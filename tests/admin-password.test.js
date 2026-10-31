import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import passwordHandler from '../api/admin-password.js';
import inquiriesHandler from '../api/inquiries.js';

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value = '') { this.body = value; }
  };
}

async function call(handler, method, body, password) {
  const req = {
    method,
    body,
    url: '/api/x',
    headers: password ? { authorization: 'Basic ' + Buffer.from('admin:' + password).toString('base64') } : {},
    query: {}
  };
  const res = mockResponse();
  await handler(req, res);
  return { status: res.statusCode, json: res.body ? JSON.parse(res.body) : null };
}

const canList = async (password) => (await call(inquiriesHandler, 'GET', null, password)).status === 200;
const change = (current, next, confirm = next) => call(passwordHandler, 'POST', { current, next, confirm });

test('staff password starts from env, can be changed, and the master password keeps working', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'inblue-pw-'));
  process.env.INBLUE_DATA_FILE = path.join(folder, 'rows.json');
  process.env.INBLUE_PASSWORD_FILE = path.join(folder, 'admin-password.json');
  process.env.INBLUE_AUTH_DELAY_MS = '0';
  process.env.ADMIN_PASSWORD = 'master-secret';
  process.env.ADMIN_STAFF_PASSWORD = 'initial-staff';
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL_OIDC_TOKEN;

  try {
    assert.equal(await canList('initial-staff'), true);
    assert.equal(await canList('master-secret'), true);
    assert.equal(await canList('wrong'), false);

    // 브라우저 기본 로그인 창(사용자 이름·비밀번호)이 뜨지 않아야 한다.
    const denied = mockResponse();
    await inquiriesHandler({ method: 'GET', url: '/api/inquiries', headers: {}, query: {} }, denied);
    assert.equal(denied.statusCode, 401);
    assert.equal(denied.headers['www-authenticate'], undefined);

    assert.equal((await change('wrong', 'abcd')).status, 401);
    assert.match((await change('initial-staff', 'ab')).json.error, /4~64자/);
    assert.match((await change('initial-staff', 'ab cd')).json.error, /공백/);
    assert.match((await change('initial-staff', 'abcd', 'abce')).json.error, /일치/);
    assert.match((await change('initial-staff', 'master-secret')).json.error, /사용할 수 없는/);

    assert.equal((await change('initial-staff', 'new-pass')).status, 200);
    const stored = JSON.parse(await readFile(process.env.INBLUE_PASSWORD_FILE, 'utf8'));
    assert.ok(stored.salt && stored.hash);
    assert.equal(JSON.stringify(stored).includes('new-pass'), false, 'password must be stored only as a hash');

    assert.equal(await canList('initial-staff'), false);
    assert.equal(await canList('new-pass'), true);
    assert.equal(await canList('master-secret'), true);

    // 마스터 비밀번호로도 관리자 비밀번호를 다시 정할 수 있다.
    assert.equal((await change('master-secret', 'third-pass')).status, 200);
    assert.equal(await canList('new-pass'), false);
    assert.equal(await canList('third-pass'), true);

    assert.equal((await call(passwordHandler, 'GET')).status, 405);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
