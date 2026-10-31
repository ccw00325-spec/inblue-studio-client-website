import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { get, put } from '@vercel/blob';

// 관리자 비밀번호는 두 가지다.
// - ADMIN_PASSWORD (환경 변수): 비상용 마스터 비밀번호. 화면에서 바꿀 수 없다.
// - 관리자 비밀번호: 화면의 「비밀번호 변경」으로 바꾸며, 비공개 Blob 에 해시로만 저장한다.
//   한 번도 바꾸지 않았다면 ADMIN_STAFF_PASSWORD (환경 변수) 가 초기값이다.
const PASSWORD_PATH = 'settings/admin-password.json';
export const MIN_PASSWORD_LENGTH = 4;
export const MAX_PASSWORD_LENGTH = 64;

export function hasBlobCredentials() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN));
}

function localPasswordFile() {
  return process.env.INBLUE_PASSWORD_FILE || path.join(process.cwd(), '.data', 'admin-password.json');
}

function safeEqual(actual, expected) {
  const a = Buffer.from(String(actual));
  const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

function hashPassword(password, salt) {
  return scryptSync(String(password), Buffer.from(salt, 'hex'), 32).toString('hex');
}

async function readStoredPassword() {
  if (!hasBlobCredentials()) {
    try {
      return JSON.parse(await readFile(localPasswordFile(), 'utf8'));
    } catch (error) {
      if (error && error.code === 'ENOENT') return null;
      throw error;
    }
  }
  const result = await get(PASSWORD_PATH, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return JSON.parse(await new Response(result.stream).text());
}

export async function saveStoredPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const record = { salt, hash: hashPassword(password, salt), updatedAt: new Date().toISOString() };
  if (!hasBlobCredentials()) {
    const target = localPasswordFile();
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(record, null, 2), 'utf8');
    return;
  }
  await put(PASSWORD_PATH, JSON.stringify(record), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60
  });
}

export async function checkPassword(password) {
  if (!password) return false;
  const master = process.env.ADMIN_PASSWORD;
  if (master && safeEqual(password, master)) return true;

  const stored = await readStoredPassword();
  if (stored && stored.salt && stored.hash) return safeEqual(hashPassword(password, stored.salt), stored.hash);

  const initial = process.env.ADMIN_STAFF_PASSWORD;
  return Boolean(initial) && safeEqual(password, initial);
}

export function passwordFromRequest(req) {
  const header = String(req.headers?.authorization || '');
  if (!header.startsWith('Basic ')) return '';
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    return separator >= 0 ? decoded.slice(separator + 1) : '';
  } catch (_) {
    return '';
  }
}

export async function isAdmin(req) {
  const ok = await checkPassword(passwordFromRequest(req));
  // 틀린 비밀번호를 빠르게 여러 번 넣어 보는 것을 늦춘다.
  if (!ok) await new Promise((resolve) => setTimeout(resolve, Number(process.env.INBLUE_AUTH_DELAY_MS ?? 600)));
  return ok;
}
