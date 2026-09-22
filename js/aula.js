// =========================================
// GeoMetrics — Aula (login, docente, estudiante)
// Datos en localStorage del navegador
// =========================================

var AULA_KEYS = {
    users: 'geometrics_users',
    session: 'geometrics_session',
    tareas: 'geometrics_tareas',
    presentaciones: 'geometrics_presentaciones',
    entregas: 'geometrics_entregas',
    docentesExtra: 'geometrics_docentes_extra',
    admins: 'geometrics_admins'
};

/** Versión de esquema: al cambiar, limpia usuarios para forzar re-registro con nuevos campos */
var GEOMETRICS_DB_VERSION = 3;
(function migrarBaseDatosGeoMetrics() {
    try {
        var v = parseInt(localStorage.getItem('geometrics_db_version') || '0', 10);
        if (v < GEOMETRICS_DB_VERSION) {
            // Reiniciar usuarios y sesión (nuevos campos: codigo, etc.)
            localStorage.removeItem('geometrics_users');
            localStorage.removeItem('geometrics_session');
            localStorage.removeItem('geometrics_perfiles');
            localStorage.setItem('geometrics_db_version', String(GEOMETRICS_DB_VERSION));
            console.info('[GeoMetrics] Base de usuarios reiniciada (v' + GEOMETRICS_DB_VERSION + ').');
        }
    } catch (e) {}
})();


/** Superadministrador fijo de la aplicación */
var AULA_SUPER_ADMIN = 'andres.enriquezval@unipamplona.edu.co';

function aulaLoad(key, fallback) {
    try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : (fallback || []);
    } catch (e) {
        return fallback || [];
    }
}

function aulaSave(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    // GeoCloud_SYNC_PATCH: subir a la nube claves compartidas
    try {
        if (window.GeoCloud && GeoCloud.isOn()) {
            if (key === 'geometrics_users') GeoCloud.syncUpUsers();
            else if (key === 'geometrics_docentes_extra') GeoCloud.pushDocentesExtra(value);
            else if (key === 'geometrics_admins') GeoCloud.pushAdmins(value);
        }
    } catch (e) {}
}

function aulaUid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function aulaSeed() {
    var DEMO_EMAIL = 'docente.demo@unipamplona.edu.co';
    var DEMO = {
        id: 'doc_demo',
        nombre: 'Laura Patricia Gómez Rincón',
        nombres: 'Laura Patricia',
        apellidos: 'Gómez Rincón',
        email: DEMO_EMAIL,
        password: 'docente123',
        rol: 'docente',
        materia: '',
        grupo: '',
        // Solo grupos de demostración (no interfiere con A, B, C reales)
        materias: [
            { nombre: 'Mecánica de Suelos I', grupo: 'DEMO' },
            { nombre: 'Mecánica de Suelos II', grupo: 'DEMO' },
            { nombre: 'Resistencia de Materiales', grupo: 'DEMO' }
        ],
        materia: 'Mecánica de Suelos I',
        grupo: 'DEMO',
        foto: ''
    };
    var users = aulaLoad(AULA_KEYS.users, null);
    if (!users || !Array.isArray(users)) users = [];
    // Asegurar docente demo de prueba
    var hasDemo = users.some(function(u) {
        return u && String(u.email || '').toLowerCase() === DEMO_EMAIL;
    });
    if (!hasDemo) users.push(DEMO);
    else {
        users = users.map(function(u) {
            if (u && String(u.email || '').toLowerCase() === DEMO_EMAIL) {
                u.nombre = u.nombre || DEMO.nombre;
                u.nombres = u.nombres || DEMO.nombres;
                u.apellidos = u.apellidos || DEMO.apellidos;
                u.password = u.password || DEMO.password;
                u.rol = 'docente';
                // Si no tiene materias, asignar solo DEMO
                if (!u.materias || !u.materias.length) {
                    u.materias = DEMO.materias;
                    u.materia = DEMO.materia;
                    u.grupo = DEMO.grupo;
                }
            }
            return u;
        });
    }
    aulaSave(AULA_KEYS.users, users);
    // Superadmin por correo (Andrés); la cuenta la crea él al registrarse como estudiante
    try {
        if (typeof aulaAdminsLoad === 'function' && typeof aulaAdminsSave === 'function') {
            var ads = aulaAdminsLoad();
            aulaAdminsSave(ads);
        } else {
            var adm = aulaLoad(AULA_KEYS.admins || 'geometrics_admins', []);
            var superE = 'andres.enriquezval@unipamplona.edu.co';
            if (!Array.isArray(adm)) adm = [];
            if (adm.map(function(x){return String(x).toLowerCase();}).indexOf(superE) < 0) adm.unshift(superE);
            aulaSave(AULA_KEYS.admins || 'geometrics_admins', adm);
        }
    } catch (e) {}
}

function aulaLimpiarTodosLosResultados() {
    try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf('geometrics_historial') === 0) keys.push(k);
        }
        keys.forEach(function(k) { localStorage.removeItem(k); });
    } catch (e) {}
}


function aulaGetSession() {
    try {
        return JSON.parse(localStorage.getItem(AULA_KEYS.session) || 'null');
    } catch (e) {
        return null;
    }
}

function aulaSetSession(user) {
    if (!user) {
        localStorage.removeItem(AULA_KEYS.session);
        return;
    }
    localStorage.setItem(AULA_KEYS.session, JSON.stringify({
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        codigo: user.codigo || '',
        materia: user.materia || '',
        grupo: user.grupo || '',
        materias: user.materias || [],
        foto: user.foto || ''
    }));
}

function aulaRequireSession() {
    var s = aulaGetSession();
    if (!s) {
        if (typeof mostrarPantalla === 'function') mostrarPantalla('inicio');
        return null;
    }
    return s;
}

function aulaReadFileAsDataURL(file, maxBytes) {
    return new Promise(function(resolve, reject) {
        if (!file) return reject(new Error('Selecciona un archivo'));
        var max = maxBytes || (100 * 1024 * 1024);
        if (file.size > max) {
            return reject(new Error('El archivo supera el tamaño máximo permitido (100 MB).'));
        }
        var reader = new FileReader();
        reader.onload = function() { resolve({ name: file.name, type: file.type || 'application/octet-stream', data: reader.result, size: file.size }); };
        reader.onerror = function() { reject(new Error('No se pudo leer el archivo')); };
        reader.readAsDataURL(file);
    });
}

/** IndexedDB para archivos grandes (entregas / presentaciones). localStorage solo guarda metadatos. */
var AULA_IDB_NAME = 'geometrics_files_v1';
var AULA_IDB_STORE = 'files';

function aulaIdbOpen() {
    return new Promise(function(resolve, reject) {
        if (!window.indexedDB) return reject(new Error('Este navegador no soporta IndexedDB'));
        var req = indexedDB.open(AULA_IDB_NAME, 1);
        req.onupgradeneeded = function() {
            var db = req.result;
            if (!db.objectStoreNames.contains(AULA_IDB_STORE)) {
                db.createObjectStore(AULA_IDB_STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = function() { resolve(req.result); };
        req.onerror = function() { reject(req.error || new Error('No se pudo abrir IndexedDB')); };
    });
}

function aulaIdbPut(id, record) {
    return aulaIdbOpen().then(function(db) {
        return new Promise(function(resolve, reject) {
            var tx = db.transaction(AULA_IDB_STORE, 'readwrite');
            tx.oncomplete = function() { resolve(id); };
            tx.onerror = function() { reject(tx.error); };
            tx.objectStore(AULA_IDB_STORE).put(Object.assign({ id: id }, record));
        });
    });
}

function aulaIdbGet(id) {
    return aulaIdbOpen().then(function(db) {
        return new Promise(function(resolve, reject) {
            var tx = db.transaction(AULA_IDB_STORE, 'readonly');
            var req = tx.objectStore(AULA_IDB_STORE).get(id);
            req.onsuccess = function() { resolve(req.result || null); };
            req.onerror = function() { reject(req.error); };
        });
    });
}

function aulaIdbDelete(id) {
    return aulaIdbOpen().then(function(db) {
        return new Promise(function(resolve, reject) {
            var tx = db.transaction(AULA_IDB_STORE, 'readwrite');
            tx.oncomplete = function() { resolve(); };
            tx.onerror = function() { reject(tx.error); };
            tx.objectStore(AULA_IDB_STORE).delete(id);
        });
    }).catch(function() {});
}

/** Guarda archivo grande en IDB; devuelve referencia liviana para localStorage/Firebase meta. */
function aulaGuardarArchivoGrande(fileObj) {
    var id = 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    return aulaIdbPut(id, {
        name: fileObj.name,
        type: fileObj.type,
        size: fileObj.size,
        data: fileObj.data,
        created: new Date().toISOString()
    }).then(function() {
        return {
            id: id,
            name: fileObj.name,
            type: fileObj.type,
            size: fileObj.size,
            // Marca de referencia (no embeber base64 en localStorage)
            storage: 'idb',
            dataRef: id
        };
    });
}

function aulaResolverUrlArchivo(entregaOFile) {
    return new Promise(function(resolve) {
        if (!entregaOFile) return resolve(null);
        // Compat: entregas antiguas con data URL completo
        if (entregaOFile.data && String(entregaOFile.data).indexOf('data:') === 0) {
            return resolve(entregaOFile.data);
        }
        var ref = entregaOFile.dataRef || entregaOFile.fileRef ||
            (entregaOFile.storage === 'idb' ? entregaOFile.id : null);
        if (!ref) return resolve(entregaOFile.data || null);
        aulaIdbGet(ref).then(function(rec) {
            resolve(rec && rec.data ? rec.data : null);
        }).catch(function() { resolve(null); });
    });
}

function aulaFormatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('es-CO');
    } catch (e) {
        return iso;
    }
}


function aulaEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Config institucional */
function aulaDominio() {
    return (typeof AULA_CONFIG !== 'undefined' && AULA_CONFIG.dominio)
        ? AULA_CONFIG.dominio
        : 'unipamplona.edu.co';
}

function aulaDocentesBase() {
    return (typeof AULA_CONFIG !== 'undefined' && AULA_CONFIG.docentes)
        ? AULA_CONFIG.docentes.map(function(e) { return String(e).toLowerCase(); })
        : ['docente.demo@unipamplona.edu.co'];
}
function aulaDocentesExtraLoad() {
    var list = aulaLoad(AULA_KEYS.docentesExtra, []);
    return Array.isArray(list) ? list : [];
}
function aulaDocentesExtraSave(list) {
    aulaSave(AULA_KEYS.docentesExtra, list);
}
/** Lista completa de correos docentes (config + panel admin) */
function aulaDocentesLista() {
    var set = {};
    aulaDocentesBase().forEach(function(e) { set[aulaNormalizarEmail(e)] = true; });
    aulaDocentesExtraLoad().forEach(function(item) {
        var e = typeof item === 'string' ? item : (item && item.email);
        if (e) set[aulaNormalizarEmail(e)] = true;
    });
    // Usuarios con rol docente también
    aulaLoad(AULA_KEYS.users, []).forEach(function(u) {
        if (u && u.rol === 'docente' && u.email) set[aulaNormalizarEmail(u.email)] = true;
    });
    return Object.keys(set);
}
function aulaAdminsLoad() {
    try {
        var list = aulaLoad(AULA_KEYS.admins || 'geometrics_admins', []);
        if (!Array.isArray(list)) list = [];
        var superE = aulaNormalizarEmail(typeof AULA_SUPER_ADMIN !== 'undefined' ? AULA_SUPER_ADMIN : 'andres.enriquezval@unipamplona.edu.co');
        if (list.indexOf(superE) < 0) list.unshift(superE);
        return list.map(aulaNormalizarEmail);
    } catch (e) {
        return ['andres.enriquezval@unipamplona.edu.co'];
    }
}
function aulaAdminsSave(list) {
    var superE = aulaNormalizarEmail(AULA_SUPER_ADMIN);
    list = (list || []).map(aulaNormalizarEmail).filter(Boolean);
    if (list.indexOf(superE) < 0) list.unshift(superE);
    // unique
    var seen = {}, out = [];
    list.forEach(function(e) { if (!seen[e]) { seen[e] = true; out.push(e); } });
    aulaSave(AULA_KEYS.admins, out);
}
function aulaEsAdminEmail(email) {
    try {
        email = aulaNormalizarEmail(email);
        if (!email) return false;
        var superE = aulaNormalizarEmail(typeof AULA_SUPER_ADMIN !== 'undefined' ? AULA_SUPER_ADMIN : 'andres.enriquezval@unipamplona.edu.co');
        if (email === superE) return true;
        return aulaAdminsLoad().indexOf(email) >= 0;
    } catch (e) { return false; }
}

function aulaNormalizarEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function aulaEmailInstitucional(email) {
    return aulaNormalizarEmail(email).endsWith('@' + aulaDominio());
}

function aulaNombreDesdeEmail(email) {
    var local = aulaNormalizarEmail(email).split('@')[0] || '';
    local = local.replace(/[0-9]+$/g, '').replace(/[._+\-]+/g, ' ').trim();
    if (!local) return '';
    return local.split(/\s+/).map(function(part) {
        return part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '';
    }).join(' ');
}

function aulaIniciales(nombre) {
    var parts = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function aulaEsDocenteEmail(email) {
    email = aulaNormalizarEmail(email);
    if (!email) return false;
    // Superadmin también puede operar como docente si quiere panel docente
    if (aulaEsAdminEmail(email) && email === aulaNormalizarEmail(AULA_SUPER_ADMIN)) {
        /* no fuerza docente; solo lista */
    }
    return aulaDocentesLista().indexOf(email) >= 0;
}


function aulaPerfilKey(email) {
    return 'geometrics_perfil_' + aulaNormalizarEmail(email);
}

function aulaGetPerfil(email) {
    try {
        return JSON.parse(localStorage.getItem(aulaPerfilKey(email)) || 'null');
    } catch (e) {
        return null;
    }
}

function aulaSavePerfil(email, perfil) {
    try {
        localStorage.setItem(aulaPerfilKey(email), JSON.stringify(perfil || {}));
    } catch (e) {}
}

function aulaNormGrupo(g) {
    return String(g || '').trim().toLowerCase().replace(/^grupo\s+/i, '');
}



function aulaUsuarioCompleto(user) {
    if (!user) return user;
    var users = aulaLoad(AULA_KEYS.users, []);
    var full = users.find(function(u) {
        return (user.id && u.id === user.id) || (user.email && u.email === user.email);
    });
    if (!full) return user;
    // Fusionar datos frescos (materias, foto, etc.)
    var merged = Object.assign({}, full);
    // session no necesita password
    delete merged.password;
    return merged;
}

function aulaMateriasUsuario(user) {
    if (!user) return [];
    if (user.materias && user.materias.length) return user.materias;
    if (user.materia) return [{ nombre: user.materia, grupo: user.grupo || '' }];
    return [];
}

function aulaNombresMaterias(user) {
    return aulaMateriasUsuario(user).map(function(m) { return m.nombre; });
}

function aulaGrupoDeMateria(user, materia) {
    var list = aulaMateriasUsuario(user);
    for (var i = 0; i < list.length; i++) {
        if (list[i].nombre === materia) return list[i].grupo || '';
    }
    return user && user.grupo ? user.grupo : '';
}

function aulaUsuarioCoincideMateriaGrupo(user, materia, grupo) {
    var list = aulaMateriasUsuario(user);
    if (!list.length) return false;
    var gFiltro = String(grupo || '').trim().toUpperCase();
    return list.some(function(m) {
        var okMat = !materia || m.nombre === materia;
        if (!okMat) return false;
        if (!gFiltro) return true;
        var gruposUser = (m.grupos && m.grupos.length) ? m.grupos : aulaParseGrupos(m.grupo);
        if (!gruposUser.length) {
            // un solo grupo en campo plano
            var g = String(m.grupo || '').trim().toUpperCase();
            return !g || g === gFiltro || g.split(/[,;]/).map(function(x){return x.trim();}).indexOf(gFiltro) >= 0;
        }
        return gruposUser.some(function(g) {
            return String(g).trim().toUpperCase() === gFiltro;
        });
    });
}

function aulaSetAvatarEl(el, user, fallbackText) {
    if (!el) return;
    if (user && user.foto) {
        el.classList.add('con-foto');
        el.style.backgroundImage = 'url(' + user.foto + ')';
        el.textContent = '';
    } else {
        el.classList.remove('con-foto');
        el.style.backgroundImage = '';
        el.textContent = fallbackText || (user ? aulaIniciales(user.nombre) : '?');
    }
}

function aulaActualizarMenuMaterias(user) {
    user = user || aulaGetSession();
    var cards = document.querySelectorAll('.menu-card[data-materia]');
    if (!user) {
        cards.forEach(function(c) { c.style.display = ''; });
        return;
    }
    if (user.rol === 'docente') {
        cards.forEach(function(c) { c.style.display = ''; });
        return;
    }
    var mats = aulaNombresMaterias(user);
    cards.forEach(function(c) {
        var m = c.getAttribute('data-materia');
        c.style.display = (mats.indexOf(m) !== -1) ? '' : 'none';
    });
}

function aulaNombresAleatorios() {
    var nombres = ['Andrés Felipe', 'Camila Andrea', 'Juan Pablo', 'María José', 'Santiago', 'Valentina', 'Diego Alejandro', 'Laura Sofía', 'Carlos Andrés', 'Isabella'];
    var apellidos = ['Enríquez Valbuena', 'García López', 'Martínez Ríos', 'Pérez Gómez', 'Rodríguez Díaz', 'Sánchez Torres', 'Ramírez Cruz', 'Hernández Mora', 'Jiménez Ruiz', 'Castro Peña'];
    var n = nombres[Math.floor(Math.random() * nombres.length)];
    var a = apellidos[Math.floor(Math.random() * apellidos.length)];
    var rn = document.getElementById('regNombres');
    var ra = document.getElementById('regApellidos');
    if (rn) rn.placeholder = 'Ej. ' + n;
    if (ra) ra.placeholder = 'Ej. ' + a;
}


function aulaActualizarIdentidadLogin() {
    var email = aulaNormalizarEmail((document.getElementById('loginEmail') || {}).value);
    var box = document.getElementById('loginIdentidad');
    var nom = document.getElementById('loginNombreDetectado');
    var rol = document.getElementById('loginRolDetectado');
    var av = document.getElementById('loginAvatar');
    if (!box || !nom) return;

    if (!email || email.indexOf('@') < 0) {
        box.hidden = true;
        return;
    }
    box.hidden = false;

    var users = aulaLoad(AULA_KEYS.users, []);
    var existing = users.find(function(u) { return u.email === email; });
    var nombre = (existing && existing.nombre) ? existing.nombre : (aulaNombreDesdeEmail(email) || email);
    nom.textContent = nombre;
    av.textContent = aulaIniciales(nombre);

    if (!aulaEmailInstitucional(email)) {
        rol.textContent = 'El correo debe ser @' + aulaDominio();
        rol.style.color = '#ff8d8d';
        return;
    }
    rol.style.color = '';
    if (existing) {
        rol.textContent = existing.rol === 'docente' ? 'Cuenta de docente' : 'Cuenta de estudiante';
    } else if (aulaEsDocenteEmail(email)) {
        rol.textContent = 'Docente autorizado — activa tu cuenta en la pestaña «Docente»';
    } else {
        rol.textContent = 'Correo no registrado. Usa la pestaña «Estudiante».';
    }
}

function aulaSugerirNombreRegistro() {
    var email = aulaNormalizarEmail((document.getElementById('regEmail') || {}).value);
    var nombres = document.getElementById('regNombres');
    var apellidos = document.getElementById('regApellidos');
    if (!nombres || !apellidos || !email) return;
    // solo autocompletar si están vacíos
    if (nombres.value.trim() || apellidos.value.trim()) return;
    var full = aulaNombreDesdeEmail(email);
    if (!full) return;
    var parts = full.split(/\s+/);
    if (parts.length === 1) {
        nombres.value = parts[0];
    } else if (parts.length === 2) {
        nombres.value = parts[0];
        apellidos.value = parts[1];
    } else {
        var mid = Math.ceil(parts.length / 2);
        nombres.value = parts.slice(0, mid).join(' ');
        apellidos.value = parts.slice(mid).join(' ');
    }
}


// ---------- Recuperar contraseña ----------
var AULA_RESET_KEY = 'geometrics_reset_codes';

function aulaLoadResets() {
    try {
        return JSON.parse(localStorage.getItem(AULA_RESET_KEY) || '{}');
    } catch (e) {
        return {};
    }
}

function aulaSaveResets(map) {
    localStorage.setItem(AULA_RESET_KEY, JSON.stringify(map));
}

function aulaGenerarCodigo() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function aulaEmailJsListo() {
    return typeof EMAILJS_CONFIG !== 'undefined'
        && EMAILJS_CONFIG.enabled
        && EMAILJS_CONFIG.publicKey
        && EMAILJS_CONFIG.publicKey.indexOf('PEGAR_') !== 0
        && EMAILJS_CONFIG.serviceId
        && EMAILJS_CONFIG.serviceId.indexOf('PEGAR_') !== 0
        && EMAILJS_CONFIG.templateId
        && EMAILJS_CONFIG.templateId.indexOf('PEGAR_') !== 0
        && typeof emailjs !== 'undefined';
}

function aulaMostrarRecupero(show) {
    var forms = ['formLogin', 'formRegistro', 'formDocente'];
    forms.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    document.querySelectorAll('.login-tab').forEach(function(t) { t.classList.remove('active'); });
    var rec = document.getElementById('formRecupero');
    if (!rec) return;
    if (show) {
        rec.classList.add('active');
        document.getElementById('recuperoPaso1').hidden = false;
        document.getElementById('recuperoPaso2').hidden = true;
        document.getElementById('recError').textContent = '';
        document.getElementById('recOk').textContent = '';
        document.getElementById('recCodigo').value = '';
        document.getElementById('recPass').value = '';
        document.getElementById('recPass2').value = '';
        var loginEmail = document.getElementById('loginEmail');
        if (loginEmail && loginEmail.value) {
            document.getElementById('recEmail').value = loginEmail.value;
        }
    } else {
        rec.classList.remove('active');
        var fl = document.getElementById('formLogin');
        if (fl) fl.classList.add('active');
        var tab = document.querySelector('.login-tab[data-login-tab="entrar"]');
        if (tab) tab.classList.add('active');
    }
}

async function aulaEnviarCodigoRecupero() {
    var err = document.getElementById('recError');
    var ok = document.getElementById('recOk');
    err.textContent = '';
    ok.textContent = '';

    var email = aulaNormalizarEmail(document.getElementById('recEmail').value);
    if (!aulaEmailInstitucional(email)) {
        err.textContent = 'Usa un correo @' + aulaDominio();
        return;
    }
    var users = aulaLoad(AULA_KEYS.users, []);
    var user = users.find(function(u) { return u.email === email; });
    if (!user) {
        err.textContent = 'No hay una cuenta registrada con ese correo.';
        return;
    }

    var code = aulaGenerarCodigo();
    var expires = Date.now() + 15 * 60 * 1000;
    var map = aulaLoadResets();
    map[email] = { code: code, expires: expires };
    aulaSaveResets(map);

    var btn = document.getElementById('btnEnviarCodigo');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
        if (aulaEmailJsListo()) {
            emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
            await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
                // compatibles con plantilla One-Time Password de EmailJS
                email: email,
                to_email: email,
                user_name: user.nombre || email,
                passcode: code,
                code: code,
                time: '15 minutos'
            });
            ok.textContent = 'Código enviado a ' + email + '. Revisa tu bandeja (y spam). Válido 15 minutos.';
        } else {
            // Modo prueba: el navegador no puede enviar correos solo
            ok.textContent = 'Modo prueba (EmailJS no configurado). Tu código es: ' + code + ' (válido 15 min). Configura EMAILJS_CONFIG en el panel Administrador para enviarlo al correo real.';
        }
        document.getElementById('recuperoPaso1').hidden = true;
        document.getElementById('recuperoPaso2').hidden = false;
    } catch (e) {
        err.textContent = 'No se pudo enviar el correo. ' + (e && e.text ? e.text : (e.message || String(e)));
        // Aun así permitir continuar en prueba si se generó código
        if (!aulaEmailJsListo()) {
            document.getElementById('recuperoPaso1').hidden = true;
            document.getElementById('recuperoPaso2').hidden = false;
            ok.textContent = 'Código de prueba: ' + code;
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'ENVIAR CÓDIGO'; }
    }
}

function aulaRestablecerPassword() {
    var err = document.getElementById('recError');
    var ok = document.getElementById('recOk');
    err.textContent = '';
    ok.textContent = '';

    var email = aulaNormalizarEmail(document.getElementById('recEmail').value);
    var codigo = String(document.getElementById('recCodigo').value || '').trim();
    var pass = document.getElementById('recPass').value || '';
    var pass2 = document.getElementById('recPass2').value || '';

    var map = aulaLoadResets();
    var entry = map[email];
    if (!entry) {
        err.textContent = 'No hay un código activo. Solicita uno de nuevo.';
        return;
    }
    if (Date.now() > entry.expires) {
        delete map[email];
        aulaSaveResets(map);
        err.textContent = 'El código expiró. Solicita uno nuevo.';
        return;
    }
    if (codigo !== String(entry.code)) {
        err.textContent = 'Código incorrecto.';
        return;
    }
    if (pass.length < 6) {
        err.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
        return;
    }
    if (pass !== pass2) {
        err.textContent = 'Las contraseñas no coinciden.';
        return;
    }

    var users = aulaLoad(AULA_KEYS.users, []);
    var idx = users.findIndex(function(u) { return u.email === email; });
    if (idx < 0) {
        err.textContent = 'Cuenta no encontrada.';
        return;
    }
    users[idx].password = pass;
    aulaSave(AULA_KEYS.users, users);
    delete map[email];
    aulaSaveResets(map);

    ok.textContent = 'Contraseña actualizada. Ya puedes iniciar sesión.';
    setTimeout(function() {
        aulaMostrarRecupero(false);
        var loginEmail = document.getElementById('loginEmail');
        if (loginEmail) loginEmail.value = email;
    }, 1200);
}

// ---------- Login / Registro local ----------
function aulaInitLogin() {
    try {
        if (window.GeoCloud && GeoCloud.isOn()) {
            GeoCloud.syncDown().then(function () {
                try { if (typeof aulaSeed === 'function') aulaSeed(); } catch (e) {}
            });
        }
    } catch (e) {}

    aulaSeed();

    function aulaBindPasswordToggles(root) {
        (root || document).querySelectorAll('.btn-toggle-pass').forEach(function(btn) {
            if (btn.dataset.bound === '1') return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var id = btn.getAttribute('data-pass-target');
                var input = document.getElementById(id);
                if (!input) {
                    input = btn.parentElement ? btn.parentElement.querySelector('input') : null;
                }
                if (!input) return;
                var show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.textContent = show ? '🙉' : '🙈';
                btn.title = show ? 'Ocultar contraseña' : 'Mostrar contraseña';
                btn.setAttribute('aria-label', btn.title);
            });
        });
    }
    aulaBindPasswordToggles(document);
    // Por si las pestañas se muestran después
    document.querySelectorAll('.login-tab, .tab-login, [data-tab]').forEach(function(tab) {
        tab.addEventListener('click', function() {
            setTimeout(function() { aulaBindPasswordToggles(document); }, 50);
        });
    });

    // Materias: habilitar grupo al marcar (estudiante)
    document.querySelectorAll('input[name="regMat"]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var inp = document.querySelector('.reg-grupo-input[data-mat="' + cb.value + '"]');
            if (inp) {
                inp.disabled = !cb.checked;
                if (!cb.checked) inp.value = '';
            }
        });
    });
    // Materias que dicta (docente) — grupos separados por comas
    document.querySelectorAll('input[name="docMat"]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var inp = document.querySelector('.doc-grupo-input[data-mat="' + cb.value + '"]');
            if (inp) {
                inp.disabled = !cb.checked;
                if (!cb.checked) inp.value = '';
            }
        });
    });
    aulaNombresAleatorios();


    var btnOlvido = document.getElementById('btnOlvidoPass');
    if (btnOlvido) {
        btnOlvido.addEventListener('click', function() {
            aulaMostrarRecupero(true);
        });
    }
    var btnVolverLogin = document.getElementById('btnVolverLogin');
    if (btnVolverLogin) {
        btnVolverLogin.addEventListener('click', function() {
            aulaMostrarRecupero(false);
        });
    }
    var btnEnviarCodigo = document.getElementById('btnEnviarCodigo');
    if (btnEnviarCodigo) {
        btnEnviarCodigo.addEventListener('click', function() {
            aulaEnviarCodigoRecupero();
        });
    }
    var btnReenviar = document.getElementById('btnReenviarCodigo');
    if (btnReenviar) {
        btnReenviar.addEventListener('click', function() {
            document.getElementById('recuperoPaso1').hidden = false;
            document.getElementById('recuperoPaso2').hidden = true;
            document.getElementById('recError').textContent = '';
            document.getElementById('recOk').textContent = '';
        });
    }
    var btnRestablecer = document.getElementById('btnRestablecer');
    if (btnRestablecer) {
        btnRestablecer.addEventListener('click', function() {
            aulaRestablecerPassword();
        });
    }


    document.querySelectorAll('.login-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.login-tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            var which = tab.getAttribute('data-login-tab');
            var fl = document.getElementById('formLogin');
            var fr = document.getElementById('formRegistro');
            var fd = document.getElementById('formDocente');
            if (fl) fl.classList.toggle('active', which === 'entrar');
            if (fr) fr.classList.toggle('active', which === 'registro');
            if (fd) fd.classList.toggle('active', which === 'docente');
            var frec = document.getElementById('formRecupero');
            if (frec) frec.classList.remove('active');
            ['loginError', 'regError', 'docError'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.textContent = '';
            });
        });
    });

    var loginEmail = document.getElementById('loginEmail');
    if (loginEmail) {
        loginEmail.addEventListener('input', aulaActualizarIdentidadLogin);
        loginEmail.addEventListener('blur', aulaActualizarIdentidadLogin);
    }

    var regEmail = document.getElementById('regEmail');
    if (regEmail) {
        regEmail.addEventListener('blur', aulaSugerirNombreRegistro);
        regEmail.addEventListener('change', aulaSugerirNombreRegistro);
    }

    var formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', function(e) {
            e.preventDefault();
            var email = aulaNormalizarEmail(document.getElementById('loginEmail').value);
            var pass = document.getElementById('loginPass').value || '';
            var err = document.getElementById('loginError');
            err.textContent = '';

            if (!aulaEmailInstitucional(email)) {
                err.textContent = 'Debes usar un correo @' + aulaDominio();
                return;
            }
            var users = aulaLoad(AULA_KEYS.users, []);
            var existing = users.find(function(u) { return u.email === email; });
            var user = users.find(function(u) { return u.email === email && u.password === pass; });
            if (!user) {
                if (aulaEsDocenteEmail(email) && !existing) {
                    err.textContent = 'Docente sin contraseña aún. Ve a la pestaña «Docente» y activa tu cuenta.';
                } else if (aulaEsDocenteEmail(email) && existing) {
                    err.textContent = 'Contraseña incorrecta.';
                } else if (!existing) {
                    err.textContent = 'Correo no registrado. Si eres estudiante, usa la pestaña «Estudiante».';
                } else {
                    err.textContent = 'Contraseña incorrecta.';
                }
                return;
            }
            // rol fijo: whitelist docente tiene prioridad
            if (aulaEsDocenteEmail(email)) user.rol = 'docente';
            user = aulaUsuarioCompleto(user) || user;
            aulaSetSession(user);
            aulaEnterApp(user);
        });
    }

    var formReg = document.getElementById('formRegistro');
    if (formReg) {
        formReg.addEventListener('submit', function(e) {
            e.preventDefault();
            var err = document.getElementById('regError');
            err.textContent = '';

            var email = aulaNormalizarEmail(document.getElementById('regEmail').value);
            var nombres = (document.getElementById('regNombres').value || '').trim();
            var apellidos = (document.getElementById('regApellidos').value || '').trim();
            var pass = document.getElementById('regPass').value || '';
            var pass2 = document.getElementById('regPass2').value || '';
            var materias = [];
            document.querySelectorAll('input[name="regMat"]:checked').forEach(function(cb) {
                var gInput = document.querySelector('.reg-grupo-input[data-mat="' + cb.value + '"]');
                var g = gInput ? (gInput.value || '').trim() : '';
                materias.push({ nombre: cb.value, grupo: g });
            });

            if (!aulaEmailInstitucional(email)) {
                err.textContent = 'Solo se permiten correos @' + aulaDominio();
                return;
            }
            if (aulaEsDocenteEmail(email)) {
                err.textContent = 'Ese correo está reservado para docentes. Usa Iniciar sesión.';
                return;
            }
            if (nombres.length < 2) {
                err.textContent = 'Ingresa tus nombres.';
                return;
            }
            if (apellidos.length < 2) {
                err.textContent = 'Ingresa tus apellidos.';
                return;
            }
            if (pass.length < 6) {
                err.textContent = 'La contraseña debe tener al menos 6 caracteres.';
                return;
            }
            if (pass !== pass2) {
                err.textContent = 'Las contraseñas no coinciden.';
                return;
            }
            if (!materias.length) {
                err.textContent = 'Selecciona al menos una materia.';
                return;
            }
            for (var mi = 0; mi < materias.length; mi++) {
                if (!materias[mi].grupo) {
                    err.textContent = 'Indica el grupo de: ' + materias[mi].nombre;
                    return;
                }
            }

            var users = aulaLoad(AULA_KEYS.users, []);
            if (users.some(function(u) { return u.email === email; })) {
                err.textContent = 'Ese correo ya está registrado. Usa Iniciar sesión.';
                return;
            }

            var codigo = (document.getElementById('regCodigo') && document.getElementById('regCodigo').value || '').trim();
            if (!codigo || codigo.length < 4) {
                err.textContent = 'Ingresa tu código estudiantil (mínimo 4 caracteres).';
                return;
            }
            var user = {
                id: aulaUid(),
                nombre: nombres + ' ' + apellidos,
                nombres: nombres,
                apellidos: apellidos,
                codigo: codigo,
                email: email,
                password: pass,
                rol: 'estudiante',
                materias: materias,
                materia: materias[0].nombre,
                grupo: materias[0].grupo,
                foto: ''
            };
            users.push(user);
            aulaSave(AULA_KEYS.users, users);
            aulaSetSession(user);
            aulaEnterApp(user);
        });
    }

    var formDoc = document.getElementById('formDocente');
    if (formDoc) {
        formDoc.addEventListener('submit', function(e) {
            e.preventDefault();
            var err = document.getElementById('docError');
            err.textContent = '';

            var email = aulaNormalizarEmail(document.getElementById('docEmail').value);
            var nombres = (document.getElementById('docNombres').value || '').trim();
            var apellidos = (document.getElementById('docApellidos').value || '').trim();
            var pass = document.getElementById('docPass').value || '';
            var pass2 = document.getElementById('docPass2').value || '';

            if (!aulaEmailInstitucional(email)) {
                err.textContent = 'Solo correos @' + aulaDominio();
                return;
            }
            if (!aulaEsDocenteEmail(email)) {
                err.textContent = 'Este correo no está autorizado como docente. Un administrador debe agregarlo desde el panel Administrador.';
                return;
            }
            if (nombres.length < 2 || apellidos.length < 2) {
                err.textContent = 'Completa nombres y apellidos.';
                return;
            }
            if (pass.length < 6) {
                err.textContent = 'La contraseña debe tener al menos 6 caracteres.';
                return;
            }
            if (pass !== pass2) {
                err.textContent = 'Las contraseñas no coinciden.';
                return;
            }

            // Materias y grupos que dicta (varios grupos por comas)
            var materiasDoc = [];
            document.querySelectorAll('input[name="docMat"]:checked').forEach(function(cb) {
                var inp = document.querySelector('.doc-grupo-input[data-mat="' + cb.value + '"]');
                var raw = inp ? (inp.value || '').trim() : '';
                var grupos = aulaParseGrupos(raw);
                materiasDoc.push({
                    nombre: cb.value,
                    grupo: grupos.join(', '),
                    grupos: grupos
                });
            });
            if (!materiasDoc.length) {
                err.textContent = 'Selecciona al menos una materia que dictas.';
                return;
            }
            for (var di = 0; di < materiasDoc.length; di++) {
                if (!materiasDoc[di].grupos.length) {
                    err.textContent = 'Indica al menos un grupo para: ' + materiasDoc[di].nombre + ' (ej. A, B)';
                    return;
                }
            }

            var users = aulaLoad(AULA_KEYS.users, []);
            var idx = users.findIndex(function(u) { return aulaNormalizarEmail(u.email) === email; });
            var user;
            if (idx >= 0) {
                var existing = users[idx];
                if (existing.rol === 'docente' && !existing.mustSetPassword) {
                    err.textContent = 'Esta cuenta docente ya está registrada. Usa Iniciar sesión.';
                    return;
                }
                user = existing;
                user.nombre = nombres + ' ' + apellidos;
                user.nombres = nombres;
                user.apellidos = apellidos;
                user.password = pass;
                user.rol = 'docente';
                user.materias = materiasDoc;
                user.materia = materiasDoc[0].nombre;
                user.grupo = materiasDoc[0].grupo;
                user.mustSetPassword = false;
                users[idx] = user;
            } else {
                user = {
                    id: aulaUid(),
                    nombre: nombres + ' ' + apellidos,
                    nombres: nombres,
                    apellidos: apellidos,
                    email: email,
                    password: pass,
                    rol: 'docente',
                    materias: materiasDoc,
                    materia: materiasDoc[0].nombre,
                    grupo: materiasDoc[0].grupo,
                    foto: ''
                };
                users.push(user);
            }
            // Guardar nombre en la lista de autorizados para el panel admin
            try {
                var extra = aulaDocentesExtraLoad();
                var foundE = false;
                extra = extra.map(function(item) {
                    var em = typeof item === 'string' ? item : (item && item.email);
                    if (aulaNormalizarEmail(em) === email) {
                        foundE = true;
                        if (typeof item === 'string') return { email: email, nombre: user.nombre };
                        item.nombre = user.nombre;
                        return item;
                    }
                    return item;
                });
                if (!foundE && aulaDocentesBase().indexOf(email) < 0) {
                    extra.push({ email: email, nombre: user.nombre });
                }
                aulaDocentesExtraSave(extra);
            } catch (e) {}
            aulaSave(AULA_KEYS.users, users);
            aulaSetSession(user);
            aulaEnterApp(user);
        });
    }

    // Restaurar sesión si existe (F5 no cierra sesión ni saca del panel)
    try {
        var session = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
        if (session && session.email) {
            var go = function() {
                var full = typeof aulaUsuarioCompleto === 'function' ? (aulaUsuarioCompleto(session) || session) : session;
                // Reafirmar sesión completa
                if (typeof aulaSetSession === 'function') aulaSetSession(full);
                if (typeof aulaEnterApp === 'function') aulaEnterApp(full);
                setTimeout(function() {
                    var last = null;
                    try {
                        last = sessionStorage.getItem('geometrics_last_pantalla')
                            || localStorage.getItem('geometrics_last_pantalla');
                    } catch (e2) {}
                    if (!last || last === 'inicio') return;
                    if (last === 'docente' || last === 'estudiante') {
                        if (typeof aulaOpenPanel === 'function') aulaOpenPanel();
                        return;
                    }
                    if (typeof mostrarPantalla === 'function') {
                        mostrarPantalla(last);
                        // mostrarPantalla capitaliza; paneles especiales
                        if (last === 'docente' || last === 'estudiante') {
                            if (typeof aulaOpenPanel === 'function') aulaOpenPanel();
                        }
                    }
                }, 120);
            };
            if (window.GeoCloud && GeoCloud.isOn()) {
                GeoCloud.syncDown().then(go).catch(go);
            } else {
                go();
            }
        }
    } catch (e) {}
}

function aulaEnterApp(user) {
    if (typeof mostrarPantalla === 'function') {
        mostrarPantalla('menu');
    } else {
        document.getElementById('pantallaInicio').style.display = 'none';
        document.getElementById('pantallaMenu').style.display = 'block';
    }
    aulaUpdateMenuUser(user);
}

function aulaUpdateMenuUser(user) {
    user = user || aulaGetSession();
    var info = document.getElementById('menuUserInfo');
    var saludo = document.getElementById('menuSaludoTexto');
    var avatar = document.getElementById('menuUserAvatar');
    if (user) {
        var nombre = (user.nombre || '').trim() || 'Usuario';
        if (user.rol === 'docente') {
            if (saludo) saludo.textContent = 'Bienvenido Ingeniero ' + nombre;
            if (info) info.textContent = 'Docente · Gestiona tu aula y materiales.';
        } else {
            if (saludo) saludo.textContent = 'Bienvenido futuro Ingeniero ' + nombre;
            if (info) {
                var mats = aulaNombresMaterias(user);
                info.textContent = mats.length
                    ? ('Estudiante · ' + mats.join(', '))
                    : 'Selecciona el área que deseas explorar.';
            }
        }
        aulaSetAvatarEl(avatar, user, aulaIniciales(nombre));
        aulaActualizarMenuMaterias(user);
    } else if (saludo) {
        saludo.textContent = 'Bienvenido';
        aulaSetAvatarEl(avatar, null, '?');
    }

    var btnAula = document.getElementById('btnAula');
    if (btnAula && user) {
        btnAula.textContent = user.rol === 'docente' ? '📚 Panel docente' : '📚 Mi aula';
    }
    var btnAdm = document.getElementById('btnAdminPanel');
    if (btnAdm) {
        try {
            var isAdm = !!(user && typeof aulaEsAdminEmail === 'function' && aulaEsAdminEmail(user.email));
            btnAdm.hidden = !isAdm;
        } catch (e) { btnAdm.hidden = true; }
    }
}

function aulaLogout() {
    aulaSetSession(null);
    if (typeof mostrarPantalla === 'function') mostrarPantalla('inicio');
    var formLogin = document.getElementById('formLogin');
    var formReg = document.getElementById('formRegistro');
    var formDoc = document.getElementById('formDocente');
    if (formLogin) formLogin.reset();
    if (formReg) formReg.reset();
    if (formDoc) formDoc.reset();
    var idBox = document.getElementById('loginIdentidad');
    if (idBox) idBox.hidden = true;
    var le = document.getElementById('loginError');
    var re = document.getElementById('regError');
    if (le) le.textContent = '';
    if (re) re.textContent = '';
}


function aulaOpenPanel() {
    var user = aulaRequireSession();
    if (!user) return;
    try {
        localStorage.setItem('geometrics_last_pantalla', user.rol === 'docente' ? 'docente' : 'estudiante');
        sessionStorage.setItem('geometrics_last_pantalla', user.rol === 'docente' ? 'docente' : 'estudiante');
    } catch (e) {}
    if (user.rol === 'docente') {
        if (typeof mostrarPantalla === 'function') {
            try { mostrarPantalla('docente'); } catch (e) {}
        }
        document.querySelectorAll('main').forEach(function(m) { m.style.display = 'none'; });
        var el = document.getElementById('pantallaDocente');
        if (el) el.style.display = 'block';
        var sub = document.getElementById('docenteSubtitulo');
        if (sub) sub.textContent = 'Hola, ' + user.nombre + '. Publica tareas y revisa entregas.';
        aulaSetAvatarEl(document.getElementById('docIconoAula'), user, '👩‍🏫');
        if (typeof activarTabsSeccion === 'function') activarTabsSeccion('pantallaDocente');
        aulaRenderDocente();
    } else {
        document.querySelectorAll('main').forEach(function(m) { m.style.display = 'none'; });
        var el2 = document.getElementById('pantallaEstudiante');
        if (el2) el2.style.display = 'block';
        var sub2 = document.getElementById('estudianteSubtitulo');
        if (sub2) {
            var mats = aulaNombresMaterias(user);
            sub2.textContent = user.nombre + (mats.length ? (' · ' + mats.join(', ')) : '');
        }
        aulaSetAvatarEl(document.getElementById('estIconoAula'), user, '🎓');
        // permitir precarga limpia de filtros al entrar al aula
        var fm = document.getElementById('estFiltroMateria');
        var fg = document.getElementById('estFiltroGrupo');
        if (fm) delete fm.dataset.iniciado;
        if (fg) delete fg.dataset.iniciado;
        if (typeof activarTabsSeccion === 'function') activarTabsSeccion('pantallaEstudiante');
        aulaRenderEstudiante();
    }
    window.scrollTo(0, 0);
}

// ---------- Docente ----------
function aulaRenderDocente() {
    try { if (typeof aulaChatBind === "function") aulaChatBind(); if (typeof aulaChatUpdateBadges === "function") aulaChatUpdateBadges(); } catch (e) {}
    aulaActualizarResumenDocente();
    aulaRenderTareasDocente();
    aulaRenderPresDocente();
    aulaRenderEstudiantes();
    aulaRenderEntregasDocente();
    try { if (typeof aulaRenderIntegrantesDocente === 'function') aulaRenderIntegrantesDocente(); } catch (e) {}
}

function aulaActualizarResumenDocente() {
    var user = aulaGetSession();
    if (!user) return;
    var tareas = aulaLoad(AULA_KEYS.tareas, []).filter(function(t) { return t.docenteId === user.id; });
    var ids = {};
    tareas.forEach(function(t) { ids[t.id] = true; });
    var entregas = aulaLoad(AULA_KEYS.entregas, []).filter(function(e) { return ids[e.tareaId]; });
    var pendientes = entregas.filter(function(e) { return e.nota == null || e.nota === ''; }).length;
    var estudiantes = aulaLoad(AULA_KEYS.users, []).filter(function(u) { return u.rol === 'estudiante'; }).length;

    var el = function(id, val) { var n = document.getElementById(id); if (n) n.textContent = String(val); };
    el('kpiTareas', tareas.length);
    el('kpiEstudiantes', estudiantes);
    el('kpiEntregas', entregas.length);
    el('kpiPendientes', pendientes);

    var badge = document.getElementById('badgeEntregas');
    if (badge) {
        if (pendientes > 0) {
            badge.hidden = false;
            badge.textContent = String(pendientes);
        } else {
            badge.hidden = true;
        }
    }
}

function aulaRenderTareasDocente() {
    var box = document.getElementById('listaTareasDocente');
    if (!box) return;
    var user = aulaGetSession();
    var mat = (document.getElementById('filtroMateriaTareas') || {}).value || '';
    var grp = ((document.getElementById('filtroGrupoTareas') || {}).value || '').trim().toLowerCase();

    var tareas = aulaLoad(AULA_KEYS.tareas, []).filter(function(t) { return t.docenteId === user.id; });
    if (mat) tareas = tareas.filter(function(t) { return t.materia === mat; });
    if (grp) tareas = tareas.filter(function(t) { return aulaNormGrupo(t.grupo) === grp || !t.grupo; });

    if (!tareas.length) {
        box.innerHTML = '<p class="aula-vacio">Aún no has publicado tareas' + (mat || grp ? ' con ese filtro' : '') + '.</p>';
        return;
    }
    box.innerHTML = tareas.slice().reverse().map(function(t) {
        return '<div class="aula-item">' +
            '<strong>' + aulaEsc(t.titulo) + '</strong>' +
            '<p>' + aulaEsc(t.descripcion || '') + '</p>' +
            '<small>' + aulaEsc(t.materia) + ' · Grupo ' + aulaEsc(t.grupo || 'Todos') +
            ' · Límite: ' + aulaEsc(t.fechaLimite || '—') + (t.horaLimite ? (' ' + aulaEsc(t.horaLimite)) : '') + '</small>' +
            '<div class="aula-item-acciones">' +
            '<button type="button" class="btn-item-edit" data-edit-tarea="' + t.id + '">Editar</button>' +
            '<button type="button" class="btn-item-del" data-del-tarea="' + t.id + '">Eliminar</button>' +
            '</div></div>';
    }).join('');

    box.querySelectorAll('[data-del-tarea]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (!confirm('¿Eliminar esta tarea? También se ocultará para los estudiantes.')) return;
            var id = btn.getAttribute('data-del-tarea');
            var list = aulaLoad(AULA_KEYS.tareas, []).filter(function(t) { return t.id !== id; });
            aulaSave(AULA_KEYS.tareas, list);
            aulaRenderDocente();
        });
    });
    box.querySelectorAll('[data-edit-tarea]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-edit-tarea');
            var t = aulaLoad(AULA_KEYS.tareas, []).find(function(x) { return x.id === id; });
            if (!t) return;
            document.getElementById('tareaEditId').value = t.id;
            document.getElementById('tareaTitulo').value = t.titulo || '';
            document.getElementById('tareaDesc').value = t.descripcion || '';
            document.getElementById('tareaMateria').value = t.materia || 'Mecánica de Suelos I';
            document.getElementById('tareaGrupo').value = t.grupo || '';
            document.getElementById('tareaFecha').value = t.fechaLimite || '';
            var th = document.getElementById('tareaHora'); if (th) th.value = t.horaLimite || '';
            document.getElementById('formTareaTitulo').textContent = 'Editar tarea';
            document.getElementById('btnCrearTarea').textContent = 'GUARDAR CAMBIOS';
            var cancel = document.getElementById('btnCancelarEditTarea');
            if (cancel) cancel.hidden = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function aulaCancelarEditTarea() {
    document.getElementById('tareaEditId').value = '';
    document.getElementById('tareaTitulo').value = '';
    document.getElementById('tareaDesc').value = '';
    document.getElementById('tareaGrupo').value = '';
    document.getElementById('tareaFecha').value = '';
    var th2 = document.getElementById('tareaHora'); if (th2) th2.value = '';
    document.getElementById('formTareaTitulo').textContent = 'Publicar tarea';
    document.getElementById('btnCrearTarea').textContent = 'PUBLICAR TAREA';
    var cancel = document.getElementById('btnCancelarEditTarea');
    if (cancel) cancel.hidden = true;
    var err = document.getElementById('tareaError');
    if (err) err.textContent = '';
}

function aulaCrearTarea() {
    var user = aulaRequireSession();
    if (!user || user.rol !== 'docente') return;
    var err = document.getElementById('tareaError');
    err.textContent = '';
    var editId = (document.getElementById('tareaEditId') || {}).value || '';
    var titulo = (document.getElementById('tareaTitulo').value || '').trim();
    var desc = (document.getElementById('tareaDesc').value || '').trim();
    var materia = document.getElementById('tareaMateria').value;
    var grupo = (document.getElementById('tareaGrupo').value || '').trim();
    var fecha = document.getElementById('tareaFecha').value || '';
    var hora = (document.getElementById('tareaHora') || {}).value || '';
    if (!titulo) { err.textContent = 'Escribe un título.'; return; }

    var tareas = aulaLoad(AULA_KEYS.tareas, []);
    if (editId) {
        var idx = tareas.findIndex(function(t) { return t.id === editId; });
        if (idx >= 0) {
            tareas[idx].titulo = titulo;
            tareas[idx].descripcion = desc;
            tareas[idx].materia = materia;
            tareas[idx].grupo = grupo;
            tareas[idx].fechaLimite = fecha;
            tareas[idx].horaLimite = hora;
        }
    } else {
        tareas.push({
            id: aulaUid(),
            titulo: titulo,
            descripcion: desc,
            materia: materia,
            grupo: grupo,
            fechaLimite: fecha,
            horaLimite: hora,
            docenteId: user.id,
            docenteNombre: user.nombre,
            creada: new Date().toISOString()
        });
    }
    aulaSave(AULA_KEYS.tareas, tareas);
    aulaCancelarEditTarea();
    aulaRenderDocente();
}

function aulaRenderPresDocente() {
    var box = document.getElementById('listaPresDocente');
    if (!box) return;
    var user = aulaGetSession();
    var list = aulaLoad(AULA_KEYS.presentaciones, []).filter(function(p) { return p.docenteId === user.id; });
    if (!list.length) {
        box.innerHTML = '<p class="aula-vacio">No hay presentaciones cargadas.</p>';
        return;
    }
    box.innerHTML = list.slice().reverse().map(function(p) {
        return '<div class="aula-item">' +
            '<strong>' + aulaEsc(p.titulo) + '</strong>' +
            '<p>' + aulaEsc(p.materia) + ' · Grupo ' + aulaEsc(p.grupo || 'Todos') + '</p>' +
            '<small>' + aulaEsc(p.fileName) + ' · ' + aulaFormatDate(p.creada) + '</small>' +
            '<div class="aula-item-acciones">' +
            (p.data ? '<a class="btn-descarga" download="' + aulaEsc(p.fileName) + '" href="' + p.data + '">Descargar</a>' : '') +
            ' <button type="button" class="btn-item-del" data-del-pres="' + p.id + '">Eliminar</button>' +
            '</div></div>';
    }).join('');
    box.querySelectorAll('[data-del-pres]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (!confirm('¿Eliminar esta presentación?')) return;
            var id = btn.getAttribute('data-del-pres');
            var list2 = aulaLoad(AULA_KEYS.presentaciones, []).filter(function(p) { return p.id !== id; });
            aulaSave(AULA_KEYS.presentaciones, list2);
            aulaRenderPresDocente();
            aulaActualizarResumenDocente();
        });
    });
}


function aulaSubirPres() {
    var user = aulaRequireSession();
    if (!user || user.rol !== 'docente') return;
    var err = document.getElementById('presError');
    if (err) err.textContent = '';
    var titulo = (document.getElementById('presTitulo').value || '').trim();
    var materia = document.getElementById('presMateria').value;
    var grupo = (document.getElementById('presGrupo').value || '').trim();
    var fileInput = document.getElementById('presArchivo');
    if (!titulo) {
        if (err) err.textContent = 'Escribe un título.';
        return;
    }
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        if (err) err.textContent = 'Selecciona un archivo.';
        return;
    }
    var file = fileInput.files[0];
    // Permitir hasta ~4MB; avisar si es muy grande
    if (file.size > 100 * 1024 * 1024) {
        if (err) err.textContent = 'El archivo supera 100 MB.';
        return;
    }
    aulaReadFileAsDataURL(file, 105 * 1024 * 1024).then(function(fileData) {
        var list = aulaLoad(AULA_KEYS.presentaciones, []);
        list.push({
            id: aulaUid(),
            titulo: titulo,
            materia: materia,
            grupo: grupo,
            docenteId: user.id,
            docenteNombre: user.nombre,
            fileName: fileData.name,
            data: fileData.data,
            creada: new Date().toISOString()
        });
        try {
            aulaSave(AULA_KEYS.presentaciones, list);
        } catch (e) {
            if (err) err.textContent = 'No se pudo guardar (almacenamiento lleno). Reduce el tamaño del archivo.';
            return;
        }
        document.getElementById('presTitulo').value = '';
        document.getElementById('presGrupo').value = '';
        fileInput.value = '';
        if (err) err.textContent = '';
        aulaRenderPresDocente();
        if (typeof aulaActualizarResumenDocente === 'function') aulaActualizarResumenDocente();
        alert('Presentación subida correctamente.');
    }).catch(function(e) {
        if (err) err.textContent = (e && e.message) ? e.message : 'Error al leer el archivo';
    });
}

function aulaRenderEstudiantes() {
    var box = document.getElementById('listaEstudiantes');
    if (!box) return;
    box.innerHTML = '<p class="aula-vacio">Cargando estudiantes…</p>';

    function pintar() {
    var materia = (document.getElementById('filtroMateriaEst') || {}).value || '';
    var grupo = ((document.getElementById('filtroGrupoEst') || {}).value || '').trim();
    var docUser = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
    var students = aulaLoad(AULA_KEYS.users, []).filter(function(u) {
        return u && u.rol === 'estudiante' && u.email;
    });
    // Si el docente tiene materias, por defecto mostrar alumnos de esas materias
    if (!materia && docUser && docUser.rol === 'docente') {
        var docMats = typeof aulaNombresMaterias === 'function' ? aulaNombresMaterias(docUser) : [];
        if (docMats.length) {
            students = students.filter(function(u) {
                return docMats.some(function(nm) {
                    return typeof aulaUsuarioCoincideMateriaGrupo === 'function'
                        ? aulaUsuarioCoincideMateriaGrupo(u, nm, '')
                        : true;
                });
            });
        }
    }
    if (materia || grupo) {
        students = students.filter(function(u) {
            return aulaUsuarioCoincideMateriaGrupo(u, materia, grupo);
        });
    }
    if (!students.length) {
        box.innerHTML = '<p class="aula-vacio">No hay estudiantes registrados' + ((materia || grupo) ? ' con ese filtro' : '') + '.</p>';
        return;
    }
    // Columnas: si hay filtro de materia, solo mostrar esa materia + su grupo
    var colMateria = materia ? 'Materia' : 'Materias';
    var colGrupo = 'Grupo';
    box.innerHTML = '<table class="aula-tabla"><thead><tr><th></th><th>Nombre</th><th>Correo</th><th>' + colMateria + '</th><th>' + colGrupo + '</th></tr></thead><tbody>' +
        students.map(function(s) {
            var mats = aulaMateriasUsuario(s);
            var matStr, grpStr;
            if (materia) {
                var found = mats.find(function(m) { return m.nombre === materia; });
                matStr = materia;
                grpStr = found ? (found.grupo || '—') : (s.grupo || '—');
                if (grupo) grpStr = grupo; // el filtro de grupo ya limitó la lista
            } else {
                matStr = mats.map(function(m) { return m.nombre; }).join(', ') || (s.materia || '—');
                grpStr = mats.map(function(m) { return (m.grupo || '—'); }).join(', ') || (s.grupo || '—');
            }
            var foto = s.foto
                ? '<img class="tabla-foto" src="' + s.foto + '" alt="">'
                : '<span class="tabla-foto tabla-foto-ini">' + aulaEsc(aulaIniciales(s.nombre)) + '</span>';
            return '<tr><td>' + foto + '</td><td>' + aulaEsc(s.nombre) + '</td><td>' + aulaEsc(s.email) + '</td><td>' +
                aulaEsc(matStr) + '</td><td>' + aulaEsc(grpStr) + '</td></tr>';
        }).join('') + '</tbody></table>';

    }
    if (window.GeoCloud && GeoCloud.isOn() && typeof GeoCloud.pullUsersAndApply === 'function') {
        GeoCloud.pullUsersAndApply().then(pintar).catch(pintar);
    } else {
        pintar();
    }
}

function aulaGuardarCalificacion(id, box) {
    var notaEl = box.querySelector('.input-nota[data-nota-id="' + id + '"]');
    var comEl = box.querySelector('.input-comentario-doc[data-com-id="' + id + '"]');
    var nota = notaEl ? notaEl.value : '';
    var com = comEl ? comEl.value : '';
    if (nota === '' || isNaN(Number(nota))) {
        alert('Ingresa una nota numérica (0 a 5).');
        return;
    }
    var n = Number(nota);
    if (n < 0 || n > 5) {
        alert('La nota debe estar entre 0 y 5.');
        return;
    }
    var list = aulaLoad(AULA_KEYS.entregas, []);
    var i = list.findIndex(function(x) { return x.id === id; });
    if (i < 0) {
        alert('No se encontró la entrega.');
        return;
    }
    list[i].nota = n;
    list[i].comentarioDocente = com;
    list[i].calificadaEn = new Date().toISOString();
    aulaSave(AULA_KEYS.entregas, list);
    aulaRenderEntregasDocente();
    if (typeof aulaActualizarResumenDocente === 'function') aulaActualizarResumenDocente();
}


/** Extrae texto de comentario + archivo (.txt o PDF con pdf.js). */
function aulaDataUrlToUint8(dataUrl) {
    try {
        var b64 = String(dataUrl).split('base64,')[1];
        if (!b64) return null;
        var bin = atob(b64);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return arr;
    } catch (e) { return null; }
}

function aulaLoadPdfJs() {
    return new Promise(function(resolve, reject) {
        if (window.pdfjsLib) return resolve(window.pdfjsLib);
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = function() {
            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(window.pdfjsLib);
            } else reject(new Error('pdf.js no cargó'));
        };
        s.onerror = function() { reject(new Error('No se pudo cargar pdf.js')); };
        document.head.appendChild(s);
    });
}

function aulaExtraerTextoDeDataUrl(dataUrl, fileName) {
    return new Promise(function(resolve) {
        if (!dataUrl) return resolve('');
        var name = String(fileName || '').toLowerCase();
        var isText = /\.(txt|md|csv|json|log|py|js|html|css|tex)$/i.test(name) ||
            String(dataUrl).indexOf('data:text/') === 0;
        if (isText) {
            try {
                var raw = dataUrl;
                if (raw.indexOf('base64,') >= 0) {
                    var b64 = raw.split('base64,')[1] || '';
                    var bin = atob(b64);
                    try { resolve(decodeURIComponent(escape(bin))); }
                    catch (e1) { resolve(bin); }
                } else if (raw.indexOf(',') >= 0) {
                    resolve(decodeURIComponent(raw.split(',').slice(1).join(',') || ''));
                } else resolve('');
            } catch (e2) { resolve(''); }
            return;
        }
        if (/\.pdf$/i.test(name) || String(dataUrl).indexOf('application/pdf') >= 0) {
            var bytes = aulaDataUrlToUint8(dataUrl);
            if (!bytes) return resolve('');
            aulaLoadPdfJs().then(function(pdfjsLib) {
                return pdfjsLib.getDocument({ data: bytes }).promise;
            }).then(function(pdf) {
                var maxPages = Math.min(pdf.numPages || 1, 15);
                var parts = [];
                var chain = Promise.resolve();
                for (var p = 1; p <= maxPages; p++) {
                    (function(pageNum) {
                        chain = chain.then(function() {
                            return pdf.getPage(pageNum).then(function(page) {
                                return page.getTextContent().then(function(tc) {
                                    var line = (tc.items || []).map(function(it) { return it.str; }).join(' ');
                                    parts.push(line);
                                });
                            });
                        });
                    })(p);
                }
                return chain.then(function() { return parts.join('\n'); });
            }).then(function(txt) { resolve(txt || ''); })
              .catch(function() { resolve(''); });
            return;
        }
        resolve('');
    });
}

function aulaExtraerTextoEntregaAsync(e) {
    var partes = [];
    if (e.comentario) partes.push(String(e.comentario));
    return aulaResolverUrlArchivo(e).then(function(url) {
        if (!url) return partes.join('\n\n').trim();
        return aulaExtraerTextoDeDataUrl(url, e.fileName).then(function(t) {
            if (t) partes.push(t);
            return partes.join('\n\n').trim();
        });
    });
}

function aulaAnalizarTextoIA(texto) {
    var t = String(texto || '').trim();
    if (t.length < 40) {
        return {
            pct: 0,
            nivel: 'insuficiente',
            iaSugerida: 'No aplica',
            detalle: 'Texto demasiado corto para analizar. Pide al estudiante un archivo .txt o pega el contenido en el comentario de entrega.',
            senales: []
        };
    }

    var lower = t.toLowerCase();
    var words = t.split(/\s+/).filter(Boolean);
    var sentences = t.split(/[.!?…]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 8; });
    var score = 0;
    var senales = [];

    // Frases típicas de LLM en español
    var frasesIA = [
        'en conclusión', 'en resumen', 'es importante destacar', 'cabe destacar',
        'en el contexto de', 'de manera significativa', 'a lo largo de este',
        'como se puede observar', 'es fundamental', 'resulta relevante',
        'en este sentido', 'por otro lado', 'además, es necesario',
        'desde una perspectiva', 'en el presente trabajo', 'el objetivo principal',
        'as an ai', 'como modelo de lenguaje', 'no puedo', 'estoy aquí para ayudar',
        'chatgpt', 'openai', 'según la información proporcionada'
    ];
    var hitsFrase = 0;
    frasesIA.forEach(function(f) {
        if (lower.indexOf(f) >= 0) hitsFrase++;
    });
    if (hitsFrase >= 1) {
        score += Math.min(25, hitsFrase * 8);
        senales.push('Frases formulaicas típicas de texto generado (' + hitsFrase + ')');
    }

    // Baja variación de longitud de oraciones (textos IA suelen ser uniformes)
    if (sentences.length >= 4) {
        var lens = sentences.map(function(s) { return s.split(/\s+/).length; });
        var mean = lens.reduce(function(a, b) { return a + b; }, 0) / lens.length;
        var variance = lens.reduce(function(a, b) { return a + Math.pow(b - mean, 2); }, 0) / lens.length;
        var std = Math.sqrt(variance);
        if (std < 4 && mean > 12) {
            score += 18;
            senales.push('Longitud de oraciones muy uniforme (poco “burstiness”)');
        } else if (std < 6) {
            score += 8;
            senales.push('Variación moderada-baja en longitud de oraciones');
        }
    }

    // Alta densidad de conectores académicos
    var conectores = (lower.match(/\b(además|asimismo|por consiguiente|en consecuencia|no obstante|sin embargo|por lo tanto|en efecto|cabe señalar)\b/g) || []).length;
    var dens = words.length ? (conectores / words.length) * 100 : 0;
    if (dens > 1.2) {
        score += 15;
        senales.push('Alta densidad de conectores formales (' + dens.toFixed(1) + '%)');
    } else if (dens > 0.6) {
        score += 7;
        senales.push('Uso frecuente de conectores formales');
    }

    // Repetición de n-gramas
    var bigrams = {};
    for (var i = 0; i < words.length - 1; i++) {
        var bg = (words[i] + ' ' + words[i + 1]).toLowerCase();
        bigrams[bg] = (bigrams[bg] || 0) + 1;
    }
    var rep = 0;
    Object.keys(bigrams).forEach(function(k) {
        if (bigrams[k] >= 3) rep++;
    });
    if (rep >= 3) {
        score += 12;
        senales.push('Repetición de expresiones (posible plantilla)');
    }

    // Poca primera persona / errores tipográficos (IA suele ser “limpia”)
    var typos = (t.match(/[a-záéíóú]{20,}/gi) || []).length; // palabras muy largas raras
    var primera = (lower.match(/\b(yo|nosotros|me|mi|creo que|pienso que|en mi opinión)\b/g) || []).length;
    if (words.length > 80 && primera === 0) {
        score += 10;
        senales.push('Ausencia de voz personal (estilo impersonal muy uniforme)');
    }

    // Listas numeradas perfectas / estructura excesivamente ordenada
    var listas = (t.match(/^\s*(\d+[\.\)]|[-•])\s+/gm) || []).length;
    if (listas >= 5) {
        score += 8;
        senales.push('Estructura muy ordenada (listas numeradas frecuentes)');
    }

    score = Math.max(0, Math.min(95, Math.round(score)));

    var nivel, iaSugerida, detalle;
    if (score < 25) {
        nivel = 'bajo';
        iaSugerida = 'No se detectan indicios claros de IA';
        detalle = 'El texto muestra más variación propia de escritura humana o es demasiado genérico para concluir. Revisa el contenido académicamente.';
    } else if (score < 50) {
        nivel = 'medio';
        iaSugerida = 'Posible asistencia de IA (no identificable)';
        detalle = 'Hay señales mixtas. Podría ser texto humano formal, editado con IA o parcialmente generado. No se puede atribuir a un modelo concreto (ChatGPT, Claude, Gemini, etc.).';
    } else if (score < 75) {
        nivel = 'alto';
        iaSugerida = 'Patrones compatibles con LLM (ChatGPT / Claude / Gemini u otros)';
        detalle = 'Varias señales coinciden con texto generado o muy asistido por un modelo de lenguaje. La herramienta NO puede afirmar qué IA específica se usó; solo estima probabilidad orientativa.';
    } else {
        nivel = 'muy alto';
        iaSugerida = 'Muy probable texto generado por IA (LLM genérico)';
        detalle = 'El estilo es altamente compatible con salida de un LLM. Identificar la marca exacta (ChatGPT, Claude, Gemini, Copilot…) requiere servicios comerciales especializados y aun así no es 100 % confiable.';
    }

    if (!senales.length) senales.push('Análisis general de estilo y estructura');

    return {
        pct: score,
        nivel: nivel,
        iaSugerida: iaSugerida,
        detalle: detalle,
        senales: senales,
        palabras: words.length
    };
}

function aulaDetectarIAEntrega(entregaId) {
    var box = document.getElementById('ai-res-' + entregaId);
    var list = aulaLoad(AULA_KEYS.entregas, []);
    var e = null;
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === entregaId) { e = list[i]; break; }
    }
    if (!e) {
        alert('No se encontró la entrega.');
        return;
    }
    if (box) {
        box.hidden = false;
        box.innerHTML = '<p class="ai-loading">Analizando texto de la entrega…</p>';
    }

    aulaExtraerTextoEntregaAsync(e).then(function(texto) {
        var name = String(e.fileName || '').toLowerCase();
        var esBinario = !/\.(txt|md|csv|json|log|py|js|html|css|tex|pdf)$/i.test(name) && texto.length < 40;

        var r = aulaAnalizarTextoIA(texto);

        var color = r.pct >= 75 ? '#b91c1c' : (r.pct >= 50 ? '#c2410c' : (r.pct >= 25 ? '#a16207' : '#15803d'));

        var html = '<div class="ai-card">' +
            '<h4>Análisis orientativo de IA</h4>' +
            '<p class="ai-pct" style="color:' + color + '"><strong>' + r.pct + '%</strong> probabilidad estimada de texto generado/asistido por IA</p>' +
            '<p><strong>Nivel:</strong> ' + aulaEsc(r.nivel) + '</p>' +
            '<p><strong>Indicación de origen:</strong> ' + aulaEsc(r.iaSugerida) + '</p>' +
            '<p>' + aulaEsc(r.detalle) + '</p>' +
            '<p><strong>Señales:</strong></p><ul>' +
            r.senales.map(function(s) { return '<li>' + aulaEsc(s) + '</li>'; }).join('') +
            '</ul>' +
            (esBinario && texto.length < 40
                ? '<p class="ai-warn">El archivo no es texto plano (.txt). Para un mejor análisis, el estudiante debe entregar también un .txt o pegar el contenido en el comentario.</p>'
                : '') +
            '<p class="ai-disclaimer"><em>Aviso:</em> este detector es <strong>heurístico y educativo</strong>. No certifica plagio ni identifica con certeza ChatGPT, Claude, Gemini u otra IA. Úsalo como apoyo, no como única prueba para sancionar.</p>' +
            '</div>';

        if (box) {
            box.hidden = false;
            box.innerHTML = html;
        } else {
            alert('Probabilidad IA: ' + r.pct + '%\n' + r.iaSugerida + '\n\n' + r.detalle);
        }

        // Guardar último análisis en la entrega (opcional)
        e.aiDetect = {
            pct: r.pct,
            nivel: r.nivel,
            iaSugerida: r.iaSugerida,
            fecha: new Date().toISOString()
        };
        for (var j = 0; j < list.length; j++) {
            if (list[j].id === entregaId) list[j] = e;
        }
        aulaSave(AULA_KEYS.entregas, list);
        if (window.GeoCloud && typeof GeoCloud.syncUp === 'function') {
            try { GeoCloud.syncUp(); } catch (err) {}
        }
    }).catch(function() {
        if (box) box.innerHTML = '<p class="ai-warn">No se pudo analizar el archivo.</p>';
    });
}

function aulaRenderEntregasDocente() {
    var box = document.getElementById('listaEntregasDocente');
    if (!box) return;
    var user = aulaGetSession();
    if (!user) return;
    var mat = (document.getElementById('filtroMateriaEnt') || {}).value || '';
    var grp = ((document.getElementById('filtroGrupoEnt') || {}).value || '').trim().toLowerCase();

    var misTareas = aulaLoad(AULA_KEYS.tareas, []).filter(function(t) { return t.docenteId === user.id; });
    var ids = {};
    misTareas.forEach(function(t) { ids[t.id] = t; });
    var entregas = aulaLoad(AULA_KEYS.entregas, []).filter(function(e) { return ids[e.tareaId]; });
    if (mat) entregas = entregas.filter(function(e) {
        var t = ids[e.tareaId] || {};
        return (e.materia || t.materia) === mat;
    });
    if (grp) entregas = entregas.filter(function(e) {
        return aulaNormGrupo(e.grupo) === grp;
    });

    if (!entregas.length) {
        box.innerHTML = '<p class="aula-vacio">No hay entregas' + (mat || grp ? ' con ese filtro' : '') + '.</p>';
        return;
    }

    box.innerHTML = entregas.slice().reverse().map(function(e) {
        var t = ids[e.tareaId] || {};
        var calificada = e.nota != null && e.nota !== '';
        var plazo = typeof aulaPlazoInfo === 'function' ? aulaPlazoInfo(t, e.fecha) : { texto: '', clase: '' };
        return '<div class="aula-item entrega-item' + (calificada ? ' item-calificada' : '') + '">' +
            '<button type="button" class="entrega-toggle" data-toggle-ent="' + e.id + '" aria-expanded="false">' +
            '<span class="entrega-toggle-main">' +
            '<strong>' + aulaEsc(e.estudianteNombre) + '</strong> — ' + aulaEsc(t.titulo || 'Tarea') +
            (calificada ? ' <span class="badge-ok">Nota: ' + aulaEsc(String(e.nota)) + '</span>' : ' <span class="badge-pend">Sin calificar</span>') +
            '</span>' +
            '<span class="entrega-toggle-meta">' + aulaEsc(plazo.texto || '') + '</span>' +
            '<span class="entrega-flecha">▾</span>' +
            '</button>' +
            '<div class="entrega-detalle" id="ent-det-' + e.id + '" hidden>' +
            '<p>' + aulaEsc(e.comentario || 'Sin comentario del estudiante') + '</p>' +
            '<p class="plazo-info ' + (plazo.clase || '') + '">' + aulaEsc(plazo.texto || '') + '</p>' +
            '<small>Archivo: ' + aulaEsc(e.fileName || '—') + ' · Entregado: ' + aulaFormatDate(e.fecha) +
            ' · ' + aulaEsc(e.materia || t.materia || '') + ' · Grupo ' + aulaEsc(e.grupo || '') + '</small>' +
            '<div class="aula-item-acciones">' +
            ((e.data || e.dataRef) ? (
                '<button type="button" class="btn-preview-file" data-entrega-id="' + e.id + '" data-preview-name="' + aulaEsc(e.fileName || 'archivo') + '">Vista previa</button>' +
                '<button type="button" class="btn-descarga btn-descarga-ent" data-entrega-id="' + e.id + '" data-download-name="' + aulaEsc(e.fileName || 'archivo') + '">Descargar</button>'
            ) : '') +
            '<button type="button" class="btn-detect-ai" data-detect-ai="' + e.id + '">🔍 Detectar IA</button>' +
            '</div>' +
            '<div class="ai-detect-result" id="ai-res-' + e.id + '" hidden></div>' +
            '<div class="calificar-box' + (calificada ? ' calificada' : '') + '" data-cal-box="' + e.id + '">' +
            (calificada ? '<p class="estado-calificada">✓ Calificada</p>' : '') +
            '<label>Nota (0-5)</label> <input type="number" min="0" max="5" step="0.1" class="input-nota" data-nota-id="' + e.id + '" value="' + (calificada ? aulaEsc(String(e.nota)) : '') + '" placeholder="0-5"' + (calificada ? ' disabled' : '') + '>' +
            '<label>Comentario docente</label> <input type="text" class="input-comentario-doc" data-com-id="' + e.id + '" value="' + aulaEsc(e.comentarioDocente || '') + '" placeholder="Retroalimentación"' + (calificada ? ' disabled' : '') + '>' +
            (calificada
                ? '<button type="button" class="btn-limpiar btn-corregir-nota" data-corregir="' + e.id + '">Corregir nota</button>'
                : '<button type="button" class="btn-calcular btn-calificar" data-calificar="' + e.id + '">Guardar calificación</button>') +
            '</div></div></div>';
    }).join('');

    box.querySelectorAll('[data-calificar]').forEach(function(btn) {
        btn.addEventListener('click', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            aulaGuardarCalificacion(btn.getAttribute('data-calificar'), box);
        });
    });

    box.querySelectorAll('[data-corregir]').forEach(function(btn) {
        btn.addEventListener('click', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var id = btn.getAttribute('data-corregir');
            var wrap = box.querySelector('[data-cal-box="' + id + '"]');
            if (!wrap) return;
            var notaEl = wrap.querySelector('.input-nota');
            var comEl = wrap.querySelector('.input-comentario-doc');
            if (notaEl) {
                notaEl.disabled = false;
                notaEl.focus();
            }
            if (comEl) comEl.disabled = false;
            var estado = wrap.querySelector('.estado-calificada');
            if (estado) estado.textContent = 'Editando calificación…';
            btn.textContent = 'Guardar calificación';
            btn.className = 'btn-calcular btn-calificar';
            btn.removeAttribute('data-corregir');
            btn.setAttribute('data-calificar', id);
            btn.onclick = function(e2) {
                e2.preventDefault();
                e2.stopPropagation();
                aulaGuardarCalificacion(id, box);
            };
        });
    });

    box.querySelectorAll('[data-toggle-ent]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-toggle-ent');
            var det = document.getElementById('ent-det-' + id);
            if (!det) return;
            var open = det.hidden;
            det.hidden = !open;
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.classList.toggle('open', open);
        });
    });

    box.querySelectorAll('.btn-preview-file').forEach(function(btn) {
        btn.addEventListener('click', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var eid = btn.getAttribute('data-entrega-id');
            var nombre = btn.getAttribute('data-preview-name') || 'archivo';
            var ent = aulaLoad(AULA_KEYS.entregas, []).find(function(x) { return x.id === eid; });
            aulaResolverUrlArchivo(ent).then(function(url) {
                if (!url) { alert('No se encontró el archivo en este dispositivo. Si se entregó en otro PC, debe volver a subirse o sincronizarse.'); return; }
                aulaAbrirVistaPrevia(url, nombre);
            });
        });
    });

    box.querySelectorAll('.btn-descarga-ent').forEach(function(btn) {
        btn.addEventListener('click', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var eid = btn.getAttribute('data-entrega-id');
            var nombre = btn.getAttribute('data-download-name') || 'archivo';
            var ent = aulaLoad(AULA_KEYS.entregas, []).find(function(x) { return x.id === eid; });
            aulaResolverUrlArchivo(ent).then(function(url) {
                if (!url) { alert('Archivo no disponible en este navegador.'); return; }
                var a = document.createElement('a');
                a.href = url;
                a.download = nombre;
                document.body.appendChild(a);
                a.click();
                a.remove();
            });
        });
    });

    box.querySelectorAll('[data-detect-ai]').forEach(function(btn) {
        btn.addEventListener('click', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            aulaDetectarIAEntrega(btn.getAttribute('data-detect-ai'));
        });
    });
}

function aulaAbrirVistaPrevia(src, name) {
    if (!src) return;
    var modal = document.getElementById('modalVistaPrevia');
    var body = document.getElementById('modalVistaPreviaBody');
    var titulo = document.getElementById('modalVistaPreviaTitulo');
    if (!modal || !body) {
        window.open(src, '_blank');
        return;
    }
    if (titulo) titulo.textContent = name || 'Vista previa';
    var lower = (name || '').toLowerCase();
    var html = '';
    if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(lower) || src.indexOf('data:image/') === 0) {
        html = '<img class="preview-img" src="' + src + '" alt="Vista previa">';
    } else if (/\.pdf$/i.test(lower) || src.indexOf('data:application/pdf') === 0) {
        html = '<iframe class="preview-frame" src="' + src + '" title="Vista previa PDF"></iframe>';
    } else {
        html = '<p>No hay vista previa para este tipo de archivo. Usa <strong>Descargar</strong>.</p>' +
            '<p><a class="btn-descarga" download="' + (name || 'archivo') + '" href="' + src + '">Descargar archivo</a></p>';
    }
    body.innerHTML = html;
    modal.hidden = false;
}


// ---------- Estudiante ----------
function aulaTareasParaEstudiante(user, materiaOverride, grupoOverride) {
    var mats = aulaMateriasUsuario(user);
    var all = aulaLoad(AULA_KEYS.tareas, []);
    if (materiaOverride) {
        var gUser = aulaNormGrupo(grupoOverride != null ? grupoOverride : aulaGrupoDeMateria(user, materiaOverride));
        return all.filter(function(t) {
            var matTarea = String(t.materia || '').trim();
            var mismaMateria = !matTarea || matTarea === materiaOverride;
            var gTarea = aulaNormGrupo(t.grupo);
            var mismoGrupo = !gTarea || !gUser || gTarea === gUser;
            return mismaMateria && mismoGrupo;
        });
    }
    // Todas las materias del estudiante
    return all.filter(function(t) {
        return mats.some(function(m) {
            var mismaMateria = !t.materia || t.materia === m.nombre;
            var gTarea = aulaNormGrupo(t.grupo);
            var gUser = aulaNormGrupo(m.grupo);
            var mismoGrupo = !gTarea || !gUser || gTarea === gUser;
            return mismaMateria && mismoGrupo;
        });
    });
}


function aulaParseLimite(t) {
    if (!t) return null;
    var f = String(t.fechaLimite || t.fecha_limite || '').trim();
    if (!f) return null;
    var h = String(t.horaLimite || t.hora_limite || '23:59').trim();
    if (/^\d{2}:\d{2}$/.test(h)) h = h + ':00';
    var d = new Date(f + 'T' + h);
    if (isNaN(d.getTime())) {
        // DD/MM/YYYY o DD-MM-YYYY
        var m = f.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) {
            var iso = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) + 'T' + h;
            d = new Date(iso);
        }
    }
    if (isNaN(d.getTime())) return null;
    return d;
}

function aulaFormatearDuracion(ms) {
    var neg = ms < 0;
    ms = Math.abs(ms);
    var totalMin = Math.floor(ms / 60000);
    var dias = Math.floor(totalMin / (60 * 24));
    var horas = Math.floor((totalMin % (60 * 24)) / 60);
    var mins = totalMin % 60;
    var parts = [];
    if (dias) parts.push(dias + (dias === 1 ? ' día' : ' días'));
    if (horas) parts.push(horas + (horas === 1 ? ' hora' : ' horas'));
    parts.push(mins + (mins === 1 ? ' min' : ' min'));
    return parts.join(', ');
}

function aulaPlazoInfo(t, fechaEntregaIso) {
    if (!t) return { texto: 'Sin fecha límite', clase: 'plazo-sin', limite: null, tarde: false };
    var limite = aulaParseLimite(t);
    var fRaw = String(t.fechaLimite || t.fecha_limite || '').trim();
    var hRaw = String(t.horaLimite || t.hora_limite || '').trim();
    var limStr = fRaw ? (fRaw + (hRaw ? (' ' + hRaw) : '')) : '';
    if (!limite) {
        if (fRaw) {
            return { texto: 'Límite: ' + limStr, clase: 'plazo-sin', limite: null, tarde: false };
        }
        return { texto: 'Sin fecha límite', clase: 'plazo-sin', limite: null, tarde: false };
    }
    var ref = fechaEntregaIso ? new Date(fechaEntregaIso) : new Date();
    if (isNaN(ref.getTime())) ref = new Date();
    var diff = limite.getTime() - ref.getTime();
    if (!fechaEntregaIso) {
        if (diff >= 0) {
            return {
                texto: 'Límite: ' + limStr + ' · Quedan ' + aulaFormatearDuracion(diff),
                clase: diff < 24 * 3600 * 1000 ? 'plazo-urgente' : 'plazo-ok',
                limite: limite,
                tarde: false
            };
        }
        return {
            texto: 'Límite: ' + limStr + ' · Vencida hace ' + aulaFormatearDuracion(diff),
            clase: 'plazo-vencido',
            limite: limite,
            tarde: true
        };
    }
    // Ya entregada
    if (diff >= 0) {
        return {
            texto: 'Entregada a tiempo (límite ' + limStr + ')',
            clase: 'plazo-ok',
            limite: limite,
            tarde: false
        };
    }
    return {
        texto: 'Entregada con retraso de ' + aulaFormatearDuracion(diff) + ' (límite ' + limStr + ')',
        clase: 'plazo-vencido',
        limite: limite,
        tarde: true
    };
}

function aulaRenderEstudiante() {
    try { var _s = document.getElementById("estChatMateria"); if (_s) _s.dataset.filled = ""; if (typeof aulaChatBind === "function") aulaChatBind(); if (typeof aulaChatUpdateBadges === "function") aulaChatUpdateBadges(); } catch (e) {}
    var user = aulaUsuarioCompleto(aulaGetSession());
    if (!user) return;
    aulaSetSession(user); // mantener materias actualizadas en sesión

    var filtroMat = document.getElementById('estFiltroMateria');
    var filtroGrp = document.getElementById('estFiltroGrupo');

    var mats = aulaMateriasUsuario(user);
    function llenarSelectMaterias(sel, keepValue) {
        if (!sel) return;
        var cur = keepValue && sel.value ? sel.value : '';
        var opts = '<option value="">Todas mis materias</option>';
        mats.forEach(function(m) {
            opts += '<option value="' + String(m.nombre).replace(/"/g, '&quot;') + '">' + m.nombre + '</option>';
        });
        sel.innerHTML = opts;
        if (cur) {
            var exists = mats.some(function(m) { return m.nombre === cur; });
            if (exists) sel.value = cur;
        }
    }
    llenarSelectMaterias(filtroMat, true);
    if (filtroMat && !filtroMat.dataset.iniciado) {
        filtroMat.value = '';
        filtroMat.dataset.iniciado = '1';
    }

    var materiaSel = filtroMat ? filtroMat.value : '';
    var grupoSel = '';
    if (materiaSel) {
        grupoSel = filtroGrp ? (filtroGrp.value || '').trim() : '';
        if (!grupoSel) {
            grupoSel = aulaGrupoDeMateria(user, materiaSel);
            if (filtroGrp && grupoSel) filtroGrp.value = grupoSel;
        }
        if (filtroGrp) {
            filtroGrp.disabled = false;
            filtroGrp.placeholder = 'Ej. A';
        }
    } else {
        if (filtroGrp) {
            filtroGrp.value = '';
            filtroGrp.disabled = true;
            filtroGrp.placeholder = 'N/A (todas las materias)';
        }
        grupoSel = '';
    }

    // Persistir la selección actual del estudiante
    try {
        if (materiaSel) {
            user.materia = materiaSel;
            user.grupo = grupoSel || user.grupo || '';
            if (typeof aulaSavePerfil === 'function') {
                aulaSavePerfil(user.email, { materia: materiaSel, grupo: user.grupo });
            }
            aulaSetSession(user);
            var users = aulaLoad(AULA_KEYS.users, []);
            var idx = users.findIndex(function(u) { return u.email === user.email; });
            if (idx >= 0) {
                // No borrar el arreglo materias[]; solo recordar última selección de filtro
                if (materiaSel) users[idx].ultimaMateria = materiaSel;
                if (grupoSel) users[idx].ultimoGrupo = grupoSel;
                aulaSave(AULA_KEYS.users, users);
            }
        }
    } catch (e) {
        console.warn('No se pudo guardar perfil estudiante', e);
    }

    // Subtítulo según filtro aplicado
    var sub = document.getElementById('estudianteSubtitulo');
    if (sub) {
        if (materiaSel) {
            sub.textContent = user.nombre + ' · ' + materiaSel + ' · Grupo ' + (grupoSel || '—');
        } else {
            var matsN = aulaNombresMaterias(user);
            sub.textContent = user.nombre + ' · Todas mis materias' + (matsN.length ? (' (' + matsN.join(', ') + ')') : '');
        }
    }

    var box = document.getElementById('listaTareasEstudiante');
    var tareas = aulaTareasParaEstudiante(user, materiaSel, grupoSel);
    var entregas = aulaLoad(AULA_KEYS.entregas, []).filter(function(e) { return e.estudianteId === user.id; });
    var entregadas = {};
    entregas.forEach(function(e) { entregadas[e.tareaId] = true; });

    if (box) {
        if (!tareas.length) {
            var todas = aulaLoad(AULA_KEYS.tareas, []);
            var totalTareas = todas.length;
            var detalle = todas.map(function(t) {
                return aulaEsc(t.titulo) + ' (' + aulaEsc(t.materia || 'sin materia') + ' / grupo ' + aulaEsc(t.grupo || 'todos') + ')';
            }).join('; ');
            var msg = totalTareas === 0
                ? 'El docente aún no ha publicado tareas en este navegador.'
                : ('No hay coincidencias para <strong>' + aulaEsc(materiaSel || '—') + '</strong> / grupo <strong>' +
                   aulaEsc(grupoSel || '—') + '</strong>.<br><small>Tareas publicadas: ' + detalle +
                   '</small><br><small>Deja el grupo vacío en la tarea del docente para que la vean todos, o usa exactamente el mismo grupo.</small>');
            box.innerHTML = '<p class="aula-vacio">' + msg + '</p>';
        } else {
            box.innerHTML = tareas.slice().reverse().map(function(t) {
                var estado = entregadas[t.id] ? '<span class="badge-ok">Entregada</span>' : '<span class="badge-pend">Pendiente</span>';
                var plazo = aulaPlazoInfo(t);
                return '<div class="aula-item">' +
                    '<strong>' + aulaEsc(t.titulo) + '</strong> ' + estado +
                    '<p>' + aulaEsc(t.descripcion || '') + '</p>' +
                    '<small>' + aulaEsc(t.materia) + ' · Grupo ' + aulaEsc(t.grupo || 'Todos') +
                    ' · Prof. ' + aulaEsc(t.docenteNombre || '') + '</small>' +
                    '<p class="plazo-info ' + plazo.clase + '">' + aulaEsc(plazo.texto) + '</p></div>';
            }).join('');
        }
    }

    var sel = document.getElementById('entregaTarea');
    if (sel) {
        var pendientes = tareas.filter(function(t) { return !entregadas[t.id]; });
        sel.innerHTML = pendientes.length
            ? pendientes.map(function(t) {
                var plazo = aulaPlazoInfo(t);
                var extra = t.fechaLimite
                    ? (' | Límite: ' + t.fechaLimite + (t.horaLimite ? (' ' + t.horaLimite) : '') + ' | ' + plazo.texto)
                    : '';
                return '<option value="' + t.id + '">' + aulaEsc(t.titulo) + aulaEsc(extra) + '</option>';
            }).join('')
            : '<option value="">No hay tareas pendientes</option>';
    }
    // Panel de detalle de plazo junto al select
    var plazoBox = document.getElementById('entregaPlazoInfo');
    if (!plazoBox && sel && sel.parentNode) {
        plazoBox = document.createElement('p');
        plazoBox.id = 'entregaPlazoInfo';
        plazoBox.className = 'plazo-info';
        sel.parentNode.insertBefore(plazoBox, sel.nextSibling);
    }
    function actualizarPlazoSelect() {
        if (!plazoBox || !sel) return;
        var id = sel.value;
        var t = tareas.find(function(x) { return x.id === id; });
        if (!t) {
            t = aulaLoad(AULA_KEYS.tareas, []).find(function(x) { return x.id === id; });
        }
        if (!t) { plazoBox.textContent = ''; plazoBox.className = 'plazo-info'; return; }
        var plazo = aulaPlazoInfo(t);
        plazoBox.textContent = plazo.texto;
        plazoBox.className = 'plazo-info ' + plazo.clase;
    }
    if (sel && !sel.dataset.plazoBound) {
        sel.addEventListener('change', actualizarPlazoSelect);
        sel.dataset.plazoBound = '1';
    }
    actualizarPlazoSelect();

    // Presentaciones: filtros propios (o los de tareas si no existen)
    var filtroMatP = document.getElementById('estFiltroMateriaPres') || filtroMat;
    var filtroGrpP = document.getElementById('estFiltroGrupoPres') || filtroGrp;
    if (filtroMatP && filtroMatP !== filtroMat) {
        llenarSelectMaterias(filtroMatP, filtroMatP.dataset.iniciado ? filtroMatP.value : '');
        if (!filtroMatP.dataset.iniciado) {
            filtroMatP.value = '';
            filtroMatP.dataset.iniciado = '1';
        }
    }
    var materiaPres = filtroMatP ? filtroMatP.value : materiaSel;
    var grupoPres = '';
    if (materiaPres) {
        // Solo cuando hay materia específica se usa grupo
        grupoPres = filtroGrpP ? (filtroGrpP.value || '').trim() : '';
        if (!grupoPres) {
            grupoPres = aulaGrupoDeMateria(user, materiaPres);
            if (filtroGrpP && grupoPres) filtroGrpP.value = grupoPres;
        }
        if (filtroGrpP) filtroGrpP.disabled = false;
    } else {
        // Todas las materias: sin grupo
        if (filtroGrpP) {
            filtroGrpP.value = '';
            filtroGrpP.disabled = true;
            filtroGrpP.placeholder = 'N/A (todas las materias)';
        }
        grupoPres = '';
    }

    var presBox = document.getElementById('listaPresEstudiante');
    if (presBox) {
        var matsUser = aulaMateriasUsuario(user);
        var pres = aulaLoad(AULA_KEYS.presentaciones, []).filter(function(p) {
            if (materiaPres) {
                var mismaMateria = !p.materia || p.materia === materiaPres;
                var gP = aulaNormGrupo(p.grupo);
                var gU = aulaNormGrupo(grupoPres);
                var mismoGrupo = !gP || !gU || gP === gU;
                return mismaMateria && mismoGrupo;
            }
            // Todas: presentaciones de cualquiera de sus materias (sin filtrar por un solo grupo)
            return matsUser.some(function(m) {
                return !p.materia || p.materia === m.nombre;
            });
        });
        if (!pres.length) {
            presBox.innerHTML = '<p class="aula-vacio">No hay presentaciones disponibles.</p>';
        } else {
            presBox.innerHTML = pres.slice().reverse().map(function(p) {
                return '<div class="aula-item"><strong>' + aulaEsc(p.titulo) + '</strong>' +
                    '<p>' + aulaEsc(p.materia) + '</p>' +
                    '<small>' + aulaEsc(p.fileName) + ' · ' + aulaFormatDate(p.creada) + '</small>' +
                    (p.data ? ' <a class="btn-descarga" download="' + aulaEsc(p.fileName) + '" href="' + p.data + '">Descargar</a>' : '') +
                    '</div>';
            }).join('');
        }
    }

    var mis = document.getElementById('listaMisEntregas');
    if (mis) {
        if (!entregas.length) {
            mis.innerHTML = '<p class="aula-vacio">Aún no has entregado trabajos.</p>';
        } else {
            var allT = {};
            aulaLoad(AULA_KEYS.tareas, []).forEach(function(t) { allT[t.id] = t; });
            mis.innerHTML = entregas.slice().reverse().map(function(e) {
                var t = allT[e.tareaId] || {};
                var notaHtml = (e.nota != null && e.nota !== '')
                    ? ' <span class="badge-ok">Nota: ' + aulaEsc(String(e.nota)) + '</span>'
                    : ' <span class="badge-pend">Sin calificar</span>';
                var feed = e.comentarioDocente ? ('<p><em>Docente: ' + aulaEsc(e.comentarioDocente) + '</em></p>') : '';
                var plazo = aulaPlazoInfo(t, e.fecha);
                return '<div class="aula-item"><strong>' + aulaEsc(t.titulo || 'Tarea') + '</strong>' + notaHtml +
                    '<p>' + aulaEsc(e.comentario || '') + '</p>' + feed +
                    '<p class="plazo-info ' + plazo.clase + '">' + aulaEsc(plazo.texto) + '</p>' +
                    '<small>' + aulaEsc(e.fileName || '') + ' · Entregado: ' + aulaFormatDate(e.fecha) + '</small>' +
                    (e.data ? ' <a class="btn-descarga" download="' + aulaEsc(e.fileName) + '" href="' + e.data + '">Descargar</a>' : '') +
                    '</div>';
            }).join('');
        }
    }
}

function aulaEntregar() {
    var user = aulaRequireSession();
    if (!user || user.rol !== 'estudiante') return;
    var err = document.getElementById('entregaError');
    if (err) err.textContent = '';
    var tareaId = document.getElementById('entregaTarea').value;
    var comentario = (document.getElementById('entregaComentario').value || '').trim();
    var fileInput = document.getElementById('entregaArchivo');
    if (!tareaId) { if (err) err.textContent = 'Selecciona una tarea.'; return; }
    if (!fileInput.files || !fileInput.files[0]) { if (err) err.textContent = 'Adjunta un archivo.'; return; }

    var rawFile = fileInput.files[0];
    if (rawFile.size > 100 * 1024 * 1024) {
        if (err) err.textContent = 'El archivo supera 100 MB.';
        return;
    }
    if (err) err.textContent = 'Subiendo archivo…';

    aulaReadFileAsDataURL(rawFile, 100 * 1024 * 1024).then(function(file) {
        // Archivos > ~400 KB van a IndexedDB para no saturar localStorage
        var usarIdb = file.size > 400 * 1024 || (file.data && file.data.length > 500000);
        var guardarMeta = function(fileMeta) {
            var list = aulaLoad(AULA_KEYS.entregas, []);
            // eliminar entrega previa misma tarea + borrar blob viejo si había
            var prev = list.filter(function(e) { return e.tareaId === tareaId && e.estudianteId === user.id; });
            prev.forEach(function(p) {
                if (p.dataRef) aulaIdbDelete(p.dataRef);
            });
            list = list.filter(function(e) { return !(e.tareaId === tareaId && e.estudianteId === user.id); });
            var row = {
                id: aulaUid(),
                tareaId: tareaId,
                estudianteId: user.id,
                estudianteNombre: user.nombre,
                materia: user.materia,
                grupo: user.grupo,
                comentario: comentario,
                fileName: fileMeta.name || file.name,
                fileType: fileMeta.type || file.type,
                fileSize: fileMeta.size || file.size,
                fecha: new Date().toISOString()
            };
            if (fileMeta.storage === 'idb') {
                row.storage = 'idb';
                row.dataRef = fileMeta.dataRef || fileMeta.id;
                // no guardar data base64 en localStorage
            } else {
                row.data = fileMeta.data || file.data;
            }
            list.push(row);
            try {
                aulaSave(AULA_KEYS.entregas, list);
            } catch (e2) {
                // Si aún falla, forzar IDB
                if (!row.dataRef) {
                    return aulaGuardarArchivoGrande(file).then(function(meta) {
                        row.storage = 'idb';
                        row.dataRef = meta.dataRef;
                        delete row.data;
                        list = list.filter(function(e) { return e.id !== row.id; });
                        list.push(row);
                        aulaSave(AULA_KEYS.entregas, list);
                    });
                }
                throw e2;
            }
            if (err) err.textContent = '';
            document.getElementById('entregaComentario').value = '';
            fileInput.value = '';
            aulaRenderEstudiante();
            if (window.GeoCloud && typeof GeoCloud.syncUp === 'function') {
                try { GeoCloud.syncUp(); } catch (e3) {}
            }
        };

        if (usarIdb) {
            return aulaGuardarArchivoGrande(file).then(guardarMeta);
        }
        try {
            guardarMeta({ name: file.name, type: file.type, size: file.size, data: file.data });
        } catch (e4) {
            return aulaGuardarArchivoGrande(file).then(guardarMeta);
        }
    }).catch(function(e) {
        if (err) err.textContent = (e && e.message) ? e.message : 'Error al entregar. Prueba un PDF más liviano o exporta a PDF comprimido.';
    });
}


function aulaAbrirPerfil() {
    var user = aulaGetSession();
    if (!user) return;
    var modal = document.getElementById('modalPerfil');
    if (!modal) return;
    modal.hidden = false;
    var err = document.getElementById('perfilError');
    if (err) err.textContent = '';
    var fileInput = document.getElementById('perfilFotoInput');
    if (fileInput) fileInput.value = '';
    var prev = document.getElementById('perfilFotoPreview');
    var ph = document.getElementById('perfilFotoPlaceholder');
    if (user.foto && prev) {
        prev.src = user.foto;
        prev.hidden = false;
        if (ph) ph.hidden = true;
    } else {
        if (prev) prev.hidden = true;
        if (ph) ph.hidden = false;
    }
}

function aulaGuardarPerfil() {
    var user = aulaGetSession();
    if (!user) return;
    var err = document.getElementById('perfilError');
    if (err) err.textContent = '';
    var fileInput = document.getElementById('perfilFotoInput');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        if (err) err.textContent = 'Selecciona una imagen para subir.';
        return;
    }
    var f = fileInput.files[0];
    if (f.size > 1.5 * 1024 * 1024) {
        if (err) err.textContent = 'La foto debe pesar menos de 1.5 MB.';
        return;
    }
    var reader = new FileReader();
    reader.onload = function() {
        user.foto = reader.result;
        var users = aulaLoad(AULA_KEYS.users, []);
        var idx = users.findIndex(function(u) { return u.id === user.id || u.email === user.email; });
        if (idx >= 0) {
            users[idx].foto = user.foto;
            aulaSave(AULA_KEYS.users, users);
            user = Object.assign({}, users[idx]);
            // no exponer password en session de más, pero mantener id
            delete user.password;
        }
        // session without password ok
        var session = aulaGetSession() || {};
        session.foto = user.foto;
        session.nombre = user.nombre || session.nombre;
        session.id = user.id || session.id;
        session.email = user.email || session.email;
        session.rol = user.rol || session.rol;
        session.materias = user.materias || session.materias;
        session.materia = user.materia || session.materia;
        session.grupo = user.grupo || session.grupo;
        aulaSetSession(session);
        aulaUpdateMenuUser(session);
        var modal = document.getElementById('modalPerfil');
        if (modal) modal.hidden = true;
    };
    reader.onerror = function() {
        if (err) err.textContent = 'No se pudo leer la imagen.';
    };
    reader.readAsDataURL(f);
}


window.__simOrigen = null;

function aulaAbrirSimulador(tipo, origenId) {
    // Guardar origen de forma persistente (evita perder el contexto)
    if (!origenId) {
        // intentar detectar el main visible del curso
        ['pantallaSuelos', 'pantallaSuelos2', 'pantallaResistencia'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el && el.style.display !== 'none' && el.offsetParent !== null) origenId = id;
        });
    }
    var tabPorCurso = {
        pantallaSuelos: 'ms1-simuladores',
        pantallaSuelos2: 'ms2-simuladores',
        pantallaResistencia: 'rm-simuladores'
    };
    window.__simOrigen = origenId || null;
    window.__simTab = origenId ? (tabPorCurso[origenId] || null) : null;
    try {
        if (origenId) {
            sessionStorage.setItem('gm_sim_origen', origenId);
            sessionStorage.setItem('gm_sim_tab', window.__simTab || '');
        }
    } catch (e) {}

    document.querySelectorAll('main').forEach(function(m) { m.style.display = 'none'; });
    var sim = document.getElementById('pantallaSimuladores');
    if (sim) sim.style.display = 'block';
    var btn = document.getElementById('btnVolverSimuladores');
    if (btn) btn.textContent = '← VOLVER';
    // Ocultar TODAS las tarjetas de simulador y mostrar solo la elegida
    try {
        var allCardIds = [
            'card-sim-mohr', 'card-sim-esfdef', 'card-sim-flujo',
            'card-sim-consolidacion', 'card-sim-consolidacion-ms2',
            'card-sim-corte', 'card-sim-inconfinada', 'card-sim-triaxial'
        ];
        allCardIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.hidden = true;
        });
        var cards = {
            mohr: 'card-sim-mohr',
            esfdef: 'card-sim-esfdef',
            flujo: 'card-sim-flujo',
            consolidacion: 'card-sim-consolidacion-ms2',
            corte: 'card-sim-corte',
            inconfinada: 'card-sim-inconfinada',
            triaxial: 'card-sim-triaxial'
        };
        // Suelos I: canvas genérico U-t (si aún se usa)
        if (tipo === 'consolidacion' && origenId === 'pantallaSuelos') {
            cards.consolidacion = 'card-sim-consolidacion';
        }
        if (tipo && cards[tipo]) {
            var show = document.getElementById(cards[tipo]);
            if (show) show.hidden = false;
        } else if (!tipo) {
            ['card-sim-mohr','card-sim-esfdef','card-sim-flujo'].forEach(function(id) {
                var el = document.getElementById(id); if (el) el.hidden = false;
            });
        }
    } catch (e) {}

    setTimeout(function() {
        if (tipo === 'flujo' && typeof actualizarSimFlujo === 'function') actualizarSimFlujo();
        if (tipo === 'consolidacion') {
            if (typeof actualizarSimConsolidacion === 'function') actualizarSimConsolidacion();
            if (typeof simularCorteDirecto === 'function' && origenId === 'pantallaSuelos2') {
                /* consolidacion sim already */
            }
        }
        if (tipo === 'mohr' && typeof dibujarCirculoMohr === 'function') dibujarCirculoMohr(100, 50, 30);
        if (tipo === 'esfdef' && typeof dibujarDiagramaEsfDef === 'function') dibujarDiagramaEsfDef(200, 250, 400);
        if (tipo === 'corte' && typeof simularCorteDirecto === 'function') simularCorteDirecto();
        if (tipo === 'inconfinada' && typeof simularInconfinada === 'function') simularInconfinada();
        if (tipo === 'consolidacion' && typeof simularConsolidacionMaquina === 'function' && origenId !== 'pantallaSuelos') simularConsolidacionMaquina();
        if (tipo === 'triaxial' && typeof simularTriaxial === 'function') simularTriaxial();
    }, 80);
    window.scrollTo(0, 0);
}

function aulaVolverDesdeSimulador() {
    var origen = window.__simOrigen;
    var tabId = window.__simTab || null;
    try {
        if (!origen) origen = sessionStorage.getItem('gm_sim_origen');
        if (!tabId) tabId = sessionStorage.getItem('gm_sim_tab') || null;
    } catch (e) {}

    var tabPorCurso = {
        pantallaSuelos: 'ms1-simuladores',
        pantallaSuelos2: 'ms2-simuladores',
        pantallaResistencia: 'rm-simuladores'
    };
    if (!tabId && origen) tabId = tabPorCurso[origen] || null;

    document.querySelectorAll('main').forEach(function(m) { m.style.display = 'none'; });

    if (origen && document.getElementById(origen)) {
        var seccion = document.getElementById(origen);
        seccion.style.display = 'block';
        if (tabId) {
            seccion.querySelectorAll('.tab-btn').forEach(function(t) {
                t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
            });
            seccion.querySelectorAll('.tab-content').forEach(function(c) {
                c.classList.toggle('active', c.id === tabId);
            });
        }
        window.scrollTo(0, 0);
    } else {
        // Fallback: intentar suelos 1 simuladores en vez del menú
        var fallback = document.getElementById('pantallaSuelos');
        if (fallback) {
            fallback.style.display = 'block';
            fallback.querySelectorAll('.tab-btn').forEach(function(t) {
                t.classList.toggle('active', t.getAttribute('data-tab') === 'ms1-simuladores');
            });
            fallback.querySelectorAll('.tab-content').forEach(function(c) {
                c.classList.toggle('active', c.id === 'ms1-simuladores');
            });
        } else if (typeof mostrarPantalla === 'function') {
            mostrarPantalla('menu');
        }
    }
    window.__simOrigen = null;
    window.__simTab = null;
}

function aulaInitUI() {
    aulaInitLogin();
    var btnCerrarPrev = document.getElementById('btnCerrarVistaPrevia');
    if (btnCerrarPrev) {
        btnCerrarPrev.addEventListener('click', function() {
            var m = document.getElementById('modalVistaPrevia');
            if (m) m.hidden = true;
            var b = document.getElementById('modalVistaPreviaBody');
            if (b) b.innerHTML = '';
        });
    }


    var btnVolverSim = document.getElementById('btnVolverSimuladores');
    if (btnVolverSim) {
        btnVolverSim.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            aulaVolverDesdeSimulador();
        });
    }


    var btnMenuUsuario = document.getElementById('btnMenuUsuario');
    var menuDropdown = document.getElementById('menuUserDropdown');
    if (btnMenuUsuario && menuDropdown) {
        btnMenuUsuario.addEventListener('click', function(e) {
            e.stopPropagation();
            var open = menuDropdown.hidden;
            menuDropdown.hidden = !open;
            btnMenuUsuario.setAttribute('aria-expanded', open ? 'true' : 'false');
            btnMenuUsuario.classList.toggle('open', open);
        });
        document.addEventListener('click', function() {
            menuDropdown.hidden = true;
            btnMenuUsuario.setAttribute('aria-expanded', 'false');
            btnMenuUsuario.classList.remove('open');
        });
        menuDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    var btnEditarPerfil = document.getElementById('btnEditarPerfil');
    if (btnEditarPerfil) {
        btnEditarPerfil.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var dd = document.getElementById('menuUserDropdown');
            if (dd) dd.hidden = true;
            aulaAbrirPerfil();
        });
    }
    var btnCerrarPerfil = document.getElementById('btnCerrarPerfil');
    if (btnCerrarPerfil) btnCerrarPerfil.addEventListener('click', function() {
        document.getElementById('modalPerfil').hidden = true;
    });
    var btnGuardarPerfil = document.getElementById('btnGuardarPerfil');
    if (btnGuardarPerfil) btnGuardarPerfil.addEventListener('click', aulaGuardarPerfil);

    document.querySelectorAll('.btn-abrir-sim').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tipo = btn.getAttribute('data-sim');
            var main = btn.closest('main');
            var origen = main ? main.id : null;
            aulaAbrirSimulador(tipo, origen);
        });
    });

    var btnAula = document.getElementById('btnAula');
    if (btnAula) {
        btnAula.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (menuDropdown) {
                menuDropdown.hidden = true;
                if (btnMenuUsuario) {
                    btnMenuUsuario.setAttribute('aria-expanded', 'false');
                    btnMenuUsuario.classList.remove('open');
                }
            }
            aulaOpenPanel();
        });
    }

    var btnLogout = document.getElementById('btnCerrarSesion');
    if (btnLogout) {
        btnLogout.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (menuDropdown) {
                menuDropdown.hidden = true;
                if (btnMenuUsuario) {
                    btnMenuUsuario.setAttribute('aria-expanded', 'false');
                    btnMenuUsuario.classList.remove('open');
                }
            }
            aulaLogout();
        });
    }

    // Evitar que clics del dropdown activen tarjetas del menú debajo
    if (menuDropdown) {
        menuDropdown.style.zIndex = '9999';
    }

    var btnVolverDoc = document.getElementById('btnVolverDocente');
    if (btnVolverDoc) btnVolverDoc.addEventListener('click', function() {
        if (typeof mostrarPantalla === 'function') mostrarPantalla('menu');
    });
    var btnVolverEst = document.getElementById('btnVolverEstudiante');
    if (btnVolverEst) btnVolverEst.addEventListener('click', function() {
        if (typeof mostrarPantalla === 'function') mostrarPantalla('menu');
    });

    var btnCrearTarea = document.getElementById('btnCrearTarea');
    if (btnCrearTarea) btnCrearTarea.addEventListener('click', aulaCrearTarea);
    var btnSubirPres = document.getElementById('btnSubirPres');
    if (btnSubirPres) btnSubirPres.addEventListener('click', aulaSubirPres);
    var btnFiltrar = document.getElementById('btnFiltrarEst');
    if (btnFiltrar) btnFiltrar.addEventListener('click', aulaRenderEstudiantes);
    var btnFiltrarTareas = document.getElementById('btnFiltrarTareas');
    if (btnFiltrarTareas) btnFiltrarTareas.addEventListener('click', aulaRenderTareasDocente);
    var btnFiltrarEnt = document.getElementById('btnFiltrarEnt');
    if (btnFiltrarEnt) btnFiltrarEnt.addEventListener('click', aulaRenderEntregasDocente);
    var btnCancelEdit = document.getElementById('btnCancelarEditTarea');
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', aulaCancelarEditTarea);
    var btnEntregar = document.getElementById('btnEntregar');
    if (btnEntregar) btnEntregar.addEventListener('click', aulaEntregar);

    var btnEstFiltro = document.getElementById('btnEstAplicarFiltro');
    if (btnEstFiltro) {
        btnEstFiltro.addEventListener('click', function() {
            var fm = document.getElementById('estFiltroMateria');
            var fg = document.getElementById('estFiltroGrupo');
            if (fm) fm.dataset.iniciado = '1';
            if (fg) fg.dataset.iniciado = '1';
            aulaRenderEstudiante();
        });
    }

    var btnEstFiltroPres = document.getElementById('btnEstAplicarFiltroPres');
    if (btnEstFiltroPres) {
        btnEstFiltroPres.addEventListener('click', function() {
            var fm = document.getElementById('estFiltroMateriaPres');
            var fg = document.getElementById('estFiltroGrupoPres');
            if (fm) fm.dataset.iniciado = '1';
            if (fg) fg.dataset.iniciado = '1';
            aulaRenderEstudiante();
        });
    }
    var estMat = document.getElementById('estFiltroMateria');
    if (estMat) {
        estMat.addEventListener('change', function() {
            var user = aulaGetSession();
            if (!user) return;
            var g = aulaGrupoDeMateria(user, estMat.value);
            var fg = document.getElementById('estFiltroGrupo');
            if (fg) fg.value = g || '';
        });
    }
    var estMatP = document.getElementById('estFiltroMateriaPres');
    if (estMatP) {
        estMatP.addEventListener('change', function() {
            var user = aulaGetSession();
            if (!user) return;
            var g = aulaGrupoDeMateria(user, estMatP.value);
            var fg = document.getElementById('estFiltroGrupoPres');
            if (fg) fg.value = g || '';
        });
    }

}

document.addEventListener('DOMContentLoaded', function() {
    aulaInitUI();
});



// ---------- Integrantes del curso + chat entre compañeros ----------
function aulaIntegrantesDe(materia, grupo) {
    var users = aulaLoad(AULA_KEYS.users, []);
    var docentes = users.filter(function(u) {
        return u && u.rol === 'docente' && typeof aulaDocenteDicta === 'function'
            && aulaDocenteDicta(u, materia, grupo);
    });
    var estudiantes = users.filter(function(u) {
        return u && u.rol === 'estudiante' && typeof aulaUsuarioCoincideMateriaGrupo === 'function'
            && aulaUsuarioCoincideMateriaGrupo(u, materia, grupo);
    });
    // Docente siempre primero (comanda el curso)
    var lista = [];
    docentes.forEach(function(d) { lista.push(d); });
    estudiantes.sort(function(a, b) {
        return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
    });
    estudiantes.forEach(function(s) { lista.push(s); });
    return lista;
}


function aulaRenderIntegrantesDocente() {
    var box = document.getElementById('listaIntegrantesDoc');
    if (!box) return;
    var user = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
    if (!user || user.rol !== 'docente') return;
    var full = typeof aulaUsuarioCompleto === 'function' ? (aulaUsuarioCompleto(user) || user) : user;
    var matEl = document.getElementById('docIntMateria');
    var grpEl = document.getElementById('docIntGrupo');
    var materia = matEl ? matEl.value : '';
    var grupo = grpEl ? (grpEl.value || '').trim() : '';

    // Rellenar materias del docente
    if (matEl && !matEl.dataset.filledDoc) {
        var mats = typeof aulaMateriasUsuario === 'function' ? aulaMateriasUsuario(full) : [];
        if (mats.length) {
            matEl.innerHTML = '<option value="">Seleccione materia</option>' + mats.map(function(m) {
                return '<option value="' + escHtml(m.nombre) + '">' + escHtml(m.nombre) +
                    (m.grupo ? ' (grupos: ' + escHtml(m.grupo) + ')' : '') + '</option>';
            }).join('');
        }
        matEl.dataset.filledDoc = '1';
        if (!materia && mats.length) {
            matEl.value = mats[0].nombre;
            materia = mats[0].nombre;
            if (grpEl && mats[0].grupo) {
                var gs = typeof aulaParseGrupos === 'function' ? aulaParseGrupos(mats[0].grupo) : [];
                if (gs.length === 1) grpEl.value = gs[0];
            }
        }
    }
    materia = matEl ? matEl.value : materia;
    grupo = grpEl ? (grpEl.value || '').trim() : grupo;

    if (!materia) {
        box.innerHTML = '<p class="aula-vacio">Selecciona una materia para ver el curso.</p>';
        return;
    }
    if (!grupo) {
        box.innerHTML = '<p class="aula-vacio">Indica el grupo (ej. A) para listar integrantes.</p>';
        return;
    }
    // Verificar que el docente dicta ese grupo
    if (typeof aulaDocenteDicta === 'function' && !aulaDocenteDicta(full, materia, grupo)) {
        box.innerHTML = '<p class="aula-vacio">No dictas el grupo ' + escHtml(grupo) + ' de ' + escHtml(materia) + '.</p>';
        return;
    }

    function pintar(lista) {
        if (!lista.length) {
            box.innerHTML = '<p class="aula-vacio">No hay integrantes en ' + escHtml(materia) + ' · Grupo ' + escHtml(grupo) + '.</p>';
            return;
        }
        var me = aulaNormalizarEmail(full.email);
        box.innerHTML = '<ul class="integrantes-lista">' + lista.map(function(u) {
            var rol = u.rol === 'docente' ? 'docente' : 'estudiante';
            var isMe = aulaNormalizarEmail(u.email) === me;
            var foto = u.foto
                ? '<img class="tabla-foto" src="' + u.foto + '" alt="">'
                : '<span class="tabla-foto tabla-foto-ini">' + escHtml(aulaIniciales(u.nombre)) + '</span>';
            var btn = '';
            if (!isMe && rol === 'estudiante') {
                btn = '<button type="button" class="btn-secundario btn-chat-comp" data-doc-peer="' +
                    escHtml(u.email) + '" data-mat="' + escHtml(materia) + '" data-grp="' + escHtml(grupo) +
                    '">Chatear</button>';
            }
            return '<li class="integrante-item' + (rol === 'docente' ? ' es-docente' : '') + (isMe ? ' es-yo' : '') + '">' +
                foto +
                '<div class="integrante-info"><strong>' + escHtml(u.nombre || u.email) + '</strong>' +
                '<span class="integrante-rol">' + rol + (isMe ? ' · tú' : '') + '</span></div>' +
                btn + '</li>';
        }).join('') + '</ul>';
        box.querySelectorAll('[data-doc-peer]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var email = btn.getAttribute('data-doc-peer');
                var mat = btn.getAttribute('data-mat');
                var grp = btn.getAttribute('data-grp') || '';
                // Abrir chat docente con ese estudiante
                var tab = document.querySelector('#pantallaDocente .tab-btn[data-tab="doc-chat"]');
                if (tab) tab.click();
                setTimeout(function() {
                    // buscar o crear chat como si el estudiante hubiera escrito
                    var chat = null;
                    if (typeof aulaChatFindOrCreate === 'function') {
                        chat = aulaChatFindOrCreate(email, mat, grp);
                        if (chat) {
                            chat.teacherEmail = aulaNormalizarEmail(full.email);
                            chat.teacherName = full.nombre || full.email;
                            if (typeof aulaChatSaveOne === 'function') aulaChatSaveOne(chat);
                            if (typeof aulaChatAbrirDocente === 'function') aulaChatAbrirDocente(chat.id);
                        }
                    }
                }, 80);
            });
        });
    }

    if (window.GeoCloud && GeoCloud.isOn() && typeof GeoCloud.pullUsersAndApply === 'function') {
        GeoCloud.pullUsersAndApply().then(function() {
            pintar(aulaIntegrantesDe(materia, grupo));
        }).catch(function() { pintar(aulaIntegrantesDe(materia, grupo)); });
    } else {
        pintar(aulaIntegrantesDe(materia, grupo));
    }
}

function aulaRenderIntegrantes() {
    var box = document.getElementById('listaIntegrantes');
    if (!box) return;
    var user = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
    if (!user) return;
    var full = typeof aulaUsuarioCompleto === 'function' ? (aulaUsuarioCompleto(user) || user) : user;
    var sel = document.getElementById('intFiltroMateria');
    var materia = sel ? sel.value : '';
    var mats = typeof aulaMateriasUsuario === 'function' ? aulaMateriasUsuario(full) : [];
    if (sel && !sel.dataset.filled) {
        sel.innerHTML = mats.map(function(m) {
            return '<option value="' + escHtml(m.nombre) + '" data-grupo="' + escHtml(m.grupo || '') + '">' +
                escHtml(m.nombre) + (m.grupo ? ' · Grupo ' + escHtml(m.grupo) : '') + '</option>';
        }).join('') || '<option value="">Sin materias</option>';
        sel.dataset.filled = '1';
        if (!materia && sel.options.length) {
            sel.selectedIndex = 0;
            materia = sel.value;
        }
    }
    if (!materia && sel) materia = sel.value;
    var grupo = '';
    if (sel && sel.selectedIndex >= 0 && sel.options[sel.selectedIndex]) {
        grupo = sel.options[sel.selectedIndex].getAttribute('data-grupo') || '';
    }
    if (!grupo) grupo = typeof aulaGrupoDeMateria === 'function' ? aulaGrupoDeMateria(full, materia) : '';

    function pintar(lista) {
        if (!lista.length) {
            box.innerHTML = '<p class="aula-vacio">No hay integrantes para ' + escHtml(materia || 'esta materia') +
                (grupo ? ' · Grupo ' + escHtml(grupo) : '') + '.</p>';
            return;
        }
        var me = aulaNormalizarEmail(full.email);
        box.innerHTML = '<ul class="integrantes-lista">' + lista.map(function(u) {
            var rol = u.rol === 'docente' ? 'docente' : 'estudiante';
            var isMe = aulaNormalizarEmail(u.email) === me;
            var foto = u.foto
                ? '<img class="tabla-foto" src="' + u.foto + '" alt="">'
                : '<span class="tabla-foto tabla-foto-ini">' + escHtml(aulaIniciales(u.nombre)) + '</span>';
            var btn = '';
            if (!isMe && rol === 'estudiante') {
                btn = '<button type="button" class="btn-secundario btn-chat-comp" data-peer="' +
                    escHtml(u.email) + '" data-mat="' + escHtml(materia) + '" data-grp="' + escHtml(grupo) +
                    '">Chatear</button>';
            } else if (!isMe && rol === 'docente') {
                btn = '<button type="button" class="btn-secundario btn-chat-comp" data-peer-doc="1" data-mat="' +
                    escHtml(materia) + '" data-grp="' + escHtml(grupo) + '">Chatear</button>';
            }
            return '<li class="integrante-item' + (rol === 'docente' ? ' es-docente' : '') + (isMe ? ' es-yo' : '') + '">' +
                foto +
                '<div class="integrante-info"><strong>' + escHtml(u.nombre || u.email) + '</strong>' +
                '<span class="integrante-rol">' + rol + (isMe ? ' · tú' : '') + '</span></div>' +
                btn + '</li>';
        }).join('') + '</ul>';
        box.querySelectorAll('.btn-chat-comp').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var mat = btn.getAttribute('data-mat');
                var grp = btn.getAttribute('data-grp') || '';
                if (btn.getAttribute('data-peer-doc')) {
                    // chat con docente de la materia
                    if (typeof aulaChatAbrirEstudiante === 'function') {
                        // switch to chat tab
                        var tab = document.querySelector('#pantallaEstudiante .tab-btn[data-tab="est-chat"]');
                        if (tab) tab.click();
                        setTimeout(function() { aulaChatAbrirEstudiante(mat, grp); }, 50);
                    }
                    return;
                }
                var peer = btn.getAttribute('data-peer');
                aulaChatAbrirCompanero(peer, mat, grp);
            });
        });
    }

    if (window.GeoCloud && GeoCloud.isOn() && typeof GeoCloud.pullUsersAndApply === 'function') {
        GeoCloud.pullUsersAndApply().then(function() {
            pintar(aulaIntegrantesDe(materia, grupo));
        }).catch(function() { pintar(aulaIntegrantesDe(materia, grupo)); });
    } else {
        pintar(aulaIntegrantesDe(materia, grupo));
    }
}

/** Chat entre dos estudiantes del mismo grupo */
function aulaChatPeerId(emailA, emailB, materia, grupo) {
    var a = aulaNormalizarEmail(emailA);
    var b = aulaNormalizarEmail(emailB);
    var pair = [a, b].sort().join('__');
    return 'peer_' + pair + '_' + String(materia || '').replace(/\s+/g, '_') + '_' + String(grupo || '');
}

function aulaChatFindOrCreatePeer(myEmail, peerEmail, materia, grupo) {
    var list = aulaChatLoad();
    var id = aulaChatPeerId(myEmail, peerEmail, materia, grupo);
    var found = list.find(function(c) { return c.id === id; });
    if (found) return found;
    var users = aulaLoad(AULA_KEYS.users, []);
    var peer = users.find(function(u) { return aulaNormalizarEmail(u.email) === aulaNormalizarEmail(peerEmail); });
    var me = users.find(function(u) { return aulaNormalizarEmail(u.email) === aulaNormalizarEmail(myEmail); });
    var chat = {
        id: id,
        type: 'peer',
        materia: materia,
        grupo: grupo || '',
        studentEmail: aulaNormalizarEmail(myEmail),
        studentName: me ? me.nombre : myEmail,
        peerEmail: aulaNormalizarEmail(peerEmail),
        peerName: peer ? peer.nombre : peerEmail,
        teacherEmail: '',
        teacherName: '',
        members: [aulaNormalizarEmail(myEmail), aulaNormalizarEmail(peerEmail)],
        messages: [],
        updatedAt: Date.now()
    };
    list.push(chat);
    aulaChatSaveOne(chat);
    return chat;
}

function aulaChatAbrirCompanero(peerEmail, materia, grupo) {
    var user = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
    if (!user || !peerEmail) return;
    // Activar pestaña chat
    var tab = document.querySelector('#pantallaEstudiante .tab-btn[data-tab="est-chat"]');
    if (tab) tab.click();
    var c = aulaChatFindOrCreatePeer(user.email, peerEmail, materia, grupo || '');
    window.__chatActivoId = c.id;
    var hdr = document.getElementById('estChatHeader');
    if (hdr) {
        hdr.textContent = (c.peerName || peerEmail) + ' · compañero · ' + materia +
            (c.grupo ? ' · Grupo ' + c.grupo : '');
    }
    var inp = document.getElementById('estChatInput');
    var btn = document.getElementById('btnEstChatEnviar');
    if (inp) { inp.disabled = false; inp.focus(); }
    if (btn) btn.disabled = false;
    aulaChatMarkRead(c.id, user.email);
    aulaChatRenderMsgs('estChatMsgs', c, user.email);
    if (typeof aulaChatRenderListaEstudiante === 'function') aulaChatRenderListaEstudiante();
}


// =========================================
// CHAT POR MATERIA (estudiante ↔ docente)
// =========================================
var CHAT_KEY = 'gm_chats_v1';
window.__chatActivoId = null;

function aulaChatLoad() {
    try {
        var raw = localStorage.getItem(CHAT_KEY);
        if (!raw) return [];
        var list = JSON.parse(raw);
        if (!Array.isArray(list)) return [];
        // solo objetos de chat válidos
        return list.filter(function(c) {
            return c && typeof c === 'object' && c.id && c.studentEmail;
        });
    } catch (e) { return []; }
}
function aulaChatSave(list) {
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(list || [])); } catch (e) {}
    try {
        if (window.GeoCloud && GeoCloud.isOn()) {
            if (typeof GeoCloud.pushChats === 'function') GeoCloud.pushChats(list || []);
        }
    } catch (e) {}
}
/** Guarda y sube un solo chat a la nube (merge seguro) */
function aulaChatSaveOne(chat) {
    if (!chat || !chat.id) return;
    var list = aulaChatLoad();
    var idx = list.findIndex(function(x) { return x.id === chat.id; });
    if (idx >= 0) list[idx] = chat;
    else list.push(chat);
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(list)); } catch (e) {}
    try {
        if (window.GeoCloud && GeoCloud.isOn() && typeof GeoCloud.pushChat === 'function') {
            GeoCloud.pushChat(chat);
        } else if (window.GeoCloud && GeoCloud.isOn()) {
            GeoCloud.pushChats([chat]);
        }
    } catch (e) {}
}
function aulaChatId() {
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

/** Normaliza lista de grupos "A, B, C" → ["A","B","C"] */
function aulaParseGrupos(str) {
    return String(str || '')
        .split(',')
        .map(function(g) { return g.trim(); })
        .filter(Boolean);
}
/** ¿El docente dicta esta materia y este grupo exacto? */
function aulaDocenteDicta(user, materia, grupo) {
    if (!user || user.rol !== 'docente') return false;
    var mats = aulaMateriasUsuario(user);
    // Sin materias en el registro → no dicta ningún grupo (evita que el demo capture todo)
    if (!mats.length) return false;
    var gWant = String(grupo || '').trim().toUpperCase();
    for (var i = 0; i < mats.length; i++) {
        if (mats[i].nombre !== materia) continue;
        var grupos = mats[i].grupos;
        if (!grupos || !grupos.length) {
            grupos = aulaParseGrupos(mats[i].grupo);
        }
        // Materia marcada pero sin grupos → no asignar chats de grupo concreto
        if (!grupos.length) {
            // Solo coincide si el estudiante tampoco tiene grupo
            if (!gWant) return true;
            continue;
        }
        if (!gWant) {
            // sin grupo pedido: el docente sí dicta esa materia
            return true;
        }
        if (grupos.some(function(g) { return String(g).trim().toUpperCase() === gWant; })) {
            return true;
        }
    }
    return false;
}
/**
 * Busca el docente de esa materia + grupo.
 * Solo coincide si el docente registró ese grupo (ej. "A, B").
 * No usa el demo como comodín.
 */
function aulaBuscarDocenteMateria(materia, grupo) {
    var users = aulaLoad(AULA_KEYS.users, []);
    var gWant = String(grupo || '').trim();
    // 1) Coincidencia exacta materia + grupo
    var candidatos = users.filter(function(u) {
        if (!u || u.rol !== 'docente') return false;
        // preferir docentes reales (con materias)
        return aulaDocenteDicta(u, materia, gWant);
    });
    // Preferir no-demo si hay varios
    var real = candidatos.filter(function(u) {
        return aulaNormalizarEmail(u.email) !== 'docente.demo@unipamplona.edu.co';
    });
    if (real.length) return real[0];
    if (candidatos.length) return candidatos[0];
    // 2) Sin fallback al demo genérico: null → el chat queda sin docente hasta que exista uno
    return null;
}

function aulaChatDocenteEmail() {
    var users = aulaLoad(AULA_KEYS.users, []);
    var d = users.find(function(u) { return u && u.rol === 'docente' && u.email; });
    if (d) return d.email;
    return 'docente.demo@unipamplona.edu.co';
}
function aulaChatDocenteNombre() {
    var users = aulaLoad(AULA_KEYS.users, []);
    var email = aulaChatDocenteEmail();
    var d = users.find(function(u) { return aulaNormalizarEmail(u.email) === aulaNormalizarEmail(email); });
    if (d) {
        if (d.nombre && d.nombre !== 'Docente') return d.nombre;
        var full = ((d.nombres || '') + ' ' + (d.apellidos || '')).trim();
        if (full) return full;
        if (d.email) return d.email.split('@')[0];
    }
    // primer docente con nombre real
    var any = users.find(function(u) { return u.rol === 'docente' && u.nombre && u.nombre !== 'Docente'; });
    if (any) return any.nombre;
    return 'Docente';
}
function aulaChatFmtHora(ts) {
    try {
        var d = new Date(ts);
        return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
}

/** Nombre visible del docente para materia/grupo (desde registro real) */
function aulaNombreDocentePara(materia, grupo, chat) {
    if (chat && chat.teacherName && chat.teacherName !== 'Docente' && chat.teacherName.toLowerCase() !== 'docente') {
        return chat.teacherName;
    }
    if (chat && chat.teacherEmail) {
        var users = aulaLoad(AULA_KEYS.users, []);
        var u = users.find(function(x) {
            return aulaNormalizarEmail(x.email) === aulaNormalizarEmail(chat.teacherEmail);
        });
        if (u && u.nombre) return u.nombre;
        if (chat.teacherEmail) return chat.teacherEmail.split('@')[0];
    }
    var doc = typeof aulaBuscarDocenteMateria === 'function' ? aulaBuscarDocenteMateria(materia, grupo) : null;
    if (doc) {
        if (doc.nombre && doc.nombre !== 'Docente') return doc.nombre;
        if (doc.nombres || doc.apellidos) return ((doc.nombres || '') + ' ' + (doc.apellidos || '')).trim();
        if (doc.email) return doc.email.split('@')[0];
    }
    var n = typeof aulaChatDocenteNombre === 'function' ? aulaChatDocenteNombre() : '';
    if (n && n !== 'Docente') return n;
    return 'Docente';
}

function aulaChatFindOrCreate(studentEmail, materia, grupo) {
    var list = aulaChatLoad();
    var se = aulaNormalizarEmail(studentEmail);
    var g = String(grupo || '').trim();
    var gNorm = g.toUpperCase();
    var found = list.find(function(c) {
        if (!c || typeof c !== 'object') return false;
        var sameStudent = aulaNormalizarEmail(c.studentEmail) === se;
        var sameMat = (c.materia || '') === materia;
        var sameGrp = String(c.grupo || '').trim().toUpperCase() === gNorm;
        return sameStudent && sameMat && sameGrp;
    });
    // Asegurar usuarios frescos desde nube si es posible (sync ya corrió al iniciar)
    var doc = typeof aulaBuscarDocenteMateria === 'function' ? aulaBuscarDocenteMateria(materia, g) : null;
    var tEmail = doc ? aulaNormalizarEmail(doc.email) : aulaNormalizarEmail(aulaChatDocenteEmail());
    var tName = doc
        ? (doc.nombre && doc.nombre !== 'Docente' ? doc.nombre : (((doc.nombres || '') + ' ' + (doc.apellidos || '')).trim() || (doc.email || '').split('@')[0]))
        : aulaChatDocenteNombre();
    if (!tEmail) tEmail = '';
    if (found) {
        var changed = false;
        if (tEmail && aulaNormalizarEmail(found.teacherEmail || '') !== tEmail) {
            found.teacherEmail = tEmail;
            found.teacherName = tName;
            changed = true;
        }
        if (changed) aulaChatSaveOne(found);
        return found;
    }
    var user = (aulaLoad(AULA_KEYS.users, [])).find(function(u) {
        return aulaNormalizarEmail(u.email) === se;
    });
    var chat = {
        id: aulaChatId(),
        materia: materia,
        grupo: g,
        studentEmail: se,
        studentName: user ? (user.nombre || se) : se,
        teacherEmail: tEmail,
        teacherName: tName || 'Docente',
        messages: [],
        updatedAt: Date.now()
    };
    list.push(chat);
    aulaChatSaveOne(chat);
    return chat;
}
function aulaChatUnread(chat, forEmail) {
    if (!chat || !chat.messages) return 0;
    var n = 0;
    chat.messages.forEach(function(m) {
        if (m.from !== forEmail && !m.readBy) n++;
        else if (m.from !== forEmail && m.readBy && m.readBy.indexOf(forEmail) < 0) n++;
    });
    return n;
}
function aulaChatMarkRead(chatId, readerEmail) {
    var list = aulaChatLoad();
    var c = list.find(function(x) { return x.id === chatId; });
    if (!c) return;
    c.messages.forEach(function(m) {
        if (m.from === readerEmail) return;
        if (!m.readBy) m.readBy = [readerEmail];
        else if (m.readBy.indexOf(readerEmail) < 0) m.readBy.push(readerEmail);
    });
    aulaChatSave(list);
}
function aulaChatSend(chatId, fromEmail, text) {
    text = (text || '').trim();
    if (!text || !chatId) return false;
    var list = aulaChatLoad();
    var c = list.find(function(x) { return x.id === chatId; });
    if (!c) return false;
    if (!c.messages) c.messages = [];
    c.messages.push({
        id: 'm_' + Date.now().toString(36),
        from: aulaNormalizarEmail(fromEmail),
        text: text,
        ts: Date.now(),
        readBy: [aulaNormalizarEmail(fromEmail)]
    });
    c.updatedAt = Date.now();
    // re-asignar docente si faltaba
    if (!c.teacherEmail) {
        var doc = typeof aulaBuscarDocenteMateria === 'function' ? aulaBuscarDocenteMateria(c.materia, c.grupo) : null;
        if (doc) {
            c.teacherEmail = aulaNormalizarEmail(doc.email);
            c.teacherName = doc.nombre || doc.email;
        }
    }
    aulaChatSaveOne(c);
    return true;
}
function aulaChatRenderMsgs(containerId, chat, meEmail) {
    var box = document.getElementById(containerId);
    if (!box) return;
    if (!chat || !chat.messages || !chat.messages.length) {
        box.innerHTML = '<p class="login-hint" style="text-align:center;margin-top:40px;">Sin mensajes. ¡Escribe el primero!</p>';
        return;
    }
    box.innerHTML = chat.messages.map(function(m) {
        var propia = m.from === meEmail;
        return '<div class="chat-burbuja ' + (propia ? 'propia' : 'ajena') + '">' +
            escHtml(m.text) +
            '<time>' + aulaChatFmtHora(m.ts) + (propia ? '' : ' · ' + escHtml(m.from.split('@')[0])) + '</time></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
}
function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function aulaChatRenderListaDocente() {
    var user = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
    if (!user) return;
    var mat = (document.getElementById('docChatMateria') || {}).value || '';
    var grp = ((document.getElementById('docChatGrupo') || {}).value || '').trim();
    var myEmail = aulaNormalizarEmail(user.email);
    var list = aulaChatLoad().filter(function(c) {
        if (!c || typeof c !== 'object' || !c.id) return false;
        if (c.type === 'peer') return false; // chats entre estudiantes no van al docente
        if (mat && c.materia !== mat) return false;
        if (grp && String(c.grupo || '').trim().toUpperCase() !== grp.toUpperCase()) return false;
        // Chats dirigidos a este docente
        if (c.teacherEmail && aulaNormalizarEmail(c.teacherEmail) === myEmail) return true;
        // Solo si dicta esa materia y grupo
        if (typeof aulaDocenteDicta === 'function' && aulaDocenteDicta(user, c.materia, c.grupo)) {
            if (!c.teacherEmail || aulaNormalizarEmail(c.teacherEmail) !== myEmail) {
                c.teacherEmail = myEmail;
                c.teacherName = user.nombre || myEmail;
                aulaChatSaveOne(c);
            }
            return true;
        }
        return false;
    }).sort(function(a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });

    var el = document.getElementById('docChatLista');
    if (!el) return;
    if (!list.length) {
        el.innerHTML = '<p class="login-hint">No hay conversaciones con este filtro. Los chats aparecen cuando un estudiante escribe.</p>';
        return;
    }
    el.innerHTML = list.map(function(c) {
        var last = c.messages && c.messages.length ? c.messages[c.messages.length - 1].text : 'Sin mensajes';
        var un = aulaChatUnread(c, user.email);
        var act = window.__chatActivoId === c.id ? ' active' : '';
        return '<button type="button" class="chat-aula-item' + act + '" data-chat-id="' + c.id + '">' +
            '<strong>' + escHtml(c.studentName || c.studentEmail) + '</strong>' +
            '<span>' + escHtml(c.materia) + (c.grupo ? ' · Grupo ' + escHtml(c.grupo) : '') + '</span>' +
            '<span class="chat-preview">' + escHtml(last) + '</span>' +
            (un ? '<span class="chat-unread">' + un + ' nuevo' + (un > 1 ? 's' : '') + '</span>' : '') +
            '</button>';
    }).join('');
    el.querySelectorAll('[data-chat-id]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            aulaChatAbrirDocente(btn.getAttribute('data-chat-id'));
        });
    });
    aulaChatUpdateBadges();
}

function aulaChatAbrirDocente(chatId) {
    var user = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
    if (!user) return;
    var list = aulaChatLoad();
    var c = list.find(function(x) { return x.id === chatId; });
    if (!c) return;
    window.__chatActivoId = chatId;
    // Alinear filtro con la conversación abierta
    var sm = document.getElementById('docChatMateria');
    if (sm) sm.value = '';
    var sg = document.getElementById('docChatGrupo');
    if (sg) sg.value = '';
    aulaChatMarkRead(chatId, user.email);
    var hdr = document.getElementById('docChatHeader');
    if (hdr) hdr.textContent = (c.studentName || c.studentEmail) + ' · ' + c.materia + (c.grupo ? ' · Grupo ' + c.grupo : '');
    var inp = document.getElementById('docChatInput');
    var btn = document.getElementById('btnDocChatEnviar');
    if (inp) { inp.disabled = false; inp.focus(); }
    if (btn) btn.disabled = false;
    aulaChatRenderMsgs('docChatMsgs', c, user.email);
    aulaChatRenderListaDocente();
}

function aulaChatRenderListaEstudiante() {
    var session = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
    if (!session) return;
    // Usuario completo desde storage (todas las materias del registro)
    var user = typeof aulaUsuarioCompleto === 'function' ? aulaUsuarioCompleto(session) : session;
    var mats = typeof aulaMateriasUsuario === 'function' ? aulaMateriasUsuario(user) : [];
    // Si por alguna razón no hay materias en el objeto, intentar desde users storage
    if (!mats.length) {
        var all = aulaLoad(AULA_KEYS.users, []);
        var u2 = all.find(function(x) { return aulaNormalizarEmail(x.email) === aulaNormalizarEmail(user.email); });
        if (u2) {
            user = u2;
            mats = aulaMateriasUsuario(u2);
        }
    }
    var list = aulaChatLoad().filter(function(c) {
        return aulaNormalizarEmail(c.studentEmail) === aulaNormalizarEmail(user.email);
    }).sort(function(a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    var el = document.getElementById('estChatLista');
    if (!el) return;
    var byMat = {};
    list.forEach(function(c) {
        byMat[c.materia + '||' + (c.grupo || '')] = c;
    });
    var items = mats.map(function(m) {
        var key = m.nombre + '||' + (m.grupo || '');
        return { materia: m.nombre, grupo: m.grupo || '', chat: byMat[key] || null, peer: false };
    });
    // Chats con compañeros
    list.forEach(function(c) {
        if (c.type === 'peer' && c.members && c.members.indexOf(aulaNormalizarEmail(user.email)) >= 0) {
            items.push({
                materia: c.peerName || c.peerEmail || 'Compañero',
                grupo: c.grupo || '',
                chat: c,
                peer: true,
                peerEmail: c.peerEmail
            });
        }
    });
    // Siempre rellenar el select con TODAS las materias
    var sel = document.getElementById('estChatMateria');
    if (sel) {
        var prev = sel.value;
        var prevGrp = '';
        try {
            if (sel.selectedIndex >= 0 && sel.options[sel.selectedIndex]) {
                prevGrp = sel.options[sel.selectedIndex].getAttribute('data-grupo') || '';
            }
        } catch (e) {}
        sel.innerHTML = mats.map(function(m) {
            return '<option value="' + escHtml(m.nombre) + '" data-grupo="' + escHtml(m.grupo || '') + '">' +
                escHtml(m.nombre) + (m.grupo ? ' · Grupo ' + escHtml(m.grupo) : '') + '</option>';
        }).join('') || '<option value="">Sin materias</option>';
        // restaurar selección si sigue existiendo
        for (var oi = 0; oi < sel.options.length; oi++) {
            if (sel.options[oi].value === prev && (sel.options[oi].getAttribute('data-grupo') || '') === prevGrp) {
                sel.selectedIndex = oi;
                break;
            }
        }
        sel.dataset.filled = '1';
    }
    if (!items.length) {
        el.innerHTML = '<p class="login-hint">No tienes materias registradas. Vuelve a registrarte eligiendo materias y grupos.</p>';
        aulaChatUpdateBadges();
        return;
    }
    el.innerHTML = items.map(function(it) {
        var c = it.chat;
        var tName = typeof aulaNombreDocentePara === 'function'
            ? aulaNombreDocentePara(it.materia, it.grupo, c)
            : ((c && c.teacherName) || 'Docente');
        var last = c && c.messages && c.messages.length ? c.messages[c.messages.length - 1].text : 'Toca para escribir al docente';
        var un = c ? aulaChatUnread(c, user.email) : 0;
        var act = c && window.__chatActivoId === c.id ? ' active' : '';
        if (it.peer) {
            var lastP = c && c.messages && c.messages.length ? c.messages[c.messages.length - 1].text : 'Toca para chatear';
            var unP = c ? aulaChatUnread(c, user.email) : 0;
            var actP = c && window.__chatActivoId === c.id ? ' active' : '';
            return '<button type="button" class="chat-aula-item' + actP + '" data-peer="1" data-peer-email="' +
                escHtml(it.peerEmail || '') + '" data-chat-mat="' + escHtml(c ? c.materia : '') +
                '" data-chat-grp="' + escHtml(it.grupo) + '"' + (c ? ' data-chat-id="' + c.id + '"' : '') + '>' +
                '<strong>' + escHtml(it.materia) + '</strong>' +
                '<span>Compañero · Grupo ' + escHtml(it.grupo || '—') + '</span>' +
                '<span class="chat-preview">' + escHtml(lastP) + '</span>' +
                (unP ? '<span class="chat-unread">' + unP + '</span>' : '') +
                '</button>';
        }
        return '<button type="button" class="chat-aula-item' + act + '" data-chat-mat="' + escHtml(it.materia) + '" data-chat-grp="' + escHtml(it.grupo) + '"' +
            (c ? ' data-chat-id="' + c.id + '"' : '') + '>' +
            '<strong>' + escHtml(it.materia) + '</strong>' +
            '<span>Grupo ' + escHtml(it.grupo || '—') + ' · ' + escHtml(tName) + '</span>' +
            '<span class="chat-preview">' + escHtml(last) + '</span>' +
            (un ? '<span class="chat-unread">' + un + ' nuevo' + (un > 1 ? 's' : '') + '</span>' : '') +
            '</button>';
    }).join('');
    el.querySelectorAll('.chat-aula-item').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (btn.getAttribute('data-peer') === '1') {
                aulaChatAbrirCompanero(btn.getAttribute('data-peer-email'), btn.getAttribute('data-chat-mat'), btn.getAttribute('data-chat-grp') || '');
                return;
            }
            aulaChatAbrirEstudiante(btn.getAttribute('data-chat-mat'), btn.getAttribute('data-chat-grp') || '');
        });
    });
    aulaChatUpdateBadges();
}

function aulaChatAbrirEstudiante(materia, grupo) {
    var session = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
    if (!session || !materia) return;
    var user = typeof aulaUsuarioCompleto === 'function' ? aulaUsuarioCompleto(session) : session;
    var g = (grupo != null && grupo !== '') ? grupo : aulaGrupoDeMateria(user, materia);
    var c = aulaChatFindOrCreate(user.email, materia, g);
    window.__chatActivoId = c.id;
    aulaChatMarkRead(c.id, user.email);
    var hdr = document.getElementById('estChatHeader');
    if (hdr) {
        var tn = 'Sin docente asignado';
        if (c.teacherEmail) {
            tn = aulaNombreDocentePara(materia, c.grupo || g, c);
            if (tn && tn !== 'Docente') {
                c.teacherName = tn;
                aulaChatSaveOne(c);
            }
        } else {
            tn = 'Sin docente para este grupo (aún no se registra)';
        }
        hdr.textContent = materia + (c.grupo ? ' · Grupo ' + c.grupo : '') + ' · ' + tn;
    }
    var inp = document.getElementById('estChatInput');
    var btn = document.getElementById('btnEstChatEnviar');
    if (inp) { inp.disabled = false; inp.focus(); }
    if (btn) btn.disabled = false;
    // reload chat after find
    c = aulaChatLoad().find(function(x) { return x.id === c.id; }) || c;
    aulaChatRenderMsgs('estChatMsgs', c, user.email);
    aulaChatRenderListaEstudiante();
}

function aulaChatUpdateBadges() {
    var user = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
    if (!user) return;
    var list = aulaChatLoad();
    var total = 0;
    if (user.rol === 'docente') {
        list.forEach(function(c) { total += aulaChatUnread(c, user.email); });
        var b = document.getElementById('badgeChatDoc');
        if (b) {
            if (total > 0) { b.hidden = false; b.textContent = String(total); }
            else b.hidden = true;
        }
    } else {
        list.filter(function(c) { return c.studentEmail === user.email; })
            .forEach(function(c) { total += aulaChatUnread(c, user.email); });
        var b2 = document.getElementById('badgeChatEst');
        if (b2) {
            if (total > 0) { b2.hidden = false; b2.textContent = String(total); }
            else b2.hidden = true;
        }
    }
}

function aulaChatBind() {
    try {
        if (window.GeoCloud && GeoCloud.isOn() && !window.__chatCloudListening) {
            window.__chatCloudListening = true;
            GeoCloud.listenChats(function (list) {
                try {
                    var incoming = (list || []).filter(function(c) {
                        return c && typeof c === 'object' && c.id;
                    });
                    // Fusionar con local: si hay mismo id, quedar el de más mensajes / updatedAt mayor
                    var local = [];
                    try { local = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]') || []; } catch (e2) { local = []; }
                    if (!Array.isArray(local)) local = [];
                    var byId = {};
                    local.forEach(function(c) {
                        if (c && c.id) byId[c.id] = c;
                    });
                    incoming.forEach(function(c) {
                        var prev = byId[c.id];
                        if (!prev) { byId[c.id] = c; return; }
                        var pm = (prev.messages && prev.messages.length) || 0;
                        var cm = (c.messages && c.messages.length) || 0;
                        if (cm > pm || (c.updatedAt || 0) >= (prev.updatedAt || 0)) byId[c.id] = c;
                    });
                    var merged = Object.keys(byId).map(function(k) { return byId[k]; });
                    localStorage.setItem(CHAT_KEY, JSON.stringify(merged));
                    var user = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
                    if (!user) return;
                    if (user.rol === 'docente') {
                        if (typeof aulaChatRenderListaDocente === 'function') aulaChatRenderListaDocente();
                        if (window.__chatActivoId && typeof aulaChatRenderMsgs === 'function') {
                            var c = merged.find(function (x) { return x.id === window.__chatActivoId; });
                            if (c) aulaChatRenderMsgs('docChatMsgs', c, user.email);
                        }
                    } else {
                        if (typeof aulaChatRenderListaEstudiante === 'function') aulaChatRenderListaEstudiante();
                        if (window.__chatActivoId && typeof aulaChatRenderMsgs === 'function') {
                            var c2 = merged.find(function (x) { return x.id === window.__chatActivoId; });
                            if (c2) aulaChatRenderMsgs('estChatMsgs', c2, user.email);
                        }
                    }
                    if (typeof aulaChatUpdateBadges === 'function') aulaChatUpdateBadges();
                } catch (e) {}
            });
        }
    } catch (e) {}

    if (window.__chatBound) return;
    window.__chatBound = true;

    var btnDoc = document.getElementById('btnDocChatEnviar');
    var inpDoc = document.getElementById('docChatInput');
    function sendDoc() {
        var user = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
        if (!user || !window.__chatActivoId) return;
        if (aulaChatSend(window.__chatActivoId, user.email, (inpDoc || {}).value)) {
            if (inpDoc) inpDoc.value = '';
            var c = aulaChatLoad().find(function(x) { return x.id === window.__chatActivoId; });
            aulaChatRenderMsgs('docChatMsgs', c, user.email);
            aulaChatRenderListaDocente();
        }
    }
    if (btnDoc) btnDoc.addEventListener('click', sendDoc);
    if (inpDoc) inpDoc.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); sendDoc(); }
    });
    var fDoc = document.getElementById('btnDocChatFiltro');
    if (fDoc) fDoc.addEventListener('click', aulaChatRenderListaDocente);

    var btnEst = document.getElementById('btnEstChatEnviar');
    var inpEst = document.getElementById('estChatInput');
    function sendEst() {
        var user = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
        if (!user || !window.__chatActivoId) return;
        if (aulaChatSend(window.__chatActivoId, user.email, (inpEst || {}).value)) {
            if (inpEst) inpEst.value = '';
            var c = aulaChatLoad().find(function(x) { return x.id === window.__chatActivoId; });
            aulaChatRenderMsgs('estChatMsgs', c, user.email);
            aulaChatRenderListaEstudiante();
        }
    }
    if (btnEst) btnEst.addEventListener('click', sendEst);
    if (inpEst) inpEst.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); sendEst(); }
    });
    var abrir = document.getElementById('btnEstChatAbrir');
    if (abrir) abrir.addEventListener('click', function() {
        var sel = document.getElementById('estChatMateria');
        if (!sel || !sel.value) return;
        var opt = sel.options[sel.selectedIndex];
        var grp = opt ? (opt.getAttribute('data-grupo') || '') : '';
        aulaChatAbrirEstudiante(sel.value, grp);
    });

    // When switching to chat tab, refresh
    document.querySelectorAll('#pantallaDocente .tab-btn, #pantallaEstudiante .tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tab = btn.getAttribute('data-tab');
            setTimeout(function() {
                if (tab === 'doc-integrantes') {
                    if (typeof aulaRenderIntegrantesDocente === 'function') aulaRenderIntegrantesDocente();
                }
                if (tab === 'doc-integrantes') {
                    document.querySelectorAll('main').forEach(function(m) {
                        if (m.id !== 'pantallaDocente') m.style.display = 'none';
                    });
                    var pdi = document.getElementById('pantallaDocente');
                    if (pdi) pdi.style.display = 'block';
                    if (typeof aulaRenderIntegrantesDocente === 'function') aulaRenderIntegrantesDocente();
                }
                if (tab === 'doc-chat') {
                    document.querySelectorAll('main').forEach(function(m) {
                        if (m.id !== 'pantallaDocente') m.style.display = 'none';
                    });
                    var pd = document.getElementById('pantallaDocente');
                    if (pd) pd.style.display = 'block';
                    aulaChatRenderListaDocente();
                }
                if (tab === 'est-chat') {
                    document.querySelectorAll('main').forEach(function(m) {
                        if (m.id !== 'pantallaEstudiante') m.style.display = 'none';
                    });
                    var pe = document.getElementById('pantallaEstudiante');
                    if (pe) pe.style.display = 'block';
                    var sel = document.getElementById('estChatMateria');
                    if (sel) sel.dataset.filled = '';
                    aulaChatRenderListaEstudiante();
                }
            }, 50);
        });
    });
}

// Hook into existing renders
(function hookChatRenders() {
    var _doc = window.aulaRenderDocente;
    if (typeof _doc === 'function') {
        window.aulaRenderDocente = function() {
            _doc.apply(this, arguments);
            try { aulaChatBind(); aulaChatUpdateBadges(); } catch (e) {}
        };
    }
    var _est = window.aulaRenderEstudiante;
    if (typeof _est === 'function') {
        window.aulaRenderEstudiante = function() {
            _est.apply(this, arguments);
            try {
                var sel = document.getElementById('estChatMateria');
                if (sel) sel.dataset.filled = '';
                aulaChatBind();
                aulaChatUpdateBadges();
            } catch (e) {}
        };
    }
})();


// =========================================
// PANEL ADMINISTRADOR
// =========================================
function aulaAbrirAdmin() {
    var user = aulaGetSession();
    if (!user || !aulaEsAdminEmail(user.email)) {
        alert('No tienes permisos de administrador.');
        return;
    }
    document.querySelectorAll('main').forEach(function(m) { m.style.display = 'none'; });
    var el = document.getElementById('pantallaAdmin');
    if (el) el.style.display = 'block';
    // cerrar dropdown
    var dd = document.getElementById('menuUserDropdown');
    if (dd) dd.hidden = true;
    aulaRenderAdmin();
}

function aulaRenderAdmin() {
    var base = aulaDocentesBase();
    var extra = aulaDocentesExtraLoad();
    var lista = document.getElementById('adminListaDocentes');
    if (lista) {
        var rows = [];
        var seen = {};
        function addRow(r) {
            var em = aulaNormalizarEmail(r.email);
            if (!em || seen[em]) {
                if (seen[em]) {
                    var prev = rows.find(function(x) { return x.email === em; });
                    if (prev) {
                        if (r.registrado) {
                            prev.registrado = true;
                            // Nombre del registro tiene prioridad
                            if (r.nombre) prev.nombre = r.nombre;
                        } else if (r.nombre && !prev.nombre) {
                            prev.nombre = r.nombre;
                        }
                        if (r.fijo) prev.fijo = true;
                        if (r.autorizado) prev.autorizado = true;
                    }
                }
                return;
            }
            seen[em] = true;
            r.email = em;
            rows.push(r);
        }
        base.forEach(function(e) {
            addRow({ email: e, nombre: '', fijo: true, autorizado: true, registrado: false });
        });
        extra.forEach(function(item) {
            var em = typeof item === 'string' ? item : item.email;
            var nom = typeof item === 'string' ? '' : (item.nombre || '');
            if (!em) return;
            addRow({ email: em, nombre: nom, fijo: false, autorizado: true, registrado: false });
        });
        // Cuentas registradas como docente
        aulaLoad(AULA_KEYS.users, []).forEach(function(u) {
            if (!u || !u.email) return;
            if (u.rol !== 'docente') return;
            // Nombre tal cual se registró el docente
            addRow({
                email: u.email,
                nombre: u.nombre || ((u.nombres || '') + ' ' + (u.apellidos || '')).trim(),
                fijo: false,
                autorizado: aulaEsDocenteEmail(u.email),
                registrado: true
            });
        });
        if (!rows.length) {
            lista.innerHTML = '<p class="login-hint">No hay docentes cargados ni registrados.</p>';
        } else {
            lista.innerHTML = '<p class="login-hint" style="margin-bottom:10px;">Puedes quitar el cargo de docente a quien no deba tenerlo (excepto lista base y superadmin).</p>' +
            rows.map(function(r) {
                var badges = '';
                if (r.fijo) badges += ' <span class="admin-badge">lista base</span>';
                if (r.autorizado && !r.fijo) badges += ' <span class="admin-badge">autorizado</span>';
                if (r.registrado) badges += ' <span class="admin-badge">cuenta activa</span>';
                if (aulaEsAdminEmail(r.email)) badges += ' <span class="admin-badge">admin</span>';
                var canRemove = !r.fijo && r.email !== aulaNormalizarEmail(typeof AULA_SUPER_ADMIN !== 'undefined' ? AULA_SUPER_ADMIN : '');
                return '<div class="admin-row" data-email="' + escHtml(r.email) + '">' +
                    '<div><strong>' + escHtml(r.nombre || r.email.split('@')[0]) + '</strong>' +
                    '<br><span>' + escHtml(r.email) + '</span>' + badges + '</div>' +
                    (canRemove
                        ? '<button type="button" class="btn-admin-del" data-del-doc="' + escHtml(r.email) + '">Quitar docente</button>'
                        : '<span class="login-hint">Protegido</span>') +
                    '</div>';
            }).join('');
            lista.querySelectorAll('[data-del-doc]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    if (confirm('¿Quitar el rol de docente a ' + btn.getAttribute('data-del-doc') + '?')) {
                        aulaAdminQuitarDocente(btn.getAttribute('data-del-doc'));
                    }
                });
            });
        }
    }
    var adminsEl = document.getElementById('adminListaAdmins');
    if (adminsEl) {
        var ads = aulaAdminsLoad();
        adminsEl.innerHTML = '<h4 style="margin:0 0 8px;color:#e8b84a;">Administradores actuales</h4>' +
            ads.map(function(e) {
                var fijo = e === aulaNormalizarEmail(AULA_SUPER_ADMIN);
                return '<div class="admin-row"><div><strong>' + escHtml(e) + '</strong>' +
                    (fijo ? ' <span class="admin-badge">superadmin</span>' : '') + '</div>' +
                    (fijo ? '' : '<button type="button" class="btn-admin-del" data-del-adm="' + escHtml(e) + '">Quitar admin</button>') +
                    '</div>';
            }).join('');
        adminsEl.querySelectorAll('[data-del-adm]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                aulaAdminQuitarAdmin(btn.getAttribute('data-del-adm'));
            });
        });
    }
}

function aulaAdminAddDocente() {
    var err = document.getElementById('adminDocError');
    var ok = document.getElementById('adminDocOk');
    if (err) err.textContent = '';
    if (ok) ok.hidden = true;
    var email = aulaNormalizarEmail((document.getElementById('adminDocEmail') || {}).value);
    var nombreNota = ((document.getElementById('adminDocNombre') || {}).value || '').trim();
    if (!email || !email.endsWith('@' + aulaDominio())) {
        if (err) err.textContent = 'Usa un correo @' + aulaDominio();
        return;
    }
    if (aulaEsDocenteEmail(email)) {
        if (err) err.textContent = 'Ese correo ya está autorizado como docente.';
        return;
    }
    // Solo autorizar el correo (whitelist). El docente debe registrarse y crear su contraseña.
    var extra = aulaDocentesExtraLoad();
    extra.push({ email: email, nombre: nombreNota, autorizadoEn: Date.now() });
    aulaDocentesExtraSave(extra);
    // Si ya tenía cuenta de estudiante, no la convertimos aún: al registrarse como docente se actualizará
    if (ok) {
        ok.hidden = false;
        ok.textContent = 'Autorizado: ' + email + '. La persona debe ir a la pestaña «Docente», completar nombres y crear su contraseña.';
    }
    var inp = document.getElementById('adminDocEmail'); if (inp) inp.value = '';
    var inpN = document.getElementById('adminDocNombre'); if (inpN) inpN.value = '';
    aulaRenderAdmin();
}

function aulaAdminQuitarDocente(email) {
    email = aulaNormalizarEmail(email);
    var superE = aulaNormalizarEmail(typeof AULA_SUPER_ADMIN !== 'undefined' ? AULA_SUPER_ADMIN : 'andres.enriquezval@unipamplona.edu.co');
    if (!email || email === superE) return;
    if (aulaDocentesBase().indexOf(email) >= 0) {
        alert('No se puede quitar un docente de la lista base del sistema.');
        return;
    }
    var extra = aulaDocentesExtraLoad().filter(function(item) {
        var e = typeof item === 'string' ? item : (item && item.email);
        return aulaNormalizarEmail(e) !== email;
    });
    aulaDocentesExtraSave(extra);
    // Quitar cargo: pasa a estudiante (conserva la cuenta)
    var users = aulaLoad(AULA_KEYS.users, []);
    var found = false;
    users.forEach(function(u) {
        if (aulaNormalizarEmail(u.email) === email && u.rol === 'docente') {
            u.rol = 'estudiante';
            found = true;
        }
    });
    aulaSave(AULA_KEYS.users, users);
    // también quitar admin si lo tenía
    var ads = aulaAdminsLoad().filter(function(e) { return e !== email; });
    aulaAdminsSave(ads);
    aulaRenderAdmin();
    alert(found
        ? 'Se quitó el rol de docente. La cuenta sigue existiendo como estudiante.'
        : 'Se eliminó la autorización de docente para ese correo.');
}

function aulaAdminPromoverAdmin() {
    var err = document.getElementById('adminPromoError');
    if (err) err.textContent = '';
    var email = aulaNormalizarEmail((document.getElementById('adminPromoEmail') || {}).value);
    if (!email || !email.endsWith('@' + aulaDominio())) {
        if (err) err.textContent = 'Correo institucional inválido.';
        return;
    }
    if (!aulaEsDocenteEmail(email) && email !== aulaNormalizarEmail(AULA_SUPER_ADMIN)) {
        if (err) err.textContent = 'Solo se puede dar admin a un correo ya autorizado como docente.';
        return;
    }
    var ads = aulaAdminsLoad();
    if (ads.indexOf(email) < 0) ads.push(email);
    aulaAdminsSave(ads);
    var inp = document.getElementById('adminPromoEmail'); if (inp) inp.value = '';
    aulaRenderAdmin();
}

function aulaAdminQuitarAdmin(email) {
    email = aulaNormalizarEmail(email);
    if (email === aulaNormalizarEmail(AULA_SUPER_ADMIN)) return;
    var ads = aulaAdminsLoad().filter(function(e) { return e !== email; });
    aulaAdminsSave(ads);
    aulaRenderAdmin();
}

function aulaAdminBind() {
    if (window.__adminBound) return;
    window.__adminBound = true;
    var btn = document.getElementById('btnAdminPanel');
    if (btn) btn.addEventListener('click', aulaAbrirAdmin);
    var back = document.getElementById('btnVolverAdmin');
    if (back) back.addEventListener('click', function() {
        document.querySelectorAll('main').forEach(function(m) { m.style.display = 'none'; });
        var menu = document.getElementById('pantallaMenu');
        if (menu) menu.style.display = 'block';
    });
    var add = document.getElementById('btnAdminAddDocente');
    if (add) add.addEventListener('click', aulaAdminAddDocente);
    var promo = document.getElementById('btnAdminPromo');
    if (promo) promo.addEventListener('click', aulaAdminPromoverAdmin);
}

// auto-bind when session updates
(function() {
    var _orig = window.aulaActualizarUISesion;
    // try common names
})();

document.addEventListener('DOMContentLoaded', function() {
    try { aulaAdminBind(); } catch (e) {}
});
// also bind immediately if DOM ready
if (document.readyState !== 'loading') {
    try { aulaAdminBind(); } catch (e) {}
}
