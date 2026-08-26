/* Supabase, over plain fetch.
 *
 * No SDK: the whole surface this app needs is four HTTP calls, and a
 * dependency that ships its own auth state machine is a lot of weight for
 * that.
 *
 * The key below is the *publishable* key and is public by design — it is in
 * the deployed JavaScript, which anyone can read. It grants nothing on its
 * own: every table has row-level security, and access requires being in
 * `members`, which requires having been invited. Verified from the outside
 * before this file existed: an anonymous read returns nothing.
 *
 * The secret key never appears here, or anywhere in this repo.
 */

export const SUPABASE_URL = 'https://tsobxrzehthegycmfsin.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_bystEHtL8rZqlgQcqOg6nQ_d7N91iHY';

const SESSION = 'us.session';

let session = load();

function load() {
  try { return JSON.parse(localStorage.getItem(SESSION) || 'null'); } catch { return null; }
}

function save(s) {
  session = s;
  try {
    if (s) localStorage.setItem(SESSION, JSON.stringify(s));
    else localStorage.removeItem(SESSION);
  } catch {}
}

export function signedIn() { return !!session?.access_token; }
export function currentUser() { return session?.user ?? null; }

async function api(path, opts = {}) {
  const r = await fetch(SUPABASE_URL + path, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(session?.access_token ? {Authorization: 'Bearer ' + session.access_token} : {}),
      ...opts.headers,
    },
  });
  if (r.status === 401 && session?.refresh_token) {
    if (await refresh()) return api(path, opts);
  }
  return r;
}

async function refresh() {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {apikey: SUPABASE_KEY, 'Content-Type': 'application/json'},
    body: JSON.stringify({refresh_token: session.refresh_token}),
  });
  if (!r.ok) { save(null); return false; }
  save(await r.json());
  return true;
}

/* Magic link. No password is ever created, typed or stored — she taps a link
 * in her email and is in, on that device, indefinitely. */
export async function sendMagicLink(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: {apikey: SUPABASE_KEY, 'Content-Type': 'application/json'},
    body: JSON.stringify({email, create_user: true,
                          options: {email_redirect_to: location.origin}}),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).msg || 'Could not send the link');
  return true;
}

/* A magic link returns with the tokens in the URL fragment. Consume them and
 * clean the address bar, so the link is not left sitting in her history. */
export function consumeMagicLink() {
  if (!location.hash.includes('access_token')) return false;
  const h = new URLSearchParams(location.hash.slice(1));
  const access_token = h.get('access_token');
  if (!access_token) return false;
  save({
    access_token,
    refresh_token: h.get('refresh_token'),
    expires_at: Number(h.get('expires_at')) || 0,
  });
  history.replaceState(null, '', location.pathname + location.search);
  return true;
}

export function signOut() { save(null); }

/* Am I actually allowed in, or did I merely get an account? */
export async function me() {
  const r = await api('/rest/v1/members?select=*&limit=1');
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] ?? null;
}

export async function notes() {
  const r = await api('/rest/v1/notes?select=*&order=created_at.desc&limit=100');
  return r.ok ? r.json() : [];
}

export async function leaveNote({body, kind = 'note', station = null, photo_path = null}) {
  const user = await me();
  if (!user) throw new Error('not a member');
  const r = await api('/rest/v1/notes', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({author: user.id, body, kind, station, photo_path}),
  });
  if (!r.ok) throw new Error('could not leave that');
  return (await r.json())[0];
}

/* Records that someone opened it. This is what lets the app say "he was here
 * this morning" without either of them having to send anything. */
export async function touch() {
  const user = await me();
  if (!user) return null;
  const r = await api('/rest/v1/visits', {
    method: 'POST',
    headers: {Prefer: 'resolution=merge-duplicates,return=representation'},
    body: JSON.stringify({member: user.id, last_at: new Date().toISOString()}),
  });
  return r.ok ? (await r.json())[0] : null;
}
