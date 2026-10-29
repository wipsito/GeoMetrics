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
            if (!d) {
                console.error('[GeoCloud] No se puede guardar en la nube: Firebase no está disponible. Ruta:', path);
                return false;
            }
            return d.ref(path).set(value).then(function () { return true; })
                .catch(function (e) {
                    console.error('[GeoCloud] No se pudo guardar "' + path + '". Revisa las reglas de Realtime Database y el proyecto configurado:', e);
                    global.dispatchEvent(new CustomEvent('geometrics-cloud-error', { detail: { operation: 'write', path: path, message: e && e.message ? e.message : String(e) } }));
                    return false;
                });
        }).catch(function (e) {
            console.error('[GeoCloud] Error de conexión al guardar', path, e);
            return false;
        });
    }

    function cloudListen(path, cb) {
        return init().then(function (d) {
            if (!d) {
                console.error('[GeoCloud] Firebase no está configurado o no pudo inicializarse. Ruta:', path);
                return false;
            }
            if (listeners[path]) {
                try { d.ref(path).off('value', listeners[path]); } catch (e) {}
            }
            var handler = function (snap) {
                try { cb(snap.exists() ? snap.val() : null); }
                catch (e) { console.error('[GeoCloud] Error procesando datos de', path, e); }
            };
            listeners[path] = handler;
            // El tercer argumento permite detectar reglas de Firebase que deniegan lectura.
            d.ref(path).on('value', handler, function (error) {
                console.error('[GeoCloud] No se pudo leer "' + path + '". Revisa las reglas de Realtime Database y el proyecto configurado:', error);
                global.dispatchEvent(new CustomEvent('geometrics-cloud-error', { detail: { operation: 'read', path: path, message: error && error.message ? error.message : String(error) } }));
            });
            return true;
        }).catch(function (e) {
            console.error('[GeoCloud] Error iniciando escucha de', path, e);
            return false;
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

    /**
     * Guarda un chat sin pisar mensajes escritos desde otro dispositivo.
     * Firebase transaction serializa escrituras concurrentes en chats/{id};
     * se fusionan mensajes por ID y se conservan los campos existentes si el
     * dispositivo que escribe tiene una copia local antigua.
     */
    function pushChat(chat) {
        if (!chat || !chat.id) return Promise.resolve(false);
        return init().then(function (d) {
            if (!d) return false;
            var ref = d.ref('chats/' + chat.id);
            return ref.transaction(function (current) {
                if (!current || typeof current !== 'object') {
                    var first = Object.assign({}, chat);
                    first.messages = Array.isArray(chat.messages) ? chat.messages.slice() : [];
                    return first;
                }

                var merged = Object.assign({}, current, chat);
                // Los datos de identificación ya existentes no deben borrarse
                // porque un cliente tenga campos vacíos en su caché local.
                [
                    'studentEmail', 'studentName', 'teacherEmail', 'teacherName',
                    'materia', 'grupo', 'type', 'peerEmail', 'peerName', 'members'
                ].forEach(function (key) {
                    if ((chat[key] === undefined || chat[key] === null || chat[key] === '') &&
                        current[key] !== undefined && current[key] !== null && current[key] !== '') {
                        merged[key] = current[key];
                    }
                });

                var byId = {};
                function addMessage(m, fallbackIndex) {
                    if (!m || typeof m !== 'object') return;
                    var key = m.id ? String(m.id) :
                        [m.from || '', m.ts || '', m.text || '', fallbackIndex].join('|');
                    var prev = byId[key];
                    // Preferir el que tenga más datos; no sustituir un mensaje
                    // existente por una versión incompleta de la caché.
                    if (!prev) {
                        byId[key] = m;
                    } else {
                        byId[key] = Object.assign({}, prev, m);
                        if (prev.readBy && (!m.readBy || m.readBy.length < prev.readBy.length)) {
                            byId[key].readBy = prev.readBy;
                        }
                    }
                }
                (Array.isArray(current.messages) ? current.messages : []).forEach(addMessage);
                (Array.isArray(chat.messages) ? chat.messages : []).forEach(addMessage);
                merged.messages = Object.keys(byId).map(function (k) { return byId[k]; });
                merged.messages.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
                merged.updatedAt = Math.max(current.updatedAt || 0, chat.updatedAt || 0, Date.now());
                return merged;
            }, undefined, false).then(function (result) {
                if (!result.committed) return false;
                return true;
            }).catch(function (e) {
                console.error('[GeoCloud] No se pudo fusionar el chat en Firebase:', e);
                global.dispatchEvent(new CustomEvent('geometrics-cloud-error', {
                    detail: { operation: 'transaction', path: 'chats/' + chat.id, message: e && e.message ? e.message : String(e) }
                }));
                return false;
            });
        }).catch(function (e) {
            console.error('[GeoCloud] Error guardando chat:', e);
            return false;
        });
    }
    /** Sube varios chats uno a uno; cada chat se fusiona transaccionalmente. */
    function pushChats(list) {
        var arr = (list || []).filter(function (c) { return c && c.id; });
        if (!arr.length) return Promise.resolve(true);
        return Promise.all(arr.map(function (c) { return pushChat(c); }))
            .then(function (results) { return results.every(function (ok) { return ok; }); });
    }

    function listenTareas(cb) {
        return cloudListen('tareas', function (val) {
            var arr = [];
            if (!val) { cb(arr); return; }
            if (Array.isArray(val)) arr = val;
            else Object.keys(val).forEach(function (k) { if (val[k]) arr.push(val[k]); });
            cb(arr);
        });
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
                cloudGet('civix'),
                cloudGet('quices')
            ]).then(function (res) {
                var users = res[0], docs = res[1], chats = res[2], admins = res[3];
                var tareas = res[4], presentaciones = res[5], entregas = res[6], civix = res[7], quices = res[8];
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
                            if (!u || !u.email) return;
                            var k = String(u.email).toLowerCase();
                            var prev = byE[k];
                            if (!prev) { byE[k] = u; return; }
                            // Fusionar: conservar foto si uno la tiene
                            var merged = Object.assign({}, prev, u);
                            if (!merged.foto && prev.foto) merged.foto = prev.foto;
                            if (!merged.foto && u.foto) merged.foto = u.foto;
                            if (!merged.photo && prev.photo) merged.photo = prev.photo;
                            byE[k] = merged;
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
                    
                    if (quices) {
                        var localQ = [];
                        try { localQ = JSON.parse(localStorage.getItem('geometrics_quices') || '[]') || []; } catch (eQ) { localQ = []; }
                        var arrQ = Array.isArray(quices) ? quices : Object.keys(quices).map(function (k) { return quices[k]; });
                        localStorage.setItem('geometrics_quices', JSON.stringify(mergeById(localQ, arrQ.filter(Boolean))));
                    }
                    if (civix && typeof civix === 'object') {
                        var localCx = {};
                        try { localCx = JSON.parse(localStorage.getItem('geometrics_civix_conversations') || '{}') || {}; } catch (e7) { localCx = {}; }
                        Object.keys(civix).forEach(function (k) {
                            var email = (k.indexOf('_at_') >= 0 || k.indexOf(',') >= 0)
                                ? emailKeyToEmail(k) : String(k).toLowerCase();
                            var remote = civix[k];
                            if (!Array.isArray(remote)) {
                                if (remote && typeof remote === 'object') {
                                    remote = Object.keys(remote).map(function (id) { return remote[id]; });
                                } else remote = [];
                            }
                            var local = localCx[email] || [];
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
                if (!u || !u.email) return;
                var k = String(u.email).toLowerCase();
                var prev = byE[k];
                if (!prev) { byE[k] = u; return; }
                var m = Object.assign({}, prev, u);
                if (!m.foto && prev.foto) m.foto = prev.foto;
                if (!m.foto && u.foto) m.foto = u.foto;
                byE[k] = m;
            });
            var merged = Object.keys(byE).map(function (k) { return byE[k]; });
            localStorage.setItem('geometrics_users', JSON.stringify(merged));
            return merged;
        });
    }



    function pushTareas(list) {
        return cloudSet('tareas', list || []);
    }
    function pushQuices(list) {
        return cloudSet('quices', list || []);
    }
    function pushPresentaciones(list) {
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

    function slimCivixChat(chat) {
        if (!chat || !chat.id) return null;
        var msgs = (chat.messages || []).slice(-60).map(function (m) {
            var content = m && m.content != null ? String(m.content) : '';
            if (content.length > 8000) content = content.slice(0, 8000) + '\n...[truncado]';
            return { role: m.role, content: content };
        });
        return {
            id: String(chat.id),
            title: chat.title || 'Chat',
            updatedAt: chat.updatedAt || Date.now(),
            messages: msgs
        };
    }

    /** Invierte emailKey: user_at_domain,com -> user@domain.com */
    function emailKeyToEmail(k) {
        return String(k || '').replace(/_at_/g, '@').replace(/,/g, '.').toLowerCase();
    }

    /**
     * Sube chats Civix por usuario.
     * Usa mapa { chatId: chat } (Firebase no trata bien arrays).
     * update() para no borrar chats de otro dispositivo.
     */
    function pushCivix(all) {
        all = all || {};
        return init().then(function (d) {
            if (!d) return false;
            var jobs = [];
            Object.keys(all).forEach(function (email) {
                var ek = emailKey(email);
                if (!ek) return;
                var list = all[email];
                if (!Array.isArray(list)) list = [];
                var updates = {};
                list.forEach(function (chat) {
                    var slim = slimCivixChat(chat);
                    if (slim) updates[slim.id] = slim;
                });
                if (Object.keys(updates).length) {
                    jobs.push(
                        d.ref('civix/' + ek).update(updates)
                            .then(function () { return true; })
                            .catch(function (err) {
                                console.warn('pushCivix', ek, err);
                                return false;
                            })
                    );
                }
            });
            if (!jobs.length) return true;
            return Promise.all(jobs).then(function () { return true; });
        });
    }

    /** Borra un chat en la nube (definitivo en todos los dispositivos) */
    function removeCivixChat(email, chatId) {
        if (!email || !chatId) return Promise.resolve(false);
        return init().then(function (d) {
            if (!d) return false;
            var path = 'civix/' + emailKey(email) + '/' + String(chatId);
            return d.ref(path).remove()
                .then(function () { return true; })
                .catch(function (err) {
                    console.warn('removeCivixChat', path, err);
                    return false;
                });
        });
    }

    /** Reemplaza TODOS los chats de un usuario en la nube (tras borrar varios) */
    function setCivixUserChats(email, list) {
        if (!email) return Promise.resolve(false);
        return init().then(function (d) {
            if (!d) return false;
            var ek = emailKey(email);
            var map = {};
            (list || []).forEach(function (chat) {
                var slim = slimCivixChat(chat);
                if (slim) map[slim.id] = slim;
            });
            // set() borra los que ya no están en la lista
            return d.ref('civix/' + ek).set(map)
                .then(function () { return true; })
                .catch(function (err) {
                    console.warn('setCivixUserChats', err);
                    return false;
                });
        });
    }

    function pullCivix() {
        return cloudGet('civix'),
                cloudGet('quices').then(function (val) {
            if (!val || typeof val !== 'object') return {};
            var out = {};
            Object.keys(val).forEach(function (k) {
                var email = emailKeyToEmail(k);
                var node = val[k];
                var list = [];
                if (Array.isArray(node)) {
                    list = node.filter(Boolean);
                } else if (node && typeof node === 'object') {
                    Object.keys(node).forEach(function (id) {
                        var ch = node[id];
                        if (ch && typeof ch === 'object') {
                            if (!ch.id) ch.id = id;
                            list.push(ch);
                        }
                    });
                }
                out[email] = list;
            });
            return out;
        });
    }

    function listenCivix(cb) {
        return cloudListen('civix', function (val) {
            var out = {};
            if (val && typeof val === 'object') {
                Object.keys(val).forEach(function (k) {
                    var email = emailKeyToEmail(k);
                    var node = val[k];
                    var list = [];
                    if (Array.isArray(node)) list = node.filter(Boolean);
                    else if (node && typeof node === 'object') {
                        Object.keys(node).forEach(function (id) {
                            var ch = node[id];
                            if (ch && typeof ch === 'object') {
                                if (!ch.id) ch.id = id;
                                list.push(ch);
                            }
                        });
                    }
                    out[email] = list;
                });
            }
            try { cb(out); } catch (e) {}
        });
    }

    function mergeById(localArr, cloudArr) {
        var map = {};
        (localArr || []).forEach(function (x) {
            if (x && x.id) map[x.id] = x;
        });
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


    function arrFromNode(val) {
        var arr = [];
        if (!val) return arr;
        if (Array.isArray(val)) return val.filter(Boolean);
        if (typeof val === 'object') {
            Object.keys(val).forEach(function (k) {
                var x = val[k];
                if (x && typeof x === 'object') {
                    if (!x.id) x.id = k;
                    arr.push(x);
                }
            });
        }
        return arr;
    }
    function pushForos(list) {
        if (!isOn()) return Promise.resolve(false);
        var obj = {};
        (list || []).forEach(function (x) { if (x && x.id) obj[x.id] = x; });
        return cloudSet('foros', obj);
    }
    function pushForosReplies(list) {
        if (!isOn()) return Promise.resolve(false);
        var obj = {};
        (list || []).forEach(function (x) { if (x && x.id) obj[x.id] = x; });
        return cloudSet('foros_replies', obj);
    }
    function pushAvisos(list) {
        if (!isOn()) return Promise.resolve(false);
        var obj = {};
        (list || []).forEach(function (x) { if (x && x.id) obj[x.id] = x; });
        return cloudSet('avisos', obj);
    }
    function pullForos() {
        return cloudGet('foros').then(arrFromNode);
    }
    function pullForosReplies() {
        return cloudGet('foros_replies').then(arrFromNode);
    }
    function pullAvisos() {
        return cloudGet('avisos').then(arrFromNode);
    }

    global.GeoCloud = {
        cloudGet: cloudGet,
        cloudSet: cloudSet,
        emailKey: emailKey,
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
        pushQuices: pushQuices,
        pushPresentaciones: pushPresentaciones,
        pushEntregas: pushEntregas,
        pushCivix: pushCivix,
        removeCivixChat: removeCivixChat,
        setCivixUserChats: setCivixUserChats,
        pullCivix: pullCivix,
        listenCivix: listenCivix,
        listenChats: listenChats,
        listenTareas: listenTareas,
        pullChats: pullChats,
        pullUsersAndApply: pullUsersAndApply,
        pushForos: pushForos,
        pushForosReplies: pushForosReplies,
        pushAvisos: pushAvisos,
        pullForos: pullForos,
        pullForosReplies: pullForosReplies,
        pullAvisos: pullAvisos
    };
})(window);
