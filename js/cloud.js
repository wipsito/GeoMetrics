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

    function pushChats(list) {
        // guardar como mapa por id
        var map = {};
        (list || []).forEach(function (c) {
            if (c && c.id) map[c.id] = c;
        });
        return cloudSet('chats', map);
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
                pullAdmins()
            ]).then(function (res) {
                var users = res[0], docs = res[1], chats = res[2], admins = res[3];
                try {
                    if (users && users.length) {
                        localStorage.setItem('geometrics_users', JSON.stringify(users));
                    }
                    if (docs) {
                        localStorage.setItem('geometrics_docentes_extra', JSON.stringify(docs));
                    }
                    if (chats) {
                        localStorage.setItem('gm_chats_v1', JSON.stringify(chats));
                    }
                    if (admins && admins.length) {
                        localStorage.setItem('geometrics_admins', JSON.stringify(admins));
                    }
                } catch (e) {}
                return true;
            });
        });
    }

    function syncUpUsers() {
        if (!isOn()) return Promise.resolve(false);
        try {
            var users = JSON.parse(localStorage.getItem('geometrics_users') || '[]');
            var map = {};
            (users || []).forEach(function (u) {
                if (u && u.email) map[emailKey(u.email)] = u;
            });
            return cloudSet('users', map);
        } catch (e) { return Promise.resolve(false); }
    }

    function syncUpAll() {
        if (!isOn()) return Promise.resolve(false);
        try {
            var users = JSON.parse(localStorage.getItem('geometrics_users') || '[]');
            var docs = JSON.parse(localStorage.getItem('geometrics_docentes_extra') || '[]');
            var chats = JSON.parse(localStorage.getItem('gm_chats_v1') || '[]');
            var admins = JSON.parse(localStorage.getItem('geometrics_admins') || '[]');
            var umap = {};
            (users || []).forEach(function (u) {
                if (u && u.email) umap[emailKey(u.email)] = u;
            });
            var cmap = {};
            (chats || []).forEach(function (c) {
                if (c && c.id) cmap[c.id] = c;
            });
            return Promise.all([
                cloudSet('users', umap),
                cloudSet('docentesExtra', docs || []),
                cloudSet('chats', cmap),
                cloudSet('admins', admins || [])
            ]).then(function () { return true; });
        } catch (e) { return Promise.resolve(false); }
    }

    global.GeoCloud = {
        isOn: isOn,
        init: init,
        syncDown: syncDown,
        syncUpAll: syncUpAll,
        syncUpUsers: syncUpUsers,
        pushUser: pushUser,
        pushDocentesExtra: pushDocentesExtra,
        pushChats: pushChats,
        pushAdmins: pushAdmins,
        listenChats: listenChats,
        pullChats: pullChats
    };
})(window);
