// Utilidades para pruebas contra los emuladores (Auth 9099, Database 9000, proyecto demo-geometrics).
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator, ref, get, set, update, serverTimestamp } from 'firebase/database';

export const PROJECT = 'demo-geometrics';
export const DB_URL = 'http://127.0.0.1:9000/?ns=demo-geometrics-default-rtdb';
const AUTH_API = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/' + PROJECT;

export function key(email) { return email.toLowerCase().replace(/\./g, ',').replace(/@/g, '_at_'); }

let n = 0;
export async function user(email, { verified = true, pass = 'clave-segura-1' } = {}) {
  const app = initializeApp({ apiKey: 'demo', projectId: PROJECT, databaseURL: DB_URL }, 'u' + (++n));
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getDatabase(app);
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
  let cred;
  try { cred = await createUserWithEmailAndPassword(auth, email, pass); }
  catch (e) { if (e.code !== 'auth/email-already-in-use') throw e; cred = await signInWithEmailAndPassword(auth, email, pass); }
  if (verified) {
    await fetch(AUTH_API + '/accounts:update', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId: cred.user.uid, emailVerified: true }) });
    await cred.user.getIdToken(true);
  }
  return { app, auth, db, email, key: key(email), uid: cred.user.uid, close: () => deleteApp(app) };
}

export async function anon() {
  const app = initializeApp({ apiKey: 'demo', projectId: PROJECT, databaseURL: DB_URL }, 'a' + (++n));
  const db = getDatabase(app);
  connectDatabaseEmulator(db, '127.0.0.1', 9000);
  return { app, db, close: () => deleteApp(app) };
}

/** Deja los emuladores vacíos (base y cuentas) para que cada batería sea independiente. */
export async function reset() {
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/' + PROJECT + '/accounts', { method: 'DELETE' });
  await admin('DELETE', '');
}

export async function admin(method, path, body) {
  const r = await fetch('http://127.0.0.1:9000/' + path + '.json?ns=demo-geometrics-default-rtdb', { method, headers: { Authorization: 'Bearer owner' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return r.json();
}

export async function ok(p) { try { await p; return true; } catch (e) { if (String(e.code || e.message).includes('PERMISSION_DENIED') || String(e).includes('permission_denied') || String(e).includes('Permission denied')) return false; throw e; } }
export { ref, get, set, update, serverTimestamp };
