const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const MAX_BYTES = 512 * 1024; // 512 KB
const TOKEN_KEY      = 'md-auth-token';
const EDIT_TOKENS_KEY = 'md-edit-tokens'; // { [slug]: editToken }

// ── Auth token helpers ────────────────────────────────────────────────────────

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Edit token helpers ────────────────────────────────────────────────────────

function loadEditTokens() {
  try { return JSON.parse(localStorage.getItem(EDIT_TOKENS_KEY) || '{}'); }
  catch { return {}; }
}

export function storeEditToken(slug, token) {
  const map = loadEditTokens();
  map[slug] = token;
  localStorage.setItem(EDIT_TOKENS_KEY, JSON.stringify(map));
}

export function getEditToken(slug) {
  return loadEditTokens()[slug] || null;
}

// ── Config check ──────────────────────────────────────────────────────────────

export function isCloudEnabled() {
  return !!import.meta.env.VITE_API_URL;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim().slice(0, 100) : null;
}

async function parseError(res) {
  const body = await res.json().catch(() => ({}));
  return body.error || `Server error (${res.status})`;
}

// ── Document API ──────────────────────────────────────────────────────────────

export async function saveDocument(content, token = null, title = null) {
  if (!API_BASE) throw new Error('API URL is not configured.');
  if (new Blob([content]).size > MAX_BYTES) {
    throw new Error('Document exceeds the 512 KB limit.');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content, title: title || extractTitle(content) }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  const { slug, edit_token: editToken } = await res.json();
  storeEditToken(slug, editToken);
  return { slug, editToken };
}

export async function updateDocument(slug, content, editToken, title = null) {
  if (!API_BASE) throw new Error('API URL is not configured.');
  if (new Blob([content]).size > MAX_BYTES) {
    throw new Error('Document exceeds the 512 KB limit.');
  }

  const headers = { 'Content-Type': 'application/json', 'X-Edit-Token': editToken };
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ content, title: title || extractTitle(content) }),
  });

  if (res.status === 403) throw new Error('You do not have permission to edit this document.');
  if (!res.ok) throw new Error(await parseError(res));
}

export async function loadDocument(slug) {
  if (!API_BASE) throw new Error('API URL is not configured.');

  const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(slug)}`);
  if (res.status === 404) throw new Error('Document not found.');
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export async function requestVerificationCode(email) {
  if (!API_BASE) throw new Error('API URL is not configured.');

  const res = await fetch(`${API_BASE}/api/auth/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function verifyCode(email, code) {
  if (!API_BASE) throw new Error('API URL is not configured.');

  const res = await fetch(`${API_BASE}/api/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const { token } = await res.json();
  return token;
}

export async function signOut(token) {
  if (!API_BASE || !token) return;
  await fetch(`${API_BASE}/api/auth/session`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  }).catch(() => {});
  clearToken();
}

export async function lockDocument(slug, locked, editToken) {
  if (!API_BASE) throw new Error('API URL is not configured.');

  const headers = { 'Content-Type': 'application/json' };
  if (editToken) headers['X-Edit-Token'] = editToken;
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ locked }),
  });

  if (res.status === 403) throw new Error('You do not have permission to lock this document.');
  if (!res.ok) throw new Error(await parseError(res));
}

export async function getMyDocuments(token) {
  if (!API_BASE) throw new Error('API URL is not configured.');

  const res = await fetch(`${API_BASE}/api/users/me/documents`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('Session expired — please sign in again.');
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
