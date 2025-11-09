export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = { ok: false; code: string; message: string };

export function respondOk<T>(data: T, init?: ResponseInit) {
  return new Response(JSON.stringify({ ok: true, data } satisfies ApiSuccess<T>), {
    ...(init || {}),
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers || {}) },
  });
}

export function respondError(code: string, message: string, status = 400, init?: ResponseInit) {
  return new Response(JSON.stringify({ ok: false, code, message } as ApiError), {
    status,
    ...(init || {}),
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers || {}) },
  });
}
