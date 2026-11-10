/**
 * GeoMetrics — identidad con Firebase Authentication (correo + contraseña, con verificación de correo).
 * Las contraseñas ya no se guardan en la base de datos: las administra Firebase.
 *
 * API (window.GeoAuth):
 *   ready()                 → Promise con el usuario de Firebase (o null) cuando se conoce el estado inicial
 *   user(), email(), verified()
 *   signIn(email, pass)     → Promise(user)          crearCuenta(email, pass) → Promise(user) y envía verificación
 *   resendVerification()    resetPassword(email)     signOut()     token(force)    refresh()
 *   message(error)          → texto en español para mostrar al usuario
 *   EMULATOR                → true solo en localhost con localStorage.gm_emulador = '1' (pruebas)
 */
(function (global) {
    'use strict';
    var EMULATOR = false;
    try {
        EMULATOR = /^(localhost|127\.0\.0\.1)$/.test(global.location.hostname) && global.localStorage.getItem('gm_emulador') === '1';
    } catch (e) { EMULATOR = false; }

    var current = null, auth = null, started = false, initialDone = false, resolveReady;
    var readyPromise = new Promise(function (r) { resolveReady = r; });

    function config() {
        if (EMULATOR) return { apiKey: 'demo', authDomain: 'localhost', projectId: 'demo-geometrics', databaseURL: 'http://127.0.0.1:9000/?ns=demo-geometrics-default-rtdb', enabled: true };
        return (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG) ? FIREBASE_CONFIG : { enabled: false };
    }

    /** Inicializa la app de Firebase una sola vez (la usan también la base de datos y los quices). */
    function firebaseApp() {
        var c = config();
        if (!global.firebase || !c.enabled || !c.apiKey) return null;
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp({
                    apiKey: c.apiKey, authDomain: c.authDomain, databaseURL: c.databaseURL, projectId: c.projectId,
                    storageBucket: c.storageBucket, messagingSenderId: c.messagingSenderId, appId: c.appId
                });
                // Pruebas: la base debe apuntar al emulador antes de que cualquier módulo la use
                if (EMULATOR && firebase.database) firebase.database().useEmulator('127.0.0.1', 9000);
            }
            return firebase.app();
        } catch (e) {
            console.error('[GeoAuth] No se pudo iniciar Firebase', e);
            return null;
        }
    }

    function start() {
        if (started) return;
        started = true;
        if (!firebaseApp() || !firebase.auth) { initialDone = true; resolveReady(null); return; }
        auth = firebase.auth();
        if (EMULATOR) auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
        auth.languageCode = 'es';
        // Igual que antes: cerrar la pestaña cierra la sesión.
        auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(function () {});
        auth.onAuthStateChanged(function (u) {
            current = u;
            if (!initialDone) { initialDone = true; resolveReady(u); }
            try { global.dispatchEvent(new CustomEvent('geometrics-auth-changed', { detail: { email: u ? u.email : null, verified: !!(u && u.emailVerified) } })); } catch (e) {}
        });
    }

    function need() {
        start();
        if (!auth) return Promise.reject({ code: 'gm/no-firebase' });
        return Promise.resolve(auth);
    }
    function continueUrl() {
        try { return { url: global.location.origin + global.location.pathname, handleCodeInApp: false }; } catch (e) { return undefined; }
    }

    var MSG = {
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/wrong-password': 'Correo o contraseña incorrectos.',
        'auth/user-not-found': 'No existe una cuenta activa con ese correo.',
        'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.',
        'auth/email-already-in-use': 'Ese correo ya tiene una cuenta activa.',
        'auth/weak-password': 'La contraseña es muy débil: usa al menos 6 caracteres.',
        'auth/invalid-email': 'El correo no es válido.',
        'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
        'auth/network-request-failed': 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
        'auth/operation-not-allowed': 'El inicio de sesión con correo no está habilitado en Firebase (Authentication → Sign-in method).',
        'auth/unauthorized-domain': 'Este sitio no está autorizado en Firebase (Authentication → Settings → Authorized domains).',
        'auth/unauthorized-continue-uri': 'Este sitio no está autorizado en Firebase (Authentication → Settings → Authorized domains).',
        'gm/no-firebase': 'Firebase no está configurado: no se puede iniciar sesión.'
    };

    var api = {
        EMULATOR: EMULATOR,
        config: config,
        firebaseApp: firebaseApp,
        ready: function () { start(); return readyPromise; },
        user: function () { return current; },
        email: function () { return current && current.email ? String(current.email).toLowerCase() : ''; },
        verified: function () { return !!(current && current.emailVerified); },
        signIn: function (email, pass) {
            return need().then(function (a) { return a.signInWithEmailAndPassword(email, pass); })
                .then(function (cred) { return cred.user.reload().then(function () { current = a2(); return current; }); });
        },
        crearCuenta: function (email, pass) {
            return need().then(function (a) { return a.createUserWithEmailAndPassword(email, pass); })
                .then(function (cred) { current = cred.user; return cred.user.sendEmailVerification(continueUrl()).catch(function () { return cred.user.sendEmailVerification(); }).then(function () { return cred.user; }); });
        },
        resendVerification: function () {
            if (!current) return Promise.reject({ code: 'auth/user-not-found' });
            return current.sendEmailVerification(continueUrl()).catch(function () { return current.sendEmailVerification(); });
        },
        resetPassword: function (email) {
            return need().then(function (a) { return a.sendPasswordResetEmail(email, continueUrl()).catch(function (e) {
                if (e && /continue-uri/.test(e.code || '')) return a.sendPasswordResetEmail(email);
                throw e;
            }); });
        },
        signOut: function () { return auth ? auth.signOut().catch(function () {}) : Promise.resolve(); },
        /** Recarga el usuario: tras confirmar el correo, el token debe renovarse para que Firebase lo reconozca. */
        refresh: function () {
            if (!current) return Promise.resolve(null);
            return current.reload().then(function () { current = a2(); return current.getIdToken(true); }).then(function () { return current; });
        },
        token: function (force) { return current ? current.getIdToken(!!force) : Promise.resolve(null); },
        message: function (e) {
            var code = e && e.code ? e.code : '';
            return MSG[code] || ('No se pudo completar la operación' + (code ? ' (' + code + ')' : '') + '.');
        }
    };
    function a2() { return auth ? auth.currentUser : null; }
    global.GeoAuth = api;
    if (global.document && global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', start); else start();
})(window);
