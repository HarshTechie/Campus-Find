const LS_KEY = 'lf_token'
export function saveToken(t) { localStorage.setItem(LS_KEY, t) }
export function getToken() { return localStorage.getItem(LS_KEY) }
export function clearToken() { localStorage.removeItem(LS_KEY) }


export async function signinWithIdToken(idToken) {
const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/auth/signin', {
method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken })
})
if (!res.ok) {
  // Surface the server's actual reason (domain rejected, bad token, etc.)
  // so the UI can show something specific instead of "Signin failed".
  let body = {}
  try { body = await res.json() } catch {}
  const err = new Error(body.message || `Sign-in failed (${res.status})`)
  err.status = res.status
  err.code = body.code
  throw err
}
const json = await res.json()
saveToken(json.token)
return json.user
}