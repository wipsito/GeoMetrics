// =========================================
// GeoMetrics - JavaScript Principal
// =========================================


// =========================================
// Configuración AI por defecto (si no hay config.js)
// =========================================
if (typeof AI_CONFIG === 'undefined') {
    var AI_CONFIG = {
        provider: 'groq',
        apiKey: '',
        model: 'openai/gpt-oss-20b',
        systemPrompt: 'Eres Civix, la mascota asistente de GeoMetrics, laboratorio virtual de Ingeniería Civil de la Universidad de Pamplona. Eres cercano, motivador y experto en mecánica de suelos, resistencia de materiales, cimentaciones y temas afines. Responde siempre en español de forma clara, didáctica y concisa. Trata al estudiante como futuro ingeniero. Cuando escribas fórmulas usa LaTeX con \\( ... \\) en línea y $$ ... $$ en bloque.'
    };
}
if (typeof API_URLS === 'undefined') {
    var API_URLS = {
        groq: 'https://api.groq.com/openai/v1/chat/completions',
        openai: 'https://api.openai.com/v1/chat/completions'
    };
}

document.addEventListener('DOMContentLoaded', function() {
    // Mantener sesión al refrescar (F5)
    inicializarApp();
});

function on(id, event, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}


(function bindEnterLabGlobal() {
    if (window.__labEnterBound) return;
    window.__labEnterBound = true;
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        var t = e.target;
        if (!t || !t.tagName) return;
        var tag = t.tagName.toUpperCase();
        if (tag !== 'INPUT' && tag !== 'SELECT') return;
        if (t.type === 'button' || t.type === 'submit' || t.type === 'file' || t.type === 'checkbox' || t.type === 'radio') return;
        // Solo dentro de paneles de laboratorio / ensayos / simuladores de datos
        var root = t.closest('.laboratorio-panel, .datos-panel, .ensayo-panel, #panelEnsayo, .sim-controles, .aula-card');
        if (!root) return;
        // No interferir con chat
        if (t.closest('#asistenteModal, .chat-aula-wrap, .asistente-input')) return;
        e.preventDefault();
        var campos = root.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), select');
        campos = Array.prototype.filter.call(campos, function(el) {
            return !el.disabled && el.offsetParent !== null;
        });
        var idx = campos.indexOf(t);
        if (idx < 0) return;
        var next = campos[idx + 1];
        if (next) {
            next.focus();
            if (typeof next.select === 'function' && next.tagName === 'INPUT') {
                try { next.select(); } catch (err) {}
            }
        } else {
            var btn = root.querySelector('.btn-calcular, button.btn-calcular');
            if (btn) btn.focus();
        }
    }, true);
})();

function inicializarApp() {
    // Si hay sesión, no forzar login (F5 mantiene la app)
    var hasSession = false;
    try {
        hasSession = !!(typeof aulaGetSession === 'function' && aulaGetSession());
    } catch (e) {}
    if (!hasSession) {
        mostrarPantalla('inicio');
    }

    // Navegación principal (login controla el acceso; btnComenzar ya no se usa)
    on('btnComenzar', 'click', function() {
        if (typeof aulaGetSession === 'function' && aulaGetSession()) {
            mostrarPantalla('menu');
        } else {
            mostrarPantalla('inicio');
        }
    });

    on('btnVolver', 'click', function() {
        // Desde el menú no volvemos al login sin cerrar sesión: ir a aula no aplica
        // El botón "Cerrar sesión" sale del sistema
        if (typeof aulaGetSession === 'function' && aulaGetSession()) {
            return; // permanecer en menú; usar Cerrar sesión
        }
        mostrarPantalla('inicio');
    });

    // Tarjetas del menú (excepto el asistente AI)
    document.querySelectorAll('.menu-card:not(.card-asistente)').forEach(function(tarjeta) {
        tarjeta.addEventListener('click', function() {
            var seccion = this.dataset.seccion;
            abrirSeccion(seccion);
        });
    });

    // Botones de volver (solo si existen en el HTML)
    on('btnVolverSuelos', 'click', function() { mostrarPantalla('menu'); });
    on('btnVolverSuelos2', 'click', function() { mostrarPantalla('menu'); });
    on('btnVolverResistencia', 'click', function() { mostrarPantalla('menu'); });
    on('btnVolverSimuladores', 'click', function(e) { e.preventDefault(); if (typeof aulaVolverDesdeSimulador === 'function') { aulaVolverDesdeSimulador(); } });
    on('btnVolverRecursos', 'click', function() { mostrarPantalla('menu'); });
    on('btnVolverResultados', 'click', function() { mostrarPantalla('menu'); });

    // Tabs de todas las pantallas
    inicializarTabs();

    // Ensayos de mecánica de suelos
    document.querySelectorAll('#ms1-ensayos .ensayo-card[data-ensayo]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            abrirEnsayoSuelos(this.dataset.ensayo);
        });
    });

    // Ensayos y simuladores de Resistencia de Materiales
    document.querySelectorAll('#rm-ensayos .ensayo-card[data-ensayo]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (typeof abrirModuloRM === 'function') abrirModuloRM(this.dataset.ensayo, 'ensayo');
        });
    });
    document.querySelectorAll('.btn-abrir-sim-rm[data-ensayo-rm]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (typeof abrirModuloRM === 'function') abrirModuloRM(this.dataset.ensayoRm, 'sim');
        });
    });

    // Inicializar simuladores de flujo (si hay canvas)
    inicializarSimuladores();
    
    // Inicializar Asistente AI
    inicializarAsistenteAI();
}

// =========================================
// ASISTENTE AI - CON IA EXTERNA
// =========================================

// Historial de conversación
var chatHistory = [];


/** Carga un script CDN una sola vez */
function civixLoadScript(src) {
    return new Promise(function(resolve, reject) {
        if (document.querySelector('script[data-civix-src="' + src + '"]')) {
            resolve();
            return;
        }
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.setAttribute('data-civix-src', src);
        s.onload = function() { resolve(); };
        s.onerror = function() { reject(new Error('No se pudo cargar ' + src)); };
        document.head.appendChild(s);
    });
}

function civixExt(name) {
    var m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
}

/** Extrae texto usable para la IA según el tipo de archivo */

/** Selecciona páginas relevantes del libro para la pregunta (libros largos 100–900 pág.) */
function civixExtraerFragmentosRelevantes(adj, pregunta, maxChars) {
    maxChars = maxChars || 100000;
    if (!adj) return '';
    var pages = adj.pagesData;
    if (!pages || !pages.length) {
        var t = adj.text || '';
        return t.length > maxChars ? t.slice(0, maxChars) + '\n\n...[truncado]' : t;
    }
    var q = String(pregunta || '').toLowerCase();
    var words = q.split(/[^a-záéíóúñü0-9]+/i).filter(function(w) {
        return w.length > 3;
    });
    // Sin pregunta clara: primeras páginas + muestra del medio + final (visión general)
    function packPages(list) {
        var out = [];
        var len = 0;
        for (var i = 0; i < list.length; i++) {
            var block = '--- Página ' + list[i].n + ' ---\n' + list[i].text;
            if (len + block.length > maxChars) break;
            out.push(block);
            len += block.length + 2;
        }
        return out.join('\n\n');
    }
    if (words.length < 2) {
        var sample = [];
        var n = pages.length;
        var head = pages.slice(0, Math.min(25, n));
        var midStart = Math.max(0, Math.floor(n / 2) - 8);
        var mid = pages.slice(midStart, midStart + 16);
        var tail = pages.slice(Math.max(0, n - 15));
        var seen = {};
        head.concat(mid).concat(tail).forEach(function(p) {
            if (!seen[p.n]) { seen[p.n] = true; sample.push(p); }
        });
        sample.sort(function(a, b) { return a.n - b.n; });
        return packPages(sample);
    }
    // Puntuar cada página
    var scored = pages.map(function(p) {
        var low = (p.text || '').toLowerCase();
        var score = 0;
        for (var i = 0; i < words.length; i++) {
            if (low.indexOf(words[i]) >= 0) score += 1;
            // bonus si aparece varias veces
            var c = low.split(words[i]).length - 1;
            if (c > 1) score += Math.min(3, c - 1);
        }
        return { n: p.n, text: p.text, score: score };
    });
    scored.sort(function(a, b) { return b.score - a.score; });
    var chosen = [];
    var used = {};
    // Top páginas por relevancia
    for (var i = 0; i < scored.length && chosen.length < 40; i++) {
        if (scored[i].score <= 0) break;
        chosen.push(scored[i]);
        used[scored[i].n] = true;
    }
    // Contexto: ±1 página alrededor de las mejores
    var tops = chosen.slice(0, 12);
    tops.forEach(function(p) {
        for (var d = -1; d <= 1; d++) {
            var pn = p.n + d;
            if (pn < 1 || used[pn]) continue;
            for (var j = 0; j < pages.length; j++) {
                if (pages[j].n === pn) {
                    chosen.push(pages[j]);
                    used[pn] = true;
                    break;
                }
            }
        }
    });
    // Si casi nada coincide, caer a muestra general
    if (!chosen.length || (chosen[0].score !== undefined && chosen[0].score === 0)) {
        return civixExtraerFragmentosRelevantes(
            { pagesData: pages, text: adj.text },
            '',
            maxChars
        );
    }
    chosen.sort(function(a, b) { return a.n - b.n; });
    var body = packPages(chosen);
    var header = '[Páginas seleccionadas por relevancia a tu pregunta: ' +
        chosen.map(function(p) { return p.n; }).filter(function(v, i, arr) { return arr.indexOf(v) === i; }).join(', ') +
        ' de ' + pages.length + ']\n\n';
    return header + body;
}

function civixLeerArchivoParaIA(file) {
    var ext = civixExt(file.name);
    var name = file.name;

    // --- PDF libros/guías hasta ~900 páginas ---
    if (ext === 'pdf') {
        return civixLoadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js').then(function() {
            var lib = window['pdfjsLib'] || window['pdfjs-dist/build/pdf'] || null;
            if (!lib) throw new Error('No se cargó PDF.js (revisa tu conexión)');
            lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            return file.arrayBuffer().then(function(buf) {
                return lib.getDocument({ data: new Uint8Array(buf) }).promise;
            }).then(function(pdf) {
                var totalPages = pdf.numPages || 1;
                var maxPages = Math.min(totalPages, 900);
                var pages = []; // { n, text }
                var i = 1;
                function next() {
                    if (i > maxPages) {
                        var full = pages.map(function(p) {
                            return '--- Página ' + p.n + ' ---\n' + p.text;
                        }).join('\n\n').trim();
                        if (!full) {
                            return {
                                name: name,
                                binary: true,
                                size: file.size,
                                text: '',
                                pagesData: [],
                                note: 'PDF sin texto extraíble (¿escaneado?). Usa un PDF con texto seleccionable u OCR.'
                            };
                        }
                        var note = maxPages + (totalPages > maxPages ? '/' + totalPages : '') + ' pág. indexadas';
                        if (totalPages > 900) note += ' (máx. 900)';
                        return {
                            name: name,
                            binary: false,
                            size: file.size,
                            text: full,
                            pagesData: pages,
                            note: note,
                            pages: maxPages,
                            totalPages: totalPages
                        };
                    }
                    var n = i++;
                    return pdf.getPage(n).then(function(page) {
                        return page.getTextContent().then(function(tc) {
                            var line = (tc.items || []).map(function(it) { return it.str; }).join(' ').replace(/\s+/g, ' ').trim();
                            pages.push({ n: n, text: line });
                            return next();
                        });
                    });
                }
                return next();
            });
        }).catch(function(err) {
            throw new Error('PDF: ' + (err && err.message ? err.message : err));
        });
    }

    // --- Word DOCX ---
    if (ext === 'docx') {
        return civixLoadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js').then(function() {
            return file.arrayBuffer().then(function(buf) {
                return mammoth.extractRawText({ arrayBuffer: buf });
            }).then(function(res) {
                var text = (res && res.value) || '';
                if (!text.trim()) throw new Error('DOCX vacío o no legible');
                if (text.length > 220000) text = text.slice(0, 220000) + '\n\n...[truncado]';
                return { name: name, binary: false, size: file.size, text: text, note: 'Word' };
            });
        });
    }

    // --- Excel XLSX / XLS ---
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        if (ext === 'csv') {
            return new Promise(function(resolve, reject) {
                var r = new FileReader();
                r.onload = function() {
                    var text = String(r.result || '');
                    if (text.length > 220000) text = text.slice(0, 220000) + '\n\n...[truncado]';
                    resolve({ name: name, binary: false, size: file.size, text: text, note: 'CSV' });
                };
                r.onerror = reject;
                r.readAsText(file);
            });
        }
        return civixLoadScript('https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js').then(function() {
            return file.arrayBuffer().then(function(buf) {
                var wb = XLSX.read(buf, { type: 'array' });
                var parts = [];
                wb.SheetNames.forEach(function(sn) {
                    var sheet = wb.Sheets[sn];
                    var csv = XLSX.utils.sheet_to_csv(sheet);
                    parts.push('### Hoja: ' + sn + '\n' + csv);
                });
                var text = parts.join('\n\n');
                if (!text.trim()) throw new Error('Excel vacío');
                if (text.length > 220000) text = text.slice(0, 220000) + '\n\n...[truncado]';
                return { name: name, binary: false, size: file.size, text: text, note: 'Excel' };
            });
        });
    }

    // --- DOC antiguo / PPT: limitado ---
    if (ext === 'doc' || ext === 'ppt' || ext === 'pptx') {
        return Promise.resolve({
            name: name,
            binary: true,
            size: file.size,
            text: '',
            note: 'formato limitado — mejor PDF/DOCX/TXT'
        });
    }

    // --- Imágenes: solo metadatos (la API de texto no ve la imagen aquí) ---
    if (/^image\//.test(file.type) || /^(png|jpe?g|gif|webp|bmp)$/.test(ext)) {
        return Promise.resolve({
            name: name,
            binary: true,
            size: file.size,
            text: '',
            note: 'imagen — describe el error en el chat'
        });
    }

    // --- Texto / código / DXF / IFC / etc. ---
    return new Promise(function(resolve, reject) {
        var r = new FileReader();
        r.onload = function() {
            var text = String(r.result || '');
            var sample = text.slice(0, 2000);
            var nulls = (sample.match(/\u0000/g) || []).length;
            if (nulls > 5) {
                resolve({ name: name, binary: true, size: file.size, text: '', note: 'binario' });
                return;
            }
            if (text.length > 220000) text = text.slice(0, 220000) + '\n\n...[truncado]';
            resolve({ name: name, binary: false, size: file.size, text: text, note: Math.round(file.size / 1024) + ' KB' });
        };
        r.onerror = function() { reject(new Error('lectura fallida')); };
        r.readAsText(file);
    });
}



/** Reescribe el texto del usuario como un prompt claro y completo (estilo Promptly) */
async function civixMejorarPrompt(textoOriginal) {
    if (window.location.protocol === 'file:') {
        throw new Error('Usa GitHub Pages o Live Server, no abras el HTML con doble clic.');
    }
    var backend = (AI_CONFIG.backendUrl || '').trim();
    if (!backend) {
        throw new Error('Falta configurar AI_CONFIG.backendUrl en js/config.js (URL del Worker).');
    }
    var response = await fetch(backend, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mode: 'improve',
            messages: [{ role: 'user', content: textoOriginal }]
        })
    });
    var data = {};
    try { data = await response.json(); } catch (e) {}
    if (!response.ok) {
        throw new Error((data && data.error) ? data.error : ('HTTP ' + response.status));
    }
    var out = (data && data.content) ? String(data.content).trim() : '';
    if (!out) throw new Error('No se pudo mejorar el prompt.');
    return out;
}


/** Conversaciones Civix por usuario (local + Firebase opcional) */
var CIVIX_CHATS_KEY = 'geometrics_civix_conversations';
var civixChatActualId = null;

function civixEmailActual() {
    try {
        if (typeof aulaGetSession === 'function') {
            var s = aulaGetSession();
            if (s && s.email) return String(s.email).toLowerCase();
        }
    } catch (e) {}
    return 'anonimo';
}

function civixCargarTodos() {
    try {
        var all = JSON.parse(localStorage.getItem(CIVIX_CHATS_KEY) || '{}');
        return all && typeof all === 'object' ? all : {};
    } catch (e) { return {}; }
}

function civixGuardarTodos(all) {
    try { localStorage.setItem(CIVIX_CHATS_KEY, JSON.stringify(all)); } catch (e) {}
}

function civixListaUsuario() {
    var email = civixEmailActual();
    var all = civixCargarTodos();
    var list = all[email] || [];
    if (!Array.isArray(list)) list = [];
    return list.sort(function(a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
}

function civixUid() {
    return 'cx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function civixTituloDesdeMensajes(messages) {
    var raw = '';
    for (var i = 0; i < (messages || []).length; i++) {
        if (messages[i].role === 'user' && messages[i].content) {
            raw = String(messages[i].content).replace(/\s+/g, ' ').trim();
            break;
        }
    }
    if (!raw) return '✨ Nueva conversación';

    // Quitar instrucciones largas de metodología; quedarse con lo esencial
    var t = raw
        .replace(/act[uú]a como docente[\s\S]{0,200}/i, '')
        .replace(/asignatura\s*:\s*/i, '')
        .replace(/textos?\s*gu[ií]a[s]?\s*:\s*/i, '')
        .trim();
    if (t.length < 8) t = raw;

    var low = t.toLowerCase();
    var mapa = [
        { re: /momento\s*flector|flexi[oó]n/, name: '📐 Momento flector' },
        { re: /esfuerzo\s*cortante|cortante|shear/, name: '✂️ Esfuerzo cortante' },
        { re: /tracci[oó]n|tensi[oó]n\s*axial/, name: '🔗 Ensayo de tracción' },
        { re: /compresi[oó]n/, name: '⬇️ Compresión' },
        { re: /torsión|torsion/, name: '🌀 Torsión' },
        { re: /m[oó]dulo\s*de\s*elasticidad|young|hooke/, name: '📈 Módulo de elasticidad' },
        { re: /c[ií]rculo\s*de\s*mohr|mohr/, name: '⭕ Círculo de Mohr' },
        { re: /corte\s*directo/, name: '🧪 Corte directo' },
        { re: /consolidaci[oó]n|ed[oó]metro/, name: '📚 Consolidación' },
        { re: /inconfinad/, name: '🧱 Compresión inconfinada' },
        { re: /triaxial/, name: '🔬 Triaxial' },
        { re: /granulometr|curva\s*granul/, name: '📊 Granulometría' },
        { re: /l[ií]mites?\s*de\s*atterberg|l[ií]mite\s*l[ií]quido|plasticidad/, name: '📏 Límites de Atterberg' },
        { re: /humedad|contenido\s*de\s*agua/, name: '💧 Contenido de humedad' },
        { re: /proctor|compactaci[oó]n/, name: '🏗️ Compactación Proctor' },
        { re: /permeabilidad/, name: '💦 Permeabilidad' },
        { re: /clasificaci[oó]n\s*de\s*suelos|usc[s]?|aasho/, name: '🗂️ Clasificación de suelos' },
        { re: /nsr-?10|norma\s*sismo/, name: '📋 NSR-10' },
        { re: /beer|hibbeler|resistencia\s*de\s*materiales/, name: '📖 Resistencia de materiales' },
        { re: /das|suelos|geot[eé]cnic/, name: '🌍 Mecánica de suelos' },
        { re: /python|c[oó]digo|error|debug/, name: '🐛 Corrección de código' },
        { re: /resuelve|ejercicio|taller|problema/, name: '✏️ Ejercicio guiado' },
        { re: /explica|qu[eé]\s*es|tema/, name: '🎓 Tutoría de tema' }
    ];
    for (var j = 0; j < mapa.length; j++) {
        if (mapa[j].re.test(low)) return mapa[j].name;
    }
    // Título llamativo genérico a partir del prompt
    var corto = t.replace(/[^\wáéíóúñüÁÉÍÓÚÑÜ\s\-]/gi, '').trim();
    if (corto.length > 42) corto = corto.slice(0, 42).replace(/\s+\S*$/, '') + '…';
    if (!corto) corto = 'Consulta Civix';
    return '💡 ' + corto.charAt(0).toUpperCase() + corto.slice(1);
}


function civixGuardarConversacionActual() {
    if (!chatHistory || !chatHistory.length) return;
    var email = civixEmailActual();
    var all = civixCargarTodos();
    if (!all[email]) all[email] = [];
    var list = all[email];
    var id = civixChatActualId || civixUid();
    civixChatActualId = id;
    var item = {
        id: id,
        title: civixTituloDesdeMensajes(chatHistory),
        updatedAt: Date.now(),
        messages: chatHistory.map(function(m) {
            return { role: m.role, content: m.content };
        })
    };
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { idx = i; break; }
    }
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    // Máximo 40 chats por usuario
    if (list.length > 40) list = list.slice(0, 40);
    all[email] = list;
    civixGuardarTodos(all);

    // Nube (si Firebase está activo)
    try {
        if (typeof GeoCloud !== 'undefined' && GeoCloud.pushChat) {
            var key = (typeof GeoCloud.emailKey === 'function')
                ? GeoCloud.emailKey(email)
                : String(email).replace(/[.#$\[\]]/g, '_');
            if (typeof GeoCloud.cloudSet === 'function') {
                GeoCloud.cloudSet('civixChats/' + key + '/' + id, item);
            } else {
                // reutilizar pushChat con id prefijado
                GeoCloud.pushChat(Object.assign({}, item, { id: 'civix_' + key + '_' + id, tipo: 'civix', email: email }));
            }
        }
    } catch (e) {}
}

function civixRenderBienvenida() {
    var chatMensajes = document.getElementById('chatMensajes');
    if (!chatMensajes) return;
    chatMensajes.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'mensaje mensaje-bot';
    div.innerHTML = '<p>¡Hola futuro ingeniero! Soy <strong>Civix</strong>. Pregúntame sobre suelos, materiales, diseño estructural o adjunta un archivo con el clip para corregir errores.</p>';
    chatMensajes.appendChild(div);
}

function civixNuevaConversacion() {
    chatHistory = [];
    civixChatActualId = null;
    civixRenderBienvenida();
    var panel = document.getElementById('civixHistorialPanel');
    if (panel) panel.hidden = true;
}

function civixAbrirConversacion(id) {
    var list = civixListaUsuario();
    var found = null;
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { found = list[i]; break; }
    }
    if (!found) return;
    civixChatActualId = found.id;
    chatHistory = (found.messages || []).map(function(m) {
        return { role: m.role, content: m.content };
    });
    var chatMensajes = document.getElementById('chatMensajes');
    if (!chatMensajes) return;
    chatMensajes.innerHTML = '';
    if (!chatHistory.length) {
        civixRenderBienvenida();
    } else {
        chatHistory.forEach(function(m) {
            if (m.role === 'user') agregarMensaje(m.content, 'usuario');
            else agregarMensajeBotConDescargas(m.content);
        });
    }
    var panel = document.getElementById('civixHistorialPanel');
    if (panel) panel.hidden = true;
}

function civixEliminarConversacion(id) {
    var email = civixEmailActual();
    var all = civixCargarTodos();
    var list = (all[email] || []).filter(function(c) { return c.id !== id; });
    all[email] = list;
    civixGuardarTodos(all);
    if (civixChatActualId === id) civixNuevaConversacion();
    civixPintarHistorial();
}

function civixPintarHistorial() {
    var lista = document.getElementById('civixHistorialLista');
    if (!lista) return;
    var items = civixListaUsuario();
    if (!items.length) {
        lista.innerHTML = '<p class="login-hint">Aún no hay chats guardados. Envía un mensaje a Civix y se guardará solo.</p>';
        return;
    }
    lista.innerHTML = '';
    items.forEach(function(c) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'civix-hist-item';
        var fecha = c.updatedAt ? new Date(c.updatedAt).toLocaleString('es-CO') : '';
        btn.innerHTML = '<button type="button" class="civix-hist-del" title="Eliminar">🗑</button>' +
            '<strong></strong><span></span>';
        btn.querySelector('strong').textContent = c.title || 'Chat';
        btn.querySelector('span').textContent = fecha;
        btn.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('civix-hist-del')) {
                e.stopPropagation();
                if (confirm('¿Eliminar esta conversación?')) civixEliminarConversacion(c.id);
                return;
            }
            civixAbrirConversacion(c.id);
        });
        lista.appendChild(btn);
    });
}

function inicializarAsistenteAI() {
    var btnAsistente = document.getElementById('btnAsistenteAI');
    var modal = document.getElementById('asistenteModal');
    var btnCerrar = document.getElementById('btnCerrarAsistente');
    var input = document.getElementById('inputAsistente');
    var btnEnviar = document.getElementById('btnEnviarMensaje');
    var fileInput = document.getElementById('civixFileInput');
    var fileNameEl = document.getElementById('civixFileName');
    var btnQuitar = document.getElementById('btnQuitarAdjunto');

    // API solo desde config.js (no editable por usuarios)
    window.__civixAdjunto = null;

    if (btnAsistente) {
        btnAsistente.addEventListener('click', function() {
            modal.classList.add('active');
            if (input) input.focus();
        });
    }
    if (btnCerrar) {
        btnCerrar.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    function limpiarAdjunto() {
        window.__civixAdjunto = null;
        if (fileInput) fileInput.value = '';
        if (fileNameEl) fileNameEl.textContent = '';
        if (btnQuitar) btnQuitar.hidden = true;
        var chip = document.getElementById('civixFileChip');
        if (chip) {
            chip.hidden = true;
            chip.style.display = 'none';
        }
    }
    if (btnQuitar) btnQuitar.addEventListener('click', limpiarAdjunto);

    if (fileInput) {
        fileInput.addEventListener('change', function() {
            var f = fileInput.files && fileInput.files[0];
            if (!f) { limpiarAdjunto(); return; }
            var maxBytes = 150 * 1024 * 1024; // 150 MB (libros hasta ~900 pág.)
            if (f.size > maxBytes) {
                agregarMensaje('El archivo supera 150 MB. Comprime el PDF o divídelo por tomos/capítulos.', 'bot');
                limpiarAdjunto();
                return;
            }
            var chip = document.getElementById('civixFileChip');
            function mostrarChip(txt) {
                if (fileNameEl) fileNameEl.textContent = txt;
                if (btnQuitar) btnQuitar.hidden = false;
                if (chip) {
                    chip.hidden = false;
                    chip.style.display = 'flex';
                }
            }
            mostrarChip('⏳ Leyendo ' + f.name + '…');

            var leyendo = agregarMensaje('📄 Indexando PDF… Si tiene cientos de páginas puede tardar 1–3 min. No cierres Civix.', 'bot', true);
            civixLeerArchivoParaIA(f).then(function(info) {
                if (leyendo && leyendo.remove) leyendo.remove();
                window.__civixAdjunto = info;
                if (info && !info.binary) {
                    agregarMensaje('✅ Documento listo: ' + info.name + (info.note ? ' · ' + info.note : '') + '. Escribe tu pregunta y Enviar (estilo ChatGPT sobre ese texto).', 'bot');
                } else if (info && info.binary) {
                    agregarMensaje('⚠️ No pude extraer texto de ' + info.name + '. ' + (info.note || ''), 'bot');
                }
                mostrarChip('📎 ' + info.name + (info.note ? ' · ' + info.note : ''));
            }).catch(function(err) {
                if (leyendo && leyendo.remove) leyendo.remove();
                agregarMensaje('No se pudo leer el archivo: ' + (err.message || err), 'bot');
                limpiarAdjunto();
            });
        });
    }

    function enviarMensaje() {
        var texto = (input && input.value || '').trim();
        var adj = window.__civixAdjunto;
        if (texto === '' && !adj) return;

        var visible = texto || ('[Archivo] ' + (adj && adj.name));
        if (adj && texto) visible = texto + '\n📎 ' + adj.name;
        else if (adj) visible = '📎 Archivo: ' + adj.name;
        agregarMensaje(visible, 'usuario');
        if (input) input.value = '';

        var payload = texto || (adj
            ? 'Analiza el documento adjunto (texto guía / libro / apunte). Resume su contenido útil, explica los conceptos clave y responde con claridad. Cita páginas si aparecen marcadas como "--- Página N ---".'
            : '');
        if (adj) {
            if (adj.binary) {
                payload += '\n\n[ARCHIVO BINARIO: ' + adj.name + ', ' + adj.size + ' bytes]\n' +
                    'No se pudo extraer texto. Si es PDF escaneado, usa un PDF con texto seleccionable u OCR. ' +
                    'Si es DWG/RVT, pide exportación DXF/IFC/TXT o el mensaje de error.';
            } else {
                var body = civixExtraerFragmentosRelevantes(adj, texto, 100000);
                payload += '\n\n[DOCUMENTO DE REFERENCIA: ' + adj.name +
                    (adj.note ? ' (' + adj.note + ')' : '') + ']\n' +
                    'Es un libro o guía de estudio. El fragmento incluye páginas relevantes a la pregunta del usuario. ' +
                    'Cita el archivo y el número de página (--- Página N ---) cuando uses información del texto. ' +
                    'Si el fragmento no basta, indica qué tema o capítulo debería consultar el estudiante.\n' +
                    '--- INICIO FRAGMENTOS DEL DOCUMENTO ---\n' + body + '\n--- FIN FRAGMENTOS ---';
            }
        }
        if (!String(payload).trim()) return;

        limpiarAdjunto();

        var escribiendo = agregarMensaje('🤖 Analizando...', 'bot', true);

        llamarIA(payload).then(function(respuesta) {
            escribiendo.remove();
            agregarMensajeBotConDescargas(respuesta);
            try { civixGuardarConversacionActual(); } catch (e) {}
        }).catch(function(err) {
            escribiendo.remove();
            agregarMensaje('Error: ' + (err.message || err), 'bot');
        });
    }

    if (btnEnviar) btnEnviar.addEventListener('click', enviarMensaje);
    if (input) {
        input.addEventListener('keydown', function(e) {
            // Enter envía; Shift+Enter inserta salto de línea
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensaje();
            }
        });
    }

    var btnHist = document.getElementById('btnCivixHistorial');
    var btnNuevo = document.getElementById('btnCivixNuevo');
    var panelHist = document.getElementById('civixHistorialPanel');
    var btnCerrarHist = document.getElementById('btnCerrarHistorialCivix');
    if (btnHist && panelHist) {
        btnHist.addEventListener('click', function() {
            var open = panelHist.hidden;
            panelHist.hidden = !open;
            if (open) civixPintarHistorial();
        });
    }
    if (btnCerrarHist && panelHist) {
        btnCerrarHist.addEventListener('click', function() { panelHist.hidden = true; });
    }
    if (btnNuevo) {
        btnNuevo.addEventListener('click', function() { civixNuevaConversacion(); });
    }

    var btnMejorar = document.getElementById('btnMejorarPrompt');
    if (btnMejorar && input) {
        btnMejorar.addEventListener('click', function() {
            var texto = (input.value || '').trim();
            if (!texto) {
                input.focus();
                input.placeholder = 'Escribe primero tu idea y luego pulsa ✨';
                return;
            }
            btnMejorar.disabled = true;
            var prevTitle = btnMejorar.title;
            btnMejorar.textContent = '…';
            btnMejorar.title = 'Mejorando prompt…';
            civixMejorarPrompt(texto).then(function(mejorado) {
                input.value = mejorado;
                input.focus();
            }).catch(function(err) {
                agregarMensaje('No pude mejorar el prompt: ' + (err.message || err), 'bot');
            }).finally(function() {
                btnMejorar.disabled = false;
                btnMejorar.textContent = '✨';
                btnMejorar.title = prevTitle || 'Mejorar prompt (estilo Promptly)';
            });
        });
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Convierte markdown simple + prepara texto para KaTeX */

function normalizarRespuestaIA(texto) {
    if (!texto) return '';
    var s = String(texto);

    s = s.replace(/\$\$([\s\S]+?)\$\$/g, function(_, math) {
        return '\n\n⟦' + latexATextoLegible(math) + '⟧\n\n';
    });
    s = s.replace(/\\\[([\s\S]+?)\\\]/g, function(_, math) {
        return '\n\n⟦' + latexATextoLegible(math) + '⟧\n\n';
    });
    s = s.replace(/\\\(([\s\S]+?)\\\)/g, function(_, math) {
        return latexATextoLegible(math);
    });
    s = s.replace(/\$([^\$\n]+?)\$/g, function(_, math) {
        return latexATextoLegible(math);
    });

    s = latexATextoLegible(s);

    // Potencias frecuentes en vigas
    s = s.replace(/\bh\s*[³3]\b/g, 'h³');
    s = s.replace(/\by\s*[²2]\b/g, 'y²');
    s = s.replace(/\bb\s*[·\*x]?\s*h³/gi, 'b · h³');
    s = s.replace(/\(b\s*[·\*]?\s*h3\)/gi, '(b · h³)');
    s = s.replace(/0\.63(?=\))/g, '0.6³'); // si vino mal 0.63 por h3

    // d2v/dx2 → d²v/dx²
    s = s.replace(/\bd2v\b/g, 'd²v').replace(/\bdx2\b/g, 'dx²');
    s = s.replace(/\(d2v\)\/\(dx2\)/g, 'd²v/dx²');
    s = s.replace(/\(d²v\)\/\(dx²\)/g, 'd²v/dx²');

    s = s.replace(/\n{3,}/g, '\n\n');
    return s.trim();
}

function latexATextoLegible(math) {
    if (!math) return '';
    var s = String(math);

    // Comandos pegados a letra: \mathbfM, \mathbfr
    s = s.replace(/\\mathbf\{([^}]*)\}/g, '$1');
    s = s.replace(/\\mathbf([A-Za-z])/g, '$1');
    s = s.replace(/\\mathrm\{([^}]*)\}/g, '$1');
    s = s.replace(/\\mathrm([A-Za-z])/g, '$1');
    s = s.replace(/\\boldsymbol\{([^}]*)\}/g, '$1');
    s = s.replace(/\\text\{([^}]*)\}/g, '$1');
    s = s.replace(/\\operatorname\{([^}]*)\}/g, '$1');

    // Fracciones con llaves
    for (var k = 0; k < 3; k++) {
        s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
        s = s.replace(/\\dfrac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
    }
    // Fracción rota: quitar \frac y unir miles tipo 10 000
    s = s.replace(/\\frac\s*([0-9]+)\s+([0-9]{3})/g, '$1 $2');
    s = s.replace(/\\frac\s*/g, '');
    s = s.replace(/sinθ/g, 'sin(θ)');
    s = s.replace(/\brFsin\(/g, 'r · F · sin(');
    s = s.replace(/\brF\s*sin/g, 'r · F · sin');
    s = s.replace(/\bm4\b/g, 'm⁴');
    s = s.replace(/\bm3\b/g, 'm³');

    // Integrales
    s = s.replace(/\\int_\{([^}]*)\}\^\{([^}]*)\}/g, '∫_$1^$2 ');
    s = s.replace(/\\int_\{([^}]*)\}/g, '∫_$1 ');
    s = s.replace(/\\int\s*([A-Za-z])/g, '∫_$1 ');
    s = s.replace(/\\int\b/g, '∫ ');

    // Subíndices max/min
    s = s.replace(/\\max\b/g, 'max');
    s = s.replace(/\\min\b/g, 'min');
    s = s.replace(/([A-Za-zστανφμ])\\max\b/g, '$1_max');
    s = s.replace(/([A-Za-zστανφμ])_?max\b/g, '$1_max');
    s = s.replace(/([A-Za-zστανφμ])max\b/g, '$1_max');

    // Símbolos griegos y operadores
    var greeks = [
        ['\\varepsilon', 'ε'], ['\\epsilon', 'ε'], ['\\vartheta', 'ϑ'],
        ['\\sigma', 'σ'], ['\\tau', 'τ'], ['\\phi', 'φ'], ['\\varphi', 'φ'],
        ['\\gamma', 'γ'], ['\\delta', 'δ'], ['\\theta', 'θ'],
        ['\\alpha', 'α'], ['\\beta', 'β'], ['\\pi', 'π'],
        ['\\rho', 'ρ'], ['\\omega', 'ω'], ['\\mu', 'μ'], ['\\lambda', 'λ'],
        ['\\nu', 'ν'], ['\\xi', 'ξ'], ['\\eta', 'η'], ['\\kappa', 'κ']
    ];
    greeks.forEach(function(p) {
        s = s.split(p[0]).join(p[1]);
    });

    s = s.replace(/\\partial/g, '∂');
    s = s.replace(/\\infty/g, '∞');
    s = s.replace(/\\sum/g, 'Σ');
    s = s.replace(/\\sqrt\{([^}]*)\}/g, '√($1)');
    s = s.replace(/\\sqrt/g, '√');
    s = s.replace(/\\cdot/g, '·');
    s = s.replace(/\\times/g, '×');
    s = s.replace(/\\div/g, '÷');
    s = s.replace(/\\leq/g, '≤');
    s = s.replace(/\\geq/g, '≥');
    s = s.replace(/\\neq/g, '≠');
    s = s.replace(/\\approx/g, '≈');
    s = s.replace(/\\pm/g, '±');
    s = s.replace(/\\rightarrow/g, '→');
    s = s.replace(/\\Rightarrow/g, '⇒');
    s = s.replace(/\\to\b/g, '→');
    s = s.replace(/\\sin/g, 'sin');
    s = s.replace(/\\cos/g, 'cos');
    s = s.replace(/\\tan/g, 'tan');
    s = s.replace(/\\log/g, 'log');
    s = s.replace(/\\ln/g, 'ln');
    s = s.replace(/\\left/g, '');
    s = s.replace(/\\right/g, '');
    s = s.replace(/\\,/g, ' ');
    s = s.replace(/\\;/g, ' ');
    s = s.replace(/\\!/g, '');
    s = s.replace(/\\:/g, ' ');
    s = s.replace(/\\%/g, '%');
    s = s.replace(/\\_/g, '_');
    s = s.replace(/\\\s/g, ' ');

    s = s.replace(/\^\{([^}]*)\}/g, '^$1');
    s = s.replace(/_\{([^}]*)\}/g, '_$1');

    // Quitar comandos LaTeX restantes \algo
    s = s.replace(/\\[a-zA-Z]+/g, '');
    // Llaves sobrantes
    s = s.replace(/[{}]/g, '');

    // Limpiar "mathbf" "mathrm" si quedaron sin barra
    s = s.replace(/\bmathbf\b/g, '');
    s = s.replace(/\bmathrm\b/g, '');
    s = s.replace(/\bboldsymbol\b/g, '');

    // Espacios en × y ·
    s = s.replace(/\s*×\s*/g, ' × ');
    s = s.replace(/\s*·\s*/g, ' · ');
    s = s.replace(/ {2,}/g, ' ');

    return s;
}


function formatearMensaje(texto) {
    if (!texto) return '';
    var s = String(texto);

    var blocks = [];
    function pushMath(type, math) {
        var clean = String(math || '').trim();
        if (!clean) return '';
        blocks.push({ type: type, math: clean });
        return '%%MATH' + (blocks.length - 1) + '%%';
    }

    // Normalizar delimitadores raros del modelo
    s = s.replace(/\\\(\s+/g, '\\(').replace(/\s+\\\)/g, '\\)');
    s = s.replace(/\\\[\s+/g, '\\[').replace(/\s+\\\]/g, '\\]');

    // Bloques $$...$$ y \[...\]
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, function(_, math) { return pushMath('block', math); });
    s = s.replace(/\\\[([\s\S]+?)\\\]/g, function(_, math) { return pushMath('block', math); });
    // Inline \(...\) y $...$
    s = s.replace(/\\\(([\s\S]+?)\\\)/g, function(_, math) { return pushMath('inline', math); });
    s = s.replace(/\$([^\$\n]+?)\$/g, function(_, math) { return pushMath('inline', math); });

    s = escapeHtml(s);

    // Fórmulas convertidas a texto legible
    s = s.replace(/⟦([^⟧]+)⟧/g, '<span class="formula-fallback formula-fallback-block">$1</span>');

    // Markdown
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/^#{1,6}\s+(.+)$/gm, '<h4>$1</h4>');
    s = s.replace(/^\s*[-•]\s+(.+)$/gm, '<li>$1</li>');
    s = s.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
    s = s.replace(/(?:<li>[\s\S]*?<\/li>\s*)+/g, function(m) { return '<ul>' + m + '</ul>'; });
    s = s.replace(/\n\n/g, '</p><p>');
    s = s.replace(/\n/g, '<br>');
    s = '<p>' + s + '</p>';
    s = s.replace(/<p><\/p>/g, '');
    s = s.replace(/<p>\s*(<h4>)/g, '$1').replace(/(<\/h4>)\s*<\/p>/g, '$1');
    s = s.replace(/<p>\s*(<ul>)/g, '$1').replace(/(<\/ul>)\s*<\/p>/g, '$1');

    s = s.replace(/%%MATH(\d+)%%/g, function(_, i) {
        var b = blocks[Number(i)];
        if (!b) return '';
        var cls = b.type === 'block' ? 'math-block' : 'math-inline';
        var legible = latexATextoLegible(b.math);
        return '<span class="' + cls + '" data-math="' + escapeHtml(b.math) + '" data-fallback="' + escapeHtml(legible) + '"></span>';
    });

    return s;
}

function renderMathInElement(el) {
    if (!el) return;
    var nodes = el.querySelectorAll('[data-math]');
    nodes.forEach(function(node) {
        var math = node.getAttribute('data-math') || '';
        math = math.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        var fallback = node.getAttribute('data-fallback') || latexATextoLegible(math);
        var display = node.classList.contains('math-block');
        var ok = false;
        try {
            if (window.katex && math) {
                katex.render(math, node, {
                    throwOnError: false,
                    displayMode: display,
                    output: 'html',
                    strict: 'ignore'
                });
                // Si KaTeX dejó el nodo vacío o casi vacío, usar fallback
                if ((node.textContent || '').trim().length > 0 || node.querySelector('.katex')) {
                    ok = true;
                }
            }
        } catch (e) {
            ok = false;
        }
        if (!ok) {
            node.innerHTML = display
                ? '<span class="formula-fallback formula-fallback-block">' + escapeHtml(fallback || math) + '</span>'
                : '<span class="formula-fallback">' + escapeHtml(fallback || math) + '</span>';
        }
    });
}

function agregarMensaje(texto, tipo, temporal) {
    var chatMensajes = document.getElementById('chatMensajes');
    if (!chatMensajes) return null;
    var div = document.createElement('div');
    div.className = 'mensaje mensaje-' + (tipo === 'usuario' ? 'usuario' : 'bot');
    if (temporal) div.classList.add('mensaje-temporal');
    var p = document.createElement('p');
    p.style.whiteSpace = 'pre-wrap';
    p.style.wordBreak = 'break-word';
    p.textContent = texto;
    div.appendChild(p);
    chatMensajes.appendChild(div);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
    return div;
}

/** Respuesta del bot con bloques de código descargables */
function civixEsFilaTabla(line) {
    var t = String(line || '').trim();
    return t.indexOf('|') === 0 || (t.indexOf('|') > 0 && t.split('|').length >= 3);
}
function civixEsSeparadorTabla(line) {
    var t = String(line || '').replace(/\s/g, '');
    return /^\|?[\-:|]+\|?$/.test(t) && t.indexOf('|') >= 0;
}
/** Renderiza markdown ligero a HTML seguro (títulos, listas, tablas, negritas) */
function civixMarkdownAHtml(texto) {
    var raw = normalizarRespuestaIA(String(texto || ''));
    var lines = raw.split(/\r?\n/);
    var html = [];
    var i = 0;
    var inUl = false, inOl = false;

    function closeLists() {
        if (inUl) { html.push('</ul>'); inUl = false; }
        if (inOl) { html.push('</ol>'); inOl = false; }
    }
    function inlineFmt(s) {
        s = String(s || '');
        // Convertir <sub>/<sup> del modelo a marcadores antes de escapar
        s = s.replace(/<\s*sub\s*>/gi, '⟦SUB⟧').replace(/<\s*\/\s*sub\s*>/gi, '⟦/SUB⟧');
        s = s.replace(/<\s*sup\s*>/gi, '⟦SUP⟧').replace(/<\s*\/\s*sup\s*>/gi, '⟦/SUP⟧');
        s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
        s = escapeHtml(s);
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        s = s.replace(/`([^`]+)`/g, '<code class="civix-inline-code">$1</code>');
        // Restaurar sub/sup seguros
        s = s.replace(/⟦SUB⟧/g, '<sub>').replace(/⟦\/SUB⟧/g, '</sub>');
        s = s.replace(/⟦SUP⟧/g, '<sup>').replace(/⟦\/SUP⟧/g, '</sup>');
        // Si el modelo escribió el HTML ya escapado
        s = s.replace(/&lt;sub&gt;/gi, '<sub>').replace(/&lt;\/sub&gt;/gi, '</sub>');
        s = s.replace(/&lt;sup&gt;/gi, '<sup>').replace(/&lt;\/sup&gt;/gi, '</sup>');
        s = s.replace(/⟦([^⟧]+)⟧/g, '<span class="civix-formula">$1</span>');
        return s;
    }

    while (i < lines.length) {
        var line = lines[i];
        var trim = line.trim();

        // Tabla markdown
        if (civixEsFilaTabla(trim) && i + 1 < lines.length && civixEsSeparadorTabla(lines[i + 1].trim())) {
            closeLists();
            var rows = [];
            while (i < lines.length && civixEsFilaTabla(lines[i].trim())) {
                var rowLine = lines[i].trim();
                if (!civixEsSeparadorTabla(rowLine)) {
                    var cells = rowLine.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function(c) {
                        return c.trim();
                    });
                    rows.push(cells);
                }
                i++;
            }
            if (rows.length) {
                html.push('<div class="civix-table-wrap"><table class="civix-table">');
                rows.forEach(function(cells, ri) {
                    html.push('<tr>');
                    cells.forEach(function(cell) {
                        var tag = ri === 0 ? 'th' : 'td';
                        html.push('<' + tag + '>' + inlineFmt(cell) + '</' + tag + '>');
                    });
                    html.push('</tr>');
                });
                html.push('</table></div>');
            }
            continue;
        }

        // Títulos
        var hm = trim.match(/^(#{1,4})\s+(.+)$/);
        if (hm) {
            closeLists();
            var level = hm[1].length;
            html.push('<h' + (level + 1) + ' class="civix-h">' + inlineFmt(hm[2]) + '</h' + (level + 1) + '>');
            i++;
            continue;
        }

        // Separador
        if (/^---+$/.test(trim) || /^\*\*\*+$/.test(trim)) {
            closeLists();
            html.push('<hr class="civix-hr"/>');
            i++;
            continue;
        }

        // Cita
        if (trim.indexOf('> ') === 0) {
            closeLists();
            html.push('<blockquote class="civix-quote">' + inlineFmt(trim.slice(2)) + '</blockquote>');
            i++;
            continue;
        }

        // Lista con viñetas
        if (/^[-*•]\s+/.test(trim)) {
            if (inOl) { html.push('</ol>'); inOl = false; }
            if (!inUl) { html.push('<ul class="civix-ul">'); inUl = true; }
            html.push('<li>' + inlineFmt(trim.replace(/^[-*•]\s+/, '')) + '</li>');
            i++;
            continue;
        }

        // Lista numerada
        if (/^\d+[.)]\s+/.test(trim)) {
            if (inUl) { html.push('</ul>'); inUl = false; }
            if (!inOl) { html.push('<ol class="civix-ol">'); inOl = true; }
            html.push('<li>' + inlineFmt(trim.replace(/^\d+[.)]\s+/, '')) + '</li>');
            i++;
            continue;
        }

        // Línea vacía
        if (!trim) {
            closeLists();
            i++;
            continue;
        }

        closeLists();
        html.push('<p class="civix-p">' + inlineFmt(trim) + '</p>');
        i++;
    }
    closeLists();
    return html.join('');
}

function agregarMensajeBotConDescargas(texto) {
    var chatMensajes = document.getElementById('chatMensajes');
    if (!chatMensajes) return;
    texto = normalizarRespuestaIA(texto);
    var div = document.createElement('div');
    div.className = 'mensaje mensaje-bot mensaje-bot-rich';

    // Extraer bloques ```lang\n...\n```
    var parts = [];
    var re = /```([\w.+-]*)\n?([\s\S]*?)```/g;
    var last = 0;
    var match;
    while ((match = re.exec(texto)) !== null) {
        if (match.index > last) {
            parts.push({ type: 'text', content: texto.slice(last, match.index) });
        }
        var lang = match[1] || '';
        var body = match[2] || '';
        // Si el bloque es una "tabla" en texto plano con |, tratarlo como markdown tabla
        if ((!lang || lang === 'text' || lang === 'markdown' || lang === 'md') && body.indexOf('|') >= 0) {
            parts.push({ type: 'text', content: body });
        } else {
            parts.push({ type: 'code', lang: lang || 'txt', content: body });
        }
        last = match.index + match[0].length;
    }
    if (last < texto.length) parts.push({ type: 'text', content: texto.slice(last) });
    if (!parts.length) parts.push({ type: 'text', content: texto });

    parts.forEach(function(part, i) {
        if (part.type === 'text') {
            var t = part.content.trim();
            if (!t) return;
            var box = document.createElement('div');
            box.className = 'civix-md';
            box.innerHTML = civixMarkdownAHtml(t);
            div.appendChild(box);
        } else {
            var wrap = document.createElement('div');
            wrap.className = 'civix-code-block';
            var pre = document.createElement('pre');
            var code = document.createElement('code');
            code.textContent = part.content;
            pre.appendChild(code);
            wrap.appendChild(pre);
            var bar = document.createElement('div');
            bar.className = 'civix-code-actions';
            var lab = document.createElement('span');
            lab.textContent = part.lang || 'archivo';
            bar.appendChild(lab);
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-descarga-civix';
            btn.textContent = '⬇ Descargar';
            btn.addEventListener('click', function() {
                var ext = civixExtDesdeLang(part.lang);
                var blob = new Blob([part.content], { type: 'text/plain;charset=utf-8' });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'civix_correccion_' + (i + 1) + ext;
                document.body.appendChild(a);
                a.click();
                setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 500);
            });
            bar.appendChild(btn);
            wrap.appendChild(bar);
            div.appendChild(wrap);
        }
    });

    chatMensajes.appendChild(div);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
}

function civixExtDesdeLang(lang) {
    lang = String(lang || '').toLowerCase();
    var map = {
        python: '.py', py: '.py', javascript: '.js', js: '.js', typescript: '.ts',
        dxf: '.dxf', ifc: '.ifc', json: '.json', csv: '.csv', xml: '.xml',
        html: '.html', css: '.css', matlab: '.m', m: '.m', text: '.txt', txt: '.txt',
        sql: '.sql', yaml: '.yml', yml: '.yml'
    };
    return map[lang] || '.txt';
}

async function llamarIA(mensaje) {
    chatHistory.push({ role: 'user', content: mensaje });

    try { localStorage.removeItem('geometrics_api_key'); } catch (e) {}
    if (window.location.protocol === 'file:') {
        chatHistory.pop();
        throw new Error('No abras el HTML con doble clic. Usa el enlace de GitHub Pages o Live Server.');
    }

    var backend = (AI_CONFIG.backendUrl || '').trim();
    if (!backend) {
        chatHistory.pop();
        throw new Error('Falta AI_CONFIG.backendUrl en js/config.js. Despliega el Worker y pega su URL.');
    }

    var response;
    try {
        response = await fetch(backend, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'chat',
                model: AI_CONFIG.model,
                messages: chatHistory,
                temperature: 0.4,
                max_tokens: 4096
            })
        });
    } catch (networkErr) {
        chatHistory.pop();
        throw new Error('No se pudo conectar con el servidor de Civix. Revisa backendUrl e internet.');
    }

    var data = {};
    try { data = await response.json(); } catch (e) {}
    if (!response.ok) {
        chatHistory.pop();
        throw new Error((data && data.error) ? data.error : ('Error HTTP ' + response.status));
    }

    var respuesta = (data && data.content) ? String(data.content) : '';
    if (!respuesta.trim()) {
        chatHistory.pop();
        throw new Error('Civix no devolvió texto. Intenta de nuevo.');
    }
    chatHistory.push({ role: 'assistant', content: respuesta });
    return respuesta;
}




// =========================================
// NAVEGACIÓN
// =========================================

function mostrarPantalla(pantalla) {
    try {
        if (pantalla && pantalla !== 'inicio') {
            sessionStorage.setItem('geometrics_last_pantalla', pantalla);
            localStorage.setItem('geometrics_last_pantalla', pantalla);
        }
    } catch (e) {}

    var pantallas = ['pantallaInicio', 'pantallaMenu', 'pantallaSuelos', 'pantallaSuelos2', 'pantallaResistencia', 'pantallaSimuladores', 'pantallaRecursos', 'pantallaResultados', 'pantallaDocente', 'pantallaEstudiante', 'pantallaAdmin'];
    
    pantallas.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    var targetId = 'pantalla' + capitalize(pantalla);
    var target = document.getElementById(targetId);
    if (target) {
        // La pantalla de inicio usa flex para centrar el contenido
        target.style.display = (pantalla === 'inicio') ? 'flex' : 'block';
    }
    
    window.scrollTo(0, 0);
}

function abrirSeccion(seccion) {
    switch(seccion) {
        case 'mecanica-suelos':
            mostrarPantalla('menu');
            document.getElementById('pantallaMenu').style.display = 'none';
            document.getElementById('pantallaSuelos').style.display = 'block';
            activarTabsSeccion('pantallaSuelos');
            break;
        case 'mecanica-suelos-2':
            mostrarPantalla('menu');
            document.getElementById('pantallaMenu').style.display = 'none';
            document.getElementById('pantallaSuelos2').style.display = 'block';
            activarTabsSeccion('pantallaSuelos2');
            break;
        case 'resistencia-materiales':
            mostrarPantalla('menu');
            document.getElementById('pantallaMenu').style.display = 'none';
            document.getElementById('pantallaResistencia').style.display = 'block';
            activarTabsSeccion('pantallaResistencia');
            break;
        case 'simuladores':
            mostrarPantalla('menu');
            var menu = document.getElementById('pantallaMenu');
            var sim = document.getElementById('pantallaSimuladores');
            if (menu) menu.style.display = 'none';
            if (sim) {
                sim.style.display = 'block';
                setTimeout(actualizarSimFlujo, 100);
            } else {
                alert('Sección de simuladores no disponible en esta versión.');
                mostrarPantalla('menu');
            }
            break;
        case 'recursos':
            mostrarPantalla('menu');
            document.getElementById('pantallaMenu').style.display = 'none';
            document.getElementById('pantallaRecursos').style.display = 'block';
            break;
        case 'resultados':
            mostrarPantalla('menu');
            document.getElementById('pantallaMenu').style.display = 'none';
            document.getElementById('pantallaResultados').style.display = 'block';
            cargarHistorial();
            break;
        default:
            mostrarPantalla('menu');
    }
}

// =========================================
// TABS
// =========================================

function inicializarTabs() {
    document.querySelectorAll('.submenu-tabs').forEach(function(contenedor) {
        var tabs = contenedor.querySelectorAll('.tab-btn');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                var tabId = this.dataset.tab;
                var seccion = this.closest('.pantalla-curso');
                
                // Remover active de tabs
                contenedor.querySelectorAll('.tab-btn').forEach(function(t) { t.classList.remove('active'); });
                this.classList.add('active');
                
                // Ocultar contenidos
                seccion.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
                
                // Mostrar seleccionado
                var activo = document.getElementById(tabId);
                if (activo) {
                    activo.classList.add('active');
                    // Inicializar canvas si es simulador
                    if (tabId.indexOf('simuladores') !== -1 || tabId.indexOf('sim') !== -1) {
                        setTimeout(actualizarSimFlujo, 100);
                    }
                }
            });
        });
    });
}

function activarTabsSeccion(seccionId) {
    var seccion = document.getElementById(seccionId);
    if (!seccion) return;
    
    var tabs = seccion.querySelectorAll('.tab-btn');
    tabs.forEach(function(t) { t.classList.remove('active'); });
    
    var contenidos = seccion.querySelectorAll('.tab-content');
    contenidos.forEach(function(c) { c.classList.remove('active'); });
    
    if (tabs.length > 0) tabs[0].classList.add('active');
    if (contenidos.length > 0) contenidos[0].classList.add('active');
}

// =========================================
// ENSAYOS DE SUELOS
// =========================================

function abrirEnsayoSuelos(nombre) {
    var panel = document.getElementById('panel-ensayo');
    var grid = document.querySelector('#ms1-ensayos .ensayos-grid');
    if (grid) grid.style.display = 'none';
    
    panel.innerHTML = '<button class="btn-volver-panel btn-volver" onclick="volverAListaEnsayos()">← Ensayos</button>';
    
    switch(nombre) {
        case 'humedad':
            panel.innerHTML += crearFormularioHumedad();
            break;
        case 'granulometria':
            panel.innerHTML += crearFormularioGranulometria();
            break;
        case 'limites':
            panel.innerHTML += crearFormularioLimites();
            break;
        case 'gravedad':
            panel.innerHTML += crearFormularioGravedad();
            break;
        case 'compactacion':
            panel.innerHTML += crearFormularioCompactacion();
            break;
        case 'densidad':
            panel.innerHTML += crearFormularioDensidad();
            break;
        case 'clasificacion':
            panel.innerHTML += crearFormularioClasificacion();
            break;
        case 'permeabilidad':
            panel.innerHTML += crearFormularioPermeabilidad();
            break;
    }
    
    panel.style.display = 'block';
    window.scrollTo(0, 0);
}

function volverAListaEnsayos() {
    var panel = document.getElementById('panel-ensayo');
    var grid = document.querySelector('#ms1-ensayos .ensayos-grid');
    if (panel) {
        panel.style.display = 'none';
        panel.innerHTML = '';
    }
    if (grid) grid.style.display = 'grid';
}

// =========================================
// FORMULARIOS DE ENSAYOS
// =========================================


/** Enter en inputs de laboratorio: pasar al siguiente campo */
function activarEnterSiguienteCampo(root) {
    if (!root) return;
    var campos = root.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="button"]):not([type="submit"]), select, textarea');
    campos = Array.prototype.slice.call(campos).filter(function(el) {
        return !el.disabled && el.offsetParent !== null;
    });
    campos.forEach(function(el, idx) {
        if (el.dataset.enterNav === '1') return;
        el.dataset.enterNav = '1';
        el.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter') return;
            // En textarea, Ctrl+Enter o Shift+Enter no navega
            if (el.tagName === 'TEXTAREA' && !e.ctrlKey) return;
            e.preventDefault();
            var next = campos[idx + 1];
            if (next) {
                next.focus();
                if (typeof next.select === 'function' && next.tagName === 'INPUT') {
                    try { next.select(); } catch (err) {}
                }
            } else {
                // último campo: intentar botón calcular
                var btn = root.querySelector('.btn-calcular, button.btn-calcular, button[onclick*="calcular"], button[onclick*="Calcular"]');
                if (btn) btn.focus();
            }
        });
    });
}


/* ============================================================
   RESISTENCIA DE MATERIALES — ensayos y simuladores
   Máquinas de referencia UniPamplona:
   - Máquina universal tipo SHIMADZU UH (tracción / compresión / flexión)
   - Banco de torsión
   - Durómetro Rockwell
   ============================================================ */
window.__datosEnsayoRM = window.__datosEnsayoRM || {};

function abrirModuloRM(tipo, modo) {
    modo = modo || 'ensayo';
    var panelId = modo === 'sim' ? 'panel-sim-rm' : 'panel-ensayo-rm';
    var panel = document.getElementById(panelId);
    if (!panel) {
        panel = document.getElementById('panel-ensayo-rm');
    }
    if (!panel) return;

    // activar pestaña correcta
    if (modo === 'sim') {
        var tabSim = document.querySelector('#pantallaResistencia .tab-btn[data-tab="rm-simuladores"]');
        if (tabSim) tabSim.click();
    } else {
        var tabEn = document.querySelector('#pantallaResistencia .tab-btn[data-tab="rm-ensayos"]');
        if (tabEn) tabEn.click();
    }

    var html = '';
    if (tipo === 'traccion') html = crearFormularioRMTraccion(modo);
    else if (tipo === 'compresion') html = crearFormularioRMCompresion(modo);
    else if (tipo === 'flexion') html = crearFormularioRMFlexion(modo);
    else if (tipo === 'torsion') html = crearFormularioRMTorsion(modo);
    else if (tipo === 'dureza') html = crearFormularioRMDureza(modo);
    else html = '<p class="aula-vacio">Módulo no disponible.</p>';

    panel.innerHTML = html;
    panel.style.display = 'block';
    try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}

    if (modo === 'sim') {
        setTimeout(function() { if (typeof dibujarMaquinaRM === 'function') dibujarMaquinaRM(tipo); }, 50);
    }
}

function rmCerrarPanel(modo) {
    var panel = document.getElementById(modo === 'sim' ? 'panel-sim-rm' : 'panel-ensayo-rm');
    if (panel) { panel.innerHTML = ''; panel.style.display = 'none'; }
}

function rmNum(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var v = parseFloat(String(el.value).replace(',', '.'));
    return isNaN(v) ? null : v;
}

function rmSet(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
}

/* --- SVG / canvas máquinas --- */
function dibujarMaquinaRM(tipo) {
    var canvas = document.getElementById('rm-machine-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, W, H);

    if (tipo === 'traccion' || tipo === 'compresion') {
        // Máquina universal esquemática
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(W * 0.25, H * 0.08, W * 0.5, H * 0.12); // travesaño superior
        ctx.fillRect(W * 0.2, H * 0.82, W * 0.6, H * 0.1); // base
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(W * 0.28, H * 0.2, 18, H * 0.62); // columna izq
        ctx.fillRect(W * 0.72 - 18, H * 0.2, 18, H * 0.62); // columna der
        // mordazas / platos
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(W * 0.38, H * 0.28, W * 0.24, 14);
        ctx.fillRect(W * 0.38, H * 0.62, W * 0.24, 14);
        // probeta
        ctx.fillStyle = '#fbbf24';
        var midX = W * 0.5, topY = H * 0.32, botY = H * 0.62;
        if (tipo === 'compresion') {
            ctx.fillRect(midX - 22, topY + 20, 44, botY - topY - 40);
        } else {
            ctx.fillRect(midX - 8, topY + 8, 16, botY - topY - 16);
            ctx.fillRect(midX - 18, topY + 8, 36, 12);
            ctx.fillRect(midX - 18, botY - 20, 36, 12);
        }
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '12px sans-serif';
        ctx.fillText(tipo === 'traccion' ? 'UTM — Tracción' : 'UTM — Compresión', 12, 20);
        ctx.fillText('Ref. SHIMADZU UH / UniPamplona', 12, 36);
    } else if (tipo === 'flexion') {
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(W * 0.1, H * 0.7, W * 0.8, 16); // base
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(W * 0.2, H * 0.55, 14, H * 0.15);
        ctx.fillRect(W * 0.8 - 14, H * 0.55, 14, H * 0.15);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(W * 0.18, H * 0.5, W * 0.64, 12); // viga
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(W * 0.5, H * 0.25);
        ctx.lineTo(W * 0.5, H * 0.48);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillRect(W * 0.5 - 20, H * 0.48, 40, 8); // cargador
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '12px sans-serif';
        ctx.fillText('Kit de flexión en UTM — UniPamplona', 12, 20);
    } else if (tipo === 'torsion') {
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(W * 0.15, H * 0.35, W * 0.7, 24);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(W * 0.25, H * 0.42, W * 0.5, 10); // barra
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(W * 0.22, H * 0.47, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(W * 0.78, H * 0.47, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '12px sans-serif';
        ctx.fillText('Banco de torsión — UniPamplona', 12, 20);
    } else if (tipo === 'dureza') {
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(W * 0.35, H * 0.15, W * 0.3, H * 0.55);
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(W * 0.42, H * 0.7, W * 0.16, 12);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(W * 0.4, H * 0.75, W * 0.2, 20); // muestra
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(W * 0.5, H * 0.55);
        ctx.lineTo(W * 0.5, H * 0.72);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '12px sans-serif';
        ctx.fillText('Durómetro Rockwell — UniPamplona', 12, 20);
    }
}

function rmMachineBlock(tipo, modo) {
    if (modo !== 'sim') {
        return '<p class="login-hint">Equipo de laboratorio UniPamplona · ' +
            (tipo === 'traccion' || tipo === 'compresion' ? 'Máquina universal (tipo SHIMADZU UH)' :
             tipo === 'flexion' ? 'Kit de flexión en UTM' :
             tipo === 'torsion' ? 'Banco de torsión' : 'Durómetro Rockwell') + '</p>';
    }
    return '<div class="rm-machine-wrap">' +
        '<canvas id="rm-machine-canvas" width="420" height="260" style="width:100%;max-width:420px;border-radius:10px;background:#1a2332;"></canvas>' +
        '</div>';
}

/* ========== TRACCIÓN ========== */
function crearFormularioRMTraccion(modo) {
    var titulo = (modo === 'sim' ? 'Simulador' : 'Ensayo') + ' de Tracción';
    return '<div class="ensayo-form rm-form">' +
        '<div class="ensayo-form-header"><h3>' + titulo + '</h3>' +
        '<button type="button" class="btn-limpiar" onclick="rmCerrarPanel(\'' + modo + '\')">Cerrar</button></div>' +
        rmMachineBlock('traccion', modo) +
        '<p class="login-hint">Beer &amp; Johnston / Hibbeler · σ = P/A · ε = δ/L₀ · E = σ/ε (zona elástica)</p>' +
        '<div class="form-grid">' +
        '<label>Diámetro inicial d₀ (mm)<input type="number" id="rm-tr-d" value="12.5" step="0.1"></label>' +
        '<label>Longitud calibrada L₀ (mm)<input type="number" id="rm-tr-l0" value="50" step="0.1"></label>' +
        '<label>Carga P (kN)<input type="number" id="rm-tr-p" value="45" step="0.1"></label>' +
        '<label>Alargamiento δ (mm)<input type="number" id="rm-tr-dL" value="0.12" step="0.01"></label>' +
        '<label>Carga de fluencia Py (kN)<input type="number" id="rm-tr-py" value="35" step="0.1"></label>' +
        '<label>Carga última Pu (kN)<input type="number" id="rm-tr-pu" value="55" step="0.1"></label>' +
        '</div>' +
        '<button type="button" class="btn-calcular" onclick="calcularRMTraccion()">CALCULAR</button>' +
        '<div class="resultados-box">' +
        '<div><span>Área A₀</span><strong id="rm-tr-a">—</strong><small>mm²</small></div>' +
        '<div><span>σ (esfuerzo)</span><strong id="rm-tr-s">—</strong><small>MPa</small></div>' +
        '<div><span>ε (deformación)</span><strong id="rm-tr-e">—</strong><small>—</small></div>' +
        '<div><span>E (módulo)</span><strong id="rm-tr-E">—</strong><small>GPa</small></div>' +
        '<div><span>σy</span><strong id="rm-tr-sy">—</strong><small>MPa</small></div>' +
        '<div><span>σu</span><strong id="rm-tr-su">—</strong><small>MPa</small></div>' +
        '</div>' +
        '<div class="grafica-panel"><div class="grafica-header"><h4>Curva esfuerzo–deformación (esquema)</h4>' +
        '<button type="button" class="btn-grafica" onclick="graficaRMTraccion()">GENERAR GRÁFICA</button></div>' +
        '<canvas id="canvas-rm-traccion" width="640" height="320"></canvas></div>' +
        '<p class="error-msg" id="rm-tr-error"></p></div>';
}

function calcularRMTraccion() {
    var err = document.getElementById('rm-tr-error');
    if (err) err.textContent = '';
    var d = rmNum('rm-tr-d'), L0 = rmNum('rm-tr-l0'), P = rmNum('rm-tr-p'), dL = rmNum('rm-tr-dL');
    var Py = rmNum('rm-tr-py'), Pu = rmNum('rm-tr-pu');
    if (!d || !L0 || d <= 0 || L0 <= 0) {
        if (err) err.textContent = 'Diámetro y longitud inválidos';
        return;
    }
    var A0 = Math.PI * Math.pow(d / 2, 2); // mm²
    var sigma = (P != null) ? (P * 1000) / A0 : null; // kN->N / mm² = MPa
    var eps = (dL != null) ? dL / L0 : null;
    var E = (sigma != null && eps && eps > 0) ? (sigma / eps) / 1000 : null; // GPa
    var sy = (Py != null) ? (Py * 1000) / A0 : null;
    var su = (Pu != null) ? (Pu * 1000) / A0 : null;
    rmSet('rm-tr-a', A0.toFixed(2));
    rmSet('rm-tr-s', sigma != null ? sigma.toFixed(1) : '—');
    rmSet('rm-tr-e', eps != null ? eps.toFixed(5) : '—');
    rmSet('rm-tr-E', E != null ? E.toFixed(1) : '—');
    rmSet('rm-tr-sy', sy != null ? sy.toFixed(1) : '—');
    rmSet('rm-tr-su', su != null ? su.toFixed(1) : '—');
    window.__datosEnsayoRM.traccion = { d: d, L0: L0, A0: A0, P: P, dL: dL, sigma: sigma, eps: eps, E: E, sy: sy, su: su };
    if (typeof dibujarMaquinaRM === 'function') dibujarMaquinaRM('traccion');
}

function graficaRMTraccion() {
    var d = window.__datosEnsayoRM.traccion;
    var canvas = document.getElementById('canvas-rm-traccion');
    if (!canvas || !d) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    var pad = 50;
    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(pad, H - pad);
    ctx.lineTo(W - 20, H - pad);
    ctx.moveTo(pad, H - pad);
    ctx.lineTo(pad, 20);
    ctx.stroke();
    // curva esquemática hasta σu
    var sy = d.sy || 250, su = d.su || 400, E = (d.E || 200) * 1000; // MPa
    var epsY = sy / E, epsU = epsY + 0.15, epsB = epsU + 0.08;
    function x(e) { return pad + (e / (epsB * 1.1)) * (W - pad - 30); }
    function y(s) { return H - pad - (s / (su * 1.15)) * (H - pad - 30); }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x(0), y(0));
    ctx.lineTo(x(epsY), y(sy));
    ctx.lineTo(x(epsY * 1.05), y(sy * 0.98));
    ctx.quadraticCurveTo(x(epsU * 0.6), y(su * 0.85), x(epsU), y(su));
    ctx.quadraticCurveTo(x(epsB * 0.9), y(su * 0.92), x(epsB), y(su * 0.75));
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    ctx.fillText('ε', W - 30, H - 20);
    ctx.fillText('σ (MPa)', 8, 24);
    if (d.sigma != null && d.eps != null) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x(Math.min(d.eps, epsB)), y(Math.min(d.sigma, su * 1.1)), 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

/* ========== COMPRESIÓN ========== */
function crearFormularioRMCompresion(modo) {
    var titulo = (modo === 'sim' ? 'Simulador' : 'Ensayo') + ' de Compresión';
    return '<div class="ensayo-form rm-form">' +
        '<div class="ensayo-form-header"><h3>' + titulo + '</h3>' +
        '<button type="button" class="btn-limpiar" onclick="rmCerrarPanel(\'' + modo + '\')">Cerrar</button></div>' +
        rmMachineBlock('compresion', modo) +
        '<p class="login-hint">Cilindro de concreto o metal en máquina universal / prensa · fc = P / A</p>' +
        '<div class="form-grid">' +
        '<label>Diámetro d (mm)<input type="number" id="rm-co-d" value="100" step="0.1"></label>' +
        '<label>Altura h (mm)<input type="number" id="rm-co-h" value="200" step="0.1"></label>' +
        '<label>Carga de falla P (kN)<input type="number" id="rm-co-p" value="450" step="0.1"></label>' +
        '</div>' +
        '<button type="button" class="btn-calcular" onclick="calcularRMCompresion()">CALCULAR</button>' +
        '<div class="resultados-box">' +
        '<div><span>Área A</span><strong id="rm-co-a">—</strong><small>mm²</small></div>' +
        '<div><span>fc (resistencia)</span><strong id="rm-co-fc">—</strong><small>MPa</small></div>' +
        '</div>' +
        '<p class="error-msg" id="rm-co-error"></p></div>';
}

function calcularRMCompresion() {
    var err = document.getElementById('rm-co-error');
    if (err) err.textContent = '';
    var d = rmNum('rm-co-d'), h = rmNum('rm-co-h'), P = rmNum('rm-co-p');
    if (!d || !P || d <= 0) { if (err) err.textContent = 'Datos inválidos'; return; }
    var A = Math.PI * Math.pow(d / 2, 2);
    var fc = (P * 1000) / A;
    rmSet('rm-co-a', A.toFixed(1));
    rmSet('rm-co-fc', fc.toFixed(2));
    window.__datosEnsayoRM.compresion = { d: d, h: h, P: P, A: A, fc: fc };
    dibujarMaquinaRM('compresion');
}

/* ========== FLEXIÓN ========== */
function crearFormularioRMFlexion(modo) {
    var titulo = (modo === 'sim' ? 'Simulador' : 'Ensayo') + ' de Flexión';
    return '<div class="ensayo-form rm-form">' +
        '<div class="ensayo-form-header"><h3>' + titulo + '</h3>' +
        '<button type="button" class="btn-limpiar" onclick="rmCerrarPanel(\'' + modo + '\')">Cerrar</button></div>' +
        rmMachineBlock('flexion', modo) +
        '<p class="login-hint">Viga simplemente apoyada, carga centrada · σ = M·c / I · Mr = módulo de ruptura</p>' +
        '<div class="form-grid">' +
        '<label>Luz L (mm)<input type="number" id="rm-fl-L" value="300" step="1"></label>' +
        '<label>Ancho b (mm)<input type="number" id="rm-fl-b" value="100" step="0.1"></label>' +
        '<label>Altura h (mm)<input type="number" id="rm-fl-h" value="100" step="0.1"></label>' +
        '<label>Carga de falla P (kN)<input type="number" id="rm-fl-p" value="25" step="0.1"></label>' +
        '</div>' +
        '<button type="button" class="btn-calcular" onclick="calcularRMFlexion()">CALCULAR</button>' +
        '<div class="resultados-box">' +
        '<div><span>M máx</span><strong id="rm-fl-m">—</strong><small>N·mm</small></div>' +
        '<div><span>I</span><strong id="rm-fl-i">—</strong><small>mm⁴</small></div>' +
        '<div><span>Mr (ruptura)</span><strong id="rm-fl-mr">—</strong><small>MPa</small></div>' +
        '</div>' +
        '<p class="error-msg" id="rm-fl-error"></p></div>';
}

function calcularRMFlexion() {
    var err = document.getElementById('rm-fl-error');
    if (err) err.textContent = '';
    var L = rmNum('rm-fl-L'), b = rmNum('rm-fl-b'), h = rmNum('rm-fl-h'), P = rmNum('rm-fl-p');
    if (!L || !b || !h || !P) { if (err) err.textContent = 'Complete todos los datos'; return; }
    var M = (P * 1000) * L / 4; // N·mm
    var I = b * Math.pow(h, 3) / 12;
    var c = h / 2;
    var Mr = (M * c) / I; // N/mm² = MPa
    rmSet('rm-fl-m', M.toFixed(0));
    rmSet('rm-fl-i', I.toFixed(0));
    rmSet('rm-fl-mr', Mr.toFixed(2));
    window.__datosEnsayoRM.flexion = { L: L, b: b, h: h, P: P, M: M, I: I, Mr: Mr };
    dibujarMaquinaRM('flexion');
}

/* ========== TORSIÓN ========== */
function crearFormularioRMTorsion(modo) {
    var titulo = (modo === 'sim' ? 'Simulador' : 'Ensayo') + ' de Torsión';
    return '<div class="ensayo-form rm-form">' +
        '<div class="ensayo-form-header"><h3>' + titulo + '</h3>' +
        '<button type="button" class="btn-limpiar" onclick="rmCerrarPanel(\'' + modo + '\')">Cerrar</button></div>' +
        rmMachineBlock('torsion', modo) +
        '<p class="login-hint">Banco de torsión · τ = T·r / J · γ = r·θ / L · G = τ/γ</p>' +
        '<div class="form-grid">' +
        '<label>Diámetro d (mm)<input type="number" id="rm-to-d" value="20" step="0.1"></label>' +
        '<label>Longitud L (mm)<input type="number" id="rm-to-L" value="250" step="1"></label>' +
        '<label>Torque T (N·m)<input type="number" id="rm-to-T" value="80" step="0.1"></label>' +
        '<label>Ángulo θ (°)<input type="number" id="rm-to-th" value="2.5" step="0.1"></label>' +
        '</div>' +
        '<button type="button" class="btn-calcular" onclick="calcularRMTorsion()">CALCULAR</button>' +
        '<div class="resultados-box">' +
        '<div><span>J</span><strong id="rm-to-j">—</strong><small>mm⁴</small></div>' +
        '<div><span>τ</span><strong id="rm-to-tau">—</strong><small>MPa</small></div>' +
        '<div><span>γ</span><strong id="rm-to-g">—</strong><small>—</small></div>' +
        '<div><span>G</span><strong id="rm-to-G">—</strong><small>GPa</small></div>' +
        '</div>' +
        '<p class="error-msg" id="rm-to-error"></p></div>';
}

function calcularRMTorsion() {
    var err = document.getElementById('rm-to-error');
    if (err) err.textContent = '';
    var d = rmNum('rm-to-d'), L = rmNum('rm-to-L'), T = rmNum('rm-to-T'), thDeg = rmNum('rm-to-th');
    if (!d || !L || !T || thDeg == null) { if (err) err.textContent = 'Complete todos los datos'; return; }
    var r = d / 2;
    var J = Math.PI * Math.pow(d, 4) / 32; // mm⁴
    var T_Nmm = T * 1000; // N·m → N·mm
    var tau = (T_Nmm * r) / J; // MPa
    var th = thDeg * Math.PI / 180;
    var gamma = (r * th) / L;
    var G = (gamma > 0) ? (tau / gamma) / 1000 : null; // GPa
    rmSet('rm-to-j', J.toFixed(0));
    rmSet('rm-to-tau', tau.toFixed(2));
    rmSet('rm-to-g', gamma.toFixed(6));
    rmSet('rm-to-G', G != null ? G.toFixed(1) : '—');
    window.__datosEnsayoRM.torsion = { d: d, L: L, T: T, thDeg: thDeg, J: J, tau: tau, gamma: gamma, G: G };
    dibujarMaquinaRM('torsion');
}

/* ========== DUREZA ========== */
function crearFormularioRMDureza(modo) {
    var titulo = (modo === 'sim' ? 'Simulador' : 'Ensayo') + ' de Dureza Rockwell';
    return '<div class="ensayo-form rm-form">' +
        '<div class="ensayo-form-header"><h3>' + titulo + '</h3>' +
        '<button type="button" class="btn-limpiar" onclick="rmCerrarPanel(\'' + modo + '\')">Cerrar</button></div>' +
        rmMachineBlock('dureza', modo) +
        '<p class="login-hint">Durómetro Rockwell (ref. Instron / UniPamplona) · Escalas HRC, HRB…</p>' +
        '<div class="form-grid">' +
        '<label>Escala<select id="rm-du-esc"><option value="C">HRC (cono diamante)</option><option value="B">HRB (bola 1/16")</option></select></label>' +
        '<label>Lectura 1<input type="number" id="rm-du-1" value="32" step="0.5"></label>' +
        '<label>Lectura 2<input type="number" id="rm-du-2" value="33" step="0.5"></label>' +
        '<label>Lectura 3<input type="number" id="rm-du-3" value="31.5" step="0.5"></label>' +
        '</div>' +
        '<button type="button" class="btn-calcular" onclick="calcularRMDureza()">CALCULAR</button>' +
        '<div class="resultados-box">' +
        '<div><span>Promedio</span><strong id="rm-du-avg">—</strong></div>' +
        '<div><span>Escala</span><strong id="rm-du-sc">—</strong></div>' +
        '</div>' +
        '<p class="error-msg" id="rm-du-error"></p></div>';
}

function calcularRMDureza() {
    var v1 = rmNum('rm-du-1'), v2 = rmNum('rm-du-2'), v3 = rmNum('rm-du-3');
    var esc = (document.getElementById('rm-du-esc') || {}).value || 'C';
    var vals = [v1, v2, v3].filter(function(v) { return v != null; });
    if (!vals.length) return;
    var avg = vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
    rmSet('rm-du-avg', avg.toFixed(1));
    rmSet('rm-du-sc', 'HR' + esc);
    window.__datosEnsayoRM.dureza = { escala: 'HR' + esc, lecturas: vals, promedio: avg };
    dibujarMaquinaRM('dureza');
}


function crearFormularioHumedad() {
    return `
        <h3>Contenido de Humedad</h3>
        <div class="laboratorio-panel">
            <div class="datos-panel">
                <h4>Datos de la muestra</h4>
                <label>Masa del recipiente (g):</label>
                <input type="number" id="h-recipiente" placeholder="Ej. 25.40" step="0.01">
                <label>Masa recipiente + suelo húmedo (g):</label>
                <input type="number" id="h-humeda" placeholder="Ej. 125.80" step="0.01">
                <label>Masa recipiente + suelo seco (g):</label>
                <input type="number" id="h-seca" placeholder="Ej. 105.20" step="0.01">
                <div class="botones-calculo">
                    <button class="btn-calcular" onclick="calcularHumedad()">CALCULAR</button>
                    <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayo('humedad')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-humedad" onclick="generarInformeEnsayoPDF('humedad')">Descargar informe</button>
        </div>
                    <button class="btn-limpiar" onclick="limpiarCampo('h')">LIMPIAR</button>
                </div>
                <div class="mensaje-error" id="h-error"></div>
            </div>
            <div class="resultado-panel">
                <h4>Resultados</h4>
                <div class="resultado-principal">
                    <span>CONTENIDO DE HUMEDAD</span>
                    <strong id="h-resultado">—</strong>
                </div>
                <div class="resultados-secundarios">
                    <div><span>Masa de agua</span><strong id="h-agua">—</strong><small>g</small></div>
                    <div><span>Masa suelo seco</span><strong id="h-suelo">—</strong><small>g</small></div>
                </div>
                <div class="interpretacion">
                    <span>INTERPRETACIÓN</span>
                    <p id="h-interpretacion">Ingresa los datos para obtener el resultado.</p>
                </div>
            </div>
        </div>
        <div class="grafica-panel">
            <div class="grafica-header">
                <h4>Gráfica — Composición de la muestra</h4>
                <button type="button" class="btn-grafica" onclick="graficaHumedad()">GENERAR GRÁFICA</button>
            </div>
            <canvas id="canvas-humedad" width="640" height="360"></canvas>
            <p class="grafica-hint" id="hint-humedad">Calcula primero y luego pulsa GENERAR GRÁFICA.</p>
        </div>`;
}

function crearFormularioGranulometria() {
    return `
        <h3>Granulometría</h3>
        <div class="laboratorio-panel">
            <div class="datos-panel">
                <h4>Datos del tamizado</h4>
                <label>Masa total de la muestra (g):</label>
                <input type="number" id="g-total" placeholder="Ej. 500" step="0.1">
                <label>Tamiz 2" (g):</label><input type="number" id="g-2" step="0.01">
                <label>Tamiz 3/4" (g):</label><input type="number" id="g-34" step="0.01">
                <label>Tamiz #4 (g):</label><input type="number" id="g-4" step="0.01">
                <label>Tamiz #10 (g):</label><input type="number" id="g-10" step="0.01">
                <label>Tamiz #20 (g):</label><input type="number" id="g-20" step="0.01">
                <label>Tamiz #40 (g):</label><input type="number" id="g-40" step="0.01">
                <label>Tamiz #60 (g):</label><input type="number" id="g-60" step="0.01">
                <label>Tamiz #100 (g):</label><input type="number" id="g-100" step="0.01">
                <label>Tamiz #200 (g):</label><input type="number" id="g-200" step="0.01">
                <label>Pasante #200 (g):</label><input type="number" id="g-p200" step="0.01">
                <div class="botones-calculo">
                    <button class="btn-calcular" onclick="calcularGranulometria()">CALCULAR</button>
                    <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayo('granulometria')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-granulometria" onclick="generarInformeEnsayoPDF('granulometria')">Descargar informe</button>
        </div>
                    <button class="btn-limpiar" onclick="limpiarCampo('g')">LIMPIAR</button>
                </div>
                <div class="mensaje-error" id="g-error"></div>
            </div>
            <div class="resultado-panel">
                <h4>Resultados</h4>
                <div class="resultado-principal">
                    <span>CLASIFICACIÓN</span>
                    <strong id="g-tipo">—</strong>
                </div>
                <div class="resultados-secundarios">
                    <div><span>Grava</span><strong id="g-grava">—</strong><small>%</small></div>
                    <div><span>Arena</span><strong id="g-arena">—</strong><small>%</small></div>
                    <div><span>Finos</span><strong id="g-finos">—</strong><small>%</small></div>
                    <div><span>Cu</span><strong id="g-cu">—</strong></div>
                </div>
            </div>
        </div>
        <div class="grafica-panel">
            <div class="grafica-header">
                <h4>Gráfica — Curva granulométrica</h4>
                <button type="button" class="btn-grafica" onclick="graficaGranulometria()">GENERAR GRÁFICA</button>
            </div>
            <canvas id="canvas-granulo" width="640" height="360"></canvas>
            <p class="grafica-hint" id="hint-granulo">Calcula primero y luego pulsa GENERAR GRÁFICA.</p>
        </div>`;
}

function crearFormularioLimites() {
    return `
        <h3>Límites de Atterberg</h3>
        <div class="laboratorio-panel">
            <div class="datos-panel">
                <h4>Límite Líquido - Ensayos de golpes</h4>
                <label>Ensayo 1 - Golpes:</label><input type="number" id="l-g1" placeholder="Ej. 25">
                <label>Ensayo 1 - Humedad (%):</label><input type="number" id="l-h1" placeholder="Ej. 32.5" step="0.1">
                <label>Ensayo 2 - Golpes:</label><input type="number" id="l-g2" placeholder="Ej. 30">
                <label>Ensayo 2 - Humedad (%):</label><input type="number" id="l-h2" placeholder="Ej. 30.2" step="0.1">
                <label>Ensayo 3 - Golpes:</label><input type="number" id="l-g3" placeholder="Ej. 35">
                <label>Ensayo 3 - Humedad (%):</label><input type="number" id="l-h3" placeholder="Ej. 28.5" step="0.1">
                <h4 style="margin-top:20px">Límite Plástico</h4>
                <label>LP (%) - Promedio de rollitos:</label>
                <input type="number" id="l-lp" placeholder="Ej. 22" step="0.1">
                <div class="botones-calculo">
                    <button class="btn-calcular" onclick="calcularLimites()">CALCULAR</button>
                    <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayo('limites')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-limites" onclick="generarInformeEnsayoPDF('limites')">Descargar informe</button>
        </div>
                    <button class="btn-limpiar" onclick="limpiarCampo('l')">LIMPIAR</button>
                </div>
                <div class="mensaje-error" id="l-error"></div>
            </div>
            <div class="resultado-panel">
                <h4>Resultados</h4>
                <div class="resultado-principal">
                    <span>ÍNDICE DE PLASTICIDAD (IP)</span>
                    <strong id="l-ip">—</strong>
                </div>
                <div class="resultados-secundarios">
                    <div><span>Límite Líquido (LL)</span><strong id="l-ll">—</strong><small>%</small></div>
                    <div><span>Límite Plástico (LP)</span><strong id="l-lpres">—</strong><small>%</small></div>
                    <div><span>Clasificación</span><strong id="l-clasif">—</strong></div>
                    <div><span>Tipo</span><strong id="l-tipo">—</strong></div>
                </div>
            </div>
        </div>
        <div class="grafica-panel">
            <div class="grafica-header">
                <h4>Gráfica — Curva de fluidez y carta de plasticidad</h4>
                <button type="button" class="btn-grafica" onclick="graficaLimites()">GENERAR GRÁFICA</button>
            </div>
            <canvas id="canvas-limites" width="640" height="360"></canvas>
            <p class="grafica-hint" id="hint-limites">Calcula primero y luego pulsa GENERAR GRÁFICA.</p>
        </div>`;
}

function crearFormularioGravedad() {
    return `
        <h3>Gravedad Específica</h3>
        <div class="laboratorio-panel">
            <div class="datos-panel">
                <h4>Datos del Picnómetro</h4>
                <label>Masa del picnómetro vacío (g):</label>
                <input type="number" id="ge-pic" placeholder="Ej. 125.40" step="0.01">
                <label>Masa picnómetro + suelo seco (g):</label>
                <input type="number" id="ge-picsuelo" placeholder="Ej. 150.80" step="0.01">
                <label>Masa picnómetro + agua + suelo (g):</label>
                <input type="number" id="ge-paguasuelo" placeholder="Ej. 685.20" step="0.01">
                <label>Masa picnómetro lleno de agua (g):</label>
                <input type="number" id="ge-pagua" placeholder="Ej. 660.50" step="0.01">
                <div class="botones-calculo">
                    <button class="btn-calcular" onclick="calcularGravedad()">CALCULAR</button>
                    <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayo('gravedad')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-gravedad" onclick="generarInformeEnsayoPDF('gravedad')">Descargar informe</button>
        </div>
                    <button class="btn-limpiar" onclick="limpiarCampo('ge')">LIMPIAR</button>
                </div>
                <div class="mensaje-error" id="ge-error"></div>
            </div>
            <div class="resultado-panel">
                <h4>Resultados</h4>
                <div class="resultado-principal">
                    <span>GRAVEDAD ESPECÍFICA (Gs)</span>
                    <strong id="ge-gs">—</strong>
                </div>
                <div class="resultados-secundarios">
                    <div><span>Masa del suelo seco</span><strong id="ge-ms">—</strong><small>g</small></div>
                    <div><span>Volumen de sólidos</span><strong id="ge-vs">—</strong><small>cm³</small></div>
                    <div><span>Tipo de suelo</span><strong id="ge-tipo">—</strong></div>
                    <div><span>Rango típico</span><strong id="ge-rango">—</strong></div>
                </div>
            </div>
        </div>
        <div class="grafica-panel">
            <div class="grafica-header">
                <h4>Gráfica — Gs vs rangos típicos</h4>
                <button type="button" class="btn-grafica" onclick="graficaGravedad()">GENERAR GRÁFICA</button>
            </div>
            <canvas id="canvas-gravedad" width="640" height="360"></canvas>
            <p class="grafica-hint" id="hint-gravedad">Calcula primero y luego pulsa GENERAR GRÁFICA.</p>
        </div>`;
}

function crearFormularioCompactacion() {
    return `
        <h3>Compactación Proctor Estándar</h3>
        <div class="laboratorio-panel">
            <div class="datos-panel">
                <h4>Datos del Molde</h4>
                <label>Masa del molde (g):</label>
                <input type="number" id="cp-molde" placeholder="Ej. 4500" step="0.1">
                <label>Volumen del molde (cm³):</label>
                <input type="number" id="cp-vol" placeholder="Ej. 2120" step="0.1">
                <h4>Datos de Ensayos</h4>
                <div class="proctor-inputs">
                    <div><label>Punto 1 - Masa+hoy+mold (g):</label><input type="number" id="cp-h1" step="0.1"><label>Humedad (%):</label><input type="number" id="cp-w1" step="0.1"></div>
                    <div><label>Punto 2 - Masa+hoy+mold (g):</label><input type="number" id="cp-h2" step="0.1"><label>Humedad (%):</label><input type="number" id="cp-w2" step="0.1"></div>
                    <div><label>Punto 3 - Masa+hoy+mold (g):</label><input type="number" id="cp-h3" step="0.1"><label>Humedad (%):</label><input type="number" id="cp-w3" step="0.1"></div>
                    <div><label>Punto 4 - Masa+hoy+mold (g):</label><input type="number" id="cp-h4" step="0.1"><label>Humedad (%):</label><input type="number" id="cp-w4" step="0.1"></div>
                    <div><label>Punto 5 - Masa+hoy+mold (g):</label><input type="number" id="cp-h5" step="0.1"><label>Humedad (%):</label><input type="number" id="cp-w5" step="0.1"></div>
                </div>
                <div class="botones-calculo">
                    <button class="btn-calcular" onclick="calcularCompactacion()">CALCULAR</button>
                    <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayo('compactacion')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-compactacion" onclick="generarInformeEnsayoPDF('compactacion')">Descargar informe</button>
        </div>
                    <button class="btn-limpiar" onclick="limpiarCampo('cp')">LIMPIAR</button>
                </div>
                <div class="mensaje-error" id="cp-error"></div>
            </div>
            <div class="resultado-panel">
                <h4>Resultados</h4>
                <div class="resultado-principal">
                    <span>HUMEDAD ÓPTIMA</span>
                    <strong id="cp-wopt">—</strong>
                </div>
                <div class="resultados-secundarios">
                    <div><span>Densidad seca máx.</span><strong id="cp-gdmax">—</strong><small>g/cm³</small></div>
                    <div><span>En kN/m³</span><strong id="cp-gdmaxkn">—</strong><small>kN/m³</small></div>
                </div>
                <div class="interpretacion">
                    <span>INTERPRETACIÓN</span>
                    <p id="cp-interpretacion">Ingresa los datos para obtener el resultado.</p>
                </div>
            </div>
        </div>
        <div class="grafica-panel">
            <div class="grafica-header">
                <h4>Gráfica — Curva de compactación Proctor</h4>
                <button type="button" class="btn-grafica" onclick="graficaCompactacion()">GENERAR GRÁFICA</button>
            </div>
            <canvas id="canvas-proctor" width="640" height="360"></canvas>
            <p class="grafica-hint" id="hint-proctor">Calcula primero y luego pulsa GENERAR GRÁFICA.</p>
        </div>`;
}

function crearFormularioDensidad() {
    return `
        <h3>Densidad de Campo (Cono de Arena)</h3>
        <div class="laboratorio-panel">
            <div class="datos-panel">
                <h4>Datos del Ensayo</h4>
                <label>Masa del cono con arena (g):</label>
                <input type="number" id="d-cono" placeholder="Ej. 1500" step="0.1">
                <label>Masa del cono con arena restante (g):</label>
                <input type="number" id="d-rest" placeholder="Ej. 750" step="0.1">
                <label>Densidad de la arena patrón (g/cm³):</label>
                <input type="number" id="d-darena" placeholder="Ej. 1.45" step="0.01">
                <label>Masa del suelo húmedo extraído (g):</label>
                <input type="number" id="d-suelo" placeholder="Ej. 1200" step="0.1">
                <label>Contenido de humedad (%):</label>
                <input type="number" id="d-w" placeholder="Ej. 12.5" step="0.1">
                <div class="botones-calculo">
                    <button class="btn-calcular" onclick="calcularDensidad()">CALCULAR</button>
                    <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayo('densidad')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-densidad" onclick="generarInformeEnsayoPDF('densidad')">Descargar informe</button>
        </div>
                    <button class="btn-limpiar" onclick="limpiarCampo('d')">LIMPIAR</button>
                </div>
                <div class="mensaje-error" id="d-error"></div>
            </div>
            <div class="resultado-panel">
                <h4>Resultados</h4>
                <div class="resultado-principal">
                    <span>DENSIDAD SECA</span>
                    <strong id="d-gd">—</strong>
                </div>
                <div class="resultados-secundarios">
                    <div><span>Volumen del hoyo</span><strong id="d-vol">—</strong><small>cm³</small></div>
                    <div><span>Densidad húmeda</span><strong id="d-gh">—</strong><small>g/cm³</small></div>
                    <div><span>En kN/m³</span><strong id="d-gdkn">—</strong><small>kN/m³</small></div>
                    <div><span>Grado compactación</span><strong id="d-gc">—</strong><small>%</small></div>
                </div>
            </div>
        </div>
        <div class="grafica-panel">
            <div class="grafica-header">
                <h4>Gráfica — Densidades de campo</h4>
                <button type="button" class="btn-grafica" onclick="graficaDensidad()">GENERAR GRÁFICA</button>
            </div>
            <canvas id="canvas-densidad" width="640" height="360"></canvas>
            <p class="grafica-hint" id="hint-densidad">Calcula primero y luego pulsa GENERAR GRÁFICA.</p>
        </div>`;
}

function crearFormularioClasificacion() {
    return `
        <h3>Clasificación SUCS</h3>
        <div class="laboratorio-panel">
            <div class="datos-panel">
                <h4>Datos para Clasificación</h4>
                <label>% Pasante tamiz #200:</label>
                <input type="number" id="c-p200" placeholder="Ej. 35" step="0.1">
                <label>Límite Líquido (LL) %:</label>
                <input type="number" id="c-ll" placeholder="Ej. 45" step="0.1">
                <label>Índice de Plasticidad (IP) %:</label>
                <input type="number" id="c-ip" placeholder="Ej. 20" step="0.1">
                <label>% Retenido tamiz #4:</label>
                <input type="number" id="c-p4" placeholder="Ej. 10" step="0.1">
                <div class="botones-calculo">
                    <button class="btn-calcular" onclick="clasificarSUCS()">CLASIFICAR</button>
                    <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayo('clasificacion')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-clasificacion" onclick="generarInformeEnsayoPDF('clasificacion')">Descargar informe</button>
        </div>
                    <button class="btn-limpiar" onclick="limpiarCampo('c')">LIMPIAR</button>
                </div>
                <div class="mensaje-error" id="c-error"></div>
            </div>
            <div class="resultado-panel">
                <h4>Resultados</h4>
                <div class="resultado-principal">
                    <span>GRUPO SUCS</span>
                    <strong id="c-grupo">—</strong>
                </div>
                <div class="resultados-secundarios">
                    <div><span>Símbolo</span><strong id="c-sim">—</strong></div>
                    <div><span>Tipo</span><strong id="c-tipo">—</strong></div>
                    <div><span>Clasificación</span><strong id="c-clasif">—</strong></div>
                    <div><span>Descripción</span><strong id="c-num">—</strong></div>
                </div>
            </div>
        </div>
        <div class="grafica-panel">
            <div class="grafica-header">
                <h4>Gráfica — Carta de plasticidad SUCS</h4>
                <button type="button" class="btn-grafica" onclick="graficaClasificacion()">GENERAR GRÁFICA</button>
            </div>
            <canvas id="canvas-sucs" width="640" height="360"></canvas>
            <p class="grafica-hint" id="hint-sucs">Clasifica primero y luego pulsa GENERAR GRÁFICA.</p>
        </div>`;
}

function crearFormularioPermeabilidad() {
    return `
        <h3>Permeabilidad (Ley de Darcy)</h3>
        <div class="laboratorio-panel">
            <div class="datos-panel">
                <h4>Datos del Ensayo</h4>
                <label>Volumen de agua (cm³):</label>
                <input type="number" id="p-vol" placeholder="Ej. 500" step="0.1">
                <label>Tiempo de recolección (s):</label>
                <input type="number" id="p-t" placeholder="Ej. 120" step="0.1">
                <label>Área de la muestra (cm²):</label>
                <input type="number" id="p-a" placeholder="Ej. 100" step="0.1">
                <label>Longitud de la muestra (cm):</label>
                <input type="number" id="p-l" placeholder="Ej. 15" step="0.1">
                <label>Carga hidráulica (cm):</label>
                <input type="number" id="p-h" placeholder="Ej. 50" step="0.1">
                <div class="botones-calculo">
                    <button class="btn-calcular" onclick="calcularPermeabilidad()">CALCULAR</button>
                    <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayo('permeabilidad')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-permeabilidad" onclick="generarInformeEnsayoPDF('permeabilidad')">Descargar informe</button>
        </div>
                    <button class="btn-limpiar" onclick="limpiarCampo('p')">LIMPIAR</button>
                </div>
                <div class="mensaje-error" id="p-error"></div>
            </div>
            <div class="resultado-panel">
                <h4>Resultados</h4>
                <div class="resultado-principal">
                    <span>COEFICIENTE k</span>
                    <strong id="p-k">—</strong>
                </div>
                <div class="resultados-secundarios">
                    <div><span>Caudal Q</span><strong id="p-q">—</strong><small>cm³/s</small></div>
                    <div><span>Gradiente i</span><strong id="p-i">—</strong></div>
                    <div><span>Velocidad v</span><strong id="p-v">—</strong><small>cm/s</small></div>
                    <div><span>Clasificación</span><strong id="p-tipo">—</strong></div>
                </div>
            </div>
        </div>
        <div class="grafica-panel">
            <div class="grafica-header">
                <h4>Gráfica — Flujo según Darcy (v vs i)</h4>
                <button type="button" class="btn-grafica" onclick="graficaPermeabilidad()">GENERAR GRÁFICA</button>
            </div>
            <canvas id="canvas-perm" width="640" height="360"></canvas>
            <p class="grafica-hint" id="hint-perm">Calcula primero y luego pulsa GENERAR GRÁFICA.</p>
        </div>`;
}

// =========================================
// FUNCIONES DE CÁLCULO
// =========================================

function parse(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var val = parseFloat(el.value);
    return isNaN(val) ? null : val;
}

function setError(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg;
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function limpiarCampo(pref) {
    document.querySelectorAll('[id^="' + pref + '-"]').forEach(function(el) {
        if (el.tagName === 'INPUT') el.value = '';
        else if (el.tagName === 'STRONG') el.textContent = '—';
        else if (el.tagName === 'P' && el.className === '') el.textContent = 'Ingresa los datos para obtener el resultado.';
    });
    setError(pref + '-error', '');
    window.__datosEnsayo = window.__datosEnsayo || {};
    window.__datosEnsayo[pref] = null;
}

// Datos del último cálculo (para gráficas)
window.__datosEnsayo = window.__datosEnsayo || {};

// CÁLCULOS DE SUELOS
function calcularHumedad() {
    var r = parse('h-recipiente'), h = parse('h-humeda'), s = parse('h-seca');
    setError('h-error', '');
    if (!r || !h || !s) { setError('h-error', 'Completa todos los campos'); return; }
    if (h <= r || s <= r || h < s) { setError('h-error', 'Revisa los datos'); return; }
    var agua = h - s, sueloSeco = s - r, w = (agua / sueloSeco) * 100;
    document.getElementById('h-resultado').textContent = w.toFixed(2) + ' %';
    document.getElementById('h-agua').textContent = agua.toFixed(2);
    document.getElementById('h-suelo').textContent = sueloSeco.toFixed(2);
    var interp = w < 10 ? 'Humedad baja' : w < 25 ? 'Humedad intermedia' : w < 40 ? 'Humedad alta' : 'Humedad muy alta';
    document.getElementById('h-interpretacion').textContent = interp + '. w = ' + w.toFixed(2) + '%';
    window.__datosEnsayo = window.__datosEnsayo || {};
    window.__datosEnsayo.h = { agua: agua, suelo: sueloSeco, w: w, texto: 'w = ' + w.toFixed(2) + '%' };
}

function calcularGranulometria() {
    var total = parse('g-total');
    setError('g-error', '');
    if (!total || total <= 0) { setError('g-error', 'Ingresa la masa total'); return; }
    // Aberturas aproximadas (mm)
    var sieves = [
        { id: 'g-2', d: 50.8, name: '2"' },
        { id: 'g-34', d: 19.1, name: '3/4"' },
        { id: 'g-4', d: 4.75, name: '#4' },
        { id: 'g-10', d: 2.0, name: '#10' },
        { id: 'g-20', d: 0.85, name: '#20' },
        { id: 'g-40', d: 0.425, name: '#40' },
        { id: 'g-60', d: 0.25, name: '#60' },
        { id: 'g-100', d: 0.15, name: '#100' },
        { id: 'g-200', d: 0.075, name: '#200' }
    ];
    var retained = [];
    var acum = 0;
    sieves.forEach(function(sv) {
        var m = parse(sv.id) || 0;
        acum += m;
        retained.push({ d: sv.d, name: sv.name, ret: m, acumRet: acum });
    });
    var pass200 = parse('g-p200') || 0;
    var grava = (parse('g-2')||0) + (parse('g-34')||0) + (parse('g-4')||0);
    var arena = (parse('g-10')||0) + (parse('g-20')||0) + (parse('g-40')||0) + (parse('g-60')||0) + (parse('g-100')||0) + (parse('g-200')||0);
    var finos = pass200;
    var gPct = (grava/total)*100, aPct = (arena/total)*100, fPct = (finos/total)*100;
    var tipo = fPct > 50 ? 'Suelo fino' : aPct > gPct ? 'Suelo grueso (arena)' : 'Suelo grueso (grava)';
    // % que pasa
    var curva = retained.map(function(sv) {
        return { d: sv.d, name: sv.name, pasa: Math.max(0, 100 - (sv.acumRet / total) * 100) };
    });
    curva.push({ d: 0.001, name: 'finos', pasa: 0 });
    document.getElementById('g-grava').textContent = gPct.toFixed(1);
    document.getElementById('g-arena').textContent = aPct.toFixed(1);
    document.getElementById('g-finos').textContent = fPct.toFixed(1);
    document.getElementById('g-cu').textContent = '—';
    document.getElementById('g-tipo').textContent = tipo;
    window.__datosEnsayo.g = { curva: curva, gPct: gPct, aPct: aPct, fPct: fPct, total: total };
}

function calcularLimites() {
    var g1=parse('l-g1'), h1=parse('l-h1'), g2=parse('l-g2'), h2=parse('l-h2'), g3=parse('l-g3'), h3=parse('l-h3'), lp=parse('l-lp');
    setError('l-error', '');
    if (!g1 || !h1 || !g2 || !h2 || !g3 || !h3) { setError('l-error', 'Completa LL'); return; }
    var x=[Math.log(g1),Math.log(g2),Math.log(g3)], y=[h1,h2,h3];
    var n=3, sumX=x.reduce(function(a,b){return a+b;},0), sumY=y.reduce(function(a,b){return a+b;},0);
    var sumXY=x.reduce(function(s,xi,i){return s+xi*y[i];},0), sumX2=x.reduce(function(s,xi){return s+xi*xi;},0);
    var m=(n*sumXY-sumX*sumY)/(n*sumX2-sumX*sumX), b=(sumY-m*sumX)/n;
    var ll=m*Math.log(25)+b;
    document.getElementById('l-ll').textContent = ll.toFixed(1);
    var ip = null, tipo = '—';
    if (lp !== null) {
        ip=ll-lp;
        document.getElementById('l-lpres').textContent = lp.toFixed(1);
        document.getElementById('l-ip').textContent = ip.toFixed(1);
        var lineaA=0.73*(ll-20);
        tipo=(ll<50?(ip>lineaA?'CL':'ML'):(ip>lineaA?'CH':'MH'));
        document.getElementById('l-clasif').textContent = tipo;
        document.getElementById('l-tipo').textContent = tipo;
    } else {
        document.getElementById('l-lpres').textContent = '—';
        document.getElementById('l-ip').textContent = '—';
    }
    window.__datosEnsayo.l = {
        puntos: [{g:g1,h:h1},{g:g2,h:h2},{g:g3,h:h3}],
        m: m, b: b, ll: ll, lp: lp, ip: ip, tipo: tipo
    };
}

function calcularGravedad() {
    var mp=parse('ge-pic'), mps=parse('ge-picsuelo'), mpws=parse('ge-paguasuelo'), mpw=parse('ge-pagua');
    setError('ge-error', '');
    if (!mp || !mps || !mpws || !mpw) { setError('ge-error', 'Completa todos'); return; }
    var ms=mps-mp, denom=ms+mpw-mpws;
    if (denom<=0) { setError('ge-error', 'Revisa datos'); return; }
    var gs=ms/denom;
    document.getElementById('ge-gs').textContent = gs.toFixed(4);
    document.getElementById('ge-ms').textContent = ms.toFixed(2);
    document.getElementById('ge-vs').textContent = (ms/gs).toFixed(2);
    document.getElementById('ge-tipo').textContent = gs<2.65?'Arena/Grava':gs<2.8?'Arcilla':'Especial';
    document.getElementById('ge-rango').textContent = '2.60-2.80 típico';
    window.__datosEnsayo.ge = { gs: gs, ms: ms };
    window.__datosEnsayo = window.__datosEnsayo || {};
    window.__datosEnsayo.gs = window.__datosEnsayo.gs || {};
    window.__datosEnsayo.gs.texto = 'Resultado de Gs calculado el ' + new Date().toLocaleString();

}

function calcularCompactacion() {
    var molde=parse('cp-molde'), vol=parse('cp-vol');
    setError('cp-error', '');
    if (!molde || !vol) { setError('cp-error', 'Datos del molde'); return; }
    var puntos=[];
    for (var i=1;i<=5;i++) {
        var h=parse('cp-h'+i), w=parse('cp-w'+i);
        if (h && w) {
            var dh=(h-molde)/vol, ds=dh/(1+w/100);
            puntos.push({w:w,ds:ds,dh:dh});
        }
    }
    if (puntos.length<3) { setError('cp-error', 'Mínimo 3 puntos'); return; }
    puntos.sort(function(a,b){return a.w-b.w;});
    var max=puntos.reduce(function(best,p){return p.ds>best.ds?p:best;},puntos[0]);
    document.getElementById('cp-wopt').textContent = max.w.toFixed(1)+'%';
    document.getElementById('cp-gdmax').textContent = max.ds.toFixed(3);
    document.getElementById('cp-gdmaxkn').textContent = (max.ds*9.81).toFixed(2);
    document.getElementById('cp-interpretacion').textContent = 'wópt='+max.w.toFixed(1)+'%, γd máx='+max.ds.toFixed(3)+' g/cm³';
    window.__datosEnsayo.cp = { puntos: puntos, max: max };
}

function calcularDensidad() {
    var cono=parse('d-cono'), rest=parse('d-rest'), darena=parse('d-darena'), suelo=parse('d-suelo'), w=parse('d-w');
    setError('d-error', '');
    if (!cono || !rest || !darena || !suelo || w===null) { setError('d-error', 'Completa todos'); return; }
    var vol=(cono-rest)/darena, gh=suelo/vol, gd=gh/(1+w/100);
    document.getElementById('d-vol').textContent = vol.toFixed(2);
    document.getElementById('d-gh').textContent = gh.toFixed(3);
    document.getElementById('d-gd').textContent = gd.toFixed(3)+' g/cm³';
    document.getElementById('d-gdkn').textContent = (gd*9.81).toFixed(2);
    document.getElementById('d-gc').textContent = ((gd/1.80)*100).toFixed(1);
    window.__datosEnsayo.d = { vol: vol, gh: gh, gd: gd, w: w, gc: (gd/1.80)*100 };
}

function clasificarSUCS() {
    var p200=parse('c-p200'), ll=parse('c-ll'), ip=parse('c-ip'), p4=parse('c-p4');
    setError('c-error', '');
    if (!p200) { setError('c-error', 'Ingresa % #200'); return; }
    var simbolo, tipo, clasif, desc;
    if (p200<50) {
        simbolo = p4!==null && p4>50 ? (p200<5?'GW':'GP') : (p200<5?'SW':'SP');
        tipo = p4!==null && p4>50 ? 'Grava' : 'Arena';
        clasif = p200<5?'Bien graduada':'Mal graduada';
        desc = tipo + ' ' + clasif;
    } else {
        if (!ll || !ip) { setError('c-error', 'Req LL e IP'); return; }
        var lineaA=0.73*(ll-20);
        simbolo = ll<50 ? (ip>lineaA?'CL':'ML') : (ip>lineaA?'CH':'MH');
        tipo = ll<50 ? (ip>lineaA?'Arcilla':'Limo') : (ip>lineaA?'Arcilla grasa':'Limo elástico');
        clasif = simbolo;
        desc = tipo + ' (IP='+ip.toFixed(1)+', LL='+ll.toFixed(1)+')';
    }
    document.getElementById('c-grupo').textContent = simbolo;
    document.getElementById('c-sim').textContent = simbolo;
    document.getElementById('c-tipo').textContent = tipo;
    document.getElementById('c-clasif').textContent = clasif;
    document.getElementById('c-num').textContent = desc;
    window.__datosEnsayo.c = { p200: p200, ll: ll, ip: ip, p4: p4, simbolo: simbolo };
    window.__datosEnsayo = window.__datosEnsayo || {};
    var resEl = document.getElementById('cl-resultado') || document.getElementById('sucs-resultado');
    var txt = resEl ? resEl.textContent : 'Clasificación realizada';
    window.__datosEnsayo.cl = { texto: txt };

}

function calcularPermeabilidad() {
    var vol=parse('p-vol'), t=parse('p-t'), a=parse('p-a'), l=parse('p-l'), h=parse('p-h');
    setError('p-error', '');
    if (!vol || !t || !a || !l || !h) { setError('p-error', 'Completa todos'); return; }
    if (t<=0 || a<=0 || l<=0 || h<=0) { setError('p-error', 'Valores > 0'); return; }
    var q=vol/t, i=h/l, k=(q*l)/(a*h);
    document.getElementById('p-k').textContent = k.toExponential(4)+' cm/s';
    document.getElementById('p-q').textContent = q.toFixed(4);
    document.getElementById('p-i').textContent = i.toFixed(4);
    document.getElementById('p-v').textContent = (q/a).toFixed(6);
    document.getElementById('p-tipo').textContent = k>0.01?'Grava':k>0.0001?'Arena':k>0.000001?'Limo':'Arcilla';
    window.__datosEnsayo.p = { q: q, i: i, k: k, v: q/a };
    window.__datosEnsayo = window.__datosEnsayo || {};
    window.__datosEnsayo.k = window.__datosEnsayo.k || {};
    window.__datosEnsayo.k.texto = 'Resultado de k calculado el ' + new Date().toLocaleString();

}

// =========================================
// GRÁFICAS DE ENSAYOS (canvas)
// =========================================

function _prepCanvas(id, hintId, okMsg) {
    var canvas = document.getElementById(id);
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || 640;
    var cssH = 360;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a1f14';
    ctx.fillRect(0, 0, cssW, cssH);
    if (hintId) {
        var h = document.getElementById(hintId);
        if (h) h.textContent = okMsg || 'Gráfica generada.';
    }
    return { ctx: ctx, w: cssW, h: cssH };
}

function _axes(ctx, pad, w, h, title) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, h - pad.b);
    ctx.stroke();
    if (title) {
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, w / 2, 22);
    }
}

function _barChart(canvasId, hintId, labels, values, title, unit) {
    var g = _prepCanvas(canvasId, hintId);
    if (!g) return;
    var ctx = g.ctx, w = g.w, h = g.h;
    var pad = { l: 55, r: 20, t: 40, b: 50 };
    _axes(ctx, pad, w, h, title);
    var maxV = Math.max.apply(null, values) * 1.2 || 1;
    var n = values.length;
    var gap = 16;
    var barW = (w - pad.l - pad.r - gap * (n + 1)) / n;
    values.forEach(function(v, i) {
        var x = pad.l + gap + i * (barW + gap);
        var bh = ((h - pad.t - pad.b) * v) / maxV;
        var y = h - pad.b - bh;
        ctx.fillStyle = i % 2 === 0 ? '#ffcc00' : '#08783a';
        ctx.fillRect(x, y, barW, bh);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(v.toFixed(2) + (unit || ''), x + barW / 2, y - 6);
        ctx.fillStyle = '#b9c8c0';
        ctx.fillText(labels[i], x + barW / 2, h - pad.b + 18);
    });
}

function graficaHumedad() {
    var d = window.__datosEnsayo && window.__datosEnsayo.h;
    if (!d) {
        var hint = document.getElementById('hint-humedad');
        if (hint) hint.textContent = 'Primero pulsa CALCULAR.';
        return;
    }
    _barChart('canvas-humedad', 'hint-humedad',
        ['Agua (g)', 'Suelo seco (g)', 'w (%)'],
        [d.agua, d.suelo, d.w],
        'Composición de la muestra', '');
}

function graficaGranulometria() {
    var d = window.__datosEnsayo && window.__datosEnsayo.g;
    if (!d || !d.curva) {
        var hint = document.getElementById('hint-granulo');
        if (hint) hint.textContent = 'Primero pulsa CALCULAR.';
        return;
    }
    var g = _prepCanvas('canvas-granulo', 'hint-granulo');
    if (!g) return;
    var ctx = g.ctx, w = g.w, h = g.h;
    var pad = { l: 55, r: 20, t: 40, b: 50 };
    _axes(ctx, pad, w, h, 'Curva granulométrica (% que pasa)');
    var pts = d.curva.filter(function(p) { return p.d > 0; }).slice().sort(function(a,b){ return b.d - a.d; });
    var minLog = Math.log10(0.001), maxLog = Math.log10(100);
    function xOf(diam) {
        return pad.l + ((Math.log10(Math.max(diam, 0.001)) - minLog) / (maxLog - minLog)) * (w - pad.l - pad.r);
    }
    function yOf(pasa) {
        return h - pad.b - (pasa / 100) * (h - pad.t - pad.b);
    }
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    [0.001, 0.01, 0.075, 0.425, 2, 4.75, 19, 50].forEach(function(dmm) {
        var x = xOf(dmm);
        ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke();
    });
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach(function(p, i) {
        var x = xOf(p.d), y = yOf(p.pasa);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = '#ffcc00';
    pts.forEach(function(p) {
        ctx.beginPath();
        ctx.arc(xOf(p.d), yOf(p.pasa), 4, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.fillStyle = '#b9c8c0';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Diámetro (mm) — escala log', w / 2, h - 12);
    ctx.save();
    ctx.translate(16, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('% que pasa', 0, 0);
    ctx.restore();
}

function graficaLimites() {
    var d = window.__datosEnsayo && window.__datosEnsayo.l;
    if (!d) {
        var hint = document.getElementById('hint-limites');
        if (hint) hint.textContent = 'Primero pulsa CALCULAR.';
        return;
    }
    var g = _prepCanvas('canvas-limites', 'hint-limites');
    if (!g) return;
    var ctx = g.ctx, w = g.w, h = g.h;
    // Left: flow curve, Right: plasticity chart
    var mid = w / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.moveTo(mid, 30); ctx.lineTo(mid, h - 20); ctx.stroke();

    // Flow curve
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Curva de fluidez', mid / 2, 22);
    var pad = { l: 45, r: mid + 10, t: 40, b: 40 };
    var gs = d.puntos.map(function(p){ return p.g; });
    var hs = d.puntos.map(function(p){ return p.h; });
    var minG = Math.min.apply(null, gs.concat([15]));
    var maxG = Math.max.apply(null, gs.concat([40]));
    var minH = Math.min.apply(null, hs) - 2;
    var maxH = Math.max.apply(null, hs) + 2;
    function xG(gv) {
        return 45 + ((Math.log(gv) - Math.log(minG)) / (Math.log(maxG) - Math.log(minG))) * (mid - 65);
    }
    function yH(hv) {
        return h - 40 - ((hv - minH) / (maxH - minH)) * (h - 80);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(45, 40); ctx.lineTo(45, h - 40); ctx.lineTo(mid - 20, h - 40); ctx.stroke();
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // regression line
    for (var gi = minG; gi <= maxG; gi += 0.5) {
        var hh = d.m * Math.log(gi) + d.b;
        var xx = xG(gi), yy = yH(hh);
        if (gi === minG) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.fillStyle = '#08783a';
    d.puntos.forEach(function(p) {
        ctx.beginPath();
        ctx.arc(xG(p.g), yH(p.h), 5, 0, Math.PI * 2);
        ctx.fill();
    });
    // LL at 25 blows
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(xG(25), yH(d.ll), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '11px Arial';
    ctx.fillText('LL=' + d.ll.toFixed(1) + '%', xG(25), yH(d.ll) - 10);

    // Plasticity chart
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Carta de plasticidad', mid + (w - mid) / 2, 22);
    var pl = { l: mid + 40, r: 20, t: 40, b: 40 };
    var plotW = w - pl.l - pl.r, plotH = h - pl.t - pl.b;
    function xLL(ll) { return pl.l + (Math.min(Math.max(ll, 0), 100) / 100) * plotW; }
    function yIP(ip) { return pl.t + plotH - (Math.min(Math.max(ip, 0), 60) / 60) * plotH; }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(pl.l, pl.t, plotW, plotH);
    // Line A
    ctx.strokeStyle = '#4af';
    ctx.beginPath();
    ctx.moveTo(xLL(20), yIP(0));
    ctx.lineTo(xLL(100), yIP(0.73 * 80));
    ctx.stroke();
    ctx.fillStyle = '#4af';
    ctx.font = '10px Arial';
    ctx.fillText('Línea A', xLL(70), yIP(0.73 * 50) - 6);
    if (d.ll != null && d.ip != null) {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(xLL(d.ll), yIP(d.ip), 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(d.tipo || '', xLL(d.ll) + 10, yIP(d.ip));
    }
    ctx.fillStyle = '#b9c8c0';
    ctx.font = '10px Arial';
    ctx.fillText('LL', mid + (w - mid) / 2, h - 12);
}

function graficaGravedad() {
    var d = window.__datosEnsayo && window.__datosEnsayo.ge;
    if (!d) {
        var hint = document.getElementById('hint-gravedad');
        if (hint) hint.textContent = 'Primero pulsa CALCULAR.';
        return;
    }
    _barChart('canvas-gravedad', 'hint-gravedad',
        ['Tu Gs', 'Arena típ. 2.65', 'Arcilla típ. 2.75'],
        [d.gs, 2.65, 2.75],
        'Gravedad específica comparada', '');
}

function graficaCompactacion() {
    var d = window.__datosEnsayo && window.__datosEnsayo.cp;
    if (!d || !d.puntos) {
        var hint = document.getElementById('hint-proctor');
        if (hint) hint.textContent = 'Primero pulsa CALCULAR.';
        return;
    }
    var g = _prepCanvas('canvas-proctor', 'hint-proctor');
    if (!g) return;
    var ctx = g.ctx, w = g.w, h = g.h;
    var pad = { l: 55, r: 20, t: 40, b: 50 };
    _axes(ctx, pad, w, h, 'Curva de compactación Proctor');
    var pts = d.puntos;
    var minW = pts[0].w - 1, maxW = pts[pts.length - 1].w + 1;
    var minD = Math.min.apply(null, pts.map(function(p){ return p.ds; })) - 0.05;
    var maxD = Math.max.apply(null, pts.map(function(p){ return p.ds; })) + 0.05;
    function xW(wv) { return pad.l + ((wv - minW) / (maxW - minW)) * (w - pad.l - pad.r); }
    function yD(dv) { return h - pad.b - ((dv - minD) / (maxD - minD)) * (h - pad.t - pad.b); }
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach(function(p, i) {
        var x = xW(p.w), y = yD(p.ds);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = '#08783a';
    pts.forEach(function(p) {
        ctx.beginPath();
        ctx.arc(xW(p.w), yD(p.ds), 5, 0, Math.PI * 2);
        ctx.fill();
    });
    // optimum
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(xW(d.max.w), yD(d.max.ds), 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('wópt=' + d.max.w.toFixed(1) + '%  γd=' + d.max.ds.toFixed(3), xW(d.max.w) + 8, yD(d.max.ds) - 8);
    ctx.fillStyle = '#b9c8c0';
    ctx.textAlign = 'center';
    ctx.fillText('Humedad w (%)', w / 2, h - 12);
}

function graficaDensidad() {
    var d = window.__datosEnsayo && window.__datosEnsayo.d;
    if (!d) {
        var hint = document.getElementById('hint-densidad');
        if (hint) hint.textContent = 'Primero pulsa CALCULAR.';
        return;
    }
    _barChart('canvas-densidad', 'hint-densidad',
        ['γhúmeda', 'γseca', 'Ref. 1.80', 'GC %'],
        [d.gh, d.gd, 1.80, d.gc],
        'Densidades de campo', '');
}

function graficaClasificacion() {
    var d = window.__datosEnsayo && window.__datosEnsayo.c;
    if (!d) {
        var hint = document.getElementById('hint-sucs');
        if (hint) hint.textContent = 'Primero pulsa CLASIFICAR.';
        return;
    }
    var g = _prepCanvas('canvas-sucs', 'hint-sucs');
    if (!g) return;
    var ctx = g.ctx, w = g.w, h = g.h;
    var pad = { l: 55, r: 20, t: 40, b: 50 };
    _axes(ctx, pad, w, h, 'Carta de plasticidad SUCS — ' + (d.simbolo || ''));
    var plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
    function xLL(ll) { return pad.l + (Math.min(Math.max(ll || 0, 0), 100) / 100) * plotW; }
    function yIP(ip) { return pad.t + plotH - (Math.min(Math.max(ip || 0, 0), 60) / 60) * plotH; }
    // zones labels
    ctx.fillStyle = 'rgba(255,204,0,0.08)';
    ctx.fillRect(xLL(50), yIP(60), xLL(100) - xLL(50), yIP(0) - yIP(60));
    ctx.strokeStyle = '#4af';
    ctx.beginPath();
    ctx.moveTo(xLL(20), yIP(0));
    ctx.lineTo(xLL(100), yIP(0.73 * 80));
    ctx.stroke();
    ctx.fillStyle = '#4af';
    ctx.font = '11px Arial';
    ctx.fillText('Línea A', xLL(75), yIP(40));
    ctx.fillStyle = '#b9c8c0';
    ctx.fillText('CL / CH', xLL(60), yIP(35));
    ctx.fillText('ML / MH', xLL(60), yIP(10));
    if (d.ll != null && d.ip != null) {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(xLL(d.ll), yIP(d.ip), 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 13px Arial';
        ctx.fillText(d.simbolo, xLL(d.ll) + 12, yIP(d.ip) + 4);
    } else {
        ctx.fillStyle = '#b9c8c0';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Suelo grueso: ' + (d.simbolo || '') + ' (sin carta de plasticidad)', w / 2, h / 2);
    }
    ctx.fillStyle = '#b9c8c0';
    ctx.textAlign = 'center';
    ctx.fillText('Límite líquido LL (%)', w / 2, h - 12);
}

function graficaPermeabilidad() {
    var d = window.__datosEnsayo && window.__datosEnsayo.p;
    if (!d) {
        var hint = document.getElementById('hint-perm');
        if (hint) hint.textContent = 'Primero pulsa CALCULAR.';
        return;
    }
    var g = _prepCanvas('canvas-perm', 'hint-perm');
    if (!g) return;
    var ctx = g.ctx, w = g.w, h = g.h;
    var pad = { l: 55, r: 20, t: 40, b: 50 };
    _axes(ctx, pad, w, h, 'Ley de Darcy: v = k · i');
    // line from 0 to 2*i
    var iMax = Math.max(d.i * 2, 0.1);
    var vMax = d.k * iMax * 1.1;
    function xI(ii) { return pad.l + (ii / iMax) * (w - pad.l - pad.r); }
    function yV(vv) { return h - pad.b - (vv / (vMax || 1)) * (h - pad.t - pad.b); }
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xI(0), yV(0));
    ctx.lineTo(xI(iMax), yV(d.k * iMax));
    ctx.stroke();
    ctx.fillStyle = '#08783a';
    ctx.beginPath();
    ctx.arc(xI(d.i), yV(d.v), 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Punto de ensayo: i=' + d.i.toFixed(3) + ', v=' + d.v.toExponential(2), xI(d.i) + 10, yV(d.v) - 10);
    ctx.fillText('k = ' + d.k.toExponential(3) + ' cm/s', pad.l + 10, pad.t + 20);
    ctx.fillStyle = '#b9c8c0';
    ctx.textAlign = 'center';
    ctx.fillText('Gradiente hidráulico i', w / 2, h - 12);
}

// =========================================
// SIMULADORES - MS1
// =========================================
// =========================================
// SIMULADORES - MS1
// =========================================

function inicializarSimuladores() {
    setTimeout(function() {
        dibujarCirculoMohr(100, 50, 30);
        dibujarDiagramaEsfDef(200, 250, 400);
        dibujarVigaSimple(5, 20);
        dibujarTorsion(50, 2);
    }, 200);
}

function simMohr() {
    var sx = parse('sim-sx') || 100, sy = parse('sim-sy') || 50, txy = parse('sim-txy') || 30;
    var s1 = (sx+sy)/2 + Math.sqrt(Math.pow((sx-sy)/2, 2) + Math.pow(txy, 2));
    var s3 = (sx+sy)/2 - Math.sqrt(Math.pow((sx-sy)/2, 2) + Math.pow(txy, 2));
    var tmax = Math.sqrt(Math.pow((sx-sy)/2, 2) + Math.pow(txy, 2));
    var theta = 0.5 * Math.atan(2*txy/(sx-sy)) * 180/Math.PI;
    
    document.getElementById('sim-s1').textContent = s1.toFixed(1);
    document.getElementById('sim-s3').textContent = s3.toFixed(1);
    document.getElementById('sim-tmax').textContent = tmax.toFixed(1);
    document.getElementById('sim-theta').textContent = theta.toFixed(1);
    
    dibujarCirculoMohr(sx, sy, txy);
}

function dibujarCirculoMohr(sx, sy, txy) {
    var canvas = document.getElementById('mohrCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    var cx = w/2, cy = h/2;
    var R = Math.sqrt(Math.pow((sx-sy)/2, 2) + Math.pow(txy, 2));
    var ctexto = (sx+sy)/2;
    
    // Ejes
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.stroke();
    
    // Círculo
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + ctexto - R, cy, R, 0, 2*Math.PI);
    ctx.stroke();
    
    // Punto
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(cx + (sx-sy)/2, cy - txy, 5, 0, 2*Math.PI);
    ctx.fill();
    
    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.fillText('σ', w-15, 15);
    ctx.fillText('τ', w-15, h-5);
}

function simConsolidacion() {
    var hc = parse('sim-hc') || 5, cv = parse('sim-cv') || 2.5, h0 = parse('sim-h0') || 10;
    var H = h0/2; // Capa doble
    var Tv = cv * 1 / (H*H); // Tv a 1 año
    var U = Tv < 0 ? 0 : Math.min(100, Tv < 0.2 ? 100*Math.sqrt(4*Tv/Math.PI) : 100);
    var Hf = h0 * (1 - 0.1 * (U/100)); // Asentamiento estimado
    var dH = h0 - Hf;
    
    document.getElementById('sim-tv').textContent = Tv.toFixed(4);
    document.getElementById('sim-u').textContent = U.toFixed(1);
    document.getElementById('sim-hf').textContent = Hf.toFixed(3);
    document.getElementById('sim-dh').textContent = dH.toFixed(3);
}

// =========================================
// SIMULADORES - MS2
// =========================================

function simCapacidadCarga() {
    var tipo = document.getElementById('ms2-tipo-zapata').value;
    var c = parse('ms2-c') || 30, phi = parse('ms2-phi') || 25;
    var gamma = parse('ms2-gamma') || 18, B = parse('ms2-b') || 2, Df = parse('ms2-df') || 1.5;
    
    var phiRad = phi * Math.PI / 180;
    var Nq = Math.pow(Math.tan(Math.PI/4 + phi/2), 2) * Math.exp(Math.PI * Math.tan(phiRad));
    var Nc = (Nq - 1) * Math.cos(phiRad);
    var Ngamma = 2 * (Nq + 1) * Math.tan(phiRad);
    
    var q = gamma * Df;
    var quTerzaghi;
    
    if (tipo === 'corrida') {
        quTerzaghi = c * Nc + q * Nq + 0.5 * gamma * B * Ngamma;
    } else if (tipo === 'cuadrada') {
        quTerzaghi = 1.3 * c * Nc + q * Nq + 0.3 * gamma * B * Ngamma;
    } else {
        quTerzaghi = 1.3 * c * Nc + q * Nq + 0.3 * gamma * B * Ngamma;
    }
    
    var qadm = quTerzaghi / 3;
    
    // Meyerhof
    var NqM = Math.pow(Math.tan(Math.PI/4 + phi/2), 2) * Math.exp(Math.PI * Math.tan(phiRad));
    var NcM = (NqM - 1) * Math.tan(phiRad + Math.PI/2);
    var NgammaM = (NqM - 1) * Math.tan(phiRad * 1.5);
    var quMeyerhof = c * NcM + q * NqM + 0.5 * gamma * B * NgammaM;
    var qadmM = quMeyerhof / 3;
    
    document.getElementById('ms2-qu-terzaghi').textContent = quTerzaghi.toFixed(1);
    document.getElementById('ms2-qadm-terzaghi').textContent = qadm.toFixed(1);
    document.getElementById('ms2-qu-meyerhof').textContent = quMeyerhof.toFixed(1);
    document.getElementById('ms2-qadm-meyerhof').textContent = qadmM.toFixed(1);
}

function simEmpujeTierra() {
    var tipo = document.getElementById('ms2-tipo-empuje').value;
    var phi = parse('ms2-emp-phi') || 30;
    var gamma = parse('ms2-emp-gamma') || 18;
    var H = parse('ms2-emp-h') || 5;
    var sigma = parse('ms2-emp-sigma') || 90;
    
    var phiRad = phi * Math.PI / 180;
    var K, P, y;
    
    if (tipo === 'activo') {
        K = Math.pow(Math.tan(Math.PI/4 - phi/2), 2);
        P = 0.5 * gamma * Math.pow(H, 2) * K;
        y = H / 3;
    } else if (tipo === 'pasivo') {
        K = Math.pow(Math.tan(Math.PI/4 + phi/2), 2);
        P = 0.5 * gamma * Math.pow(H, 2) * K;
        y = H / 3;
    } else {
        K = 1 - Math.sin(phiRad);
        P = sigma * K;
        y = H / 2;
    }
    
    document.getElementById('ms2-k').textContent = K.toFixed(4);
    document.getElementById('ms2-p').textContent = P.toFixed(1);
    document.getElementById('ms2-y').textContent = y.toFixed(2);
}

function simEstabilidadTalud() {
    var H = parse('ms2-talud-h') || 2, V = parse('ms2-talud-v') || 1;
    var c = parse('ms2-talud-c') || 25;
    var phi = parse('ms2-talud-phi') || 20;
    var gamma = parse('ms2-talud-gamma') || 18;
    var altura = parse('ms2-talud-altura') || 10;
    
    var alpha = Math.atan(V/H);
    var L = altura / Math.sin(alpha);
    var W = 0.5 * gamma * altura * L;
    var cL = c * L;
    var Wsin = W * Math.sin(alpha);
    var Wcos = W * Math.cos(alpha);
    var tanphi = Math.tan(phi * Math.PI / 180);
    
    var FS = (cL + Wcos * tanphi) / Wsin;
    
    document.getElementById('ms2-talud-fs').textContent = FS.toFixed(2);
}

// =========================================
// SIMULADORES - RESISTENCIA DE MATERIALES
// =========================================

function simDiagramaEsfDef() {
    var E = parse('rm-sim-e') || 200;
    var sy = parse('rm-sim-sy') || 250;
    var su = parse('rm-sim-su') || 400;
    var er = parse('rm-sim-er') || 20;
    
    dibujarDiagramaEsfDef(E, sy, su, er);
}

function dibujarDiagramaEsfDef(E, sy, su, er) {
    var canvas = document.getElementById('canvasEsfDef');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    var scaleX = w / (er * 1.2);
    var scaleY = h / (su * 1.2);
    
    // Ejes
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, h-30); ctx.lineTo(w-10, h-30);
    ctx.moveTo(50, h-30); ctx.lineTo(50, 10);
    ctx.stroke();
    
    // Etiquetas
    ctx.fillStyle = '#888';
    ctx.font = '10px Arial';
    ctx.fillText('ε (%)', w-30, h-15);
    ctx.fillText('σ (MPa)', 10, 20);
    
    // Punto de fluencia
    var ey = sy / E;
    var eu = er;
    
    // Curva
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, h-30 - sy*scaleY);
    ctx.lineTo(50 + ey*100*scaleX, h-30 - sy*scaleY);
    ctx.lineTo(50 + ey*100*scaleX + (eu-ey)*50*scaleX, h-30 - su*scaleY);
    ctx.stroke();
    
    // Punto de fluencia
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(50 + ey*100*scaleX, h-30 - sy*scaleY, 4, 0, 2*Math.PI);
    ctx.fill();
}

function simVigaSimple() {
    var L = parse('rm-viga-l') || 5;
    var P = parse('rm-viga-p') || 20;
    var E = parse('rm-viga-e') || 200;
    var I = parse('rm-viga-i') || 8000;
    
    var Mmax = P * L / 4;
    var Vmax = P / 2;
    var Smax = I / (I/100); // Asumiendo h=200mm
    var sigma = (Mmax * 1000) / Smax;
    var delta = (P * 1000 * Math.pow(L*1000, 3)) / (48 * E * 1000 * I * 10000);
    
    document.getElementById('rm-viga-mmax').textContent = Mmax.toFixed(2);
    document.getElementById('rm-viga-vmax').textContent = Vmax.toFixed(2);
    document.getElementById('rm-viga-smax').textContent = sigma.toFixed(2);
    document.getElementById('rm-viga-dmax').textContent = delta.toFixed(2);
    
    dibujarVigaSimple(L, P);
}

function dibujarVigaSimple(L, P) {
    // Simulación visual simple
}

function simTorsion() {
    var d = parse('rm-tor-d') || 50;
    var T = parse('rm-tor-t') || 2;
    var L = parse('rm-tor-l') || 3;
    var G = parse('rm-tor-g') || 77;
    
    var J = Math.PI * Math.pow(d, 4) / 32;
    var tau = (T * 1000 * d / 2) / (J / 1000);
    var phi = (T * 1000 * L * 1000) / (G * 1000 * J);
    
    document.getElementById('rm-tor-tmax').textContent = tau.toFixed(2);
    document.getElementById('rm-tor-j').textContent = (J/1000000).toFixed(2);
    document.getElementById('rm-tor-phi').textContent = phi.toFixed(4);
    document.getElementById('rm-tor-phi-grados').textContent = (phi * 180 / Math.PI).toFixed(3);
}

function dibujarTorsion(d, T) {
    // Visualización de torsión
}

// =========================================
// CÁLCULOS MS2
// =========================================

function calcularIncrementoEsfuerzo() {
    var q = parse('calc-q') || 150;
    var B = parse('calc-b') || 3;
    var L = parse('calc-l') || 5;
    var z = parse('calc-z') || 4;
    
    var m = z / B;
    var n = L / B;
    // Factor de influencia aproximado
    var I = 0.25 * (1 / (1 + Math.pow(m, 1.5)) + 1 / (1 + Math.pow(n, 1.5)));
    var dsigma = q * I;
    
    document.getElementById('calc-i').textContent = I.toFixed(4);
    document.getElementById('calc-dsigma').textContent = dsigma.toFixed(1);
}

function calcularAsentamiento() {
    var q = parse('calcase-q') || 150;
    var B = parse('calcase-b') || 3;
    var E = parse('calcase-e') || 25000;
    var nu = parse('calcase-nu') || 0.3;
    var Is = parse('calcase-is') || 1;
    
    var Se = (q * B * (1 - Math.pow(nu, 2)) / E) * Is * 1000;
    
    document.getElementById('calcase-se').textContent = Se.toFixed(1);
}

// =========================================
// SIMULADORES PRINCIPALES
// =========================================

function actualizarSimFlujo() {
    var k = parseFloat(document.getElementById('sim-flujo-k')?.value) || 0.01;
    var i = parseFloat(document.getElementById('sim-flujo-i')?.value) || 1;
    
    var canvas = document.getElementById('sim-flujo');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, 0, w, h);
    
    // Líneas de flujo
    ctx.strokeStyle = '#4af';
    ctx.lineWidth = 1;
    for (var x = 50; x < w-50; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (var y = 0; y < h; y += 5) {
            ctx.lineTo(x + Math.sin(y/20 + x/50) * 10, y);
        }
        ctx.stroke();
    }
    
    // Equipotenciales
    ctx.strokeStyle = '#fa0';
    ctx.lineWidth = 1;
    for (var y = 30; y < h-30; y += 40) {
        ctx.beginPath();
        for (var x = 0; x < w; x += 2) {
            var yp = y + Math.sin(x/30) * 8;
            if (x === 0) ctx.moveTo(x, yp);
            else ctx.lineTo(x, yp);
        }
        ctx.stroke();
    }
    
    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText('k = ' + k.toExponential(2) + ' cm/s', 20, 30);
    ctx.fillText('i = ' + i.toFixed(2), 20, 50);
    ctx.fillText('v = ' + (k*i).toExponential(2) + ' cm/s', 20, 70);
    
    // Leyenda
    ctx.fillStyle = '#4af';
    ctx.fillRect(w-100, h-40, 15, 3);
    ctx.fillStyle = '#fff';
    ctx.fillText('Líneas de flujo', w-80, h-35);
    ctx.fillStyle = '#fa0';
    ctx.fillRect(w-100, h-25, 15, 3);
    ctx.fillStyle = '#fff';
    ctx.fillText('Equipotenciales', w-80, h-20);
}

function actualizarSimConsolidacion() {
    var cv = parseFloat(document.getElementById('sim-cons-cv')?.value) || 2;
    var H = parseFloat(document.getElementById('sim-cons-h')?.value) || 5;
    
    var canvas = document.getElementById('sim-consolidacion');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, 0, w, h);
    
    // Ejes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, h-30); ctx.lineTo(w-30, h-30);
    ctx.moveTo(50, h-30); ctx.lineTo(50, 30);
    ctx.stroke();
    
    // Curva de consolidación
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var t = 0; t <= 10; t += 0.1) {
        var Tv = cv * t / (H*H);
        var U = Tv < 0.2 ? 100*Math.sqrt(4*Tv/Math.PI) : 100*(1 - Math.exp(-Math.PI*Tv/4));
        var x = 50 + t * (w-80) / 10;
        var y = h - 30 - (U/100) * (h-60);
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText('t (años)', w/2, h-10);
    ctx.fillText('U (%)', 15, 20);
    ctx.fillText('Cv = ' + cv + ' m²/año', 60, 50);
    ctx.fillText('H = ' + H + ' m', 60, 70);
}

// =========================================
// HISTORIAL
// =========================================

function historialStorageKey() {
    var u = (typeof aulaGetSession === 'function') ? aulaGetSession() : null;
    if (u && (u.id || u.email)) {
        return 'geometrics_historial_' + (u.id || u.email);
    }
    return 'geometrics_historial_anon';
}

function cargarHistorial() {
    var historial = [];
    try {
        historial = JSON.parse(localStorage.getItem(historialStorageKey()) || '[]');
    } catch (e) { historial = []; }
    var container = document.getElementById('historial-resultados');
    if (!container) return;

    var u = (typeof aulaGetSession === 'function') ? aulaGetSession() : null;
    var titulo = (u && u.rol === 'docente')
        ? 'Resultados del docente'
        : 'Mis resultados de ensayos';

    if (!historial.length) {
        container.innerHTML =
            '<div class="resultados-vacio">' +
            '<div class="resultados-vacio-icono">📋</div>' +
            '<h4>' + titulo + '</h4>' +
            '<p>Aún no hay ensayos guardados en esta cuenta.</p>' +
            '<p class="resultados-hint">En <strong>Mecánica de Suelos I</strong> calcula un ensayo y pulsa <strong>GUARDAR DATOS</strong>.</p>' +
            '</div>';
        return;
    }

    var html = '<div class="resultados-header-block"><h3>' + titulo + '</h3>' +
        '<p class="resultados-count">' + historial.length + ' registro(s)</p></div>';
    html += '<div class="resultados-lista">';
    historial.slice().reverse().forEach(function(item) {
        var idAttr = escapeHtml(item.id || '');
        html += '<article class="resultado-card" data-res-id="' + idAttr + '">' +
            '<div class="resultado-card-top">' +
            '<span class="resultado-badge">Ensayo</span>' +
            '<time>' + escapeHtml(item.fecha || '') + '</time>' +
            '</div>' +
            '<h4>' + escapeHtml(item.nombre || 'Ensayo') + '</h4>' +
            '<p class="resultado-valor">' + escapeHtml(item.resultado || '') + '</p>' +
            '<div class="resultado-acciones">' +
            '<button type="button" class="btn-ver-resultado" data-ver-res="' + idAttr + '">Descargar informe</button>' +
            '<button type="button" class="btn-del-resultado" data-del-res="' + idAttr + '">Eliminar</button>' +
            '</div></article>';
    });
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('[data-ver-res]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            descargarInformeDesdeHistorial(btn.getAttribute('data-ver-res'));
        });
    });
    container.querySelectorAll('[data-del-res]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            eliminarResultado(btn.getAttribute('data-del-res'));
        });
    });
}

function guardarResultado(nombre, resultado, detalle) {
    var key = historialStorageKey();
    var historial = [];
    try { historial = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { historial = []; }
    historial.push({
        id: 'res_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        nombre: nombre,
        resultado: resultado,
        detalle: detalle || null,
        fecha: new Date().toLocaleString(),
        usuario: (typeof aulaGetSession === 'function' && aulaGetSession()) ? (aulaGetSession().email || '') : ''
    });
    localStorage.setItem(key, JSON.stringify(historial));
    if (typeof cargarHistorial === 'function') cargarHistorial();
}

function eliminarResultado(id) {
    if (!id) return;
    if (!confirm('¿Eliminar este resultado guardado?')) return;
    var key = historialStorageKey();
    var historial = [];
    try { historial = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { historial = []; }
    historial = historial.filter(function(item) { return item.id !== id; });
    localStorage.setItem(key, JSON.stringify(historial));
    cargarHistorial();
}

/** Restaura datos del historial y genera el PDF del ensayo */
function descargarInformeDesdeHistorial(id) {
    if (!id) return;
    var key = historialStorageKey();
    var historial = [];
    try { historial = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { historial = []; }
    var item = null;
    for (var i = 0; i < historial.length; i++) {
        if (historial[i].id === id) { item = historial[i]; break; }
    }
    if (!item) {
        alert('No se encontró el registro guardado.');
        return;
    }
    var det = item.detalle || {};
    var tipo = det.tipo || '';
    // Inferir tipo por nombre si falta
    if (!tipo && item.nombre) {
        var n = String(item.nombre).toLowerCase();
        if (n.indexOf('corte') >= 0) tipo = 'corte';
        else if (n.indexOf('inconfinad') >= 0) tipo = 'inconfinada';
        else if (n.indexOf('consolid') >= 0) tipo = 'consolidacion';
        else if (n.indexOf('triaxial') >= 0) tipo = 'triaxial';
        else if (n.indexOf('humedad') >= 0) tipo = 'humedad';
        else if (n.indexOf('granulo') >= 0) tipo = 'granulometria';
        else if (n.indexOf('atterberg') >= 0 || n.indexOf('límite') >= 0) tipo = 'limites';
        else if (n.indexOf('gravedad') >= 0) tipo = 'gravedad';
        else if (n.indexOf('proctor') >= 0 || n.indexOf('compact') >= 0) tipo = 'compactacion';
        else if (n.indexOf('densidad') >= 0) tipo = 'densidad';
        else if (n.indexOf('clasific') >= 0) tipo = 'clasificacion';
        else if (n.indexOf('permeab') >= 0) tipo = 'permeabilidad';
    }
    if (!tipo) {
        alert('Este registro no tiene tipo de ensayo. Vuelve a calcular y pulsa GUARDAR DATOS.');
        return;
    }

    var ms2 = { corte: 1, inconfinada: 1, consolidacion: 1, triaxial: 1 };
    if (ms2[tipo]) {
        window.__datosEnsayoMS2 = window.__datosEnsayoMS2 || {};
        if (det.calculados) {
            window.__datosEnsayoMS2[tipo] = det.calculados;
        }
        if (!window.__datosEnsayoMS2[tipo]) {
            alert('No hay datos calculados guardados para este ensayo. Vuelve a calcularlo y guarda de nuevo.');
            return;
        }
    } else {
        window.__datosEnsayo = window.__datosEnsayo || {};
        var keyMap = {
            humedad: 'h', granulometria: 'g', limites: 'l', gravedad: 'ge',
            compactacion: 'cp', densidad: 'd', clasificacion: 'c', permeabilidad: 'p'
        };
        var k = keyMap[tipo] || tipo;
        if (det.calculados) {
            window.__datosEnsayo[k] = det.calculados;
            // también alias cortos usados por resumenDatosEnsayo
            window.__datosEnsayo[tipo] = det.calculados;
        }
    }

    if (typeof generarInformeEnsayoPDF !== 'function') {
        alert('No se pudo generar el informe (función no disponible).');
        return;
    }
    try {
        generarInformeEnsayoPDF(tipo);
    } catch (err) {
        alert('Error al generar el PDF: ' + (err.message || err));
    }
}

function verDetalleResultado(id) {
    var key = historialStorageKey();
    var historial = [];
    try { historial = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { historial = []; }
    var item = historial.find(function(x) { return x.id === id; });
    if (!item) { alert('No se encontró el registro.'); return; }
    var modal = document.getElementById('modalResultado');
    var body = document.getElementById('modalResultadoBody');
    var titulo = document.getElementById('modalResultadoTitulo');
    if (!modal || !body) {
        alert(item.nombre + '\n' + item.resultado);
        return;
    }
    if (titulo) titulo.textContent = item.nombre || 'Resultado';
    var html = '<p class="resultado-modal-fecha"><strong>Fecha:</strong> ' + escapeHtml(item.fecha || '') + '</p>';
    html += '<p class="resultado-modal-resumen"><strong>Resultado:</strong> ' + escapeHtml(item.resultado || '') + '</p>';
    if (item.detalle && item.detalle.entradas && item.detalle.entradas.length) {
        html += '<h4>Datos ingresados (solo lectura)</h4><table class="resultado-detalle-tabla"><tbody>';
        item.detalle.entradas.forEach(function(row) {
            html += '<tr><td>' + escapeHtml(row.label) + '</td><td>' + escapeHtml(String(row.valor)) + '</td></tr>';
        });
        html += '</tbody></table>';
    } else if (item.detalle && item.detalle.calculados) {
        html += '<h4>Valores calculados</h4><pre class="resultado-pre">' + escapeHtml(JSON.stringify(item.detalle.calculados, null, 2)) + '</pre>';
    } else {
        html += '<p class="resultados-hint">Este registro no tiene el detalle de entradas (fue guardado antes de esta función).</p>';
    }
    body.innerHTML = html;
    modal.hidden = false;
}

function leerValorInput(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return el.value;
}

function capturarEntradasEnsayo(tipo) {
    var map = {
        humedad: [
            { id: 'h-recipiente', label: 'Masa del recipiente (g)' },
            { id: 'h-humeda', label: 'Masa recipiente + suelo húmedo (g)' },
            { id: 'h-seca', label: 'Masa recipiente + suelo seco (g)' }
        ],
        granulometria: [
            { id: 'g-total', label: 'Masa total (g)' },
            { id: 'g-2', label: 'Retenido 2"' },
            { id: 'g-34', label: 'Retenido 3/4"' },
            { id: 'g-4', label: 'Retenido #4' },
            { id: 'g-10', label: 'Retenido #10' },
            { id: 'g-20', label: 'Retenido #20' },
            { id: 'g-40', label: 'Retenido #40' },
            { id: 'g-60', label: 'Retenido #60' },
            { id: 'g-200', label: 'Retenido #200' }
        ],
        limites: [
            { id: 'l-g1', label: 'Golpes 1' }, { id: 'l-h1', label: 'Humedad 1 (%)' },
            { id: 'l-g2', label: 'Golpes 2' }, { id: 'l-h2', label: 'Humedad 2 (%)' },
            { id: 'l-g3', label: 'Golpes 3' }, { id: 'l-h3', label: 'Humedad 3 (%)' },
            { id: 'l-lp', label: 'Límite plástico (%)' }
        ],
        gravedad: [
            { id: 'ge-pic', label: 'Masa picnómetro' },
            { id: 'ge-picsuelo', label: 'Masa picnómetro + suelo' },
            { id: 'ge-paguasuelo', label: 'Masa picnómetro + agua + suelo' },
            { id: 'ge-pagua', label: 'Masa picnómetro + agua' }
        ],
        compactacion: [
            { id: 'cp-molde', label: 'Masa molde' }, { id: 'cp-vol', label: 'Volumen molde' },
            { id: 'cp-h1', label: 'Masa húmeda 1' }, { id: 'cp-w1', label: 'w 1 (%)' },
            { id: 'cp-h2', label: 'Masa húmeda 2' }, { id: 'cp-w2', label: 'w 2 (%)' },
            { id: 'cp-h3', label: 'Masa húmeda 3' }, { id: 'cp-w3', label: 'w 3 (%)' },
            { id: 'cp-h4', label: 'Masa húmeda 4' }, { id: 'cp-w4', label: 'w 4 (%)' },
            { id: 'cp-h5', label: 'Masa húmeda 5' }, { id: 'cp-w5', label: 'w 5 (%)' }
        ],
        densidad: [
            { id: 'd-cono', label: 'Masa cono + arena' },
            { id: 'd-rest', label: 'Masa restante' },
            { id: 'd-darena', label: 'Densidad arena' },
            { id: 'd-suelo', label: 'Masa suelo' },
            { id: 'd-w', label: 'Humedad (%)' }
        ],
        clasificacion: [
            { id: 'cl-p200', label: '% pasa #200' },
            { id: 'cl-ll', label: 'LL' },
            { id: 'cl-ip', label: 'IP' },
            { id: 'cl-p4', label: '% pasa #4' }
        ],
        permeabilidad: [
            { id: 'p-q', label: 'Caudal q' },
            { id: 'p-a', label: 'Área A' },
            { id: 'p-l', label: 'Longitud L' },
            { id: 'p-h', label: 'Carga h' }
        ]
    };
    var fields = map[tipo] || [];
    var entradas = [];
    fields.forEach(function(f) {
        var v = leerValorInput(f.id);
        if (v !== '' && v != null) entradas.push({ label: f.label, valor: v });
    });
    return entradas;
}

function guardarDatosEnsayo(tipo) {
    var datos = window.__datosEnsayo || {};
    var nombre = '';
    var resultado = '';
    switch (tipo) {
        case 'humedad':
            if (!datos.h) { alert('Primero calcula el ensayo de humedad.'); return; }
            nombre = 'Contenido de Humedad (Suelos I)';
            resultado = 'w = ' + Number(datos.h.w).toFixed(2) + '% · Agua = ' + Number(datos.h.agua).toFixed(2) + ' g · Suelo seco = ' + Number(datos.h.suelo).toFixed(2) + ' g';
            break;
        case 'granulometria':
            if (!datos.g) { alert('Primero calcula la granulometría.'); return; }
            nombre = 'Granulometría (Suelos I)';
            resultado = 'Grava ' + Number(datos.g.gPct).toFixed(1) + '% · Arena ' + Number(datos.g.aPct).toFixed(1) + '% · Finos ' + Number(datos.g.fPct).toFixed(1) + '%';
            break;
        case 'limites':
            if (!datos.l) { alert('Primero calcula los límites de Atterberg.'); return; }
            nombre = 'Límites de Atterberg (Suelos I)';
            resultado = 'LL = ' + Number(datos.l.ll).toFixed(1) + (datos.l.lp != null ? (' · LP = ' + Number(datos.l.lp).toFixed(1)) : '') + (datos.l.ip != null ? (' · IP = ' + Number(datos.l.ip).toFixed(1)) : '') + (datos.l.tipo && datos.l.tipo !== '—' ? (' · ' + datos.l.tipo) : '');
            break;
        case 'gravedad':
            if (!datos.ge && !datos.gs) { alert('Primero calcula la gravedad específica.'); return; }
            nombre = 'Gravedad Específica (Suelos I)';
            resultado = datos.ge ? ('Gs = ' + Number(datos.ge.gs).toFixed(3)) : (datos.gs.texto || 'Gs calculado');
            break;
        case 'compactacion':
            if (!datos.cp) { alert('Primero calcula el ensayo Proctor.'); return; }
            nombre = 'Compactación Proctor (Suelos I)';
            resultado = datos.cp.max ? ('wópt = ' + Number(datos.cp.max.w).toFixed(1) + '% · γd máx = ' + Number(datos.cp.max.ds).toFixed(3) + ' g/cm³') : 'Proctor calculado';
            break;
        case 'densidad':
            if (!datos.d) { alert('Primero calcula la densidad in situ.'); return; }
            nombre = 'Densidad in situ (Suelos I)';
            resultado = 'γh = ' + Number(datos.d.gh).toFixed(3) + ' · γd = ' + Number(datos.d.gd).toFixed(3) + ' · w = ' + Number(datos.d.w).toFixed(1) + '% · Gc = ' + Number(datos.d.gc).toFixed(1) + '%';
            break;
        case 'clasificacion':
            if (!datos.c && !datos.cl) { alert('Primero clasifica el suelo.'); return; }
            nombre = 'Clasificación SUCS (Suelos I)';
            resultado = (datos.c && datos.c.simbolo) ? ('Símbolo: ' + datos.c.simbolo) : ((datos.cl && datos.cl.texto) || 'Clasificación realizada');
            break;
        case 'permeabilidad':
            if (!datos.p && !datos.k) { alert('Primero calcula la permeabilidad.'); return; }
            nombre = 'Permeabilidad (Suelos I)';
            resultado = datos.p ? ('k = ' + Number(datos.p.k).toExponential(3) + ' · q = ' + Number(datos.p.q) + ' · i = ' + Number(datos.p.i)) : (datos.k.texto || 'k calculado');
            break;
        default:
            alert('Ensayo no reconocido.');
            return;
    }
    var entradas = capturarEntradasEnsayo(tipo);
    var detalle = {
        tipo: tipo,
        entradas: entradas,
        calculados: (window.__datosEnsayo && window.__datosEnsayo[tipo === 'humedad' ? 'h' : tipo === 'granulometria' ? 'g' : tipo === 'limites' ? 'l' : tipo === 'gravedad' ? 'ge' : tipo === 'compactacion' ? 'cp' : tipo === 'densidad' ? 'd' : tipo === 'clasificacion' ? 'c' : tipo === 'permeabilidad' ? 'p' : tipo]) || null
    };
    guardarResultado(nombre, resultado, detalle);
    alert('Datos guardados. Revísalos en Resultados.');
}



document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('btnCerrarResultado');
    if (btn) btn.addEventListener('click', function() {
        var m = document.getElementById('modalResultado');
        if (m) m.hidden = true;
    });
});


// =========================================
// ENSAYOS MECÁNICA DE SUELOS II
// (Corte directo, Compresión inconfinada, Consolidación)
// =========================================

window.__datosEnsayoMS2 = window.__datosEnsayoMS2 || {};

function volverAListaEnsayosMS2() {
    var panel = document.getElementById('panel-ensayo-ms2');
    var grid = document.getElementById('ms2-ensayos-grid');
    if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
    if (grid) grid.style.display = 'grid';
}

function abrirEnsayoSuelos2(nombre) {
    var panel = document.getElementById('panel-ensayo-ms2');
    var grid = document.getElementById('ms2-ensayos-grid');
    if (!panel) return;
    if (grid) grid.style.display = 'none';
    panel.style.display = 'block';
    var html = '<button class="btn-volver-panel btn-volver" onclick="volverAListaEnsayosMS2()">← Ensayos</button>';
    if (nombre === 'corte') html += crearFormularioCorteDirecto();
    else if (nombre === 'inconfinada') html += crearFormularioInconfinada();
    else if (nombre === 'consolidacion') html += crearFormularioConsolidacionMS2();
    else if (nombre === 'triaxial') html += crearFormularioTriaxial();
    panel.innerHTML = html;
    window.scrollTo(0, 0);
}

function crearFormularioCorteDirecto() {
    // Ejemplos aleatorios realistas (σn, τ en kPa) con φ ~ 25–35°
    function rnd(a, b) { return a + Math.random() * (b - a); }
    var phiEj = rnd(25, 35) * Math.PI / 180;
    var cEj = rnd(5, 15);
    var sn1 = rnd(40, 70), sn2 = rnd(90, 130), sn3 = rnd(180, 240);
    var t1 = cEj + sn1 * Math.tan(phiEj) + rnd(-2, 2);
    var t2 = cEj + sn2 * Math.tan(phiEj) + rnd(-2, 2);
    var t3 = cEj + sn3 * Math.tan(phiEj) + rnd(-2, 2);
    function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
    return `
    <h3>Ensayo de Corte Directo</h3>
    <p class="login-hint">Ingresa σn y τ en kPa. Envolvente: τ = c + σn·tan(φ) → c = τ − σn·tan(φ)</p>
    <div class="laboratorio-panel">
      <div class="datos-panel">
        <h4>Datos de la caja</h4>
        <label>Área de la muestra A (m²) — opcional / referencia</label>
        <input type="number" id="cd-area" value="0.0036" step="0.0001" min="0.0001">
        <p class="login-hint" style="margin:4px 0 8px;">Si tienes la fuerza N en kN: σn (kPa) = N / A. Aquí introduces ya el esfuerzo σn.</p>
        <h4>Puntos de falla (mín. 2, ideal 3)</h4>
        <label>Ensayo 1 — σn (kPa)</label>
        <input type="number" id="cd-pv1" placeholder="Ej. ` + f2(sn1) + `" step="0.01">
        <label>Ensayo 1 — τ última (kPa)</label>
        <input type="number" id="cd-ph1" placeholder="Ej. ` + f2(t1) + `" step="0.01">
        <label>Ensayo 2 — σn (kPa)</label>
        <input type="number" id="cd-pv2" placeholder="Ej. ` + f2(sn2) + `" step="0.01">
        <label>Ensayo 2 — τ última (kPa)</label>
        <input type="number" id="cd-ph2" placeholder="Ej. ` + f2(t2) + `" step="0.01">
        <label>Ensayo 3 — σn (kPa) (opcional)</label>
        <input type="number" id="cd-pv3" placeholder="Ej. ` + f2(sn3) + `" step="0.01">
        <label>Ensayo 3 — τ última (kPa)</label>
        <input type="number" id="cd-ph3" placeholder="Ej. ` + f2(t3) + `" step="0.01">
        <div class="botones-calculo">
          <button class="btn-calcular" onclick="calcularCorteDirecto()">CALCULAR</button>
          <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayoMS2('corte')">GUARDAR DATOS</button>
        </div>
        <div class="mensaje-error" id="cd-error"></div>
      </div>
      <div class="resultado-panel">
        <h4>Resultados</h4>
        <div class="resultado-principal"><span>ÁNGULO φ</span><strong id="cd-phi">—</strong></div>
        <div class="resultados-secundarios">
          <div><span>Cohesión c</span><strong id="cd-c">—</strong><small>kPa</small></div>
          <div><span>Puntos usados</span><strong id="cd-n">—</strong></div>
          <div><span>σ₁ medio</span><strong id="cd-s1">—</strong><small>kPa</small></div>
          <div><span>σ₃ medio</span><strong id="cd-s3">—</strong><small>kPa</small></div>
        </div>
        <div class="interpretacion">
          <span>ECUACIÓN DE COULOMB</span>
          <p id="cd-eq">Ingresa al menos 2 ensayos.</p>
        </div>
      </div>
    </div>
    <div class="grafica-panel">
      <div class="grafica-header">
        <h4>Envolvente τ – σn</h4>
        <button class="btn-grafica" onclick="graficaCorteDirecto()">GENERAR GRÁFICA</button>
      </div>
      <canvas id="canvas-corte" width="720" height="460"></canvas>
      <div id="hint-corte" class="mohr-resultados">
        <p class="grafica-hint">Pulsa CALCULAR y luego GENERAR GRÁFICA.</p>
      </div>
    </div>`;
}

function calcularCorteDirecto() {
    setError('cd-error', '');
    var A = parse('cd-area');
    var A_m2 = (A && A > 0) ? A : 0.0036;
    if (A_m2 >= 0.1) A_m2 = A_m2 / 10000; // cm² → m² si aplica
    var pts = [];
    for (var i = 1; i <= 3; i++) {
        // cd-pv = σn en kPa (esfuerzo normal de falla)
        // cd-ph = τ en kPa (esfuerzo cortante de falla)
        var snKPa = parse('cd-pv' + i);
        var tauKPa = parse('cd-ph' + i);
        if (snKPa != null && tauKPa != null && snKPa > 0 && tauKPa > 0) {
            pts.push({ sn: snKPa, t: tauKPa, tau: tauKPa });
        }
    }
    if (pts.length < 2) {
        setError('cd-error', 'Se requieren al menos 2 ensayos con σn (kPa) y τ (kPa)');
        return;
    }
    var n = pts.length, sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    pts.forEach(function(p) {
        sumX += p.sn;
        sumY += p.t;
        sumXY += p.sn * p.t;
        sumX2 += p.sn * p.sn;
    });
    // τ = c + σn · tan(φ)  →  pendiente b = tan(φ), intercepto = c
    var den = (n * sumX2 - sumX * sumX);
    if (Math.abs(den) < 1e-18) {
        setError('cd-error', 'Los valores de N deben ser distintos entre ensayos');
        return;
    }
    var b = (n * sumXY - sumX * sumY) / den; // tan(φ)
    var cInt = (sumY - b * sumX) / n;       // c
    var phi = Math.atan(b) * 180 / Math.PI;
    if (!isFinite(phi) || isNaN(phi)) {
        setError('cd-error', 'No se pudo calcular φ. Revisa que τ esté en kPa y N en kN.');
        return;
    }
    // c = τ − σn·tan(φ)  (promedio de los despejes por punto)
    var cSum = 0;
    pts.forEach(function(p) {
        p.c_i = p.t - p.sn * b;
        cSum += p.c_i;
    });
    // φ con 1 decimal (como en calculadora de lab)
    var phiShow = Math.round(phi * 10) / 10;
    var tanPhiShow = Math.tan(phiShow * Math.PI / 180);
    // Cohesión: intercepto de la regresión τ = c + σn·tan(φ), redondeado a 2 decimales
    // (equivalente a despejar c = τ − σn·tan(φ) sobre la recta ajustada)
    var c = Math.max(0, Math.round(cInt * 100) / 100);
    var cReg = Math.max(0, cInt);

    var phiRad = phiShow * Math.PI / 180;
    var tanPhi = tanPhiShow;
    var cosPhi = Math.cos(phiRad);
    if (Math.abs(cosPhi) < 1e-9) cosPhi = 1e-9;

    pts.forEach(function(p) {
        var R = p.t / cosPhi;
        var sc = p.sn + p.t * tanPhi;
        p.R = R;
        p.sc = sc;
        p.s1 = sc + R;
        p.s3 = sc - R;
        // Mohr: radio = (σ1 − σ3)/2 ; centro = (σ1 + σ3)/2
        p.radio = (p.s1 - p.s3) / 2;
        p.centro = (p.s1 + p.s3) / 2;
        p.c_check = p.t - p.sn * tanPhi;
    });

    var avgS1 = pts.reduce(function(s, p) { return s + p.s1; }, 0) / n;
    var avgS3 = pts.reduce(function(s, p) { return s + p.s3; }, 0) / n;

    var detSn = pts.map(function(p, idx) {
        return 'E' + (idx + 1) + ': σn=' + p.sn.toFixed(2) + ' kPa, τ=' + p.t.toFixed(2) + ' kPa';
    }).join(' · ');

    var elPhi = document.getElementById('cd-phi');
    var elC = document.getElementById('cd-c');
    var elN = document.getElementById('cd-n');
    var elS1 = document.getElementById('cd-s1');
    var elS3 = document.getElementById('cd-s3');
    var elEq = document.getElementById('cd-eq');
    if (elPhi) elPhi.textContent = phiShow.toFixed(1) + '°';
    // Mostrar c con 2 decimales (ej. 8.14) alineado a calculadora
    if (elC) elC.textContent = c.toFixed(2);
    if (elN) elN.textContent = String(n);
    if (elS1) elS1.textContent = avgS1.toFixed(2);
    if (elS3) elS3.textContent = avgS3.toFixed(2);
    if (elEq) {
        elEq.textContent =
            'τ = c + σn·tan(φ)  →  c = τ − σn·tan(φ) = ' + c.toFixed(2) + ' kPa · φ = ' + phiShow.toFixed(1) +
            '° · σ₁ ≈ ' + avgS1.toFixed(2) + ' kPa · σ₃ ≈ ' + avgS3.toFixed(2) + ' kPa · ' + detSn;
    }
    window.__datosEnsayoMS2 = window.__datosEnsayoMS2 || {};
    window.__datosEnsayoMS2.corte = {
        pts: pts, c: c, cReg: cReg, phi: phiShow, A: A_m2, avgS1: avgS1, avgS3: avgS3, unidades: 'kPa'
    };
}

function graficaCorteDirecto() {
    var d = window.__datosEnsayoMS2.corte;
    var canvas = document.getElementById('canvas-corte');
    var hint = document.getElementById('hint-corte');
    if (!d || !canvas) { if (hint) hint.textContent = 'Primero pulsa CALCULAR.'; return; }
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(0, 0, w, h);

    // Ambos ejes en kPa (esfuerzos): σ y τ
    var ptsN = d.pts.map(function(p) {
        var s1 = Number(p.s1), s3 = Number(p.s3);
        var radio = (typeof p.radio === 'number') ? p.radio : (s1 - s3) / 2;
        var centro = (typeof p.centro === 'number') ? p.centro : (s1 + s3) / 2;
        return {
            sn: Number(p.sn),
            t: Number(p.t),
            s1: s1,
            s3: s3,
            R: Number(p.R != null ? p.R : radio),
            sc: Number(p.sc != null ? p.sc : centro),
            radio: radio,
            centro: centro
        };
    });
    var cY = Number(d.c) || 0;
    var phiRad = (Number(d.phi) || 0) * Math.PI / 180;

    var maxS = Math.max.apply(null, ptsN.map(function(p) { return Math.max(p.s1, p.sn, p.s3); }));
    maxS = Math.max(maxS * 1.25, 1);
    var maxT = Math.max(
        cY + maxS * Math.tan(phiRad),
        Math.max.apply(null, ptsN.map(function(p) { return Math.max(p.t, p.R); })),
        1
    ) * 1.25;

    var ox = 70, oy = h - 70, gx = w - 30, gy = 30;
    function sx(x) { return ox + (x / maxS) * (gx - ox); }
    function sy(y) { return oy - (y / maxT) * (oy - gy); }

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (var gi = 0; gi <= 5; gi++) {
        var xv = (maxS / 5) * gi, yv = (maxT / 5) * gi;
        ctx.beginPath(); ctx.moveTo(sx(xv), oy); ctx.lineTo(sx(xv), gy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox, sy(yv)); ctx.lineTo(gx, sy(yv)); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#8a7a60';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox, gy); ctx.lineTo(ox, oy); ctx.lineTo(gx, oy); ctx.stroke();

    // Envolvente: τ = c + σ · tan(φ)  (kPa vs kPa)
    ctx.strokeStyle = '#e8b84a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(cY));
    ctx.lineTo(sx(maxS), sy(cY + maxS * Math.tan(phiRad)));
    ctx.stroke();

    var colors = ['#5dade2', '#58d68d', '#f5b041', '#af7ac5', '#ec7063', '#1abc9c'];
    var labelBottom = [];

    ptsN.forEach(function(p, i) {
        var col = colors[i % colors.length];
        // Semicírculo de Mohr (radio en kPa, centro en kPa)
        var cx = p.centro;
        var R = p.radio;
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // arco superior de σ3 a σ1
        var steps = 48;
        for (var s = 0; s <= steps; s++) {
            var ang = Math.PI - (Math.PI * s / steps); // π → 0
            var px = cx + R * Math.cos(ang);
            var py = R * Math.sin(ang);
            if (s === 0) ctx.moveTo(sx(px), sy(py));
            else ctx.lineTo(sx(px), sy(py));
        }
        ctx.stroke();

        // Base σ3 — σ1
        ctx.beginPath();
        ctx.moveTo(sx(p.s3), oy);
        ctx.lineTo(sx(p.s1), oy);
        ctx.stroke();

        // Punto de falla (σn, τ)
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(sx(p.sn), sy(p.t), 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sx(p.sn), sy(p.t), 2.5, 0, Math.PI * 2); ctx.fill();

        // Extremes σ1, σ3
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(sx(p.s1), oy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx(p.s3), oy, 4, 0, Math.PI * 2); ctx.fill();

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = col;
        var labY = sy(p.t) - 10 - (i * 12);
        if (labY < gy + 8) labY = sy(p.t) + 14 + (i * 12);
        ctx.fillText('E' + (i + 1), sx(p.sn) + 8, labY);

        labelBottom.push({ x: sx(p.s3), text: 'σ₃=' + p.s3.toFixed(1), col: col, row: 0 });
        labelBottom.push({ x: sx(p.s1), text: 'σ₁=' + p.s1.toFixed(1), col: col, row: 0 });
    });

    labelBottom.sort(function(a, b) { return a.x - b.x; });
    var placed = [];
    var minGap = 58;
    labelBottom.forEach(function(lb) {
        var row = 0, ok = false;
        while (!ok && row < 4) {
            ok = true;
            for (var pi = 0; pi < placed.length; pi++) {
                if (placed[pi].row === row && Math.abs(placed[pi].x - lb.x) < minGap) {
                    ok = false;
                    break;
                }
            }
            if (!ok) row++;
        }
        lb.row = row;
        placed.push(lb);
    });

    ctx.font = '10px sans-serif';
    placed.forEach(function(lb) {
        ctx.fillStyle = lb.col;
        var ty = oy + 14 + lb.row * 13;
        var tx = lb.x - 24;
        if (tx < ox) tx = ox;
        if (tx > gx - 55) tx = gx - 55;
        ctx.fillText(lb.text, tx, ty);
    });

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#e8b84a';
    ctx.fillText('Envolvente τ = c + σn·tanφ', ox + 8, gy + 14);
    ctx.fillStyle = '#c8d0d8';
    ctx.fillText('c = ' + d.c.toFixed(2) + ' kPa   φ = ' + d.phi.toFixed(1) + '°', ox + 8, gy + 30);

    // Ejes en kPa
    ctx.fillStyle = '#aaa';
    ctx.font = '12px sans-serif';
    var maxRow = 0;
    placed.forEach(function(lb) { if (lb.row > maxRow) maxRow = lb.row; });
    ctx.fillText('σ (kPa)', gx - 55, oy + 16 + (maxRow + 1) * 13);
    ctx.save();
    ctx.translate(16, (gy + oy) / 2 + 20);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('τ (kPa)', 0, 0);
    ctx.restore();

    // R y Centro en kPa: R = (σ1−σ3)/2 , Centro = (σ1+σ3)/2
    if (hint) {
        var html = '<div class="mohr-rc-wrap">';
        html += '<div class="mohr-rc-grid">';
        ptsN.forEach(function(p, i) {
            html += '<div class="mohr-rc-item">' +
                '<span>R' + (i + 1) + ' = <strong>' + p.radio.toFixed(3) + '</strong> kPa</span>' +
                '<span>Centro' + (i + 1) + ' = <strong>' + p.centro.toFixed(3) + '</strong> kPa</span>' +
                '</div>';
        });
        html += '</div>';
        html += '<button type="button" class="btn-informe-pdf" id="btnInformeCorte">Descargar informe</button>';
        html += '</div>';
        hint.innerHTML = html;
        var btnInf = document.getElementById('btnInformeCorte');
        if (btnInf) {
            btnInf.onclick = function() {
                generarInformeEnsayoPDF('corte');
            };
        }
    }
}

/** Clasificación orientativa del suelo según c (kPa) y φ (°) — uso didáctico */
function clasificarSueloCorte(c, phi) {
    c = Number(c) || 0;
    phi = Number(phi) || 0;
    var tipo = '';
    var detalle = '';
    if (c < 5 && phi >= 35) {
        tipo = 'Arena densa / grava arenosa';
        detalle = 'Baja cohesión y alto ángulo de fricción, típico de arenas densas o materiales granulares.';
    } else if (c < 5 && phi >= 30) {
        tipo = 'Arena media a densa';
        detalle = 'Cohesión casi nula y φ moderado-alto: comportamiento predominantemente friccionante.';
    } else if (c < 10 && phi >= 28 && phi < 35) {
        tipo = 'Arena limosa / suelo granular con algo de finos';
        detalle = 'Ligera cohesión aparente y φ intermedio; posible presencia de finos o humedad.';
    } else if (c >= 10 && c < 25 && phi >= 20 && phi < 32) {
        tipo = 'Limo arcilloso / arcilla arenosa';
        detalle = 'Cohesión moderada y fricción intermedia: mezcla de finos con fracción granular.';
    } else if (c >= 25 && phi < 25) {
        tipo = 'Arcilla (comportamiento cohesivo)';
        detalle = 'Alta cohesión y φ relativamente bajo: resistencia controlada por la cohesión.';
    } else if (c >= 15 && phi >= 25) {
        tipo = 'Arcilla limosa / suelo cohesivo-friccionante';
        detalle = 'Combinación relevante de c y φ: suelo con contribución de cohesión y fricción.';
    } else if (phi < 20) {
        tipo = 'Suelo de baja resistencia al corte (posible arcilla blanda o relleno)';
        detalle = 'Ángulo de fricción bajo: revisar humedad, estructura y condiciones de drenaje del ensayo.';
    } else {
        tipo = 'Suelo intermedio (cohesivo-friccionante)';
        detalle = 'Los parámetros se sitúan en un rango mixto; conviene contrastar con granulometría e índice de plasticidad.';
    }
    return { tipo: tipo, detalle: detalle };
}


/** Datos del informe según sesión (estudiante / materia / grupo / docente) */

/** Catálogo de ensayos para informes PDF */
/** Esquema obligatorio de informes descargables (GeoMetrics) */
var ESQUEMA_INFORME_ACADEMICO = [
    { id: 'portada', nombre: 'Portada', desc: 'Institución, logos, título del ensayo, estudiante, código, docente, grupo, asignatura, fecha.' },
    { id: 'resumen', nombre: 'Resumen', desc: 'Síntesis del objetivo, método y principales resultados (máx. media página).' },
    { id: 'introduccion', nombre: 'Introducción', desc: 'Contexto del ensayo, importancia en ingeniería civil y alcance del informe.' },
    { id: 'objetivos', nombre: 'Objetivos', desc: 'Objetivo general y específicos del laboratorio.' },
    { id: 'marco', nombre: 'Marco teórico', desc: 'Fundamentos y fórmulas según textos guía de la asignatura (sin mezclar materias).' },
    { id: 'materiales', nombre: 'Materiales y equipos', desc: 'Listado de equipos, instrumentos y muestras utilizadas.' },
    { id: 'procedimiento', nombre: 'Procedimiento', desc: 'Pasos del ensayo en tiempo pasado, de forma impersonal y reproducible.' },
    { id: 'resultados', nombre: 'Resultados', desc: 'Datos con unidades, tablas, gráficos y cifras significativas coherentes.' },
    { id: 'discusion', nombre: 'Discusión', desc: 'Análisis crítico de resultados, fuentes de error y comparación con la teoría.' },
    { id: 'conclusiones', nombre: 'Conclusiones', desc: 'Hallazgos alineados con objetivos; no introducir datos nuevos.' },
    { id: 'referencias', nombre: 'Referencias', desc: 'Fuentes autorizadas (guías FLA-23, Beer/Hibbeler, Das, NSR-10 según materia).' },
    { id: 'anexos', nombre: 'Anexos', desc: 'Cálculos extendidos, capturas de gráficas y datos brutos si aplica.' }
];

/** Normas de ensayo alineadas con NSR-10 Título H (H.2.6), NTC/ASTM e INVIAS */
var NORMA_ENSAYO_NSR10 = {
    humedad: {
        ntc: 'NTC 1495 (referencia ICONTEC)',
        astm: 'ASTM D 2216-10',
        invias: 'INV E-122-13 (INVIAS) — Contenido de agua (humedad); Guía FLA-23 UniPamplona',
        uso: 'Propiedad índice w (%) para relaciones de fase e investigación del subsuelo (NSR-10 H.2.1.1.1).'
    },
    granulometria: {
        ntc: 'NTC 1522 (referencia)',
        astm: 'ASTM D 422-63',
        invias: 'INV E-123-13 (INVIAS); Guía FLA-23 UniPamplona',
        uso: 'Distribución de tamaños de partículas; curva granulométrica; apoyo a SUCS (H.2.5).'
    },
    limites: {
        ntc: 'NTC 1493, NTC 1494, NTC 4630',
        astm: 'ASTM D 4318-10',
        invias: 'INV E-125-13 (límite líquido) e INV asociadas (LP/IP); Guía FLA-23',
        uso: 'LL, LP e IP para clasificación de finos y comportamiento plástico.'
    },
    gravedad: {
        ntc: 'NTC 1974',
        astm: 'ASTM D 854',
        invias: 'INVIAS — Densidad relativa de sólidos',
        uso: 'Relaciones volumétricas y de fase del suelo.'
    },
    compactacion: {
        ntc: 'NTC / Proctor (referencia de laboratorio)',
        astm: 'ASTM D 698 / D 1557',
        invias: 'INVIAS — Compactación de suelos (Proctor)',
        uso: 'Control de rellenos y obras de adecuación del terreno.'
    },
    densidad: {
        ntc: 'NTC 1667 / NTC 1528',
        astm: 'ASTM D 1556 / D 2167',
        invias: 'INVIAS — Densidad in situ (cono de arena / balón)',
        uso: 'Estado de densificación en campo.'
    },
    clasificacion: {
        ntc: 'NTC 1504',
        astm: 'ASTM D 2487-11 (SUCS)',
        invias: 'INV E-181-13 (INVIAS); Guía FLA-23 UniPamplona',
        uso: 'Clasificación SUCS/AASHTO; identificación de unidades de suelo (H.2.2.2.1-c).'
    },
    permeabilidad: {
        ntc: 'NTC (permeabilidad de laboratorio)',
        astm: 'ASTM D 2434 / D 5084 (referencia)',
        invias: 'INVIAS — Permeabilidad de suelos',
        uso: 'Flujo y drenaje; apoyo a análisis hidráulicos del Título H.'
    },
    corte: {
        ntc: 'NTC 1917',
        astm: 'ASTM D 3080',
        invias: 'INVIAS — Resistencia al corte (corte directo)',
        uso: 'Parámetros c y φ para resistencia al corte (H.2.0, H.2.4); insumos de análisis geotécnicos del estudio definitivo.'
    },
    inconfinada: {
        ntc: 'NTC / compresión inconfinada',
        astm: 'ASTM D 2166',
        invias: 'INVIAS — Resistencia a la compresión inconfinada',
        uso: 'Resistencia no drenada Su (H.2.0) en suelos cohesivos.'
    },
    consolidacion: {
        ntc: 'NTC 1967',
        astm: 'ASTM D 2435',
        invias: 'INVIAS — Consolidación unidimensional',
        uso: 'Parámetros de deformabilidad y asentamiento (H.2.2.2.1-e).'
    },
    triaxial: {
        ntc: 'NTC 2041',
        astm: 'ASTM D 2850 / D 4767 (referencia)',
        invias: 'INVIAS — Ensayo triaxial en suelos',
        uso: 'Resistencia y trayectoria de esfuerzos para diseño geotécnico.'
    }
};

/** Textos de informe por ensayo — alineados a prácticas UniPamplona / FLA-23 / NSR-10 H */
var TEXTO_INFORME_ENSAYO = {
    humedad: {
        tituloFLA: 'Determinación del contenido de agua (humedad)',
        intro: 'El contenido de humedad (w) expresa la relación entre la masa de agua y la masa de sólidos del suelo. Es una propiedad índice fundamental: interviene en la resistencia, la compactación, la consolidación y el estado de consistencia. Se determina secando la muestra en horno a 110 ± 5 °C hasta masa constante (ASTM D 2216 / INV E-122 / FLA-23).',
        objetivoGeneral: 'Determinar el contenido de humedad de la muestra de suelo mediante el método de secado en horno.',
        objetivosEspecificos: [
            'Registrar las masas del recipiente, del suelo húmedo y del suelo seco.',
            'Calcular la masa de agua y el contenido de humedad w en porcentaje.',
            'Interpretar el resultado según el contexto de la muestra (estado natural / laboratorio).'
        ],
        materiales: 'Balanza de precisión, recipientes o cápsulas, horno a 110 ± 5 °C, espátula y muestra de suelo representativa.',
        proc: '1) Pesar el recipiente limpio y seco (Mr). 2) Colocar la muestra húmeda y pesar (Mr+h). 3) Secar en horno a 110 ± 5 °C hasta peso constante. 4) Enfriar y pesar (Mr+s). 5) Calcular Mw = (Mr+h) − (Mr+s), Ms = (Mr+s) − Mr y w = (Mw/Ms)×100.',
        formulas: [
            { eq: 'Mw = Mh − Ms', desc: 'Masa de agua (g): diferencia entre masa húmeda y masa seca de suelo.' },
            { eq: 'w = (Mw / Ms) × 100', desc: 'Contenido de humedad en porcentaje. Unidades: % y g. No aplican kPa ni grados.' }
        ],
        analisisGuia: 'Interpretar si w es bajo, medio o alto según el tipo de suelo y el contexto (campo o laboratorio). Relacionar con el estado natural y posibles usos posteriores (compactación, límites, etc.).',
        conclusionesGuia: 'Reportar el valor de w obtenido y su relevancia como propiedad índice del suelo ensayado.',
        referencias: [
            'Guía Unificada FLA-23 — Mecánica de Suelos 1 (Universidad de Pamplona).',
            'ASTM D 2216 — Laboratory determination of water (moisture) content.',
            'INV E-122 — Contenido de agua (humedad).'
        ],
        canvasId: 'canvas-humedad'
    },
    granulometria: {
        tituloFLA: 'Determinación de los tamaños de las partículas de los suelos',
        intro: 'La granulometría describe la distribución de tamaños de partículas del suelo. Es base de la clasificación SUCS/AASHTO y del comportamiento hidráulico y mecánico. Se obtiene por tamizado (fracción > 75 µm) y, si aplica, sedimentación (FLA-23 / ASTM D 422 / INV E-123).',
        objetivoGeneral: 'Determinar la distribución de tamaños de partículas y construir la curva granulométrica.',
        objetivosEspecificos: [
            'Obtener masas retenidas en cada tamiz y calcular % retenido, acumulado y % que pasa.',
            'Graficar la curva granulométrica (% que pasa vs abertura, eje log de diámetros).',
            'Estimar D10, D30, D60 y los coeficientes Cu y Cc cuando corresponda.'
        ],
        materiales: 'Juego de tamices, balanza, agitador, bandejas, horno y muestra preparada según la guía.',
        proc: 'Preparar la muestra, tamizar, pesar retenidos, calcular porcentajes y dibujar la curva. Reportar D10, D30, D60, Cu = D60/D10 y Cc = (D30)²/(D10·D60) si hay datos suficientes.',
        formulas: [
            { eq: '% retenido = (mi / M) × 100', desc: 'mi = masa retenida en el tamiz i; M = masa total de la muestra.' },
            { eq: '% pasa = 100 − % retenido acumulado', desc: 'Fracción que atraviesa el tamiz considerado.' },
            { eq: 'Cu = D60 / D10', desc: 'Coeficiente de uniformidad.' },
            { eq: 'Cc = (D30)² / (D10 · D60)', desc: 'Coeficiente de curvatura.' }
        ],
        analisisGuia: 'Analizar predominio de grava, arena o finos, y si el suelo es bien o mal graduado según Cu y Cc.',
        conclusionesGuia: 'Resumir la distribución granulométrica y los parámetros D10, D30, D60, Cu y Cc obtenidos.',
        referencias: [
            'Guía FLA-23 — Granulometría.',
            'ASTM D 422 / INV E-123.'
        ],
        canvasId: 'canvas-granulo'
    },
    limites: {
        tituloFLA: 'Límites de Atterberg (LL, LP e IP)',
        intro: 'Los límites de Atterberg caracterizan la consistencia de suelos finos con la variación del contenido de agua. El límite líquido (LL), el límite plástico (LP) y el índice de plasticidad (IP = LL − LP) son esenciales para la clasificación y el comportamiento de suelos cohesivos (ASTM D 4318 / FLA-23).',
        objetivoGeneral: 'Determinar el límite líquido, el límite plástico y el índice de plasticidad de la muestra.',
        objetivosEspecificos: [
            'Obtener la curva de fluidez (humedad vs número de golpes) y el LL a 25 golpes.',
            'Determinar el LP e IP = LL − LP.',
            'Interpretar la plasticidad del suelo.'
        ],
        materiales: 'Copa de Casagrande (o equipo equivalente), ranurador, espátula, balanza, cápsulas, horno y tamiz N.º 40.',
        proc: 'Preparar pasta que pasa el N.º 40; realizar puntos de LL; trazar curva de fluidez; obtener LL; determinar LP por rollitos; calcular IP.',
        formulas: [
            { eq: 'w = (Mw / Ms) × 100', desc: 'Humedad de cada punto del ensayo.' },
            { eq: 'IP = LL − LP', desc: 'Índice de plasticidad.' }
        ],
        analisisGuia: 'Interpretar la plasticidad (baja, media, alta) y el comportamiento frente a cambios de humedad. Relacionar con la clasificación de finos.',
        conclusionesGuia: 'Reportar LL, LP e IP y su significado para el suelo ensayado.',
        referencias: [
            'Guía FLA-23 — Límites de Atterberg.',
            'ASTM D 4318 / INV E-125.'
        ],
        canvasId: 'canvas-limites'
    },
    gravedad: {
        tituloFLA: 'Gravedad específica de las partículas sólidas (Gs)',
        intro: 'La gravedad específica Gs es la relación entre la masa de las partículas sólidas y la masa de un volumen igual de agua a temperatura de referencia. Interviene en las relaciones de fase (índice de vacíos, porosidad, grado de saturación).',
        objetivoGeneral: 'Determinar la gravedad específica de los sólidos del suelo (Gs).',
        objetivosEspecificos: [
            'Registrar las masas del picnómetro en las condiciones del ensayo.',
            'Calcular Gs y compararlo con rangos típicos.',
            'Identificar posibles fuentes de error (aire atrapado, temperatura, humedad residual).'
        ],
        materiales: 'Picnómetro, balanza, agua destilada, termómetro, bomba de vacío si aplica, horno.',
        proc: 'Calibrar el picnómetro, desairear, registrar masas y temperatura, y aplicar la fórmula de Gs según la norma de referencia.',
        formulas: [
            { eq: 'Gs = Ms / (Ms + Mpw − Mpsw)', desc: 'Forma típica con masas de picnómetro+agua y picnómetro+suelo+agua (ajustar según protocolo del laboratorio).' }
        ],
        analisisGuia: 'Comparar Gs con valores típicos (p. ej. 2,65–2,70 para muchos minerales). Discutir aire atrapado, temperatura y humedad residual.',
        conclusionesGuia: 'Reportar Gs y su utilidad en cálculos posteriores de fase.',
        referencias: ['ASTM D 854 / NTC 1974', 'Guía FLA-23'],
        canvasId: 'canvas-gravedad'
    },
    compactacion: {
        tituloFLA: 'Compactación Proctor — relaciones humedad–peso unitario seco',
        intro: 'La compactación mejora la densidad y la resistencia del suelo. El ensayo Proctor relaciona el contenido de humedad con el peso unitario seco bajo una energía de compactación definida, permitiendo obtener la humedad óptima (wopt) y la densidad seca máxima (γd máx).',
        objetivoGeneral: 'Determinar la curva de compactación y obtener wopt y γd máx.',
        objetivosEspecificos: [
            'Calcular humedad y densidades húmeda y seca en cada punto.',
            'Construir la curva γd vs w.',
            'Identificar humedad óptima y densidad seca máxima.'
        ],
        materiales: 'Molde Proctor, pisón, balanza, horno, regla, recipientes y muestra.',
        proc: 'Compactar puntos a distintas humedades, determinar γh y w, calcular γd = γh/(1+w) y graficar la curva de compactación.',
        formulas: [
            { eq: 'γh = Mh / V', desc: 'Densidad húmeda.' },
            { eq: 'γd = γh / (1 + w)', desc: 'Densidad seca (w en decimal).' }
        ],
        analisisGuia: 'Analizar la forma de la curva, la relación agua–compactación y el significado de wopt en obra.',
        conclusionesGuia: 'Reportar wopt y γd máx como parámetros de control de compactación.',
        referencias: ['ASTM D 698 / D 1557', 'Guía FLA-23'],
        canvasId: 'canvas-proctor'
    },
    densidad: {
        tituloFLA: 'Densidad in situ (cono de arena u otro método)',
        intro: 'La densidad de campo verifica el grado de compactación logrado en obra. Se determina la densidad húmeda y seca del suelo in situ y, si existe Proctor de referencia, el grado de compactación.',
        objetivoGeneral: 'Determinar la densidad de campo y el grado de compactación cuando aplique.',
        objetivosEspecificos: [
            'Obtener masa y volumen del material extraído.',
            'Calcular densidades húmeda y seca.',
            'Comparar con γd máx del Proctor si está disponible.'
        ],
        materiales: 'Cono de arena (o método del balón), arena calibrada, balanza, herramientas de excavación.',
        proc: 'Excavar el hueco, determinar volumen, pesar el material, obtener w y calcular densidades y grado de compactación.',
        formulas: [
            { eq: 'γd campo = γh / (1 + w)', desc: 'Densidad seca de campo.' },
            { eq: 'GC = (γd campo / γd máx) × 100', desc: 'Grado de compactación (%).' }
        ],
        analisisGuia: 'Comparar el grado de compactación con el porcentaje exigido por el proyecto o la especificación.',
        conclusionesGuia: 'Reportar γd de campo y GC, e indicar si cumple el criterio de obra.',
        referencias: ['ASTM D 1556', 'Guía FLA-23'],
        canvasId: 'canvas-densidad'
    },
    clasificacion: {
        tituloFLA: 'Clasificación de suelos (SUCS)',
        intro: 'El Sistema Unificado de Clasificación de Suelos (SUCS) asigna un símbolo de grupo a partir de la granulometría y, en finos, de los límites de Atterberg (ASTM D 2487 / INV E-181 / FLA-23).',
        objetivoGeneral: 'Clasificar el suelo según el sistema SUCS a partir de los datos de laboratorio.',
        objetivosEspecificos: [
            'Determinar si el suelo es grueso o fino.',
            'Aplicar criterios de grava/arena y de plasticidad de finos.',
            'Asignar el símbolo SUCS y justificarlo con los datos.'
        ],
        materiales: 'Resultados de granulometría y de límites de Atterberg; carta de plasticidad.',
        proc: '1) ¿Finos > 50 %? 2) Si grueso: grava vs arena. 3) Caracterizar finos con LL e IP. 4) Asignar símbolo (GW, SP, CL, CH, etc.).',
        formulas: [
            { eq: 'IP = LL − LP', desc: 'Índice de plasticidad usado en la carta de Casagrande.' }
        ],
        analisisGuia: 'Explicar por qué se obtuvo el símbolo: porcentajes de grava/arena/finos y posición en la carta de plasticidad.',
        conclusionesGuia: 'Enunciar el símbolo SUCS y el nombre del grupo (p. ej. SP — arena mal graduada).',
        referencias: ['ASTM D 2487', 'INV E-181', 'Guía FLA-23'],
        canvasId: 'canvas-sucs'
    },
    permeabilidad: {
        tituloFLA: 'Permeabilidad de suelos (carga constante o variable)',
        intro: 'El coeficiente de permeabilidad k cuantifica la capacidad del suelo para conducir agua. Se determina en laboratorio con permeámetro de carga constante (granulares) o variable (finos), aplicando la ley de Darcy.',
        objetivoGeneral: 'Determinar el coeficiente de permeabilidad k de la muestra.',
        objetivosEspecificos: [
            'Registrar carga hidráulica, caudales o tiempos según el método.',
            'Calcular k mediante la ley de Darcy.',
            'Interpretar el comportamiento hidráulico del suelo.'
        ],
        materiales: 'Permeámetro, muestra, agua, cronómetro, probeta o balanza según el método.',
        proc: 'Saturar la muestra, aplicar el gradiente hidráulico, medir caudales o tiempos y calcular k.',
        formulas: [
            { eq: 'q = k · i · A', desc: 'Ley de Darcy: caudal, gradiente e área de la sección.' },
            { eq: 'k = (q · L) / (A · Δh)', desc: 'Forma típica a carga constante.' }
        ],
        analisisGuia: 'Relacionar k con el tamaño de partículas y clasificar cualitativamente el suelo como más o menos permeable.',
        conclusionesGuia: 'Reportar k y su implicación en drenaje o filtración.',
        referencias: ['ASTM D 2434', 'Guía FLA-23'],
        canvasId: 'canvas-perm'
    },
    corte: {
        tituloFLA: 'Ensayo de corte directo (condición CD)',
        intro: 'El ensayo de corte directo determina la resistencia al corte del suelo sobre un plano impuesto. A partir de varios niveles de esfuerzo normal se obtiene la envolvente de falla y los parámetros c y φ del criterio de Mohr–Coulomb.',
        objetivoGeneral: 'Determinar la cohesión c y el ángulo de fricción interna φ del suelo mediante corte directo.',
        objetivosEspecificos: [
            'Registrar esfuerzos normales y cortantes de falla en cada ensayo.',
            'Obtener la envolvente τ–σn y los parámetros c y φ.',
            'Construir o interpretar los círculos de Mohr asociados.'
        ],
        materiales: 'Caja de corte, celdas de carga, marco de carga, muestra preparada según FLA-23.',
        proc: 'Montaje, consolidación si aplica, corte a velocidad controlada, registro de τ de falla, regresión de la envolvente y cálculo de σ₁, σ₃, R y centro.',
        formulas: [
            { eq: 'τ = c + σn · tan(φ)', desc: 'Criterio de Mohr–Coulomb (c en kPa, φ en grados).' },
            { eq: 'R = (σ₁ − σ₃) / 2', desc: 'Radio del círculo de Mohr (kPa).' },
            { eq: 'C = (σ₁ + σ₃) / 2', desc: 'Centro del círculo de Mohr (kPa).' }
        ],
        analisisGuia: 'Analizar la influencia del esfuerzo normal, la interpretación de c y φ y la clasificación orientativa del suelo.',
        conclusionesGuia: 'Reportar c, φ y la coherencia de la envolvente con los puntos de falla.',
        referencias: ['ASTM D 3080', 'NTC 1917', 'Guía FLA-23 de corte directo', 'Das — Principles of Geotechnical Engineering'],
        canvasId: 'canvas-corte'
    },
    inconfinada: {
        tituloFLA: 'Compresión inconfinada',
        intro: 'La compresión inconfinada determina la resistencia a la compresión axial de un suelo cohesivo sin confinamiento lateral (σ₃ = 0). Se obtiene qu y, en condiciones no drenadas, cu ≈ qu/2.',
        objetivoGeneral: 'Determinar la resistencia a la compresión inconfinada qu y la cohesión no drenada cu.',
        objetivosEspecificos: [
            'Registrar la curva esfuerzo–deformación.',
            'Identificar qu y la deformación en la falla.',
            'Calcular cu = qu/2 cuando aplique.'
        ],
        materiales: 'Prensa de compresión, deformímetros, probeta tallada.',
        proc: 'Preparar la probeta, cargar hasta la falla, registrar pares carga–deformación y calcular esfuerzos.',
        formulas: [
            { eq: 'qu = Pfalla / A', desc: 'Resistencia a la compresión inconfinada.' },
            { eq: 'cu = qu / 2', desc: 'Cohesión no drenada (φ ≈ 0).' }
        ],
        analisisGuia: 'Analizar el comportamiento esfuerzo–deformación, la forma de falla y la resistencia del suelo.',
        conclusionesGuia: 'Reportar qu, cu y la deformación en la falla.',
        referencias: ['ASTM D 2166', 'Guía FLA-23'],
        canvasId: 'canvas-inconf'
    },
    consolidacion: {
        tituloFLA: 'Consolidación unidimensional',
        intro: 'La consolidación unidimensional evalúa la magnitud y la velocidad de compresión del suelo bajo carga axial con deformación lateral restringida. Se obtienen parámetros como Cc, Cv y la presión de preconsolidación.',
        objetivoGeneral: 'Determinar los parámetros de consolidación del suelo a partir del ensayo edométrico.',
        objetivosEspecificos: [
            'Registrar deformaciones por escalón de carga.',
            'Construir curvas e–log σ′ y deformación–log t cuando aplique.',
            'Estimar Cc, Cv y σ′p según el procedimiento del laboratorio.'
        ],
        materiales: 'Edómetro, piedras porosas, diales o LVDT, marco de carga.',
        proc: 'Montaje, saturación, aplicación de escalones de carga, registro de lecturas y construcción de curvas de consolidación.',
        formulas: [
            { eq: 'e = e0 − ΔH / H0 · (1 + e0)', desc: 'Relación típica entre cambio de altura e índice de vacíos (ajustar según datos).' },
            { eq: 'Cc = −Δe / Δlog σ′', desc: 'Índice de compresión en el tramo virgen.' }
        ],
        analisisGuia: 'Interpretar compresibilidad, consolidación primaria y estado de preconsolidación del suelo.',
        conclusionesGuia: 'Reportar Cc, Cv, σ′p y e0 según lo obtenido en la práctica.',
        referencias: ['ASTM D 2435', 'NTC 1967', 'Guía FLA-23'],
        canvasId: 'canvas-consol'
    },
    triaxial: {
        tituloFLA: 'Ensayo triaxial (UU / CU / CD)',
        intro: 'El ensayo triaxial permite obtener la resistencia y las trayectorias de esfuerzo bajo confinamiento controlado. Debe especificarse la modalidad: UU, CU o CD.',
        objetivoGeneral: 'Determinar parámetros de resistencia (c, φ) y el comportamiento esfuerzo–deformación bajo confinamiento.',
        objetivosEspecificos: [
            'Registrar curvas esfuerzo desviador–deformación para cada σ₃.',
            'Construir círculos de Mohr y la envolvente de falla.',
            'Obtener c y φ según la modalidad del ensayo.'
        ],
        materiales: 'Cámara triaxial, sistema de presión, marco de carga, probetas.',
        proc: 'Preparación, saturación si aplica, confinamiento, trayectoria de carga y registro de esfuerzos y deformaciones.',
        formulas: [
            { eq: 'σ₁ − σ₃ = esfuerzo desviador', desc: 'Diferencia de esfuerzos principales.' },
            { eq: 'τ = c + σ · tan(φ)', desc: 'Envolvente de falla en términos de esfuerzos efectivos o totales según la modalidad.' }
        ],
        analisisGuia: 'Comparar probetas, influencia del confinamiento y forma de falla; interpretar c y φ.',
        conclusionesGuia: 'Reportar σ₁, σ₃, c, φ y el tipo de comportamiento según UU, CU o CD.',
        referencias: ['ASTM D 2850 y variantes', 'NTC 2041'],
        canvasId: 'canvas-triaxial'
    }
};



var ENSAYOS_INFORME = {
    humedad: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE CONTENIDO DE HUMEDAD',
        tituloCorto: 'Contenido de humedad',
        materia: 'Mecánica de Suelos I',
        dataKey: 'h'
    },
    granulometria: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE GRANULOMETRÍA',
        tituloCorto: 'Granulometría',
        materia: 'Mecánica de Suelos I',
        dataKey: 'g'
    },
    limites: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE LÍMITES DE ATTERBERG',
        tituloCorto: 'Límites de Atterberg',
        materia: 'Mecánica de Suelos I',
        dataKey: 'l'
    },
    gravedad: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE GRAVEDAD ESPECÍFICA',
        tituloCorto: 'Gravedad específica',
        materia: 'Mecánica de Suelos I',
        dataKey: 'ge'
    },
    compactacion: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE COMPACTACIÓN PROCTOR',
        tituloCorto: 'Compactación Proctor',
        materia: 'Mecánica de Suelos I',
        dataKey: 'cp'
    },
    densidad: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE DENSIDAD IN SITU',
        tituloCorto: 'Densidad in situ',
        materia: 'Mecánica de Suelos I',
        dataKey: 'd'
    },
    clasificacion: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE CLASIFICACIÓN DE SUELOS',
        tituloCorto: 'Clasificación de suelos',
        materia: 'Mecánica de Suelos I',
        dataKey: 'c'
    },
    permeabilidad: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE PERMEABILIDAD',
        tituloCorto: 'Permeabilidad',
        materia: 'Mecánica de Suelos I',
        dataKey: 'p'
    },
    corte: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE CORTE DIRECTO',
        tituloCorto: 'Corte directo',
        materia: 'Mecánica de Suelos II',
        dataKey: 'corte'
    },
    inconfinada: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE COMPRESIÓN INCONFINADA',
        tituloCorto: 'Compresión inconfinada',
        materia: 'Mecánica de Suelos II',
        dataKey: 'inconfinada'
    },
    consolidacion: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE CONSOLIDACIÓN',
        tituloCorto: 'Consolidación',
        materia: 'Mecánica de Suelos II',
        dataKey: 'consolidacion'
    },
    triaxial: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE TRIAXIAL',
        tituloCorto: 'Triaxial',
        materia: 'Mecánica de Suelos II',
        dataKey: 'triaxial'
    },

    traccion: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE TRACCIÓN',
        tituloCorto: 'Tracción',
        materia: 'Resistencia de Materiales'
    },
    compresion: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE COMPRESIÓN',
        tituloCorto: 'Compresión',
        materia: 'Resistencia de Materiales'
    },
    flexion: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE FLEXIÓN',
        tituloCorto: 'Flexión',
        materia: 'Resistencia de Materiales'
    },
    dureza: {
        titulo: 'INFORME DE LABORATORIO: ENSAYO DE DUREZA',
        tituloCorto: 'Dureza',
        materia: 'Resistencia de Materiales'
    },

};

function resumenDatosEnsayo(tipo) {
    var meta = ENSAYOS_INFORME[tipo];
    if (!meta) return ['No hay datos del ensayo.'];
    var lines = [];
    if (tipo === 'corte') {
        var d = window.__datosEnsayoMS2 && window.__datosEnsayoMS2.corte;
        if (!d) return ['Primero calcula el ensayo de corte directo.'];
        lines.push('Ángulo de fricción φ = ' + Number(d.phi).toFixed(1) + '°');
        lines.push('Cohesión c = ' + Number(d.c).toFixed(2) + ' kPa');
        lines.push('σ₁ medio ≈ ' + Number(d.avgS1).toFixed(2) + ' kPa');
        lines.push('σ₃ medio ≈ ' + Number(d.avgS3).toFixed(2) + ' kPa');
        if (d.pts) {
            d.pts.forEach(function(p, i) {
                lines.push('Punto ' + (i + 1) + ': σn = ' + p.sn.toFixed(2) + ' kPa, τ = ' + p.t.toFixed(2) + ' kPa');
            });
        }
        return lines;
    }
    var bag = window.__datosEnsayo || {};
    var bag2 = window.__datosEnsayoMS2 || {};
    var data = bag[meta.dataKey] || bag[tipo] || bag2[meta.dataKey] || bag2[tipo] || null;
    if (!data) return ['Primero calcula y/o guarda los datos del ensayo.'];
    if (data.texto) lines.push(String(data.texto));
    if (data.w != null) lines.push('Contenido de humedad w = ' + Number(data.w).toFixed(2) + ' %');
    if (data.gs != null) lines.push('Gravedad específica Gs = ' + Number(data.gs).toFixed(3));
    if (data.k != null) lines.push('Coeficiente de permeabilidad k = ' + Number(data.k).toExponential(3) + ' cm/s');
    if (data.simbolo) lines.push('Clasificación: ' + data.simbolo);
    if (data.ll != null) lines.push('LL = ' + data.ll + ', IP = ' + (data.ip != null ? data.ip : '—'));
    if (data.gPct != null) lines.push('Grava ' + data.gPct + ' %, Arena ' + data.aPct + ' %, Finos ' + data.fPct + ' %');
    if (data.gd != null) lines.push('γd = ' + Number(data.gd).toFixed(3) + ' g/cm³, w = ' + Number(data.w).toFixed(2) + ' %');
    if (data.max && data.max.gamma) lines.push('γd máx ≈ ' + Number(data.max.gamma).toFixed(3));
    if (data.cu != null) lines.push('cu = ' + Number(data.cu).toFixed(2) + ' kPa');
    if (data.qu != null) lines.push('qu = ' + Number(data.qu).toFixed(2) + ' kPa');
    if (!lines.length) {
        try { lines.push(JSON.stringify(data).slice(0, 400)); } catch (e) { lines.push('Datos calculados disponibles.'); }
    }
    return lines;
}

function aulaDatosInformeEnsayo(materiaPreferida) {
    var vacio = {
        estudiante: '—',
        codigo: '—',
        docente: '—',
        grupo: '—',
        asignatura: materiaPreferida || 'Mecánica de Suelos II'
    };
    try {
        if (typeof aulaGetSession !== 'function') return vacio;
        var session = aulaGetSession();
        if (!session) return vacio;
        var user = (typeof aulaUsuarioCompleto === 'function') ? aulaUsuarioCompleto(session) : session;
        if (!user) return vacio;

        var asignatura = materiaPreferida || 'Mecánica de Suelos II';
        // Preferir materia del estudiante que coincida con el ensayo
        var mats = (typeof aulaMateriasUsuario === 'function') ? aulaMateriasUsuario(user) : (user.materias || []);
        var match = null;
        for (var i = 0; i < mats.length; i++) {
            var n = String(mats[i].nombre || '').toLowerCase();
            if (n.indexOf('suelos ii') >= 0 || n.indexOf('suelos 2') >= 0 || n === asignatura.toLowerCase()) {
                match = mats[i];
                break;
            }
        }
        if (!match && mats.length) match = mats[0];
        if (match) {
            asignatura = match.nombre || asignatura;
        }
        var grupo = match ? (match.grupo || '') : (user.grupo || '');
        if (typeof aulaGrupoDeMateria === 'function') {
            var g2 = aulaGrupoDeMateria(user, asignatura);
            if (g2) grupo = g2;
        }

        // Código estudiantil del registro
        var codigo = user.codigo || user.codigoEstudiante || '';
        if (!codigo && user.email) {
            var m = String(user.email).split('@')[0].match(/(\d{5,})/);
            if (m) codigo = m[1];
        }

        // Docente del grupo/materia
        var docenteNombre = '—';
        if (user.rol === 'docente') {
            docenteNombre = user.nombre || '—';
        } else {
            var users = (typeof aulaLoad === 'function' && typeof AULA_KEYS !== 'undefined')
                ? aulaLoad(AULA_KEYS.users, [])
                : [];
            var gNorm = String(grupo || '').trim().toUpperCase();
            for (var j = 0; j < users.length; j++) {
                var du = users[j];
                if (!du || du.rol !== 'docente') continue;
                var dMats = du.materias || [];
                for (var k = 0; k < dMats.length; k++) {
                    var dm = dMats[k];
                    if (!dm || dm.nombre !== asignatura) continue;
                    var gruposDoc = (dm.grupos && dm.grupos.length)
                        ? dm.grupos
                        : String(dm.grupo || '').split(/[,;]/).map(function(x) { return x.trim(); }).filter(Boolean);
                    var okG = !gNorm || gruposDoc.some(function(g) {
                        return String(g).trim().toUpperCase() === gNorm;
                    });
                    if (okG) {
                        docenteNombre = du.nombre || du.email || '—';
                        break;
                    }
                }
                if (docenteNombre !== '—') break;
            }
        }

        return {
            estudiante: user.rol === 'docente' ? (user.nombre || '—') : (user.nombre || '—'),
            codigo: codigo || '—',
            docente: docenteNombre,
            grupo: grupo || '—',
            asignatura: asignatura || '—'
        };
    } catch (e) {
        return vacio;
    }
}


/** Datos de entrada / tablas según tipo de ensayo */
function construirDatosYCalculosInforme(tipo, api) {
    var addP = api.addParagraph, addH = api.addHeading, addT = api.addTablaColor;
    if (tipo === 'humedad') {
        var dh = (window.__datosEnsayo && (window.__datosEnsayo.h || window.__datosEnsayo.humedad)) || {};
        addP('Se registran las masas del ensayo de contenido de humedad (unidades: g).');
        var filas = [];
        if (dh.mr != null) filas.push(['Masa del recipiente (Mr)', Number(dh.mr).toFixed(2), 'g']);
        if (dh.mh != null || dh.humedo != null) filas.push(['Masa recipiente + suelo húmedo', Number(dh.mh != null ? dh.mh : dh.humedo).toFixed(2), 'g']);
        if (dh.ms != null || dh.seco != null) filas.push(['Masa recipiente + suelo seco', Number(dh.ms != null ? dh.ms : dh.seco).toFixed(2), 'g']);
        if (dh.agua != null) filas.push(['Masa de agua (Mw)', Number(dh.agua).toFixed(2), 'g']);
        if (dh.suelo != null) filas.push(['Masa de sólidos (Ms)', Number(dh.suelo).toFixed(2), 'g']);
        if (filas.length) addT(['Magnitud', 'Valor', 'Unidad'], filas);
        else if (api.resumen && api.resumen.length) api.resumen.forEach(function(ln) { addP('• ' + ln); });
        else addP('Complete el ensayo de humedad en GeoMetrics para poblar esta tabla.');
        return filas.length > 0;
    }
    if (tipo === 'corte') {
        var d0 = window.__datosEnsayoMS2 && window.__datosEnsayoMS2.corte;
        if (d0 && d0.pts && d0.pts.length) {
            addP('Datos de falla por ensayo (esfuerzos en kPa).');
            addT(
                ['Ensayo', 'σn (kPa)', 'τ (kPa)', 'σ₁ (kPa)', 'σ₃ (kPa)'],
                d0.pts.map(function(p, i) {
                    return ['E' + (i + 1), Number(p.sn).toFixed(2), Number(p.t).toFixed(2), Number(p.s1).toFixed(2), Number(p.s3).toFixed(2)];
                })
            );
            return true;
        }
        addP('No hay puntos de corte registrados en esta sesión.');
        return false;
    }
    if (tipo === 'inconfinada') {
        var di = window.__datosEnsayoMS2 && window.__datosEnsayoMS2.inconfinada;
        if (di && di.pts) {
            addT(['ε (%)', 'σ (kPa)', 'P (N)', 'ΔL'], di.pts.map(function(p) {
                return [Number(p.eps).toFixed(2), Number(p.sig).toFixed(2), Number(p.P).toFixed(1), Number(p.dl).toFixed(2)];
            }));
            return true;
        }
    }
    // genérico
    if (api.resumen && api.resumen.length) {
        api.resumen.forEach(function(ln) { addP('• ' + ln); });
        return true;
    }
    addP('Registre los datos del ensayo en GeoMetrics y vuelva a generar el informe.');
    return false;
}

function construirCalculosNumericosInforme(tipo, api) {
    var addP = api.addParagraph;
    if (tipo === 'humedad') {
        var dh = (window.__datosEnsayo && (window.__datosEnsayo.h || window.__datosEnsayo.humedad)) || {};
        if (dh.agua != null && dh.suelo != null) {
            addP('Mw = ' + Number(dh.agua).toFixed(2) + ' g');
            addP('Ms = ' + Number(dh.suelo).toFixed(2) + ' g');
            if (dh.w != null) addP('w = (Mw/Ms)×100 = ' + Number(dh.w).toFixed(2) + ' %');
        } else if (dh.w != null) {
            addP('w = ' + Number(dh.w).toFixed(2) + ' %');
        } else {
            addP('Aplique w = (Mw/Ms)×100 con las masas registradas.');
        }
        return;
    }
    if (tipo === 'corte') {
        var d0 = window.__datosEnsayoMS2 && window.__datosEnsayoMS2.corte;
        if (d0) {
            addP('De la regresión τ = c + σn·tan(φ):');
            addP('φ = ' + Number(d0.phi).toFixed(1) + '°');
            addP('c = ' + Number(d0.c).toFixed(2) + ' kPa');
            if (d0.pts) {
                d0.pts.forEach(function(p, i) {
                    var R = (typeof p.radio === 'number') ? p.radio : (Number(p.s1) - Number(p.s3)) / 2;
                    var C = (typeof p.centro === 'number') ? p.centro : (Number(p.s1) + Number(p.s3)) / 2;
                    addP('E' + (i + 1) + ': R = (σ₁−σ₃)/2 = ' + Number(R).toFixed(2) + ' kPa; Centro = (σ₁+σ₃)/2 = ' + Number(C).toFixed(2) + ' kPa');
                });
            }
        }
        return;
    }
    if (tipo === 'inconfinada') {
        var di = window.__datosEnsayoMS2 && window.__datosEnsayoMS2.inconfinada;
        if (di) {
            addP('qu = ' + Number(di.qu).toFixed(2) + ' kPa');
            addP('cu = qu/2 = ' + Number(di.cu).toFixed(2) + ' kPa');
        }
        return;
    }
    addP('Los cálculos numéricos se detallan a partir de los datos de la sección anterior.');
}

function construirResultadosInforme(tipo, api) {
    var addP = api.addParagraph, addT = api.addTablaColor;
    if (tipo === 'humedad') {
        var dh = (window.__datosEnsayo && (window.__datosEnsayo.h || window.__datosEnsayo.humedad)) || {};
        addP('Resultado principal del ensayo de contenido de humedad:');
        if (dh.w != null) {
            addT(['Parámetro', 'Valor', 'Unidad'], [['Contenido de humedad w', Number(dh.w).toFixed(2), '%']]);
        } else {
            addP('No se obtuvo w en esta sesión.');
        }
        return;
    }
    if (tipo === 'corte') {
        var d0 = window.__datosEnsayoMS2 && window.__datosEnsayoMS2.corte;
        if (d0) {
            addT(['Parámetro', 'Valor', 'Unidad'], [
                ['Ángulo de fricción φ', Number(d0.phi).toFixed(1), '°'],
                ['Cohesión c', Number(d0.c).toFixed(2), 'kPa'],
                ['σ₁ medio', Number(d0.avgS1).toFixed(2), 'kPa'],
                ['σ₃ medio', Number(d0.avgS3).toFixed(2), 'kPa']
            ]);
            if (d0.pts && d0.pts.length) {
                addP('Tabla de Mohr (R y centro en kPa):');
                addT(
                    ['Ensayo', 'σ₁', 'σ₃', 'R', 'Centro'],
                    d0.pts.map(function(p, i) {
                        var s1 = Number(p.s1), s3 = Number(p.s3);
                        var R = (typeof p.radio === 'number') ? p.radio : (s1 - s3) / 2;
                        var C = (typeof p.centro === 'number') ? p.centro : (s1 + s3) / 2;
                        return ['E' + (i + 1), s1.toFixed(2), s3.toFixed(2), Number(R).toFixed(2), Number(C).toFixed(2)];
                    })
                );
            }
        } else addP('Sin resultados de corte en esta sesión.');
        return;
    }
    if (tipo === 'inconfinada') {
        var di = window.__datosEnsayoMS2 && window.__datosEnsayoMS2.inconfinada;
        if (di) {
            addT(['Parámetro', 'Valor', 'Unidad'], [
                ['qu', Number(di.qu).toFixed(2), 'kPa'],
                ['cu', Number(di.cu).toFixed(2), 'kPa'],
                ['ε en falla', di.peak ? Number(di.peak.eps).toFixed(2) : '—', '%']
            ]);
        }
        return;
    }
    if (api.resumen && api.resumen.length) {
        addP('Valores obtenidos en GeoMetrics:');
        api.resumen.forEach(function(ln) { addP('• ' + ln); });
    } else {
        addP('Complete el ensayo para listar resultados numéricos.');
    }
}

function construirAnalisisEspecifico(tipo, api) {
    var addP = api.addParagraph;
    if (tipo === 'humedad') {
        var dh = (window.__datosEnsayo && (window.__datosEnsayo.h || window.__datosEnsayo.humedad)) || {};
        if (dh.w != null) {
            var w = Number(dh.w);
            var nivel = w < 10 ? 'bajo' : (w < 25 ? 'medio' : 'alto');
            addP('Para w = ' + w.toFixed(2) + ' %, el contenido de agua se interpreta como ' + nivel + ' en un sentido orientativo (depende del tipo de suelo y del contexto de muestreo).');
        }
        addP('Este ensayo no clasifica el suelo por sí solo; complementa granulometría, límites y densidades.');
        return;
    }
    if (tipo === 'corte') {
        var d0 = window.__datosEnsayoMS2 && window.__datosEnsayoMS2.corte;
        if (d0 && typeof clasificarSueloCorte === 'function') {
            var cl = clasificarSueloCorte(d0.c, d0.phi);
            if (cl && cl.tipo) addP('Clasificación orientativa a partir de c y φ: ' + cl.tipo + (cl.detalle ? ('. ' + cl.detalle) : ''));
        }
        addP('La envolvente debe ser coherente con los puntos de falla; se recomienda contrastar con FLA-23 y el criterio del docente.');
        return;
    }
    if (tipo === 'inconfinada') {
        addP('El valor de qu refleja la resistencia del suelo cohesivo sin confinamiento; cu = qu/2 aplica bajo el supuesto φ ≈ 0 (no drenado).');
        return;
    }
    addP('Los resultados deben interpretarse según la norma del ensayo y las condiciones de la muestra.');
}

function construirConclusionesEspecificas(tipo, api) {
    var addP = api.addParagraph;
    if (tipo === 'humedad') {
        var dh = (window.__datosEnsayo && (window.__datosEnsayo.h || window.__datosEnsayo.humedad)) || {};
        if (dh.w != null) addP('Se obtuvo un contenido de humedad w = ' + Number(dh.w).toFixed(2) + ' %.');
        addP('El contenido de humedad es una propiedad índice esencial para el análisis de fases y el control de calidad de suelos.');
        return;
    }
    if (tipo === 'corte') {
        var d0 = window.__datosEnsayoMS2 && window.__datosEnsayoMS2.corte;
        if (d0) {
            addP('Se obtuvieron φ = ' + Number(d0.phi).toFixed(1) + '° y c = ' + Number(d0.c).toFixed(2) + ' kPa.');
        }
        addP('Los parámetros de resistencia al corte son insumos para el análisis de estabilidad y capacidad portante, sujetos a revisión docente.');
        return;
    }
    if (tipo === 'inconfinada') {
        var di = window.__datosEnsayoMS2 && window.__datosEnsayoMS2.inconfinada;
        if (di) addP('Se obtuvieron qu = ' + Number(di.qu).toFixed(2) + ' kPa y cu = ' + Number(di.cu).toFixed(2) + ' kPa.');
        return;
    }
    addP('Se completó el ensayo «' + tipo + '» conforme a los objetivos de la práctica.');
    addP('Se recomienda archivar la gráfica generada y contrastar los resultados con la guía FLA-23 y el docente.');
}

function generarInformeCorteDirectoPDF() {
    generarInformeEnsayoPDF('corte');
}

function generarInformeEnsayoPDF(tipoEnsayo) {
    tipoEnsayo = tipoEnsayo || 'corte';
    var metaInf = (typeof ENSAYOS_INFORME !== 'undefined' && ENSAYOS_INFORME[tipoEnsayo])
        ? ENSAYOS_INFORME[tipoEnsayo]
        : { titulo: 'INFORME DE LABORATORIO: ENSAYO DE LABORATORIO', tituloCorto: 'Ensayo', materia: 'Mecánica de Suelos I' };

    var resumen = (typeof resumenDatosEnsayo === 'function') ? resumenDatosEnsayo(tipoEnsayo) : [];
    if (resumen.length === 1 && (resumen[0].indexOf('Primero') === 0 || resumen[0].indexOf('No hay') === 0)) {
        alert(resumen[0]);
        return;
    }

    var btn = document.getElementById('btnInformeCorte') || document.getElementById('btnInforme-' + tipoEnsayo);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Generando…';
    }
    function fin() {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Descargar informe';
        }
    }

    function loadImageDataURL(src) {
        return new Promise(function(resolve) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                try {
                    var c = document.createElement('canvas');
                    var max = 500;
                    var w = img.width, h = img.height;
                    if (w > max || h > max) {
                        var r = Math.min(max / w, max / h);
                        w = Math.round(w * r);
                        h = Math.round(h * r);
                    }
                    c.width = w;
                    c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(c.toDataURL('image/png'));
                } catch (e) { resolve(null); }
            };
            img.onerror = function() { resolve(null); };
            img.src = src;
        });
    }
    function loadFontBase64(url) {
        return fetch(url).then(function(r) {
            if (!r.ok) throw new Error('Fuente no disponible');
            return r.arrayBuffer();
        }).then(function(buf) {
            var bytes = new Uint8Array(buf);
            var chunk = 0x8000, binary = '';
            for (var i = 0; i < bytes.length; i += chunk) {
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
            }
            return btoa(binary);
        });
    }

    Promise.all([
        civixLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
        loadImageDataURL('docs/logo_unipamplona.png'),
        loadImageDataURL('docs/logo_ingenieria_civil.png'),
        loadImageDataURL('docs/GeoMetrics.png'),
        loadFontBase64('https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf').catch(function() { return null; }),
        loadFontBase64('https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf').catch(function() { return null; })
    ]).then(function(results) {
        var JsPDF = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
        if (!JsPDF) throw new Error('jsPDF no disponible');

        var logoUni = results[1], logoCiv = results[2], logoGeo = results[3];
        var fontReg = results[4], fontBold = results[5];

        var doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        var marginL = 20, marginR = 18, marginT = 18, marginB = 20;
        var pageW = doc.internal.pageSize.getWidth();
        var pageH = doc.internal.pageSize.getHeight();
        var y = marginT;
        var maxW = pageW - marginL - marginR;
        var lineH = 6.8;
        var hasUnicodeFont = false;

        if (fontReg) {
            doc.addFileToVFS('DejaVuSans.ttf', fontReg);
            doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
            hasUnicodeFont = true;
        }
        if (fontBold) {
            doc.addFileToVFS('DejaVuSans-Bold.ttf', fontBold);
            doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold');
        }

        function setF(bold, size) {
            if (hasUnicodeFont) doc.setFont('DejaVu', bold ? 'bold' : 'normal');
            else doc.setFont('times', bold ? 'bold' : 'normal');
            doc.setFontSize(size || 12);
            doc.setTextColor(0, 0, 0);
        }
        function sym(s) {
            if (hasUnicodeFont) return s;
            return String(s)
                .replace(/σ₁/g, 'sigma_1').replace(/σ₃/g, 'sigma_3').replace(/σn/g, 'sigma_n')
                .replace(/σ/g, 'sigma').replace(/τ/g, 'tau').replace(/φ/g, 'phi')
                .replace(/≥/g, '>=').replace(/≈/g, 'aprox.').replace(/²/g, '2');
        }
        function dibujarMarcaAgua() {
            if (!logoGeo) return;
            try {
                var gW = 95, gH = 95;
                var gx = (pageW - gW) / 2;
                var gy = (pageH - gH) / 2;
                if (doc.setGState) {
                    doc.setGState(new doc.GState({ opacity: 0.08 }));
                }
                doc.addImage(logoGeo, 'PNG', gx, gy, gW, gH);
                if (doc.setGState) {
                    doc.setGState(new doc.GState({ opacity: 1 }));
                }
                setF(true, 14);
                doc.setTextColor(180, 180, 180);
                var marca = 'GeoMetrics';
                doc.text(marca, (pageW - doc.getTextWidth(marca)) / 2, gy + gH + 8);
                doc.setTextColor(0, 0, 0);
                setF(false, 11);
            } catch (e) {}
        }
        function dibujarMarcoPagina() {
            doc.setDrawColor(40, 70, 140);
            doc.setLineWidth(0.6);
            doc.rect(8, 8, pageW - 16, pageH - 16);
            dibujarMarcaAgua();
        }
        function ensureSpace(h) {
            if (y + h > pageH - marginB) {
                doc.addPage();
                dibujarMarcoPagina();
                y = marginT + 8;
                setF(false, 11);
            }
        }
        function colorAleatorioTabla() {
            var paletas = [
                { h: [40, 70, 140], b: [230, 238, 250] },   // azul
                { h: [34, 110, 70], b: [230, 245, 235] },    // verde
                { h: [160, 110, 30], b: [255, 246, 220] },   // dorado
                { h: [120, 50, 120], b: [245, 232, 250] },   // morado
                { h: [160, 55, 55], b: [255, 235, 235] },    // rojo
                { h: [20, 110, 130], b: [225, 245, 250] },   // cian
                { h: [90, 90, 40], b: [245, 245, 220] },     // oliva
                { h: [50, 70, 100], b: [235, 240, 248] },    // slate
                { h: [140, 70, 40], b: [255, 240, 230] },    // terracota
                { h: [30, 90, 90], b: [230, 248, 248] }      // teal
            ];
            return paletas[Math.floor(Math.random() * paletas.length)];
        }
        function addTablaColor(headers, rows, headerRGB, bodyRGB) {
            if (!headerRGB || !bodyRGB) {
                var pal = colorAleatorioTabla();
                headerRGB = headerRGB || pal.h;
                bodyRGB = bodyRGB || pal.b;
            }
            var cols = headers.length;
            var colW = maxW / cols;
            var fontSize = cols >= 6 ? 7.5 : (cols >= 5 ? 8 : 9);
            var padX = 1.2;

            function fitCell(txt, width) {
                txt = sym(String(txt == null ? '' : txt));
                setF(false, fontSize);
                var maxWCell = width - padX * 2;
                if (doc.getTextWidth(txt) <= maxWCell) return txt;
                // truncar con …
                var t = txt;
                while (t.length > 1 && doc.getTextWidth(t + '…') > maxWCell) {
                    t = t.slice(0, -1);
                }
                return t + '…';
            }

            // Altura de fila fija (una sola línea por celda para evitar solapes)
            var rowH = fontSize * 0.45 + 5.2;
            ensureSpace(rowH * (rows.length + 1) + 8);

            // Header
            doc.setFillColor(headerRGB[0], headerRGB[1], headerRGB[2]);
            doc.rect(marginL, y - 4.2, maxW, rowH, 'F');
            setF(true, fontSize);
            doc.setTextColor(255, 255, 255);
            headers.forEach(function(h, i) {
                var cell = fitCell(h, colW);
                setF(true, fontSize);
                doc.setTextColor(255, 255, 255);
                doc.text(cell, marginL + i * colW + padX, y);
            });
            y += rowH;

            rows.forEach(function(row, ri) {
                ensureSpace(rowH + 2);
                if (ri % 2 === 0) {
                    doc.setFillColor(bodyRGB[0], bodyRGB[1], bodyRGB[2]);
                } else {
                    doc.setFillColor(255, 255, 255);
                }
                doc.rect(marginL, y - 4.2, maxW, rowH, 'F');
                doc.setDrawColor(190, 190, 190);
                doc.setLineWidth(0.12);
                doc.rect(marginL, y - 4.2, maxW, rowH);
                // líneas verticales de columna
                for (var c = 1; c < cols; c++) {
                    var xL = marginL + c * colW;
                    doc.line(xL, y - 4.2, xL, y - 4.2 + rowH);
                }
                setF(false, fontSize);
                doc.setTextColor(25, 35, 50);
                for (var ci = 0; ci < cols; ci++) {
                    var val = row[ci] != null ? row[ci] : '';
                    var cell = fitCell(val, colW);
                    setF(false, fontSize);
                    doc.setTextColor(25, 35, 50);
                    doc.text(cell, marginL + ci * colW + padX, y);
                }
                y += rowH;
            });
            y += 5;
            doc.setTextColor(0, 0, 0);
            setF(false, 11);
        }

        function wrapText(text, width, fontSize) {
            text = sym(String(text || ''));
            setF(false, fontSize || 11);
            var lines = doc.splitTextToSize(text, width);
            return (lines && lines.length) ? lines : [''];
        }
        function addParagraph(text) {
            var lines = wrapText(text, maxW, 11);
            lines.forEach(function(ln) {
                ensureSpace(lineH + 1);
                setF(false, 11);
                doc.text(ln, marginL, y);
                y += lineH;
            });
            y += 3.5;
        }
        function addHeading(text) {
            var lines = wrapText(text, maxW, 13);
            ensureSpace(lines.length * lineH + 10);
            y += 5;
            lines.forEach(function(ln) {
                ensureSpace(lineH + 1);
                setF(true, 13);
                doc.setTextColor(30, 55, 110);
                doc.text(ln, marginL, y);
                y += lineH;
            });
            // línea decorativa bajo el título
            doc.setDrawColor(40, 70, 140);
            doc.setLineWidth(0.35);
            doc.line(marginL, y - 1, marginL + 40, y - 1);
            y += 3;
            doc.setTextColor(0, 0, 0);
            setF(false, 11);
        }
        function addEq(num, formula, meaning) {
            ensureSpace(lineH * 3 + 4);
            setF(true, 11);
            doc.setTextColor(20, 50, 100);
            doc.text(sym('(' + num + ')  ' + formula), marginL + 4, y);
            y += lineH;
            setF(false, 10);
            doc.setTextColor(60, 60, 60);
            var ml = wrapText(meaning, maxW - 8, 10);
            ml.forEach(function(ln) {
                ensureSpace(lineH);
                doc.text(ln, marginL + 6, y);
                y += lineH * 0.95;
            });
            y += 3;
            doc.setTextColor(0, 0, 0);
            setF(false, 11);
        }

        var fechaStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        var datosInf = aulaDatosInformeEnsayo(metaInf.materia);

        // ===== PORTADA (plantilla) =====
        doc.setDrawColor(40, 70, 140);
        doc.setLineWidth(1.2);
        doc.rect(8, 8, pageW - 16, pageH - 16);
        doc.setLineWidth(0.4);
        doc.rect(10, 10, pageW - 20, pageH - 20);

        var logoHUni = 28;
        var logoHCiv = 34; // Ingeniería Civil un poco más grande
        if (logoUni) { try { doc.addImage(logoUni, 'PNG', 16, 14, logoHUni, logoHUni); } catch (e) {} }
        if (logoCiv) { try { doc.addImage(logoCiv, 'PNG', pageW - 16 - logoHCiv, 12, logoHCiv, logoHCiv); } catch (e) {} }
        if (logoGeo) {
            try {
                doc.setGState && doc.setGState(new doc.GState({ opacity: 0.1 }));
                doc.addImage(logoGeo, 'PNG', (pageW - 120) / 2, 70, 120, 120);
                doc.setGState && doc.setGState(new doc.GState({ opacity: 1 }));
            } catch (e) {}
        }

        y = 50;
        setF(true, 14);
        var tituloFull = String(metaInf.titulo || '');
        if (tituloFull.indexOf('INFORME DE LABORATORIO') !== 0) {
            tituloFull = 'INFORME DE LABORATORIO: ENSAYO DE ' + (metaInf.tituloCorto || 'LABORATORIO').toUpperCase();
        }
        var titLines = doc.splitTextToSize(tituloFull, maxW - 8);
        titLines.forEach(function(ln) {
            doc.text(ln, (pageW - doc.getTextWidth(ln)) / 2, y);
            y += 7.5;
        });

        y = 100;
        setF(false, 12);
        function lineaDato(et, val) {
            var txt = et + '  ' + (val || '—');
            doc.text(txt, (pageW - doc.getTextWidth(txt)) / 2, y);
            y += 9;
        }
        lineaDato('ESTUDIANTE:', datosInf.estudiante);
        lineaDato('CÓDIGO:', datosInf.codigo);
        lineaDato('DOCENTE:', datosInf.docente);
        lineaDato('GRUPO:', datosInf.grupo);
        lineaDato('ASIGNATURA:', datosInf.asignatura);

        y = pageH - 48;
        setF(false, 11);
        ['UNIVERSIDAD DE PAMPLONA', 'FACULTAD DE INGENIERÍAS Y ARQUITECTURA', 'PROGRAMA DE INGENIERÍA CIVIL'].forEach(function(ln) {
            doc.text(ln, (pageW - doc.getTextWidth(ln)) / 2, y);
            y += 6;
        });
        setF(false, 9);
        doc.setTextColor(90, 90, 90);
        var gen = 'Generado con la plataforma GeoMetrics  ' + fechaStr;
        doc.text(gen, (pageW - doc.getTextWidth(gen)) / 2, y + 2);
        doc.setTextColor(0, 0, 0);

        // ===== CUERPO =====
        doc.addPage();
        dibujarMarcoPagina();
        y = marginT + 6;

        // Esquema académico completo del informe
        var asig = datosInf.asignatura || metaInf.materia || '';
        var esRM = /resistencia/i.test(String(metaInf.materia || '') + asig);
        var fuenteMarco = esRM
            ? 'Beer, Johnston, DeWolf y Mazurek — Mecánica de materiales; Hibbeler — Mecánica de materiales / Estática.'
            : 'Guías unificadas de laboratorio FLA-23 (Universidad de Pamplona) y Das — Principles of Geotechnical Engineering, según el ensayo.';


        var txtE = (typeof TEXTO_INFORME_ENSAYO !== 'undefined' && TEXTO_INFORME_ENSAYO[tipoEnsayo])
            ? TEXTO_INFORME_ENSAYO[tipoEnsayo] : null;

        // ========== 2. INTRODUCCIÓN ==========
        addHeading('1. Introducción');
        if (txtE && txtE.intro) {
            addParagraph(txtE.intro);
        } else {
            addParagraph(
                'Este informe presenta los resultados del ensayo de laboratorio «' + metaInf.tituloCorto +
                '», realizado en la asignatura ' + asig + ' con la plataforma GeoMetrics (Universidad de Pamplona).'
            );
        }
        addParagraph(
            'La base teórica se limita a lo necesario para entender el ensayo, justificar los cálculos y interpretar los resultados. ' +
            'No se desarrolla un tratado general de mecánica de suelos ajeno a esta práctica.'
        );

        // ========== 3. OBJETIVOS ==========
        addHeading('2. Objetivos');
        addHeading('2.1. Objetivo general');
        addParagraph((txtE && txtE.objetivoGeneral)
            ? txtE.objetivoGeneral
            : ('Aplicar el procedimiento del ensayo «' + metaInf.tituloCorto + '» y analizar los resultados obtenidos.'));
        addHeading('2.2. Objetivos específicos');
        var objs = (txtE && txtE.objetivosEspecificos) ? txtE.objetivosEspecificos : [
            'Registrar los datos de laboratorio con unidades coherentes.',
            'Aplicar las ecuaciones propias del ensayo.',
            'Presentar resultados en tablas y figuras.',
            'Interpretar los valores y formular conclusiones.'
        ];
        objs.forEach(function(o) { addParagraph('• ' + o); });

        // ========== 4. MATERIALES ==========
        addHeading('3. Materiales y equipos');
        addParagraph((txtE && txtE.materiales)
            ? txtE.materiales
            : ('Equipos del ensayo «' + metaInf.tituloCorto + '» conforme a la guía FLA-23 y al protocolo del curso.'));
        addParagraph('El registro de datos y los cálculos se realizaron en GeoMetrics.');

        // ========== 5. PROCEDIMIENTO ==========
        addHeading('4. Procedimiento');
        if (txtE && txtE.proc) addParagraph(txtE.proc);
        else addParagraph('Se siguió el procedimiento de la guía de laboratorio correspondiente al ensayo.');
        addParagraph('Las lecturas y resultados quedaron registrados en la sesión de GeoMetrics del estudiante.');

        // ========== 5. DATOS / 6. CÁLCULOS / 7. RESULTADOS (técnicos por ensayo) ==========
        addHeading('5. Datos obtenidos');
        var datosOk = construirDatosYCalculosInforme(tipoEnsayo, {
            addParagraph: addParagraph,
            addHeading: addHeading,
            addTablaColor: addTablaColor,
            addEq: addEq,
            ensureSpace: ensureSpace,
            doc: doc,
            pageW: pageW,
            marginL: marginL,
            marginR: marginR,
            getY: function() { return y; },
            setY: function(v) { y = v; },
            resumen: resumen,
            metaInf: metaInf,
            txtE: txtE
        });

        addHeading('6. Cálculos');
        if (txtE && txtE.formulas && txtE.formulas.length) {
            txtE.formulas.forEach(function(f, idx) {
                addEq(String(idx + 1), f.eq, f.desc);
            });
        } else {
            addParagraph('Las expresiones de cálculo se aplicaron según la norma del ensayo.');
        }
        // cálculos numéricos específicos
        construirCalculosNumericosInforme(tipoEnsayo, {
            addParagraph: addParagraph,
            addHeading: addHeading,
            addTablaColor: addTablaColor,
            addEq: addEq
        });

        addHeading('7. Resultados');
        construirResultadosInforme(tipoEnsayo, {
            addParagraph: addParagraph,
            addHeading: addHeading,
            addTablaColor: addTablaColor,
            ensureSpace: ensureSpace,
            doc: doc,
            pageW: pageW,
            marginL: marginL,
            getY: function() { return y; },
            setY: function(v) { y = v; },
            resumen: resumen,
            metaInf: metaInf,
            txtE: txtE
        });

        // Figura si hay canvas
        var canvasIdFig = (txtE && txtE.canvasId) ? txtE.canvasId : null;
        if (tipoEnsayo === 'corte') canvasIdFig = 'canvas-corte';
        if (canvasIdFig) {
            var canvasEl = document.getElementById(canvasIdFig);
            if (canvasEl && canvasEl.width) {
                try {
                    ensureSpace(90);
                    addHeading('7.1. Figura del ensayo');
                    var imgData = canvasEl.toDataURL('image/png');
                    var figW = Math.min(pageW - marginL - marginR, 160);
                    var figH = figW * (canvasEl.height / canvasEl.width);
                    if (figH > 100) { figH = 100; figW = figH * (canvasEl.width / canvasEl.height); }
                    doc.addImage(imgData, 'PNG', marginL, y, figW, figH);
                    y += figH + 6;
                    addParagraph('Figura. ' + ((txtE && txtE.grafica) ? txtE.grafica : ('Gráfica del ensayo «' + metaInf.tituloCorto + '» generada en GeoMetrics.')));
                } catch (eFig) {
                    addParagraph('Nota: genere la gráfica en pantalla (GENERAR GRÁFICA) antes de descargar el informe para incluir la figura.');
                }
            } else {
                addParagraph('Nota: para incluir la figura, genere la gráfica en pantalla antes de descargar el informe.');
            }
        }

        // ========== 8. ANÁLISIS ==========
        addHeading('8. Análisis de resultados');
        if (txtE && txtE.analisisGuia) addParagraph(txtE.analisisGuia);
        construirAnalisisEspecifico(tipoEnsayo, { addParagraph: addParagraph, addTablaColor: addTablaColor });

        // ========== 9. CONCLUSIONES ==========
        addHeading('9. Conclusiones');
        if (txtE && txtE.conclusionesGuia) addParagraph(txtE.conclusionesGuia);
        construirConclusionesEspecificas(tipoEnsayo, { addParagraph: addParagraph, resumen: resumen });

        // ========== 10. REFERENCIAS ==========
        addHeading('10. Referencias');
        var refs = (txtE && txtE.referencias) ? txtE.referencias : [
            'Guía Unificada de Laboratorios FLA-23 — Mecánica de Suelos (Universidad de Pamplona).',
            'Normas ASTM / NTC / INVIAS aplicables al ensayo.'
        ];
        refs.forEach(function(r, i) { addParagraph('[' + (i + 1) + '] ' + r); });

        // ========== 11. ANEXOS ==========
        addHeading('11. Anexos');
        addParagraph('Anexo A. Datos brutos registrados en GeoMetrics.');
        addParagraph('Anexo B. Gráficas del ensayo (cuando se generen en pantalla).');
        addParagraph('Anexo C. Memoria de cálculo auxiliar, si el docente la solicita.');

        var safeName = String(metaInf.tituloCorto || 'ensayo').replace(/\s+/g, '_');
        doc.save('Informe_' + safeName + '_GeoMetrics.pdf');
        fin();
    }).catch(function(err) {
        alert('No se pudo generar el PDF: ' + (err.message || err));
        fin();
    });
}

function crearFormularioInconfinada() {
    return `
    <h3>Ensayo de Compresión Inconfinada</h3>
    <p class="login-hint">Guía FLA-23 · cu = qu / 2 · φ ≈ 0 (no drenado)</p>
    <div class="laboratorio-panel">
      <div class="datos-panel">
        <h4>Geometría de la muestra</h4>
        <label>Diámetro (mm)</label>
        <input type="number" id="uc-d" placeholder="Ej. 38" step="0.1">
        <label>Altura L0 (mm)</label>
        <input type="number" id="uc-l0" placeholder="Ej. 76" step="0.1">
        <h4>Lecturas (deformación y carga)</h4>
        <p class="login-hint">Ingresa pares ΔL (mm) y carga P (N). Usa al menos 4 puntos hasta falla.</p>
        <label>ΔL1, P1</label>
        <div style="display:flex;gap:8px"><input type="number" id="uc-dl1" placeholder="ΔL mm" step="0.01"><input type="number" id="uc-p1" placeholder="P N" step="0.1"></div>
        <label>ΔL2, P2</label>
        <div style="display:flex;gap:8px"><input type="number" id="uc-dl2" placeholder="ΔL mm" step="0.01"><input type="number" id="uc-p2" placeholder="P N" step="0.1"></div>
        <label>ΔL3, P3</label>
        <div style="display:flex;gap:8px"><input type="number" id="uc-dl3" placeholder="ΔL mm" step="0.01"><input type="number" id="uc-p3" placeholder="P N" step="0.1"></div>
        <label>ΔL4, P4</label>
        <div style="display:flex;gap:8px"><input type="number" id="uc-dl4" placeholder="ΔL mm" step="0.01"><input type="number" id="uc-p4" placeholder="P N" step="0.1"></div>
        <label>ΔL5, P5 (opcional)</label>
        <div style="display:flex;gap:8px"><input type="number" id="uc-dl5" placeholder="ΔL mm" step="0.01"><input type="number" id="uc-p5" placeholder="P N" step="0.1"></div>
        <label>ΔL6, P6 (opcional)</label>
        <div style="display:flex;gap:8px"><input type="number" id="uc-dl6" placeholder="ΔL mm" step="0.01"><input type="number" id="uc-p6" placeholder="P N" step="0.1"></div>
        <div class="botones-calculo">
          <button class="btn-calcular" onclick="calcularInconfinada()">CALCULAR</button>
          <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayoMS2('inconfinada')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-inconfinada" onclick="generarInformeEnsayoPDF('inconfinada')">Descargar informe</button>
        </div>
        </div>
        <div class="mensaje-error" id="uc-error"></div>
      </div>
      <div class="resultado-panel">
        <h4>Resultados</h4>
        <div class="resultado-principal"><span>qu</span><strong id="uc-qu">—</strong></div>
        <div class="resultados-secundarios">
          <div><span>cu = qu/2</span><strong id="uc-cu">—</strong><small>kPa</small></div>
          <div><span>ε en falla</span><strong id="uc-ef">—</strong><small>%</small></div>
        </div>
        <div class="interpretacion">
          <span>INTERPRETACIÓN</span>
          <p id="uc-interp">Ingresa geometría y lecturas.</p>
        </div>
      </div>
    </div>
    <div class="grafica-panel">
      <div class="grafica-header">
        <h4>Curva esfuerzo–deformación</h4>
        <button type="button" class="btn-grafica" onclick="graficaInconfinada()">GENERAR GRÁFICA</button>
      </div>
      <canvas id="canvas-inconf" width="640" height="360"></canvas>
      <p class="grafica-hint" id="hint-inconf">Calcula primero y luego genera la gráfica.</p>
    </div>`;
}

function calcularInconfinada() {
    setError('uc-error', '');
    var d = parse('uc-d'), L0 = parse('uc-l0');
    if (!d || !L0 || d <= 0 || L0 <= 0) { setError('uc-error', 'Diámetro y altura inválidos'); return; }
    var A0 = Math.PI * Math.pow(d / 20, 2); // mm -> cm diameter/2, area cm²
    // better: d in mm, A0 in mm² then convert to m² for kPa: P(N)/A(m²)=Pa
    var A0_m2 = Math.PI * Math.pow((d / 1000) / 2, 2);
    var pts = [];
    for (var i = 1; i <= 6; i++) {
        var dl = parse('uc-dl' + i), P = parse('uc-p' + i);
        if (dl != null && P != null && dl >= 0 && P >= 0) {
            var eps = dl / L0; // unit strain
            var Ac = A0_m2 / (1 - eps); // corrected area
            var sig = P / Ac / 1000; // kPa
            pts.push({ eps: eps * 100, sig: sig, P: P, dl: dl });
        }
    }
    if (pts.length < 3) { setError('uc-error', 'Ingresa al menos 3 pares ΔL–P'); return; }
    var peak = pts.reduce(function(best, p) { return p.sig > best.sig ? p : best; }, pts[0]);
    var qu = peak.sig;
    var cu = qu / 2;
    document.getElementById('uc-qu').textContent = qu.toFixed(1) + ' kPa';
    document.getElementById('uc-cu').textContent = cu.toFixed(1);
    document.getElementById('uc-ef').textContent = peak.eps.toFixed(1);
    document.getElementById('uc-interp').textContent = 'Resistencia a la compresión inconfinada qu = ' + qu.toFixed(1) + ' kPa. Cohesión no drenada cu = ' + cu.toFixed(1) + ' kPa (φ ≈ 0).';
    window.__datosEnsayoMS2.inconfinada = { pts: pts, qu: qu, cu: cu, peak: peak, d: d, L0: L0 };
}

function graficaInconfinada() {
    var d = window.__datosEnsayoMS2.inconfinada;
    var canvas = document.getElementById('canvas-inconf');
    var hint = document.getElementById('hint-inconf');
    if (!d || !canvas) { if (hint) hint.textContent = 'Primero pulsa CALCULAR.'; return; }
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1c1410'; ctx.fillRect(0, 0, w, h);
    var maxE = Math.max.apply(null, d.pts.map(function(p) { return p.eps; })) * 1.15;
    var maxS = Math.max(d.qu * 1.2, 1);
    var ox = 55, oy = h - 40, gx = w - 30, gy = 25;
    function sx(x) { return ox + (x / maxE) * (gx - ox); }
    function sy(y) { return oy - (y / maxS) * (oy - gy); }
    ctx.strokeStyle = '#666'; ctx.beginPath(); ctx.moveTo(ox, gy); ctx.lineTo(ox, oy); ctx.lineTo(gx, oy); ctx.stroke();
    ctx.strokeStyle = '#e8b84a'; ctx.lineWidth = 2; ctx.beginPath();
    d.pts.forEach(function(p, i) {
        var x = sx(p.eps), y = sy(p.sig);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = '#ff8d8d';
    ctx.beginPath(); ctx.arc(sx(d.peak.eps), sy(d.qu), 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
    ctx.fillText('ε (%)', gx - 30, oy + 20);
    ctx.fillText('σ (kPa)', ox - 10, gy + 12);
    ctx.fillText('qu = ' + d.qu.toFixed(1) + ' kPa', ox + 10, gy + 20);
    if (hint) hint.textContent = 'Pico qu marcado en rojo.';
}

function crearFormularioConsolidacionMS2() {
    return `
    <h3>Ensayo de Consolidación</h3>
    <p class="login-hint">Guía FLA-23 · e–log σ' · Cc, Cr, σ'p · Cv (método log t o √t)</p>
    <div class="laboratorio-panel">
      <div class="datos-panel">
        <h4>Datos iniciales</h4>
        <label>Altura inicial H0 (mm)</label>
        <input type="number" id="co-h0" placeholder="Ej. 20" step="0.01">
        <label>Relación de vacíos inicial e0</label>
        <input type="number" id="co-e0" placeholder="Ej. 0.85" step="0.001">
        <h4>Incrementos de carga (σ' en kPa y e final)</h4>
        <label>σ'1 , e1</label>
        <div style="display:flex;gap:8px"><input type="number" id="co-s1" placeholder="kPa"><input type="number" id="co-e1" placeholder="e" step="0.001"></div>
        <label>σ'2 , e2</label>
        <div style="display:flex;gap:8px"><input type="number" id="co-s2" placeholder="kPa"><input type="number" id="co-e2" placeholder="e" step="0.001"></div>
        <label>σ'3 , e3</label>
        <div style="display:flex;gap:8px"><input type="number" id="co-s3" placeholder="kPa"><input type="number" id="co-e3" placeholder="e" step="0.001"></div>
        <label>σ'4 , e4</label>
        <div style="display:flex;gap:8px"><input type="number" id="co-s4" placeholder="kPa"><input type="number" id="co-e4" placeholder="e" step="0.001"></div>
        <label>σ'5 , e5 (opcional)</label>
        <div style="display:flex;gap:8px"><input type="number" id="co-s5" placeholder="kPa"><input type="number" id="co-e5" placeholder="e" step="0.001"></div>
        <h4>Para Cv (un incremento)</h4>
        <label>H drenaje (mm) — H0/2 si doble drenaje</label>
        <input type="number" id="co-hdr" placeholder="Ej. 10" step="0.01">
        <label>t50 (min)</label>
        <input type="number" id="co-t50" placeholder="Ej. 12" step="0.1">
        <div class="botones-calculo">
          <button class="btn-calcular" onclick="calcularConsolidacionMS2()">CALCULAR</button>
          <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayoMS2('consolidacion')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-consolidacion" onclick="generarInformeEnsayoPDF('consolidacion')">Descargar informe</button>
        </div>
        </div>
        <div class="mensaje-error" id="co-error"></div>
      </div>
      <div class="resultado-panel">
        <h4>Resultados</h4>
        <div class="resultado-principal"><span>Cc (compresión)</span><strong id="co-cc">—</strong></div>
        <div class="resultados-secundarios">
          <div><span>Cv</span><strong id="co-cv">—</strong><small>mm²/min</small></div>
          <div><span>σ'p est.</span><strong id="co-pc">—</strong><small>kPa</small></div>
        </div>
        <div class="interpretacion">
          <span>INTERPRETACIÓN</span>
          <p id="co-interp">Ingresa la curva e–log σ'.</p>
        </div>
      </div>
    </div>
    <div class="grafica-panel">
      <div class="grafica-header">
        <h4>Curva e – log σ'</h4>
        <button type="button" class="btn-grafica" onclick="graficaConsolidacionMS2()">GENERAR GRÁFICA</button>
      </div>
      <canvas id="canvas-consol" width="640" height="360"></canvas>
      <p class="grafica-hint" id="hint-consol">Calcula primero y luego genera la gráfica.</p>
    </div>`;
}

function calcularConsolidacionMS2() {
    setError('co-error', '');
    var e0 = parse('co-e0');
    var pts = [];
    for (var i = 1; i <= 5; i++) {
        var s = parse('co-s' + i), e = parse('co-e' + i);
        if (s != null && e != null && s > 0) pts.push({ s: s, e: e });
    }
    if (pts.length < 2) { setError('co-error', 'Se requieren al menos 2 puntos σ\'–e'); return; }
    pts.sort(function(a, b) { return a.s - b.s; });
    // Cc ≈ slope of steep virgin compression (last two points)
    var p1 = pts[pts.length - 2], p2 = pts[pts.length - 1];
    var Cc = Math.abs((p1.e - p2.e) / (Math.log10(p2.s) - Math.log10(p1.s)));
    // Rough Pc: mid of transition (max curvature approx = point with max Δslope)
    var pc = pts[Math.floor(pts.length / 2)].s;
    var hdr = parse('co-hdr'), t50 = parse('co-t50');
    var Cv = null;
    if (hdr && t50 && t50 > 0) {
        // Cv = 0.197 * Hdr^2 / t50  (Tv50≈0.197)
        Cv = 0.197 * hdr * hdr / t50;
    }
    document.getElementById('co-cc').textContent = Cc.toFixed(3);
    document.getElementById('co-cv').textContent = Cv != null ? Cv.toFixed(3) : '—';
    document.getElementById('co-pc').textContent = pc.toFixed(1);
    document.getElementById('co-interp').textContent = 'Cc ≈ ' + Cc.toFixed(3) + (Cv != null ? (' · Cv ≈ ' + Cv.toFixed(3) + ' mm²/min') : '') + ' · σ\'p aproximada ≈ ' + pc.toFixed(1) + ' kPa. Usa Casagrande en el informe para σ\'p preciso.';
    window.__datosEnsayoMS2.consolidacion = { pts: pts, Cc: Cc, Cv: Cv, pc: pc, e0: e0 };
}

function graficaConsolidacionMS2() {
    var d = window.__datosEnsayoMS2.consolidacion;
    var canvas = document.getElementById('canvas-consol');
    var hint = document.getElementById('hint-consol');
    if (!d || !canvas) { if (hint) hint.textContent = 'Primero pulsa CALCULAR.'; return; }
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1c1410'; ctx.fillRect(0, 0, w, h);
    var logs = d.pts.map(function(p) { return Math.log10(p.s); });
    var minL = Math.min.apply(null, logs) - 0.1, maxL = Math.max.apply(null, logs) + 0.1;
    var minE = Math.min.apply(null, d.pts.map(function(p) { return p.e; })) - 0.05;
    var maxE = Math.max.apply(null, d.pts.map(function(p) { return p.e; })) + 0.05;
    var ox = 55, oy = h - 40, gx = w - 30, gy = 25;
    function sx(logS) { return ox + ((logS - minL) / (maxL - minL)) * (gx - ox); }
    function sy(e) { return oy - ((e - minE) / (maxE - minE)) * (oy - gy); }
    ctx.strokeStyle = '#666'; ctx.beginPath(); ctx.moveTo(ox, gy); ctx.lineTo(ox, oy); ctx.lineTo(gx, oy); ctx.stroke();
    ctx.strokeStyle = '#e8b84a'; ctx.lineWidth = 2; ctx.beginPath();
    d.pts.forEach(function(p, i) {
        var x = sx(Math.log10(p.s)), y = sy(p.e);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = '#9dffc0';
    d.pts.forEach(function(p) {
        ctx.beginPath(); ctx.arc(sx(Math.log10(p.s)), sy(p.e), 5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
    ctx.fillText('log σ\'', gx - 40, oy + 20);
    ctx.fillText('e', ox - 15, gy + 12);
    ctx.fillText('Cc ≈ ' + d.Cc.toFixed(3), ox + 10, gy + 20);
    if (hint) hint.textContent = 'Curva de consolidación e–log σ\'.';
}

function guardarDatosEnsayoMS2(tipo) {
    var d = window.__datosEnsayoMS2[tipo];
    if (!d) { alert('Primero calcula el ensayo.'); return; }
    var nombre = '', resultado = '';
    if (tipo === 'corte') {
        nombre = 'Corte Directo (Suelos II)';
        resultado = 'c = ' + d.c.toFixed(3) + ' kPa · φ = ' + d.phi.toFixed(1) + '° · c = τ − σn·tan(φ)';
    } else if (tipo === 'inconfinada') {
        nombre = 'Compresión Inconfinada (Suelos II)';
        resultado = 'qu = ' + d.qu.toFixed(1) + ' kPa · cu = ' + d.cu.toFixed(1) + ' kPa';
    } else if (tipo === 'consolidacion') {
        nombre = 'Consolidación (Suelos II)';
        resultado = 'Cc = ' + d.Cc.toFixed(3) + (d.Cv != null ? (' · Cv = ' + d.Cv.toFixed(3) + ' mm²/min') : '') + ' · σ\'p ≈ ' + d.pc.toFixed(1) + ' kPa';
    } else if (tipo === 'triaxial') {
        nombre = 'Triaxial (Suelos II)';
        resultado = (d.resumen || d.texto || 'Ensayo triaxial calculado');
    }
    if (typeof guardarResultado === 'function') {
        guardarResultado(nombre, resultado, { tipo: tipo, calculados: d });
        alert('Datos guardados. Revísalos en Resultados.');
    }
}

// Simuladores MS2 dedicados

window.__simCD = window.__simCD || {
    running: false,
    paused: false,
    pauseAccum: 0,
    t0: 0,
    dh: 0,
    dv: 0,
    ph: 0,
    peak: 0,
    done: false,
    history: [],
    raf: null
};

function simCDLeerParams() {
    // A en m², N (σn fuerza) en kN → σn (kPa) = N/A
    // c y τ en kPa
    var A = parseFloat(document.getElementById('sim-cd-area').value) || 0.0036;
    var NkN = parseFloat(document.getElementById('sim-cd-pv').value) || 1.0;
    var c = parseFloat(document.getElementById('sim-cd-c').value) || 5;
    var phi = parseFloat(document.getElementById('sim-cd-phi').value) || 28;
    var tipo = (document.getElementById('sim-cd-tipo') || {}).value || 'suelto';
    var vel = parseFloat(document.getElementById('sim-cd-vel').value) || 2;
    if (window.__datosEnsayoMS2 && window.__datosEnsayoMS2.corte) {
        var d = window.__datosEnsayoMS2.corte;
        if (d.c != null) c = d.c;
        if (d.phi != null) phi = d.phi;
        if (d.A != null) A = d.A;
    }
    var sn = NkN / A; // kPa
    var tauPeak = c + sn * Math.tan(phi * Math.PI / 180); // kPa
    var PhPeak = tauPeak; // se muestra como esfuerzo (kPa), no fuerza
    var PhRes = PhPeak * (tipo === 'denso' ? 0.72 : (tipo === 'arcilla' ? 0.85 : 0.78));
    return { A: A, Pv: NkN, NkN: NkN, c: c, phi: phi, tipo: tipo, vel: vel, sn: sn, tauPeak: tauPeak, PhPeak: PhPeak, PhRes: PhRes };
}

function simCDActualizarLabels() {
    var p = simCDLeerParams();
    var el;
    el = document.getElementById('sim-cd-pv-val'); if (el) el.textContent = p.Pv.toFixed(1);
    el = document.getElementById('sim-cd-c-val'); if (el) el.textContent = p.c.toFixed(2);
    el = document.getElementById('sim-cd-phi-val'); if (el) el.textContent = p.phi.toFixed(1);
    var velN = Math.round(p.vel) || 3;
    var velTxt = ['', 'muy lenta', 'lenta', 'media', 'rápida', 'muy rápida'][velN] || 'media';
    var dur = typeof simCDDuracionSeg === 'function' ? simCDDuracionSeg(velN) : 5;
    el = document.getElementById('sim-cd-vel-val'); if (el) el.textContent = velTxt + ' (~' + dur + ' s)';
    el = document.getElementById('sim-cd-sn'); if (el) el.textContent = p.sn.toFixed(3);
    if (!window.__simCD.running && !window.__simCD.done) {
        el = document.getElementById('sim-cd-ph'); if (el) el.textContent = '0.00';
        el = document.getElementById('sim-cd-t'); if (el) el.textContent = '0.000';
        el = document.getElementById('sim-cd-dh'); if (el) el.textContent = '0.0';
        el = document.getElementById('sim-cd-dv'); if (el) el.textContent = '0.00';
    }
}

function simCDCurvaPh(dh) {
    // Curva tipo: sube a pico ~3-5 mm, luego residual
    var p = simCDLeerParams();
    var xPeak = p.tipo === 'arcilla' ? 6 : (p.tipo === 'denso' ? 3.5 : 4.5);
    var Ph;
    if (dh <= 0) Ph = 0;
    else if (dh < xPeak) {
        var r = dh / xPeak;
        Ph = p.PhPeak * (1 - Math.pow(1 - r, 2.2));
    } else {
        var r2 = Math.min(1, (dh - xPeak) / 8);
        Ph = p.PhPeak - (p.PhPeak - p.PhRes) * (1 - Math.exp(-2.5 * r2));
    }
    return Math.max(0, Ph);
}

function simCDDeltaV(dh) {
    var p = simCDLeerParams();
    if (p.tipo === 'denso') return 0.15 * Math.sin(Math.min(dh, 10) / 10 * Math.PI) * (dh / 4); // dilata
    if (p.tipo === 'arcilla') return -0.05 * Math.min(dh, 8) / 8; // leve compresión
    return -0.12 * Math.min(dh, 10) / 5; // suelta se comprime
}

function dibujarMaquinaCorte(dh, dv, Ph) {
    var canvas = document.getElementById('sim-corte-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Fondo
    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#2a1f14');
    grd.addColorStop(1, '#15100c');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    var p = simCDLeerParams();
    var shift = Math.min(dh, 14) * 4; // px
    var vShift = Math.max(-8, Math.min(10, dv * 12));

    // Base de la máquina
    ctx.fillStyle = '#3a3228';
    ctx.fillRect(40, h - 48, w - 80, 28);
    ctx.fillStyle = '#4a4034';
    ctx.fillRect(60, h - 70, w - 120, 22);

    // Guías / riel
    ctx.strokeStyle = '#6a5e4e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(70, h - 58);
    ctx.lineTo(w - 70, h - 58);
    ctx.stroke();

    // Caja inferior (fija)
    var boxW = 160, boxH = 80;
    var bx = w / 2 - boxW / 2 - 10;
    var by = h - 160;
    ctx.fillStyle = '#5c5348';
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by + boxH / 2, boxW, boxH / 2);
    ctx.strokeRect(bx, by + boxH / 2, boxW, boxH / 2);
    ctx.fillStyle = '#a89060';
    ctx.font = '11px sans-serif';
    ctx.fillText('Mitad inferior (fija)', bx + 8, by + boxH - 6);

    // Suelo (entre mitades)
    var soilY = by + boxH / 2 - 18 + vShift;
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(bx + 8, soilY, boxW - 16, 36);
    // textura suelo
    ctx.fillStyle = 'rgba(60,40,10,0.35)';
    for (var i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.arc(bx + 20 + i * 12 + (i % 3), soilY + 10 + (i % 4) * 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#e8d5a3';
    ctx.font = '10px sans-serif';
    ctx.fillText('Suelo', bx + boxW / 2 - 14, soilY + 22);

    // Caja superior (móvil)
    var topX = bx + shift;
    var topY = by + vShift;
    ctx.fillStyle = '#6a6256';
    ctx.strokeStyle = '#e8b84a';
    ctx.lineWidth = 2;
    ctx.fillRect(topX, topY, boxW, boxH / 2 - 2);
    ctx.strokeRect(topX, topY, boxW, boxH / 2 - 2);
    ctx.fillStyle = '#e8b84a';
    ctx.font = '11px sans-serif';
    ctx.fillText('Mitad superior →', topX + 8, topY + 16);

    // Plano de falla
    ctx.strokeStyle = '#ff6b6b';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx - 10, by + boxH / 2 + vShift);
    ctx.lineTo(bx + boxW + shift + 10, by + boxH / 2 + vShift);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff8d8d';
    ctx.font = '10px sans-serif';
    ctx.fillText('Plano de falla', bx + boxW + shift - 30, by + boxH / 2 + vShift - 6);

    // Pistón / carga vertical
    var pistX = topX + boxW / 2 - 18;
    var pistY = topY - 55;
    ctx.fillStyle = '#7a7268';
    ctx.fillRect(pistX, pistY + 20, 36, 35);
    ctx.fillStyle = '#9a8f80';
    ctx.fillRect(pistX - 10, pistY, 56, 22);
    // pesas
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(pistX - 4, pistY - 18, 44, 10);
    ctx.fillRect(pistX, pistY - 28, 36, 10);
    ctx.fillStyle = '#e8b84a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('σn·A = ' + p.Pv.toFixed(2) + ' kN', pistX - 28, pistY - 36);
    // flecha Pv
    ctx.strokeStyle = '#e8b84a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pistX + 18, pistY - 50);
    ctx.lineTo(pistX + 18, pistY - 32);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pistX + 12, pistY - 38);
    ctx.lineTo(pistX + 18, pistY - 30);
    ctx.lineTo(pistX + 24, pistY - 38);
    ctx.stroke();

    // Empuje horizontal Ph
    var arrowY = by + boxH / 4 + vShift;
    var ax0 = topX + boxW + 8;
    ctx.strokeStyle = '#5ec8ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax0, arrowY);
    ctx.lineTo(ax0 + 50, arrowY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax0 + 42, arrowY - 7);
    ctx.lineTo(ax0 + 55, arrowY);
    ctx.lineTo(ax0 + 42, arrowY + 7);
    ctx.stroke();
    ctx.fillStyle = '#5ec8ff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('τ = ' + (Ph || 0).toFixed(2) + ' kPa', ax0, arrowY - 12);

    // Marco / deformímetro horizontal
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(topX + boxW - 5, by + boxH + 8, 40, 16);
    ctx.fillStyle = '#ccc';
    ctx.font = '9px sans-serif';
    ctx.fillText('δh ' + dh.toFixed(1) + ' mm', topX + boxW - 2, by + boxH + 20);

    // Título
    ctx.fillStyle = '#e8dcc0';
    ctx.font = '13px sans-serif';
    ctx.fillText('Equipo de corte directo (vista esquemática)', 16, 22);
    ctx.fillStyle = '#a09070';
    ctx.font = '11px sans-serif';
    ctx.fillText('σn = N/A = ' + p.sn.toFixed(2) + ' kPa   ·   τpico = c + σn·tanφ = ' + p.tauPeak.toFixed(2) + ' kPa', 16, 40);
}

function dibujarCurvaSimCD() {
    var canvas = document.getElementById('sim-corte-curva');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(0, 0, w, h);
    var hist = window.__simCD.history || [];
    var p = simCDLeerParams();
    var maxX = 14, maxY = Math.max(p.PhPeak * 1.15, 1);
    var ox = 45, oy = h - 28, gx = w - 15, gy = 15;
    function sx(x) { return ox + (x / maxX) * (gx - ox); }
    function sy(y) { return oy - (y / maxY) * (oy - gy); }
    ctx.strokeStyle = '#555';
    ctx.beginPath(); ctx.moveTo(ox, gy); ctx.lineTo(ox, oy); ctx.lineTo(gx, oy); ctx.stroke();
    ctx.fillStyle = '#aaa';
    ctx.font = '10px sans-serif';
    ctx.fillText('δh (mm)', gx - 45, oy + 16);
    ctx.fillText('τ (kPa)', 6, gy + 10);
    // theoretical curve
    ctx.strokeStyle = 'rgba(232,184,74,0.35)';
    ctx.beginPath();
    for (var i = 0; i <= 40; i++) {
        var x = (i / 40) * maxX;
        var y = simCDCurvaPh(x);
        if (i === 0) ctx.moveTo(sx(x), sy(y)); else ctx.lineTo(sx(x), sy(y));
    }
    ctx.stroke();
    if (hist.length > 1) {
        ctx.strokeStyle = '#5ec8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        hist.forEach(function(pt, i) {
            if (i === 0) ctx.moveTo(sx(pt.dh), sy(pt.ph));
            else ctx.lineTo(sx(pt.dh), sy(pt.ph));
        });
        ctx.stroke();
        var last = hist[hist.length - 1];
        ctx.fillStyle = '#9dffc0';
        ctx.beginPath(); ctx.arc(sx(last.dh), sy(last.ph), 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#e8b84a';
    ctx.font = '11px sans-serif';
    ctx.fillText('Pico ≈ ' + p.PhPeak.toFixed(2) + ' kPa', ox + 8, gy + 14);
}

function simCDDuracionSeg(vel) {
    // 1 muy lenta=5s · 2 lenta=5s · 3 media=2.5s · 4 rápida=1s · 5 muy rápida=0.5s
    var v = Math.max(1, Math.min(5, Math.round(vel || 3)));
    var map = { 1: 5, 2: 5, 3: 2.5, 4: 1, 5: 0.5 };
    return map[v] || 2.5;
}

function simCDTick(ts) {
    if (!window.__simCD.running || window.__simCD.paused) return;
    if (!window.__simCD.t0) window.__simCD.t0 = ts;
    var p = simCDLeerParams();
    var dur = simCDDuracionSeg(p.vel); // segundos totales del ensayo (δh 0→14 mm)
    var elapsed = (ts - window.__simCD.t0 - (window.__simCD.pauseAccum || 0)) / 1000; // s
    var dh = Math.min(14, (elapsed / dur) * 14);
    window.__simCD.dh = dh;
    var Ph = simCDCurvaPh(dh);
    var dv = simCDDeltaV(dh);
    window.__simCD.ph = Ph;
    window.__simCD.dv = dv;
    if (Ph > window.__simCD.peak) window.__simCD.peak = Ph;
    window.__simCD.history.push({ dh: dh, ph: Ph });
    if (window.__simCD.history.length > 200) window.__simCD.history.shift();

    var el;
    el = document.getElementById('sim-cd-ph'); if (el) el.textContent = Ph.toFixed(2);
    el = document.getElementById('sim-cd-t'); if (el) el.textContent = Ph.toFixed(2);
    el = document.getElementById('sim-cd-dh'); if (el) el.textContent = dh.toFixed(1);
    el = document.getElementById('sim-cd-dv'); if (el) el.textContent = dv.toFixed(2);
    el = document.getElementById('sim-cd-estado');
    if (el) {
        if (dh < 3) el.textContent = 'Cargando…';
        else if (Ph >= p.PhPeak * 0.98 && dh < 6) el.textContent = '¡Pico de resistencia!';
        else if (dh >= 12) el.textContent = 'Residual / fin';
        else el.textContent = 'Deslizando…';
    }

    dibujarMaquinaCorte(dh, dv, Ph);
    dibujarCurvaSimCD();

    if (dh >= 14) {
        window.__simCD.running = false;
        window.__simCD.paused = false;
        window.__simCD.done = true;
        el = document.getElementById('sim-cd-estado');
        if (el) el.textContent = 'Ensayo terminado';
        var bs = document.getElementById('btn-sim-cd-start');
        if (bs) bs.textContent = '▶ INICIAR ENSAYO';
        return;
    }
    window.__simCD.raf = requestAnimationFrame(simCDTick);
}

function simCDToggle() {
    var bs = document.getElementById('btn-sim-cd-start');
    // Pausar si está corriendo
    if (window.__simCD.running && !window.__simCD.paused) {
        window.__simCD.paused = true;
        window.__simCD.pauseAt = performance.now();
        if (window.__simCD.raf) cancelAnimationFrame(window.__simCD.raf);
        if (bs) bs.textContent = '▶ CONTINUAR';
        var st = document.getElementById('sim-cd-estado');
        if (st) st.textContent = 'Pausado';
        return;
    }
    // Continuar desde pausa
    if (window.__simCD.running && window.__simCD.paused) {
        window.__simCD.paused = false;
        window.__simCD.pauseAccum = (window.__simCD.pauseAccum || 0) + (performance.now() - (window.__simCD.pauseAt || performance.now()));
        if (bs) bs.textContent = '⏸ PAUSA';
        var st = document.getElementById('sim-cd-estado');
        if (st) st.textContent = 'Continuando…';
        window.__simCD.raf = requestAnimationFrame(simCDTick);
        return;
    }
    // Iniciar de cero
    window.__simCD.running = true;
    window.__simCD.paused = false;
    window.__simCD.pauseAccum = 0;
    window.__simCD.done = false;
    window.__simCD.t0 = 0;
    window.__simCD.dh = 0;
    window.__simCD.dv = 0;
    window.__simCD.ph = 0;
    window.__simCD.peak = 0;
    window.__simCD.history = [];
    if (bs) bs.textContent = '⏸ PAUSA';
    var st = document.getElementById('sim-cd-estado');
    if (st) st.textContent = 'Iniciando…';
    window.__simCD.raf = requestAnimationFrame(simCDTick);
}

function simCDReset() {
    if (window.__simCD.raf) cancelAnimationFrame(window.__simCD.raf);
    window.__simCD.running = false;
    window.__simCD.paused = false;
    window.__simCD.pauseAccum = 0;
    window.__simCD.done = false;
    window.__simCD.dh = 0;
    window.__simCD.dv = 0;
    window.__simCD.ph = 0;
    window.__simCD.history = [];
    simCDActualizarLabels();
    dibujarMaquinaCorte(0, 0, 0);
    dibujarCurvaSimCD();
    var st = document.getElementById('sim-cd-estado');
    if (st) st.textContent = 'Listo';
    var bs = document.getElementById('btn-sim-cd-start');
    if (bs) bs.textContent = '▶ INICIAR ENSAYO';
}

function simularCorteDirecto() {
    // precargar desde ensayo si hay datos
    if (window.__datosEnsayoMS2 && window.__datosEnsayoMS2.corte) {
        var d = window.__datosEnsayoMS2.corte;
        var elC = document.getElementById('sim-cd-c');
        var elPhi = document.getElementById('sim-cd-phi');
        var elA = document.getElementById('sim-cd-area');
        if (elC && d.c != null) elC.value = d.c;
        if (elPhi && d.phi != null) elPhi.value = d.phi;
        if (elA && d.A != null) elA.value = d.A;
    }
    simCDBindOnce();
    simCDReset();
}

function simCDBindOnce() {
    if (window.__simCD.bound) return;
    window.__simCD.bound = true;
    ['sim-cd-pv', 'sim-cd-c', 'sim-cd-phi', 'sim-cd-vel', 'sim-cd-area', 'sim-cd-tipo'].forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function() {
            simCDActualizarLabels();
            if (!window.__simCD.running) {
                dibujarMaquinaCorte(window.__simCD.dh || 0, window.__simCD.dv || 0, window.__simCD.ph || 0);
                dibujarCurvaSimCD();
            }
        });
    });
    var bStart = document.getElementById('btn-sim-cd-start');
    var bReset = document.getElementById('btn-sim-cd-reset');
    if (bStart) bStart.addEventListener('click', simCDToggle);
    if (bReset) bReset.addEventListener('click', simCDReset);
}


// Extend abrir simulador visibility
function mostrarTarjetasSim(tipo) {
    var map = {
        mohr: 'card-sim-mohr',
        esfdef: 'card-sim-esfdef',
        flujo: 'card-sim-flujo',
        consolidacion: 'card-sim-consolidacion',
        corte: 'card-sim-corte',
        inconfinada: 'card-sim-inconfinada'
    };
    Object.keys(map).forEach(function(k) {
        var el = document.getElementById(map[k]);
        if (el) el.hidden = (k !== tipo);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[data-ensayo-ms2]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            abrirEnsayoSuelos2(btn.getAttribute('data-ensayo-ms2'));
        });
    });
});


// =========================================
// ENSAYO TRIAXIAL (datos de laboratorio)
// =========================================
function crearFormularioTriaxial() {
    return `
    <h3>Ensayo Triaxial</h3>
    <p class="login-hint">σ₁ = σ₃ + (P/A) · Círculos de Mohr · τ = c + σ·tanφ. Ingresa al menos 2 ensayos a distinta σ₃.</p>
    <div class="laboratorio-panel">
      <div class="datos-panel">
        <h4>Tipo</h4>
        <select id="tx-tipo">
          <option value="UU">UU — no consolidado no drenado</option>
          <option value="CU" selected>CU — consolidado no drenado</option>
          <option value="CD">CD — consolidado drenado</option>
        </select>
        <h4>Ensayo 1</h4>
        <label>σ₃ (kPa)</label>
        <input type="number" id="tx-s3-1" placeholder="Ej. 100" step="1">
        <label>σ₁ en falla (kPa)</label>
        <input type="number" id="tx-s1-1" placeholder="Ej. 320" step="1">
        <h4>Ensayo 2</h4>
        <label>σ₃ (kPa)</label>
        <input type="number" id="tx-s3-2" placeholder="Ej. 200" step="1">
        <label>σ₁ en falla (kPa)</label>
        <input type="number" id="tx-s1-2" placeholder="Ej. 480" step="1">
        <h4>Ensayo 3 (opcional)</h4>
        <label>σ₃ (kPa)</label>
        <input type="number" id="tx-s3-3" placeholder="Ej. 300" step="1">
        <label>σ₁ en falla (kPa)</label>
        <input type="number" id="tx-s1-3" placeholder="Ej. 620" step="1">
        <div class="botones-calculo">
          <button class="btn-calcular" onclick="calcularTriaxial()">CALCULAR</button>
          <button class="btn-calcular btn-guardar-datos" onclick="guardarDatosEnsayoMS2('triaxial')">GUARDAR DATOS</button>
        <div class="botones-calculo" style="margin-top:10px">
          <button type="button" class="btn-informe-pdf" id="btnInforme-triaxial" onclick="generarInformeEnsayoPDF('triaxial')">Descargar informe</button>
        </div>
        </div>
        <div class="mensaje-error" id="tx-error"></div>
      </div>
      <div class="resultado-panel">
        <h4>Resultados</h4>
        <div class="resultado-principal"><span>φ</span><strong id="tx-phi">—</strong></div>
        <div class="resultados-secundarios">
          <div><span>c</span><strong id="tx-c">—</strong><small>kPa</small></div>
          <div><span>Ensayos</span><strong id="tx-n">—</strong></div>
        </div>
        <div class="interpretacion">
          <span>ENVOLVENTE</span>
          <p id="tx-eq">Ingresa al menos 2 pares σ₃–σ₁.</p>
        </div>
      </div>
    </div>
    <div class="grafica-panel">
      <div class="grafica-header">
        <h4>Círculos de Mohr y envolvente</h4>
        <button type="button" class="btn-grafica" onclick="graficaTriaxial()">GENERAR GRÁFICA</button>
      </div>
      <canvas id="canvas-triaxial" width="640" height="360"></canvas>
      <p class="grafica-hint" id="hint-tx">Calcula primero y luego genera la gráfica.</p>
    </div>`;
}

function calcularTriaxial() {
    setError('tx-error', '');
    var pts = [];
    for (var i = 1; i <= 3; i++) {
        var s3 = parse('tx-s3-' + i), s1 = parse('tx-s1-' + i);
        if (s3 != null && s1 != null && s1 > s3) {
            var p = (s1 + s3) / 2; // center
            var R = (s1 - s3) / 2;
            pts.push({ s3: s3, s1: s1, p: p, R: R, tau: R }); // max shear = R
        }
    }
    if (pts.length < 2) { setError('tx-error', 'Se requieren ≥2 ensayos con σ₁ > σ₃'); return; }
    // Fit envelope: for each circle, tangent point relates to φ,c
    // Use p-q: q = (s1-s3)/2, p = (s1+s3)/2  →  q = a + p * b  where b = sinφ, a = c cosφ
    var n = pts.length, sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    pts.forEach(function(pt) {
        var pp = (pt.s1 + pt.s3) / 2, q = (pt.s1 - pt.s3) / 2;
        sumX += pp; sumY += q; sumXY += pp * q; sumX2 += pp * pp;
        pt.pp = pp; pt.q = q;
    });
    var b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    var a = (sumY - b * sumX) / n;
    // b = sinφ, a = c·cosφ
    var sinphi = Math.max(-0.999, Math.min(0.999, b));
    var phi = Math.asin(sinphi) * 180 / Math.PI;
    var cosphi = Math.cos(phi * Math.PI / 180);
    var c = cosphi > 1e-6 ? Math.max(0, a / cosphi) : 0;
    var tipo = (document.getElementById('tx-tipo') || {}).value || 'CU';
    document.getElementById('tx-phi').textContent = phi.toFixed(1) + '°';
    document.getElementById('tx-c').textContent = c.toFixed(1);
    document.getElementById('tx-n').textContent = String(n);
    document.getElementById('tx-eq').textContent = 'τ = ' + c.toFixed(1) + ' + σ·tan(' + phi.toFixed(1) + '°)  ·  Tipo ' + tipo;
    window.__datosEnsayoMS2.triaxial = { pts: pts, c: c, phi: phi, tipo: tipo };
}

function graficaTriaxial() {
    var d = window.__datosEnsayoMS2.triaxial;
    var canvas = document.getElementById('canvas-triaxial');
    var hint = document.getElementById('hint-tx');
    if (!d || !canvas) { if (hint) hint.textContent = 'Primero CALCULAR.'; return; }
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, w, h);
    var maxS = Math.max.apply(null, d.pts.map(function(p) { return p.s1; })) * 1.2;
    var maxT = Math.max(d.c + maxS * Math.tan(d.phi * Math.PI / 180), Math.max.apply(null, d.pts.map(function(p) { return p.R; }))) * 1.25;
    var ox = 60, oy = h - 45, gx = w - 25, gy = 25;
    function sx(x) { return ox + (x / maxS) * (gx - ox); }
    function sy(y) { return oy - (y / maxT) * (oy - gy); }
    ctx.strokeStyle = '#666'; ctx.beginPath(); ctx.moveTo(ox, gy); ctx.lineTo(ox, oy); ctx.lineTo(gx, oy); ctx.stroke();
    // envelope
    ctx.strokeStyle = '#e8b84a'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(d.c));
    ctx.lineTo(sx(maxS), sy(d.c + maxS * Math.tan(d.phi * Math.PI / 180)));
    ctx.stroke();
    var colors = ['#5ec8ff', '#9dffc0', '#ff9f7a'];
    d.pts.forEach(function(p, i) {
        var col = colors[i % 3];
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath();
        for (var k = 0; k <= 64; k++) {
            var ang = Math.PI * k / 64;
            var X = sx(p.p + p.R * Math.cos(ang)), Y = sy(p.R * Math.sin(ang));
            if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(sx(p.s1), oy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx(p.s3), oy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif';
        ctx.fillText('σ1=' + p.s1.toFixed(0), sx(p.s1) - 20, oy + 14);
        ctx.fillText('σ3=' + p.s3.toFixed(0), sx(p.s3) - 20, oy + 26);
    });
    ctx.fillStyle = '#e8b84a'; ctx.font = '12px sans-serif';
    ctx.fillText('c=' + d.c.toFixed(1) + ' kPa  φ=' + d.phi.toFixed(1) + '°', ox + 8, gy + 16);
    if (hint) hint.textContent = 'Círculos de Mohr en falla y envolvente de Coulomb.';
}

// =========================================
// MÁQUINA: COMPRESIÓN INCONFINADA
// =========================================
window.__simUC = window.__simUC || { running: false, paused: false, pauseAccum: 0, history: [], raf: null };

function simUCDur(vel) {
    var map = { 1: 5, 2: 5, 3: 2.5, 4: 1, 5: 0.5 };
    return map[Math.round(vel) || 3] || 2.5;
}

function simUCParams() {
    var d = parseFloat((document.getElementById('sim-uc-d') || {}).value) || 38;
    var L0 = parseFloat((document.getElementById('sim-uc-l0') || {}).value) || 76;
    var qu = parseFloat((document.getElementById('sim-uc-qu') || {}).value) || 120;
    if (window.__datosEnsayoMS2 && window.__datosEnsayoMS2.inconfinada && window.__datosEnsayoMS2.inconfinada.qu) {
        qu = window.__datosEnsayoMS2.inconfinada.qu;
    }
    var vel = parseFloat((document.getElementById('sim-uc-vel') || {}).value) || 3;
    var A = Math.PI * Math.pow((d / 1000) / 2, 2); // m²
    return { d: d, L0: L0, qu: qu, vel: vel, A: A };
}

function dibujarPrensaUC(eps, sig) {
    var canvas = document.getElementById('sim-inconf-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, w, h);
    var p = simUCParams();
    eps = eps || 0;
    sig = sig || 0;

    // Cilindro equilibrado: ref 38×76 (H/D≈2) → ~48×96 px
    var refD = 38, refL = 76;
    var scale = 1.15;
    var baseW = 48 * (p.d / refD) * scale;
    var baseH = 96 * (p.L0 / refL) * scale;
    // límites suaves para no aplastar ni alargar
    baseW = Math.max(28, Math.min(64, baseW));
    baseH = Math.max(56, Math.min(128, baseH));
    // mantener H/D visual razonable
    if (baseH / baseW < 1.4) baseH = baseW * 1.6;
    if (baseH / baseW > 2.6) baseH = baseW * 2.2;

    var soft = Math.max(0.55, Math.min(1.4, 150 / Math.max(20, p.qu)));
    var axial = Math.min(0.35, (eps / 100) * soft);
    var sampleH = baseH * (1 - axial);
    var bulge = 1 + (eps / 100) * 0.35 * soft;
    var sampleW = baseW * bulge;

    var cx = w / 2;
    var baseY = h - 48;

    ctx.fillStyle = '#4a4034';
    ctx.fillRect(cx - 70, baseY, 140, 16);
    ctx.fillRect(cx - 55, baseY + 16, 110, 12);

    ctx.fillStyle = '#7a7268';
    ctx.fillRect(cx - sampleW / 2 - 6, baseY - 8, sampleW + 12, 8);

    var sy0 = baseY - 10 - sampleH;
    // cilindro (barrilete)
    ctx.fillStyle = '#8b6914';
    ctx.beginPath();
    ctx.moveTo(cx - sampleW / 2, sy0);
    ctx.lineTo(cx + sampleW / 2, sy0);
    ctx.lineTo(cx + sampleW / 2 + 5 * (eps / 15) * soft, sy0 + sampleH / 2);
    ctx.lineTo(cx + sampleW / 2, sy0 + sampleH);
    ctx.lineTo(cx - sampleW / 2, sy0 + sampleH);
    ctx.lineTo(cx - sampleW / 2 - 5 * (eps / 15) * soft, sy0 + sampleH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5; ctx.stroke();

    // cotas D y L
    ctx.strokeStyle = '#9dffc0'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - sampleW / 2 - 12, sy0);
    ctx.lineTo(cx - sampleW / 2 - 12, sy0 + sampleH);
    ctx.stroke();
    ctx.fillStyle = '#9dffc0';
    ctx.font = '10px sans-serif';
    ctx.fillText('L=' + p.L0.toFixed(0) + ' mm', 8, sy0 + sampleH / 2);
    ctx.fillText('Ø=' + p.d.toFixed(0) + ' mm', cx - 20, sy0 + sampleH + 22);

    if (eps > 7) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(cx - sampleW / 2 - 4, sy0 + sampleH * 0.25);
        ctx.lineTo(cx + sampleW / 2 + 4, sy0 + sampleH * 0.75);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.fillStyle = '#7a7268';
    ctx.fillRect(cx - sampleW / 2 - 6, sy0 - 8, sampleW + 12, 8);
    ctx.fillStyle = '#5c5348';
    ctx.fillRect(cx - 8, 26, 16, Math.max(10, sy0 - 36));
    ctx.fillRect(cx - 40, 18, 80, 12);

    ctx.strokeStyle = '#e8b84a'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 10); ctx.lineTo(cx, 18);
    ctx.moveTo(cx - 5, 15); ctx.lineTo(cx, 20); ctx.lineTo(cx + 5, 15);
    ctx.stroke();
    ctx.fillStyle = '#e8b84a';
    ctx.font = '11px sans-serif';
    ctx.fillText('P axial', cx + 14, 16);
    ctx.fillStyle = '#ccc';
    ctx.fillText('σ₃=0  ·  qu=' + p.qu.toFixed(0) + ' kPa  ·  ε=' + eps.toFixed(1) + '%  σ=' + sig.toFixed(0) + ' kPa', 8, h - 6);
}

function simUCCurve(eps, qu) {
    // peak near 12%
    var ep = 12;
    if (eps <= 0) return 0;
    if (eps < ep) return qu * (1 - Math.pow(1 - eps / ep, 2));
    return qu * Math.max(0.7, 1 - (eps - ep) / 40);
}

function simUCTick(ts) {
    if (!window.__simUC.running || window.__simUC.paused) return;
    if (!window.__simUC.t0) window.__simUC.t0 = ts;
    var p = simUCParams();
    var dur = simUCDur(p.vel);
    var elapsed = (ts - window.__simUC.t0 - (window.__simUC.pauseAccum || 0)) / 1000;
    var eps = Math.min(20, (elapsed / dur) * 20);
    var sig = simUCCurve(eps, p.qu);
    var P = sig * 1000 * p.A; // N
    window.__simUC.history.push({ eps: eps, sig: sig });
    var el;
    el = document.getElementById('sim-uc-sig'); if (el) el.textContent = sig.toFixed(0);
    el = document.getElementById('sim-uc-eps'); if (el) el.textContent = eps.toFixed(1);
    el = document.getElementById('sim-uc-p'); if (el) el.textContent = P.toFixed(1);
    el = document.getElementById('sim-uc-estado');
    if (el) el.textContent = eps >= 19 ? 'Falla / fin' : (sig >= p.qu * 0.98 ? '¡Pico qu!' : 'Cargando…');
    dibujarPrensaUC(eps, sig);
    // mini curve
    var cv = document.getElementById('sim-uc-curva');
    if (cv) {
        var ctx = cv.getContext('2d');
        var w = cv.width, h = cv.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, w, h);
        var ox = 40, oy = h - 20, gx = w - 10, gy = 10;
        function sx(x) { return ox + (x / 20) * (gx - ox); }
        function sy(y) { return oy - (y / (p.qu * 1.2)) * (oy - gy); }
        ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(ox, gy); ctx.lineTo(ox, oy); ctx.lineTo(gx, oy); ctx.stroke();
        ctx.strokeStyle = '#5ec8ff'; ctx.beginPath();
        window.__simUC.history.forEach(function(pt, i) {
            if (i === 0) ctx.moveTo(sx(pt.eps), sy(pt.sig)); else ctx.lineTo(sx(pt.eps), sy(pt.sig));
        });
        ctx.stroke();
        ctx.fillStyle = '#e8b84a'; ctx.font = '11px sans-serif';
        ctx.fillText('qu = ' + p.qu.toFixed(0) + ' kPa', ox + 6, gy + 12);
    }
    if (eps >= 20) {
        window.__simUC.running = false;
        window.__simUC.paused = false;
        var bs = document.getElementById('btn-sim-uc-start');
        if (bs) bs.textContent = '▶ INICIAR ENSAYO';
        return;
    }
    window.__simUC.raf = requestAnimationFrame(simUCTick);
}

function simularInconfinada() {
    if (window.__datosEnsayoMS2 && window.__datosEnsayoMS2.inconfinada) {
        var el = document.getElementById('sim-uc-qu');
        if (el) el.value = window.__datosEnsayoMS2.inconfinada.qu;
    }
    if (!window.__simUC.bound) {
        window.__simUC.bound = true;
        ['sim-uc-qu', 'sim-uc-vel', 'sim-uc-d', 'sim-uc-l0'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', function() {
                var p = simUCParams();
                var v = document.getElementById('sim-uc-qu-val'); if (v) v.textContent = p.qu.toFixed(0);
                var vv = document.getElementById('sim-uc-vel-val'); if (vv) vv.textContent = ' (~' + simUCDur(p.vel) + ' s)';
                // Vista previa: si no corre, muestra cilindro a proporción; con qu bajo, leve pre-deformación
                if (!window.__simUC.running) {
                    var pre = Math.max(0, (200 - p.qu) / 200 * 3);
                    dibujarPrensaUC(pre, 0);
                }
            });
        });
        var bs = document.getElementById('btn-sim-uc-start');
        var br = document.getElementById('btn-sim-uc-reset');
        if (bs) bs.addEventListener('click', function() {
            if (window.__simUC.running && !window.__simUC.paused) {
                window.__simUC.paused = true;
                window.__simUC.pauseAt = performance.now();
                if (window.__simUC.raf) cancelAnimationFrame(window.__simUC.raf);
                bs.textContent = '▶ CONTINUAR';
                var st = document.getElementById('sim-uc-estado'); if (st) st.textContent = 'Pausado';
                return;
            }
            if (window.__simUC.running && window.__simUC.paused) {
                window.__simUC.paused = false;
                window.__simUC.pauseAccum = (window.__simUC.pauseAccum || 0) + (performance.now() - (window.__simUC.pauseAt || performance.now()));
                bs.textContent = '⏸ PAUSA';
                var st = document.getElementById('sim-uc-estado'); if (st) st.textContent = 'Continuando…';
                window.__simUC.raf = requestAnimationFrame(simUCTick);
                return;
            }
            window.__simUC.running = true;
            window.__simUC.paused = false;
            window.__simUC.pauseAccum = 0;
            window.__simUC.t0 = 0;
            window.__simUC.history = [];
            bs.textContent = '⏸ PAUSA';
            window.__simUC.raf = requestAnimationFrame(simUCTick);
        });
        if (br) br.addEventListener('click', function() {
            if (window.__simUC.raf) cancelAnimationFrame(window.__simUC.raf);
            window.__simUC.running = false;
            window.__simUC.paused = false;
            window.__simUC.pauseAccum = 0;
            window.__simUC.history = [];
            dibujarPrensaUC(0, 0);
            var st = document.getElementById('sim-uc-estado'); if (st) st.textContent = 'Listo';
            if (bs) bs.textContent = '▶ INICIAR ENSAYO';
        });
    }
    var p = simUCParams();
    var v = document.getElementById('sim-uc-qu-val'); if (v) v.textContent = p.qu.toFixed(0);
    dibujarPrensaUC(0, 0);
}

// =========================================
// MÁQUINA: EDÓMETRO (CONSOLIDACIÓN)
// =========================================
window.__simCO = window.__simCO || { running: false, paused: false, pauseAccum: 0, history: [], raf: null };

function simCOParams() {
    return {
        sig: parseFloat((document.getElementById('sim-co-sig') || {}).value) || 100,
        cv: parseFloat((document.getElementById('sim-co-cv') || {}).value) || 4,
        H: parseFloat((document.getElementById('sim-co-h') || {}).value) || 10,
        vel: parseFloat((document.getElementById('sim-co-vel') || {}).value) || 3
    };
}

function dibujarEdometro(U, dv) {
    var canvas = document.getElementById('sim-co-maquina');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, w, h);
    var p = simCOParams();
    var cx = w / 2;
    var settle = Math.min(14, (dv || 0) * 5);
    // anillo: más ancho que alto, proporción de edómetro real
    var ringW = 100;
    var soilH = Math.max(28, Math.min(48, 24 + p.H * 1.0));

    ctx.strokeStyle = '#8a7a60'; ctx.lineWidth = 3;
    ctx.strokeRect(cx - 90, 40, 180, h - 72);

    ctx.fillStyle = '#c0c0c0';
    for (var i = 0; i < Math.min(5, Math.ceil(p.sig / 100)); i++) {
        ctx.fillRect(cx - 28, 28 - i * 9, 56, 8);
    }
    ctx.fillStyle = '#e8b84a';
    ctx.font = '11px sans-serif';
    ctx.fillText("σ' = " + p.sig + ' kPa', cx - 36, 18);

    ctx.fillStyle = '#7a7268';
    ctx.fillRect(cx - 30, 48 + settle, 60, 10);
    ctx.fillRect(cx - 7, 38, 14, 12 + settle);

    ctx.fillStyle = '#9a8f80';
    ctx.fillRect(cx - ringW / 2, 58 + settle, ringW, 7);

    ctx.fillStyle = '#8b6914';
    ctx.fillRect(cx - ringW / 2, 65 + settle, ringW, soilH - settle * 0.2);
    ctx.strokeStyle = '#c9a84c';
    ctx.strokeRect(cx - ringW / 2 - 4, 63 + settle, ringW + 8, soilH + 6 - settle * 0.2);
    ctx.fillStyle = '#e8d5a3';
    ctx.font = '10px sans-serif';
    ctx.fillText('Anillo H≈' + p.H + ' mm', cx - 38, 64 + settle + soilH / 2);

    if ((U || 0) > 5 && (U || 0) < 98) {
        ctx.fillStyle = '#5ec8ff';
        for (var j = 0; j < 3; j++) {
            ctx.beginPath(); ctx.arc(cx - 55, 70 + j * 10 + settle, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 55, 70 + j * 10 + settle, 2.5, 0, Math.PI * 2); ctx.fill();
        }
    }

    ctx.strokeStyle = '#aaa';
    ctx.beginPath(); ctx.arc(cx + 105, 70, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '9px sans-serif';
    ctx.fillText('δv', cx + 98, 66);
    ctx.fillText((dv || 0).toFixed(2), cx + 94, 78);

    ctx.fillStyle = '#ccc';
    ctx.fillText('U=' + (U || 0).toFixed(0) + '%  Cv=' + p.cv + '  σ\'=' + p.sig + ' kPa', 8, h - 6);
}

function simCOTick(ts) {
    if (!window.__simCO.running || window.__simCO.paused) return;
    if (!window.__simCO.t0) window.__simCO.t0 = ts;
    var p = simCOParams();
    var dur = { 1: 5, 2: 5, 3: 2.5, 4: 1, 5: 0.5 }[Math.round(p.vel)] || 2.5;
    var elapsed = (ts - window.__simCO.t0 - (window.__simCO.pauseAccum || 0)) / 1000;
    var frac = Math.min(1, elapsed / dur);
    // U approx with sqrt then asymptotic
    var U = frac < 0.5 ? 100 * Math.sqrt(frac) : 100 * (1 - 0.5 * Math.exp(-3 * (frac - 0.5)));
    U = Math.min(100, U);
    var dvMax = 0.5 + p.sig / 400;
    var dv = dvMax * (U / 100);
    // simulated time (min) from Tv = Cv t / H^2, Tv50≈0.197
    var tMin = (0.197 * p.H * p.H / Math.max(0.01, p.cv)) * (U / 50);
    window.__simCO.history.push({ U: U, dv: dv, t: tMin });
    var el;
    el = document.getElementById('sim-co-u'); if (el) el.textContent = U.toFixed(0);
    el = document.getElementById('sim-co-dv'); if (el) el.textContent = dv.toFixed(2);
    el = document.getElementById('sim-co-t'); if (el) el.textContent = tMin.toFixed(1);
    el = document.getElementById('sim-co-estado'); if (el) el.textContent = U >= 99 ? 'Primaria terminada' : 'Consolidando…';
    dibujarEdometro(U, dv);
    var cv = document.getElementById('sim-co-curva');
    if (cv && window.__simCO.history.length > 1) {
        var ctx = cv.getContext('2d');
        var w = cv.width, hh = cv.height;
        ctx.clearRect(0, 0, w, hh);
        ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, w, hh);
        var ox = 40, oy = hh - 20, gx = w - 10, gy = 10;
        var maxT = Math.max(1, window.__simCO.history[window.__simCO.history.length - 1].t);
        function sx(t) { return ox + (t / maxT) * (gx - ox); }
        function sy(u) { return oy - (u / 100) * (oy - gy); }
        ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(ox, gy); ctx.lineTo(ox, oy); ctx.lineTo(gx, oy); ctx.stroke();
        ctx.strokeStyle = '#5ec8ff'; ctx.beginPath();
        window.__simCO.history.forEach(function(pt, i) {
            if (i === 0) ctx.moveTo(sx(pt.t), sy(pt.U)); else ctx.lineTo(sx(pt.t), sy(pt.U));
        });
        ctx.stroke();
        ctx.fillStyle = '#e8b84a'; ctx.font = '11px sans-serif';
        ctx.fillText('U vs t (min)', ox + 6, gy + 12);
    }
    if (frac >= 1) {
        window.__simCO.running = false;
        window.__simCO.paused = false;
        var bs = document.getElementById('btn-sim-co-start');
        if (bs) bs.textContent = '▶ APLICAR CARGA';
        return;
    }
    window.__simCO.raf = requestAnimationFrame(simCOTick);
}

function simularConsolidacionMaquina() {
    if (!window.__simCO.bound) {
        window.__simCO.bound = true;
        ['sim-co-sig', 'sim-co-cv', 'sim-co-h', 'sim-co-vel'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', function() {
                var p = simCOParams();
                var a = document.getElementById('sim-co-sig-val'); if (a) a.textContent = p.sig;
                var b = document.getElementById('sim-co-cv-val'); if (b) b.textContent = p.cv;
                if (!window.__simCO.running) dibujarEdometro(0, 0);
            });
        });
        var bs = document.getElementById('btn-sim-co-start');
        var br = document.getElementById('btn-sim-co-reset');
        if (bs) bs.addEventListener('click', function() {
            if (window.__simCO.running && !window.__simCO.paused) {
                window.__simCO.paused = true;
                window.__simCO.pauseAt = performance.now();
                if (window.__simCO.raf) cancelAnimationFrame(window.__simCO.raf);
                bs.textContent = '▶ CONTINUAR';
                var st = document.getElementById('sim-co-estado'); if (st) st.textContent = 'Pausado';
                return;
            }
            if (window.__simCO.running && window.__simCO.paused) {
                window.__simCO.paused = false;
                window.__simCO.pauseAccum = (window.__simCO.pauseAccum || 0) + (performance.now() - (window.__simCO.pauseAt || performance.now()));
                bs.textContent = '⏸ PAUSA';
                var st = document.getElementById('sim-co-estado'); if (st) st.textContent = 'Continuando…';
                window.__simCO.raf = requestAnimationFrame(simCOTick);
                return;
            }
            window.__simCO.running = true;
            window.__simCO.paused = false;
            window.__simCO.pauseAccum = 0;
            window.__simCO.t0 = 0;
            window.__simCO.history = [];
            bs.textContent = '⏸ PAUSA';
            window.__simCO.raf = requestAnimationFrame(simCOTick);
        });
        if (br) br.addEventListener('click', function() {
            if (window.__simCO.raf) cancelAnimationFrame(window.__simCO.raf);
            window.__simCO.running = false;
            window.__simCO.paused = false;
            window.__simCO.pauseAccum = 0;
            window.__simCO.history = [];
            dibujarEdometro(0, 0);
            var st = document.getElementById('sim-co-estado'); if (st) st.textContent = 'Listo';
            if (bs) bs.textContent = '▶ APLICAR CARGA';
        });
    }
    var p = simCOParams();
    var a = document.getElementById('sim-co-sig-val'); if (a) a.textContent = p.sig;
    var b = document.getElementById('sim-co-cv-val'); if (b) b.textContent = p.cv;
    dibujarEdometro(0, 0);
}

// =========================================
// MÁQUINA: TRIAXIAL
// =========================================
window.__simTX = window.__simTX || { running: false, paused: false, pauseAccum: 0, history: [], raf: null };

function simTXParams() {
    var c = parseFloat((document.getElementById('sim-tx-c') || {}).value) || 15;
    var phi = parseFloat((document.getElementById('sim-tx-phi') || {}).value) || 25;
    var s3 = parseFloat((document.getElementById('sim-tx-s3') || {}).value) || 100;
    var vel = parseFloat((document.getElementById('sim-tx-vel') || {}).value) || 3;
    var tipo = (document.getElementById('sim-tx-tipo') || {}).value || 'CU';
    var dmm = parseFloat((document.getElementById('sim-tx-d') || {}).value) || 38;
    var hmm = parseFloat((document.getElementById('sim-tx-h') || {}).value) || 76;
    if (window.__datosEnsayoMS2 && window.__datosEnsayoMS2.triaxial) {
        var d = window.__datosEnsayoMS2.triaxial;
        if (d.c != null) c = d.c;
        if (d.phi != null) phi = d.phi;
    }
    var pr = phi * Math.PI / 180;
    var den = Math.max(0.05, 1 - Math.sin(pr));
    var N = (1 + Math.sin(pr)) / den;
    var s1f = s3 * N + 2 * c * Math.sqrt(N);
    var devf = Math.max(10, s1f - s3);
    return { c: c, phi: phi, s3: s3, vel: vel, tipo: tipo, s1f: s1f, devf: devf, dmm: dmm, hmm: hmm };
}

function dibujarCamaraTX(eps, s1, s3) {
    var canvas = document.getElementById('sim-tx-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, w, h);
    var p = simTXParams();
    eps = eps || 0;
    s3 = s3 != null ? s3 : p.s3;
    s1 = s1 != null ? s1 : s3;

    var refD = 38, refH = 76;
    var baseW = 44 * (p.dmm / refD);
    var baseH = 88 * (p.hmm / refH);
    baseW = Math.max(26, Math.min(58, baseW));
    baseH = Math.max(52, Math.min(120, baseH));
    if (baseH / baseW < 1.4) baseH = baseW * 1.6;
    if (baseH / baseW > 2.5) baseH = baseW * 2.1;

    var soft = Math.max(0.55, Math.min(1.5, 200 / Math.max(40, p.devf)));
    var axial = Math.min(0.32, (eps / 100) * soft);
    var sampleH = baseH * (1 - axial);
    var sampleW = baseW * (1 + (eps / 100) * 0.28 * soft);
    var cx = w / 2;

    // cámara proporcional al cilindro (no aplastada)
    var cellH = Math.max(150, sampleH + 70);
    var cellTop = 36;
    ctx.strokeStyle = '#5ec8ff';
    ctx.lineWidth = 2.5;
    var cellW = Math.max(120, sampleW + 56);
    ctx.strokeRect(cx - cellW / 2, cellTop, cellW, cellH);
    ctx.fillStyle = 'rgba(94,200,255,0.08)';
    ctx.fillRect(cx - cellW / 2, cellTop, cellW, cellH);
    ctx.fillStyle = '#5ec8ff';
    ctx.font = '10px sans-serif';
    ctx.fillText('Cámara σ₃', cx - 28, cellTop - 6);

    // flechas confinamiento (más grosor si σ3 alto)
    ctx.strokeStyle = '#5ec8ff';
    ctx.lineWidth = 1.5 + Math.min(3, s3 / 150);
    ctx.beginPath();
    ctx.moveTo(cx - cellW / 2 - 16, cellTop + cellH / 2); ctx.lineTo(cx - cellW / 2 - 2, cellTop + cellH / 2);
    ctx.moveTo(cx + cellW / 2 + 2, cellTop + cellH / 2); ctx.lineTo(cx + cellW / 2 + 16, cellTop + cellH / 2);
    ctx.stroke();

    var sy0 = cellTop + (cellH - sampleH) / 2 + 8;
    ctx.fillStyle = '#6b5b2e';
    ctx.fillRect(cx - sampleW / 2, sy0, sampleW, sampleH);
    ctx.strokeStyle = '#c9a84c'; ctx.strokeRect(cx - sampleW / 2, sy0, sampleW, sampleH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    for (var i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - sampleW / 2, sy0 + 8 + i * (sampleH / 5));
        ctx.lineTo(cx + sampleW / 2, sy0 + 8 + i * (sampleH / 5));
        ctx.stroke();
    }
    if (eps > 6) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(cx - sampleW / 2, sy0 + sampleH * 0.28);
        ctx.lineTo(cx + sampleW / 2, sy0 + sampleH * 0.72);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.fillStyle = '#7a7268';
    ctx.fillRect(cx - 24, sy0 - 10, 48, 10);
    ctx.fillRect(cx - 7, cellTop + 4, 14, Math.max(6, sy0 - cellTop - 14));
    ctx.fillRect(cx - 24, sy0 + sampleH, 48, 10);

    ctx.fillStyle = '#9dffc0';
    ctx.font = '10px sans-serif';
    ctx.fillText('Ø=' + p.dmm.toFixed(0) + '  H=' + p.hmm.toFixed(0) + ' mm', 8, h - 8);
    ctx.fillStyle = '#ccc';
    ctx.fillText('σ1=' + s1.toFixed(0) + '  σ3=' + s3.toFixed(0) + '  (σ1−σ3)=' + (s1 - s3).toFixed(0) + ' kPa  εa=' + eps.toFixed(1) + '%', 8, 14);
    ctx.fillStyle = '#e8b84a';
    ctx.fillText('c=' + p.c.toFixed(0) + '  φ=' + p.phi.toFixed(0) + '°  → σ1,f≈' + p.s1f.toFixed(0) + ' kPa', 8, 28);
}

function simTXTick(ts) {
    if (!window.__simTX.running || window.__simTX.paused) return;
    if (!window.__simTX.t0) window.__simTX.t0 = ts;
    var p = simTXParams();
    var dur = { 1: 5, 2: 5, 3: 2.5, 4: 1, 5: 0.5 }[Math.round(p.vel)] || 2.5;
    var elapsed = (ts - window.__simTX.t0 - (window.__simTX.pauseAccum || 0)) / 1000;
    var eps = Math.min(18, (elapsed / dur) * 18);
    var ep = 10;
    var dev;
    if (eps < ep) dev = p.devf * (1 - Math.pow(1 - eps / ep, 2));
    else dev = p.devf * Math.max(0.75, 1 - (eps - ep) / 50);
    var s1 = p.s3 + dev;
    window.__simTX.history.push({ eps: eps, dev: dev });
    var el;
    el = document.getElementById('sim-tx-s1'); if (el) el.textContent = s1.toFixed(0);
    el = document.getElementById('sim-tx-s3r'); if (el) el.textContent = p.s3.toFixed(0);
    el = document.getElementById('sim-tx-dev'); if (el) el.textContent = dev.toFixed(0);
    el = document.getElementById('sim-tx-eps'); if (el) el.textContent = eps.toFixed(1);
    el = document.getElementById('sim-tx-estado');
    if (el) el.textContent = eps >= 17 ? 'Falla' : (dev >= p.devf * 0.98 ? '¡Pico!' : 'Cortando…');
    dibujarCamaraTX(eps, s1, p.s3);
    var cv = document.getElementById('sim-tx-curva');
    if (cv) {
        var ctx = cv.getContext('2d');
        var w = cv.width, hh = cv.height;
        ctx.clearRect(0, 0, w, hh);
        ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, w, hh);
        var ox = 40, oy = hh - 20, gx = w - 10, gy = 10;
        function sx(x) { return ox + (x / 18) * (gx - ox); }
        function sy(y) { return oy - (y / (p.devf * 1.2)) * (oy - gy); }
        ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(ox, gy); ctx.lineTo(ox, oy); ctx.lineTo(gx, oy); ctx.stroke();
        ctx.strokeStyle = '#5ec8ff'; ctx.beginPath();
        window.__simTX.history.forEach(function(pt, i) {
            if (i === 0) ctx.moveTo(sx(pt.eps), sy(pt.dev)); else ctx.lineTo(sx(pt.eps), sy(pt.dev));
        });
        ctx.stroke();
        ctx.fillStyle = '#e8b84a'; ctx.font = '11px sans-serif';
        ctx.fillText('(σ1−σ3) vs εa', ox + 6, gy + 12);
    }
    if (eps >= 18) {
        window.__simTX.running = false;
        window.__simTX.paused = false;
        var bs = document.getElementById('btn-sim-tx-start');
        if (bs) bs.textContent = '▶ INICIAR ENSAYO';
        return;
    }
    window.__simTX.raf = requestAnimationFrame(simTXTick);
}

function simularTriaxial() {
    if (window.__datosEnsayoMS2 && window.__datosEnsayoMS2.triaxial) {
        var d = window.__datosEnsayoMS2.triaxial;
        var elC = document.getElementById('sim-tx-c');
        var elP = document.getElementById('sim-tx-phi');
        if (elC && d.c != null) elC.value = d.c;
        if (elP && d.phi != null) elP.value = d.phi;
    }
    if (!window.__simTX.bound) {
        window.__simTX.bound = true;
        ['sim-tx-c', 'sim-tx-phi', 'sim-tx-s3', 'sim-tx-vel', 'sim-tx-tipo', 'sim-tx-d', 'sim-tx-h'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', function() {
                var p = simTXParams();
                var a = document.getElementById('sim-tx-c-val'); if (a) a.textContent = p.c.toFixed(0);
                var b = document.getElementById('sim-tx-phi-val'); if (b) b.textContent = p.phi.toFixed(0);
                var c = document.getElementById('sim-tx-s3-val'); if (c) c.textContent = p.s3.toFixed(0);
                var d = document.getElementById('sim-tx-vel-val'); if (d) d.textContent = ' (~' + ({ 1: 5, 2: 5, 3: 2.5, 4: 1, 5: 0.5 }[Math.round(p.vel)] || 2.5) + ' s)';
                if (!window.__simTX.running) {
                    // Preview: cilindro a tamaño real; leve “aplastado” si el suelo es muy blando
                    var pre = Math.max(0, (120 - p.devf) / 120 * 4);
                    dibujarCamaraTX(pre, p.s3 + pre * 2, p.s3);
                }
            });
        });
        var bs = document.getElementById('btn-sim-tx-start');
        var br = document.getElementById('btn-sim-tx-reset');
        if (bs) bs.addEventListener('click', function() {
            if (window.__simTX.running && !window.__simTX.paused) {
                window.__simTX.paused = true;
                window.__simTX.pauseAt = performance.now();
                if (window.__simTX.raf) cancelAnimationFrame(window.__simTX.raf);
                bs.textContent = '▶ CONTINUAR';
                var st = document.getElementById('sim-tx-estado'); if (st) st.textContent = 'Pausado';
                return;
            }
            if (window.__simTX.running && window.__simTX.paused) {
                window.__simTX.paused = false;
                window.__simTX.pauseAccum = (window.__simTX.pauseAccum || 0) + (performance.now() - (window.__simTX.pauseAt || performance.now()));
                bs.textContent = '⏸ PAUSA';
                var st = document.getElementById('sim-tx-estado'); if (st) st.textContent = 'Continuando…';
                window.__simTX.raf = requestAnimationFrame(simTXTick);
                return;
            }
            window.__simTX.running = true;
            window.__simTX.paused = false;
            window.__simTX.pauseAccum = 0;
            window.__simTX.t0 = 0;
            window.__simTX.history = [];
            bs.textContent = '⏸ PAUSA';
            window.__simTX.raf = requestAnimationFrame(simTXTick);
        });
        if (br) br.addEventListener('click', function() {
            if (window.__simTX.raf) cancelAnimationFrame(window.__simTX.raf);
            window.__simTX.running = false;
            window.__simTX.paused = false;
            window.__simTX.pauseAccum = 0;
            window.__simTX.history = [];
            var p = simTXParams();
            dibujarCamaraTX(0, p.s3, p.s3);
            var st = document.getElementById('sim-tx-estado'); if (st) st.textContent = 'Listo';
            if (bs) bs.textContent = '▶ INICIAR ENSAYO';
        });
    }
    var p = simTXParams();
    var a = document.getElementById('sim-tx-c-val'); if (a) a.textContent = p.c.toFixed(0);
    var b = document.getElementById('sim-tx-phi-val'); if (b) b.textContent = p.phi.toFixed(0);
    var c = document.getElementById('sim-tx-s3-val'); if (c) c.textContent = p.s3.toFixed(0);
    dibujarCamaraTX(0, p.s3, p.s3);
}
