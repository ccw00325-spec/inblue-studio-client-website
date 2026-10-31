import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import handler, { validateInquiry } from '../api/inquiries.js';

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value = '') { this.body = value; }
  };
}

async function request(method, body, password, url = '/api/inquiries') {
  const req = {
    method,
    body,
    url,
    headers: password ? { authorization: 'Basic ' + Buffer.from('admin:' + password).toString('base64') } : {},
    query: Object.fromEntries(new URL(url, 'http://localhost').searchParams)
  };
  const res = mockResponse();
  await handler(req, res);
  return { status: res.statusCode, json: res.body ? JSON.parse(res.body) : null };
}

test('validates and normalizes a reservation', () => {
  const result = validateInquiry({
    name: '홍길동', phoneTail: '12345678', age: 31, branch: '장안점', memo: '상담 희망'
  });
  assert.equal(result.error, undefined);
  assert.equal(result.value.phone, '010-1234-5678');
  assert.equal(result.value.time, '아무 때나');
});

test('rejects malformed personal data', () => {
  assert.match(validateInquiry({ name: '김', phoneTail: '12', age: 9, branch: '장안점' }).error, /이름/);
  assert.match(validateInquiry({ name: '김철수', phoneTail: '12', age: 30, branch: '장안점' }).error, /전화번호/);
  assert.match(validateInquiry({ name: '김철수', phoneTail: '12345678', age: 30, branch: '미정' }).error, /지점/);
});

test('creates, protects, updates and deletes inquiries', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'inblue-api-'));
  process.env.INBLUE_DATA_FILE = path.join(folder, 'rows.json');
  process.env.INBLUE_PASSWORD_FILE = path.join(folder, 'admin-password.json');
  process.env.INBLUE_AUTH_DELAY_MS = '0';
  process.env.ADMIN_PASSWORD = 'test-admin-password';
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL_OIDC_TOKEN;

  try {
    const created = await request('POST', {
      name: '연동테스트', phoneTail: '00000000', age: 30, branch: '성내점', interest: '필라테스'
    });
    assert.equal(created.status, 201);
    assert.match(created.json.id, /^IB/);

    const denied = await request('GET');
    assert.equal(denied.status, 401);

    const listed = await request('GET', null, 'test-admin-password');
    assert.equal(listed.status, 200);
    assert.equal(listed.json.inquiries.length, 1);
    assert.equal(listed.json.inquiries[0].name, '연동테스트');

    const updated = await request('PATCH', {
      id: created.json.id,
      patch: { status: 'done', read: true, name: '변조금지' }
    }, 'test-admin-password');
    assert.equal(updated.status, 200);
    assert.equal(updated.json.inquiry.status, 'done');
    assert.equal(updated.json.inquiry.name, '연동테스트');

    const removed = await request('DELETE', null, 'test-admin-password', '/api/inquiries?id=' + created.json.id);
    assert.equal(removed.status, 200);
    const after = JSON.parse(await readFile(process.env.INBLUE_DATA_FILE, 'utf8'));
    assert.deepEqual(after, []);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
