// GeoMetrics — sincronización multi-PC (Firebase Realtime Database)
(function (global) {
    var ready = false;
    var db = null;
    var listeners = {};

    function cfg() {
        return (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG) ? FIREBASE_CONFIG : { enabled: false };
    }

    function isOn() {
        var c = cfg();
        return !!(c.enabled && c.databaseURL && c.apiKey && global.firebase);
    }

    function init() {
        if (ready) return Promise.resolve(db);
        if (!isOn()) return Promise.resolve(null);
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp({
                    apiKey: cfg().apiKey,
                    authDomain: cfg().authDomain,
                    databaseURL: cfg().databaseURL,
                    projectId: cfg().projectId,
                    storageBucket: cfg().storageBucket,
                    messagingSenderId: cfg().messagingSenderId,
                    appId: cfg().appId
                });
            }
            db = firebase.database();
            ready = true;
            return Promise.resolve(db);
        } catch (e) {
            console.warn('Firebase init error', e);
            return Promise.resolve(null);
        }
    }

    function refPath(path) {
        return db.ref(path);
    }

    /** Lee un nodo; si falla o no hay cloud, null */
    function cloudGet(path) {
        return init().then(function (d) {
            if (!d) return null;
            return d.ref(path).once('value').then(function (snap) {
                return snap.exists() ? snap.val() : null;
            }).catch(function (e) {
                console.warn('cloudGet', path, e);
                return null;
            });
        });
    }

    function cloudSet(path, value) {
        return init().then(function (d) {
            if (!d) return false;
            return d.ref(path).set(value).then(function () { return true; })
                .catch(function (e) { console.warn('cloudSet', path, e); return false; });
        });
    }

    function cloudListen(path, cb) {
        return init().then(function (d) {
            if (!d) return;
            if (listeners[path]) {
                try { d.ref(path).off('value', listeners[path]); } catch (e) {}
            }
            var handler = function (snap) {
                try { cb(snap.exists() ? snap.val() : null); } catch (e) {}
            };
            listeners[path] = handler;
            d.ref(path).on('value', handler);
        });
    }

    // ---- API de alto nivel para el aula ----
    function emailKey(email) {
        return String(email || '').toLowerCase().replace(/\./g, ',').replace(/@/g, '_at_');
    }

    function pullUsers() {
        return cloudGet('users').then(function (val) {
            if (!val || typeof val !== 'object') return null;
            var arr = [];
            Object.keys(val).forEach(function (k) {
                if (val[k] && val[k].email) arr.push(val[k]);
            });
            return arr;
        });
    }

    function pushUser(user) {
        if (!user || !user.email) return Promise.resolve(false);
        var copy = {};
        Object.keys(user).forEach(function (k) {
            if (k === 'password') copy[k] = user[k]; // piloto: se guarda (mejor hash en prod)
            else copy[k] = user[k];
        });
        return cloudSet('users/' + emailKey(user.email), copy);
    }

    function pullDocentesExtra() {
        return cloudGet('docentesExtra').then(function (val) {
            if (!val) return null;
            if (Array.isArray(val)) return val;
            return Object.keys(val).map(function (k) { return val[k]; });
        });
    }

    function pushDocentesExtra(list) {
        return cloudSet('docentesExtra', list || []);
    }

    function pullChats() {
        return cloudGet('chats').then(function (val) {
            if (!val) return null;
            if (Array.isArray(val)) return val;
            return Object.keys(val).map(function (k) { return val[k]; });
        });
    }

    /** Sube UN chat (no borra los demás en la nube) */
    function pushChat(chat) {
        if (!chat || !chat.id) return Promise.resolve(false);
        return cloudSet('chats/' + chat.id, chat);
    }
    /** Sube varios chats uno a uno (merge, no reemplazo total) */
    function pushChats(list) {
        var arr = (list || []).filter(function (c) { return c && c.id; });
        if (!arr.length) return Promise.resolve(true);
        return Promise.all(arr.map(function (c) { return pushChat(c); }))
            .then(function () { return true; });
    }

    function listenChats(cb) {
        return cloudListen('chats', function (val) {
            var arr = [];
            if (!val) { cb(arr); return; }
            if (Array.isArray(val)) arr = val;
            else Object.keys(val).forEach(function (k) { arr.push(val[k]); });
            cb(arr);
        });
    }

    function pullAdmins() {
        return cloudGet('admins').then(function (val) {
            if (!val) return null;
            if (Array.isArray(val)) return val;
            return Object.keys(val).map(function (k) { return val[k]; });
        });
    }

    function pushAdmins(list) {
        return cloudSet('admins', list || []);
    }

    /** Mezcla local + nube (nube gana si hay datos) */
    function syncDown() {
        if (!isOn()) return Promise.resolve(false);
        return init().then(function () {
            return Promise.all([
                pullUsers(),
                pullDocentesExtra(),
                pullChats(),
                pullAdmins(),
                cloudGet('tareas'),
                cloudGet('presentaciones'),
                cloudGet('entregas'),
                cloudGet('civix')
            ]).then(function (res) {
                var users = res[0], docs = res[1], chats = res[2], admins = res[3];
                var tareas = res[4], presentaciones = res[5], entregas = res[6], civix = res[7];
                try {
                    if (users && users.length) {
                        var localU = [];
                        try { localU = JSON.parse(localStorage.getItem('geometrics_users') || '[]') || []; } catch (e2) { localU = []; }
                        if (!Array.isArray(localU)) localU = [];
                        var byE = {};
                        localU.forEach(function (u) {
                            if (u && u.email) byE[String(u.email).toLowerCase()] = u;
                        });
                        users.forEach(function (u) {
                            if (u && u.email) byE[String(u.email).toLowerCase()] = u;
                        });
                        localStorage.setItem('geometrics_users', JSON.stringify(Object.keys(byE).map(function (k) { return byE[k]; })));
                    }
                    if (docs) localStorage.setItem('geometrics_docentes_extra', JSON.stringify(docs));
                    if (chats && Array.isArray(chats)) {
                        var localC = [];
                        try { localC = JSON.parse(localStorage.getItem('gm_chats_v1') || '[]') || []; } catch (e3) { localC = []; }
                        localStorage.setItem('gm_chats_v1', JSON.stringify(mergeById(localC, chats)));
                    }
                    if (admins && admins.length) localStorage.setItem('geometrics_admins', JSON.stringify(admins));
                    if (tareas) {
                        var localT = [];
                        try { localT = JSON.parse(localStorage.getItem('geometrics_tareas') || '[]') || []; } catch (e4) { localT = []; }
                        var arrT = Array.isArray(tareas) ? tareas : Object.keys(tareas).map(function (k) { return tareas[k]; });
                        localStorage.setItem('geometrics_tareas', JSON.stringify(mergeById(localT, arrT)));
                    }
                    if (presentaciones) {
                        var localP = [];
                        try { localP = JSON.parse(localStorage.getItem('geometrics_presentaciones') || '[]') || []; } catch (e5) { localP = []; }
                        var arrP = Array.isArray(presentaciones) ? presentaciones : Object.keys(presentaciones).map(function (k) { return presentaciones[k]; });
                        localStorage.setItem('geometrics_presentaciones', JSON.stringify(mergeById(localP, arrP)));
                    }
                    if (entregas) {
                        var localE = [];
                        try { localE = JSON.parse(localStorage.getItem('geometrics_entregas') || '[]') || []; } catch (e6) { localE = []; }
                        var arrE = Array.isArray(entregas) ? entregas : Object.keys(entregas).map(function (k) { return entregas[k]; });
                        localStorage.setItem('geometrics_entregas', JSON.stringify(mergeById(localE, arrE)));
                    }
                    if (civix && typeof civix === 'object') {
                        var localCx = {};
                        try { localCx = JSON.parse(localStorage.getItem('geometrics_civix_conversations') || '{}') || {}; } catch (e7) { localCx = {}; }
                        Object.keys(civix).forEach(function (email) {
                            var remote = civix[email] || [];
                            var local = localCx[email] || [];
                            if (!Array.isArray(remote)) remote = [];
                            if (!Array.isArray(local)) local = [];
                            localCx[email] = mergeById(local, remote);
                        });
                        localStorage.setItem('geometrics_civix_conversations', JSON.stringify(localCx));
                    }
                } catch (e) { console.warn('syncDown apply', e); }
                return true;
            });
        });
    }

function syncUpUsers() {
        if (!isOn()) return Promise.resolve(false);
        try {
            var users = JSON.parse(localStorage.getItem('geometrics_users') || '[]');
            return Promise.all((users || []).filter(function (u) { return u && u.email; }).map(function (u) {
                return pushUser(u);
            })).then(function () { return true; });
        } catch (e) { return Promise.resolve(false); }
    }

    function syncUpAll() {
        if (!isOn()) return Promise.resolve(false);
        try {
            var users = JSON.parse(localStorage.getItem('geometrics_users') || '[]');
            var docs = JSON.parse(localStorage.getItem('geometrics_docentes_extra') || '[]');
            var chats = JSON.parse(localStorage.getItem('gm_chats_v1') || '[]');
            var admins = JSON.parse(localStorage.getItem('geometrics_admins') || '[]');
            var tareas = JSON.parse(localStorage.getItem('geometrics_tareas') || '[]');
            var presentaciones = JSON.parse(localStorage.getItem('geometrics_presentaciones') || '[]');
            var entregas = JSON.parse(localStorage.getItem('geometrics_entregas') || '[]');
            var civix = {};
            try { civix = JSON.parse(localStorage.getItem('geometrics_civix_conversations') || '{}'); } catch (eC) { civix = {}; }
            var umap = {};
            (users || []).forEach(function (u) {
                if (u && u.email) umap[emailKey(u.email)] = u;
            });
            return Promise.all([
                Promise.all(Object.keys(umap).map(function (k) { return cloudSet('users/' + k, umap[k]); })),
                cloudSet('docentesExtra', docs || []),
                pushChats(chats || []),
                cloudSet('admins', admins || []),
                pushTareas(tareas || []),
                pushPresentaciones(presentaciones || []),
                pushEntregas(entregas || []),
                pushCivix(civix || {})
            ]).then(function () { return true; });
        } catch (e) { return Promise.resolve(false); }
    }

        function pullUsersAndApply() {
        return pullUsers().then(function (users) {
            if (!users || !users.length) return [];
            var localU = [];
            try { localU = JSON.parse(localStorage.getItem('geometrics_users') || '[]') || []; } catch (e) { localU = []; }
            if (!Array.isArray(localU)) localU = [];
            var byE = {};
            localU.forEach(function (u) {
                if (u && u.email) byE[String(u.email).toLowerCase()] = u;
            });
            users.forEach(function (u) {
                if (u && u.email) byE[String(u.email).toLowerCase()] = u;
            });
            var merged = Object.keys(byE).map(function (k) { return byE[k]; });
            localStorage.setItem('geometrics_users', JSON.stringify(merged));
            return merged;
        });
    }


    function pushTareas(list) {
        return cloudSet('tareas', list || []);
    }
    function pushPresentaciones(list) {
        // evitar payloads enormes: quitar data URL si > 800KB
        var slim = (list || []).map(function (p) {
            if (!p) return p;
            var o = {};
            Object.keys(p).forEach(function (k) {
                if (k === 'data' || k === 'archivo' || k === 'fileData') {
                    var s = p[k];
                    if (typeof s === 'string' && s.length > 800000) o[k] = null;
                    else o[k] = s;
                } else o[k] = p[k];
            });
            return o;
        });
        return cloudSet('presentaciones', slim);
    }
    function pushEntregas(list) {
        var slim = (list || []).map(function (e) {
            if (!e) return e;
            var o = {};
            Object.keys(e).forEach(function (k) {
                if (k === 'data' || k === 'archivo' || k === 'fileData' || k === 'contenido') {
                    var s = e[k];
                    if (typeof s === 'string' && s.length > 800000) {
                        o[k] = null;
                        o._archivoOmitido = true;
                        o.nombreArchivo = e.nombreArchivo || e.name || '';
                    } else o[k] = s;
                } else o[k] = e[k];
            });
            return o;
        });
        return cloudSet('entregas', slim);
    }
    function pushCivix(all) {
        return cloudSet('civix', all || {});
    }
    function pullCivix() {
        return cloudGet('civix');
    }

    function mergeById(localArr, cloudArr) {
        var map = {};
        (localArr || []).forEach(function (x) { if (x && x.id) map[x.id] = x; });
        (cloudArr || []).forEach(function (x) {
            if (!x || !x.id) return;
            var prev = map[x.id];
            if (!prev) map[x.id] = x;
            else {
                var tL = prev.updatedAt || prev.fecha || prev.createdAt || 0;
                var tC = x.updatedAt || x.fecha || x.createdAt || 0;
                if (tC >= tL) map[x.id] = x;
            }
        });
        return Object.keys(map).map(function (k) { return map[k]; });
    }

    global.GeoCloud = {
        isOn: isOn,
        init: init,
        syncDown: syncDown,
        syncUpAll: syncUpAll,
        syncUpUsers: syncUpUsers,
        pushUser: pushUser,
        pushDocentesExtra: pushDocentesExtra,
        pushChat: pushChat,
        pushChats: pushChats,
        pushAdmins: pushAdmins,
        pushTareas: pushTareas,
        pushPresentaciones: pushPresentaciones,
        pushEntregas: pushEntregas,
        pushCivix: pushCivix,
        pullCivix: pullCivix,
        listenChats: listenChats,
        pullChats: pullChats,
        pullUsersAndApply: pullUsersAndApply
    };
})(window);
