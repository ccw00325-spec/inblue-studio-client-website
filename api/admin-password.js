import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  checkPassword,
  hasBlobCredentials,
  saveStoredPassword
} from './_auth.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function requestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length <= 2000) {
    try { return JSON.parse(req.body); } catch (_) { return null; }
  }
  return null;
}

export function validateNewPassword(current, next, confirm) {
  if (typeof next !== 'string' || next.length < MIN_PASSWORD_LENGTH || next.length > MAX_PASSWORD_LENGTH) {
    return `새 비밀번호는 ${MIN_PASSWORD_LENGTH}~${MAX_PASSWORD_LENGTH}자로 입력해 주세요.`;
  }
  if (/\s/.test(next)) return '새 비밀번호에는 공백을 넣을 수 없습니다.';
  if (confirm !== undefined && next !== confirm) return '새 비밀번호 확인이 일치하지 않습니다.';
  if (next === current) return '지금과 다른 비밀번호를 입력해 주세요.';
  if (process.env.ADMIN_PASSWORD && next === process.env.ADMIN_PASSWORD) return '사용할 수 없는 비밀번호입니다.';
  return '';
}

export default async function handler(req, res) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: '지원하지 않는 요청입니다.' });
  }

  try {
    const body = requestBody(req);
    if (!body) return json(res, 400, { error: '요청 형식이 올바르지 않습니다.' });
    const current = String(body.current || '');
    if (!(await checkPassword(current))) {
      await new Promise((resolve) => setTimeout(resolve, Number(process.env.INBLUE_AUTH_DELAY_MS ?? 600)));
      return json(res, 401, { error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    const problem = validateNewPassword(current, body.next, body.confirm);
    if (problem) return json(res, 400, { error: problem });

    await saveStoredPassword(body.next);
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('Admin password API error:', error);
    const storageMissing = !hasBlobCredentials() && process.env.VERCEL;
    return json(res, 503, {
      error: storageMissing
        ? '저장소 연결이 필요합니다. 잠시 후 다시 시도해 주세요.'
        : '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    });
  }
}
