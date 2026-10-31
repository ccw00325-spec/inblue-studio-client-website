import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { del, get, list, put } from '@vercel/blob';
import { hasBlobCredentials, isAdmin } from './_auth.js';

const PREFIX = 'inquiries/';
const ALLOWED_BRANCHES = new Set(['장안점', '성내점']);
const ALLOWED_STATUS = new Set(['new', 'done']);
const ALLOWED_PATCH_KEYS = new Set(['status', 'read']);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function cleanText(value, maxLength) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

function requestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length <= 25000) {
    try { return JSON.parse(req.body); } catch (_) { return null; }
  }
  return null;
}

function newId() {
  return 'IB' + Date.now().toString(36).toUpperCase() + randomBytes(3).toString('hex').toUpperCase();
}

export function validateInquiry(input) {
  if (!input || typeof input !== 'object') return { error: '요청 형식이 올바르지 않습니다.' };
  if (cleanText(input.website, 100)) return { error: '요청을 처리할 수 없습니다.' };

  const name = cleanText(input.name, 20);
  const phoneDigits = String(input.phone || input.phoneTail || '').replace(/\D/g, '');
  const normalizedDigits = phoneDigits.startsWith('010') ? phoneDigits : '010' + phoneDigits;
  const age = Number(input.age);
  const branch = cleanText(input.branch, 10);

  if (name.length < 2) return { error: '이름을 두 글자 이상 입력해 주세요.' };
  if (!/^010\d{8}$/.test(normalizedDigits)) return { error: '전화번호를 확인해 주세요.' };
  if (!Number.isInteger(age) || age < 14 || age > 80) return { error: '나이를 확인해 주세요.' };
  if (!ALLOWED_BRANCHES.has(branch)) return { error: '지점을 확인해 주세요.' };

  return {
    value: {
      name,
      phoneTail: normalizedDigits.slice(3),
      phone: '010-' + normalizedDigits.slice(3, 7) + '-' + normalizedDigits.slice(7),
      age,
      branch,
      interest: cleanText(input.interest, 40),
      time: cleanText(input.time, 40) || '아무 때나',
      memo: cleanText(input.memo, 1000)
    }
  };
}

function localFile() {
  return process.env.INBLUE_DATA_FILE || path.join(process.cwd(), '.data', 'inquiries.json');
}

async function localRows() {
  try {
    const parsed = JSON.parse(await readFile(localFile(), 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function saveLocalRows(rows) {
  const target = localFile();
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(rows, null, 2), 'utf8');
}

async function streamText(stream) {
  if (!stream) return '';
  return new Response(stream).text();
}

async function listRows() {
  if (!hasBlobCredentials()) return (await localRows()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const rows = await Promise.all(blobs.map(async (blob) => {
    try {
      const result = await get(blob.url, { access: 'private', useCache: false });
      if (!result || result.statusCode !== 200) return null;
      return JSON.parse(await streamText(result.stream));
    } catch (_) {
      return null;
    }
  }));
  return rows.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function saveRow(row) {
  if (!hasBlobCredentials()) {
    const rows = await localRows();
    const index = rows.findIndex((item) => item.id === row.id);
    if (index >= 0) rows[index] = row; else rows.unshift(row);
    await saveLocalRows(rows);
    return;
  }
  await put(PREFIX + row.id + '.json', JSON.stringify(row), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60
  });
}

async function removeRow(id) {
  if (!hasBlobCredentials()) {
    const rows = await localRows();
    await saveLocalRows(rows.filter((item) => item.id !== id));
    return;
  }
  await del(PREFIX + id + '.json');
}

async function requireAdmin(req, res) {
  if (await isAdmin(req)) return true;
  // WWW-Authenticate 를 보내지 않는다. 보내면 브라우저가 사용자 이름·비밀번호 창을 따로 띄운다.
  // 로그인은 관리자 화면의 비밀번호 입력란 하나로만 한다.
  json(res, 401, { error: '관리자 인증이 필요합니다.' });
  return false;
}

function validId(id) {
  return /^IB[A-Z0-9]{8,40}$/.test(String(id || ''));
}

export default async function handler(req, res) {
  const method = String(req.method || 'GET').toUpperCase();

  try {
    if (method === 'POST') {
      const checked = validateInquiry(requestBody(req));
      if (checked.error) return json(res, 400, { error: checked.error });

      const row = {
        id: newId(),
        createdAt: new Date().toISOString(),
        status: 'new',
        read: false,
        ...checked.value
      };
      await saveRow(row);
      return json(res, 201, { id: row.id, createdAt: row.createdAt });
    }

    if (!(await requireAdmin(req, res))) return;

    if (method === 'GET') {
      return json(res, 200, { inquiries: await listRows() });
    }

    if (method === 'PATCH') {
      const body = requestBody(req);
      const id = body && body.id;
      if (!validId(id) || !body.patch || typeof body.patch !== 'object') {
        return json(res, 400, { error: '변경 요청을 확인해 주세요.' });
      }
      const patch = {};
      for (const key of Object.keys(body.patch)) {
        if (!ALLOWED_PATCH_KEYS.has(key)) continue;
        if (key === 'status' && ALLOWED_STATUS.has(body.patch.status)) patch.status = body.patch.status;
        if (key === 'read' && typeof body.patch.read === 'boolean') patch.read = body.patch.read;
      }
      if (!Object.keys(patch).length) return json(res, 400, { error: '변경할 값이 없습니다.' });

      const rows = await listRows();
      const row = rows.find((item) => item.id === id);
      if (!row) return json(res, 404, { error: '문의를 찾을 수 없습니다.' });
      Object.assign(row, patch, { updatedAt: new Date().toISOString() });
      await saveRow(row);
      return json(res, 200, { inquiry: row });
    }

    if (method === 'DELETE') {
      const url = new URL(req.url || '/api/inquiries', 'http://localhost');
      const id = req.query?.id || url.searchParams.get('id');
      if (!validId(id)) return json(res, 400, { error: '삭제할 문의를 확인해 주세요.' });
      await removeRow(id);
      return json(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return json(res, 405, { error: '지원하지 않는 요청입니다.' });
  } catch (error) {
    console.error('Inquiry API error:', error);
    const storageMissing = !hasBlobCredentials() && process.env.VERCEL;
    return json(res, 503, {
      error: storageMissing
        ? '예약 저장소 연결이 필요합니다. 잠시 후 다시 시도해 주세요.'
        : '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    });
  }
}
