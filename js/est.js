/* =========================================================
   GeoMetrics — Estructuras I (165013) · pestaña ENSAYOS
   Ocho prácticas de análisis estructural con formulario,
   resultados, figura y guardado en «Mis resultados».
   Requiere: js/est-calc.js
   ========================================================= */
(function (root) {
    'use strict';
    var C = root.EstCalc;
    if (!C) { if (root.console) console.error('Estructuras I: falta js/est-calc.js'); return; }

    var E = root.Estru = root.Estru || {};
    var DEFS = {};
    var ORDER = ['centroides', 'indeterminacion', 'viga', 'voladizo', 'cercha', 'portico', 'rigidez', 'continuas'];
    var LAST = null;
    E.state = { open: null };
    E.DEFS = DEFS;
    E.ORDER = ORDER;

    /* ---------------- utilidades ---------------- */
    function $(id) { return document.getElementById(id); }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function fmt(v, d) {
        if (v == null || !isFinite(v)) return '—';
        return Number(v).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    function num(id) {
        var el = $(id); if (!el) return NaN;
        var s = String(el.value).trim().replace(',', '.');
        if (s === '') return NaN;
        var v = parseFloat(s);
        return isFinite(v) ? v : NaN;
    }
    function val(id) { var el = $(id); return el ? el.value : ''; }
    function field(id, label, value, o) {
        o = o || {};
        return '<label class="dm-field' + (o.wide ? ' dm-wide' : '') + '" for="' + id + '"><span class="dm-lab">' + label +
            (o.unit ? ' <em>(' + o.unit + ')</em>' : '') + '</span>' +
            '<input type="number" inputmode="decimal" id="' + id + '" value="' + (value == null ? '' : value) + '" step="' + (o.step || 'any') + '"' +
            (o.min != null ? ' min="' + o.min + '"' : '') + (o.max != null ? ' max="' + o.max + '"' : '') + '>' +
            (o.hint ? '<small class="dm-hint">' + o.hint + '</small>' : '') + '</label>';
    }
    function select(id, label, opts, sel) {
        return '<label class="dm-field" for="' + id + '"><span class="dm-lab">' + label + '</span><select id="' + id + '">' +
            opts.map(function (op) {
                var v = Array.isArray(op) ? op[0] : op, t = Array.isArray(op) ? op[1] : op;
                return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(t) + '</option>';
            }).join('') + '</select></label>';
    }
    function tiles(items) {
        return '<div class="dm-tiles">' + items.map(function (it) {
            return '<div class="dm-tile' + (it.tone ? ' is-' + it.tone : '') + (it.big ? ' is-big' : '') + '"><span>' + it.l +
                '</span><strong>' + it.v + '</strong>' + (it.s ? '<small>' + it.s + '</small>' : '') + '</div>';
        }).join('') + '</div>';
    }
    function alerts(list) {
        if (!list || !list.length) return '';
        return '<ul class="dm-alerts">' + list.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    }
    function errorBox(msg) { return '<div class="dm-error" role="alert">⚠ ' + esc(msg) + '</div>'; }

    function fitCanvas(c, ratio) {
        if (!c) return null;
        var w = Math.round(c.getBoundingClientRect().width || c.parentNode.clientWidth || 0);
        if (w < 40) return null;
        var h = Math.round(w * (ratio || parseFloat(c.getAttribute('data-ratio')) || 0.58));
        var dpr = Math.min(2.5, root.devicePixelRatio || 1);
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
            c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        }
        c.style.height = h + 'px';
        var ctx = c.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, W: w, H: h };
    }
    var COL = {
        bg: '#0B1220', panel: '#0f1c2e', grid: 'rgba(167,180,200,.09)', axis: 'rgba(167,180,200,.5)',
        txt: '#c9d4df', dim: '#718096', acc: '#3B82F6', ok: '#34D399', warn: '#F59E0B', bad: '#F87171',
        beam: '#93C5FD', conc: '#94A3B8', load: '#FBBF24'
    };

    /* ---------------- iconos de las tarjetas ---------------- */
    var ICONS = {
        centroides: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h44v12H36v28H20V24H10z"/><path d="M6 56h52" stroke-dasharray="2 4"/><circle cx="28" cy="34" r="3.4"/><path d="M28 27v-6M28 41v6M21 34h-6M35 34h6"/></svg>',
        indeterminacion: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 50h48M14 50V22h36v28"/><path d="M14 22l9-8h18l9 8"/><path d="M32 22v10"/><circle cx="32" cy="36" r="4"/><path d="M18 50l8-12M46 50l-8-12"/></svg>',
        viga: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 38h54"/><path d="M9 38l-5 12h10zM55 38l-5 12h10z"/><path d="M32 8v18M27 14l5-6 5 6"/><path d="M14 28v10M18 28l-4 10M42 28v10M46 28l-4 10"/><path d="M8 56h48" stroke-dasharray="2 4"/></svg>',
        voladizo: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12v40M10 36h44"/><path d="M10 18h-4M10 28h-4M10 46h-4"/><path d="M44 14v18M39 20l5-6 5 6"/><path d="M30 26v10M34 26l-4 10"/><path d="M6 56h50" stroke-dasharray="2 4"/></svg>',
        cercha: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 46h54M9 46l11-24h24l11 24"/><path d="M20 46V22M32 46V22M44 46V22M20 22l12 24M44 22L32 46M20 22l24 24M44 22L20 46"/><path d="M32 8v6"/></svg>',
        portico: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 54V16h40v38"/><path d="M8 54h10M46 54h10"/><path d="M32 16V8"/><path d="M26 8h12"/><path d="M12 30h40" stroke-dasharray="2 4"/><path d="M12 30l8-6M52 30l-8-6"/><circle cx="12" cy="16" r="2.4"/><circle cx="52" cy="16" r="2.4"/></svg>',
        rigidez: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="18" height="18" rx="2"/><rect x="38" y="8" width="18" height="18" rx="2"/><rect x="8" y="38" width="18" height="18" rx="2"/><rect x="38" y="38" width="18" height="18" rx="2"/><path d="M26 17h12M17 26v12M47 26v12M26 47h12"/></svg>',
        continuas: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 38h56"/><path d="M8 38l-4 10h8zM56 38l-4 10h8zM32 38l-4 10h8z"/><path d="M20 26v10M24 26l-4 10M44 26v10M48 26l-4 10"/><path d="M8 56h48" stroke-dasharray="2 4"/></svg>'
    };

    /* ---------------- inicio (lista de prácticas) ---------------- */
    function esCard(id, i) {
        var d = DEFS[id];
        return '<button type="button" class="ensayo-card ms2-card" data-ensayo="' + id + '" style="--ms2-accent:' + d.accent + ';--ms2-rgb:' + d.rgb + '">' +
            '<div class="ms2-card-head"><em class="ms2-card-num">' + String(i + 1).padStart(2, '0') + '</em><em class="ms2-card-tag">' + esc(d.tag) + '</em></div>' +
            '<div class="ms2-card-body"><div class="ms2-glyph">' + ICONS[id] + '</div><div class="ms2-card-text"><h3>' + esc(d.title) + '</h3><p>' + esc(d.desc) + '</p></div></div>' +
            '<div class="ms2-chips">' + d.chips.map(function (c) { return '<em>' + c + '</em>'; }).join('') + '</div>' +
            '<span class="ms2-card-cta">ABRIR PRÁCTICA <i>→</i></span></button>';
    }

    function home() {
        return '<header class="ms2-hero">' +
            '<div class="ms2-hero-text"><em class="ms2-eyebrow">Laboratorio virtual · Estructuras I · 165013</em>' +
            '<h3>Calcular, dibujar y entender la estructura</h3>' +
            '<p>Ocho prácticas que recorren el programa: propiedades de sección, estabilidad, vigas, voladizos, cerchas, pórticos, matriz de rigidez y vigas continuas. Ingresa los datos, obtén los diagramas y guarda el informe.</p>' +
            '<ol class="ms2-flow"><li><b>1</b>Modelo</li><li><b>2</b>Cálculo</li><li><b>3</b>Diagrama</li><li><b>4</b>Informe</li></ol></div>' +
            '<ul class="ms2-hero-stats"><li><strong>8</strong><em>Prácticas</em></li><li><strong>5</strong><em>Simuladores</em></li><li><strong>4</strong><em>Unidades</em></li></ul></header>' +
            '<div class="ensayos-grid ms2-grid est-grid">' + ORDER.map(esCard).join('') + '</div>' +
            '<section class="ms2-guias est-ruta"><div class="ms2-guias-head"><h4>Ruta del curso</h4><p>Las cuatro unidades del programa, conectadas con la teoría y los simuladores.</p></div>' +
            '<div class="est-ruta-chips"><span><b>U1</b>Generalidades y análisis</span><span><b>U2</b>Métodos energéticos</span><span><b>U3</b>Método directo de rigidez</span><span><b>U4</b>Métodos aproximados</span></div></section>';
    }

    /* ---------------- detalle de la práctica ---------------- */
    function detail(id) {
        var d = DEFS[id];
        return '<div class="ms2-shell est-shell" style="--ms2-accent:' + d.accent + ';--ms2-rgb:' + d.rgb + '">' +
            '<div class="ms2-topbar"><button type="button" class="btn-limpiar ms2-back" id="estBack">← Prácticas</button>' +
            '<div class="ms2-crumbs"><span>Estructuras I</span><i>/</i><span>Ensayos</span><i>/</i><b>' + esc(d.title) + '</b></div>' +
            (d.sim ? '<button type="button" class="btn-limpiar est-simlink" data-go-sim="' + d.sim + '">Abrir simulador →</button>' : '') + '</div>' +
            '<header class="ms2-phero"><div class="ms2-phero-icon">' + ICONS[id] + '</div>' +
            '<div class="ms2-phero-text"><em>Práctica ' + String(ORDER.indexOf(id) + 1).padStart(2, '0') + ' · ' + esc(d.tag) + '</em>' +
            '<h2>' + esc(d.title) + '</h2><p class="ms2-fund"><b>Objetivo</b> ' + esc(d.objetivo) + '</p></div>' +
            '<ul class="ms2-phero-meta"><li><b>Referencia</b><span>' + esc(d.norma) + '</span></li>' +
            '<li><b>Unidad del programa</b><span>' + esc(d.unidad) + '</span></li>' +
            '<li><b>Entregable</b><span>' + esc(d.entrega) + '</span></li></ul></header>' +
            '<div class="est-work"><div class="est-work-main">' +
            '<section class="dm-panel est-panel"><h4>Datos de entrada</h4>' + d.form() +
            '<div class="dm-actions"><button type="button" class="btn-calcular" id="estCalc">CALCULAR Y DIBUJAR</button>' +
            '<button type="button" class="btn-limpiar" id="estReset">Restablecer</button></div></section>' +
            '<section class="dm-panel est-panel"><h4>Procedimiento y criterio</h4><div class="est-proc">' + d.proc + '</div></section>' +
            '</div><aside class="est-work-side">' +
            '<section class="dm-panel est-panel est-respanel"><h4>Resultados</h4><div id="estRes" class="dm-res"><p class="dm-empty">Completa los datos y pulsa CALCULAR.</p></div>' +
            '<div class="dm-actions dm-savebar"><button type="button" class="btn-calcular" id="estSave">Guardar en Mis resultados</button>' +
            '<button type="button" class="btn-limpiar" id="estPrint">Informe (imprimir / PDF)</button></div></section>' +
            '<section class="dm-panel est-panel est-figure"><h4>Figura del modelo</h4><canvas id="estCanvas" data-ratio="0.62" role="img" aria-label="Figura del modelo estructural"></canvas>' +
            '<div class="est-legend" id="estLegend"></div></section>' +
            '</aside></div></div>';
    }

    function render() {
        var host = $('est-ensayos'); if (!host) return;
        host.innerHTML = E.state.open ? detail(E.state.open) : home();
        if (E.state.open) {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () { run(false); });
            });
        }
    }

    function open(id) {
        if (!DEFS[id]) return;
        E.state.open = id; LAST = null;
        var tab = document.querySelector('#pantallaEstructuras .tab-btn[data-tab="est-ensayos"]');
        if (tab && !tab.classList.contains('active')) tab.click();
        render();
        scrollTop();
    }
    function close() {
        E.state.open = null; LAST = null; render(); scrollTop();
    }
    function scrollTop() {
        try {
            var s = $('pantallaEstructuras');
            if (s && s.scrollIntoView) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else root.scrollTo(0, 0);
        } catch (e) { root.scrollTo(0, 0); }
    }

    /* ---------------- cálculo y publicación ---------------- */
    function run(showErrors) {
        var d = DEFS[E.state.open]; if (!d) return null;
        var p, r;
        try {
            p = d.read();
            r = d.calc(p);
        } catch (err) {
            if (showErrors !== false) {
                var res = $('estRes');
                if (res) res.innerHTML = errorBox(err.userMessage || err.message || 'Revisa los datos ingresados.');
                var lg = $('estLegend'); if (lg) lg.innerHTML = '';
            }
            return null;
        }
        var rep = d.report(r, p);
        LAST = { id: d.id, p: p, r: r, rep: rep };
        var box = $('estRes');
        if (box) {
            box.innerHTML = tiles(d.tiles(r, p)) + (d.table ? d.table(r, p) : '') + alerts(d.notas ? d.notas(r, p) : []) +
                '<p class="est-footnote">' + esc(d.footnote || 'Resultados de análisis elástico lineal. Verifica unidades y hipótesis antes de usarlos en un diseño real.') + '</p>';
        }
        var lgd = $('estLegend');
        if (lgd) lgd.innerHTML = (d.legend || []).map(function (x) { return '<span><i style="background:' + x[1] + '"></i>' + x[0] + '</span>'; }).join('');
        var canvas = $('estCanvas');
        if (canvas) {
            var f = fitCanvas(canvas, d.ratio || 0.62);
            if (f) d.draw(f.ctx, f.W, f.H, r, p);
        }
        return LAST;
    }

    function save() {
        if (!LAST) { run(true); if (!LAST) return; }
        if (typeof root.guardarResultado !== 'function') { alert('El historial no está disponible.'); return; }
        var d = DEFS[LAST.id];
        root.guardarResultado('Estructuras I — ' + d.title, LAST.rep.resumen, {
            tipo: 'est-' + d.id,
            entradas: LAST.rep.entradas,
            reporteHTML: reportHTML(LAST.rep)
        });
        var b = $('estSave');
        if (b) { b.textContent = '✓ Guardado'; setTimeout(function () { b.textContent = 'Guardar en Mis resultados'; }, 1800); }
    }

    function reportHTML(rep) {
        rep = rep || {};
        function rows(arr) {
            return (arr || []).map(function (x) {
                return '<tr><td>' + esc(x.label) + '</td><td>' + esc(x.valor) + '</td></tr>';
            }).join('');
        }
        return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + esc(rep.titulo) + ' — GeoMetrics</title><style>' +
            'body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;max-width:840px}h1{font-size:20px;margin:0 0 4px;color:#003366}' +
            'h2{font-size:13px;margin:22px 0 6px;color:#003366;border-bottom:2px solid #003366;padding-bottom:3px}.m{color:#555;font-size:12px;line-height:1.6}' +
            'table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #bbb;padding:5px 8px;text-align:left}th{background:#eef2f7}' +
            'td:last-child{text-align:right;font-variant-numeric:tabular-nums}li{font-size:12px;margin:3px 0}.f{margin-top:28px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:8px}' +
            '.eq{background:#f4f7fa;border-left:3px solid #003366;padding:8px 12px;font-size:13px;margin:8px 0}' +
            '@media print{body{margin:14mm}}</style></head><body>' +
            '<h1>' + esc(rep.titulo) + '</h1><div class="m">Universidad de Pamplona · Ingeniería Civil · Estructuras I (165013) · GeoMetrics<br>' +
            'Referencia: ' + esc(rep.norma || '—') + '<br>Fecha: ' + esc(rep.fecha || new Date().toLocaleString('es-CO')) +
            (rep.usuario ? ' · Estudiante/Docente: ' + esc(rep.usuario) : '') + '</div>' +
            '<h2>Datos ingresados</h2><table><tbody>' + rows(rep.entradas) + '</tbody></table>' +
            '<h2>Resultados</h2><table><tbody>' + rows(rep.resultados) + '</tbody></table>' +
            (rep.tablaHtml ? '<h2>Detalle del cálculo</h2>' + rep.tablaHtml : '') +
            (rep.formulas ? '<h2>Ecuaciones empleadas</h2><div class="eq">' + rep.formulas + '</div>' : '') +
            ((rep.avisos && rep.avisos.length) ? '<h2>Observaciones</h2><ul>' + rep.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
            '<div class="f">Informe académico generado con GeoMetrics. Los resultados corresponden a un modelo elástico lineal con las hipótesis indicadas; no reemplazan la revisión de un ingeniero responsable.</div>' +
            '<script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script></body></html>';
    }

    function printReport(repHTML) {
        if (repHTML && typeof repHTML === 'string' && repHTML.indexOf('<html') >= 0) {
            var w0 = root.open('', '_blank');
            if (!w0) { alert('Permite ventanas emergentes para generar el informe.'); return; }
            w0.document.open(); w0.document.write(repHTML); w0.document.close(); return;
        }
        if (!LAST) { run(true); if (!LAST) return; }
        var rep = LAST.rep;
        try {
            var s = typeof root.aulaGetSession === 'function' ? root.aulaGetSession() : null;
            rep.usuario = s ? (s.nombre || s.email || '') : '';
        } catch (e) {}
        rep.fecha = new Date().toLocaleString('es-CO');
        var w = root.open('', '_blank');
        if (!w) { alert('Permite ventanas emergentes para generar el informe.'); return; }
        w.document.open(); w.document.write(reportHTML(rep)); w.document.close();
    }

    /* ---------------- eventos ---------------- */
    function bind() {
        var host = $('est-ensayos'); if (!host || host.getAttribute('data-est-bind') === '1') return;
        host.setAttribute('data-est-bind', '1');
        host.addEventListener('click', function (e) {
            var t = e.target;
            var card = t.closest ? t.closest('[data-ensayo]') : null;
            if (card) { e.preventDefault(); open(card.getAttribute('data-ensayo')); return; }
            if (t.closest && t.closest('#estBack')) { e.preventDefault(); close(); return; }
            if (t.closest && t.closest('#estCalc')) { e.preventDefault(); run(true); return; }
            if (t.closest && t.closest('#estSave')) { e.preventDefault(); save(); return; }
            if (t.closest && t.closest('#estPrint')) { e.preventDefault(); printReport(); return; }
            var simBtn = t.closest ? t.closest('[data-go-sim]') : null;
            if (simBtn) {
                e.preventDefault();
                var id = simBtn.getAttribute('data-go-sim');
                var tab = document.querySelector('#pantallaEstructuras .tab-btn[data-tab="est-simuladores"]');
                if (tab && !tab.classList.contains('active')) tab.click();
                if (root.EstruSim && typeof root.EstruSim.open === 'function') root.EstruSim.open(id);
                return;
            }
            if (t.closest && t.closest('#estReset')) {
                e.preventDefault();
                render();
                requestAnimationFrame(function () { requestAnimationFrame(function () { run(true); }); });
            }
        });
        host.addEventListener('input', function (e) {
            var t = e.target;
            if (t && t.id === 'estAngle') {
                var o = $('estAngleV'); if (o) o.textContent = t.value + '°';
            }
        });
    }

    E.reportHTML = reportHTML;
    E.open = open;
    E.close = close;
    E.render = render;
    E.printReport = printReport;
    E.refresh = function () { run(true); };
    E.last = function () { return LAST; };

    function init() {
        bind();
        render();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    /* =========================================================
       DEFINICIONES DE LAS PRÁCTICAS (se completan abajo)
       ========================================================= */
    function entradas(pairs) {
        return pairs.map(function (x) { return { label: x[0], valor: String(x[1]) }; });
    }

    /* =========================================================
       01 · SECCIÓN Y CENTROIDE
       ========================================================= */
    DEFS.centroides = {
        id: 'centroides', title: 'Sección compuesta y centroide', tag: 'Geometría',
        accent: '#38BDF8', rgb: '56,189,248', unidad: 'Generalidades · propiedades de sección',
        entrega: 'Área, centroide, inercia y módulos de sección',
        desc: 'Área, centro de gravedad, momento de inercia y módulo de sección de una viga T o I.',
        objetivo: 'reducir una sección real a sus propiedades geométricas para el análisis de flexión.',
        norma: 'Hibbeler, Mecánica de Materiales, cap. 6 · Beer & Johnston, cap. 4',
        chips: ['A', 'ȳ', 'Ix', 'Sx', 'radio de giro'],
        proc: '<p>La sección se descompone en rectángulos. Para cada uno se calcula su área y su centro, y se aplica el <b>teorema de los ejes paralelos</b>:</p>' +
            '<div class="est-eq">A = Σ bᵢhᵢ · ȳ = Σ(Aᵢyᵢ)/A · Ix = Σ[ bᵢhᵢ³/12 + Aᵢ(yᵢ − ȳ)² ]</div>' +
            '<p>El módulo de sección se toma respecto a la fibra superior e inferior: S = Ix / c. La fibra más alejada del centroide gobierna el esfuerzo normal por flexión.</p>' +
            '<p><b>Revisión:</b> usa las mismas unidades en todos los términos. Si la sección tiene un eje de simetría vertical, el centroide horizontal está sobre ese eje.</p>',
        form: function () {
            return '<div class="dm-formrow"><label class="dm-field dm-wide"><span class="dm-lab">Tipo de sección</span><select id="ctTipo"><option value="T">T (ala superior + alma)</option><option value="I">I (ala superior + alma + ala inferior)</option></select></label></div>' +
                '<div class="dm-formrow dm-3">' + field('ctBf', 'Ancho del ala superior', 240, { unit: 'mm', step: '1', min: 1 }) +
                field('ctHf', 'Espesor del ala superior', 40, { unit: 'mm', step: '1', min: 1 }) +
                field('ctBw', 'Ancho del alma', 40, { unit: 'mm', step: '1', min: 1 }) + '</div>' +
                '<div class="dm-formrow dm-3">' + field('ctH', 'Altura total', 320, { unit: 'mm', step: '1', min: 1 }) +
                field('ctBi', 'Ancho del ala inferior', 0, { unit: 'mm', step: '1', min: 0 }) +
                field('ctHi', 'Espesor del ala inferior', 0, { unit: 'mm', step: '1', min: 0 }) + '</div>' +
                '<p class="dm-hint">Para una sección T deja el ala inferior en 0. Para una sección rectangular usa bf = bw y hf = H.</p>';
        },
        read: function () {
            var p = {
                tipo: val('ctTipo'), bf: num('ctBf'), hf: num('ctHf'), bw: num('ctBw'),
                H: num('ctH'), bi: num('ctBi') || 0, hi: num('ctHi') || 0
            };
            p.entradas = entradas([
                ['Tipo de sección', p.tipo], ['Ala superior bf × hf (mm)', p.bf + ' × ' + p.hf],
                ['Alma bw (mm)', p.bw], ['Altura total H (mm)', p.H],
                ['Ala inferior bi × hi (mm)', p.bi + ' × ' + p.hi]
            ]);
            return p;
        },
        calc: function (p) {
            if (!(p.bf > 0 && p.hf > 0 && p.bw > 0 && p.H > 0)) throwObject('Revisa las dimensiones: deben ser positivas.');
            if (p.hf >= p.H) throwObject('El espesor del ala debe ser menor que la altura total.');
            var hasBot = p.tipo === 'I' && p.bi > 0 && p.hi > 0;
            var rects = [];
            if (hasBot) rects.push({ b: p.bi, h: p.hi, x: (p.bf - p.bi) / 2, y: 0 });
            var yWeb = hasBot ? p.hi : 0;
            var hWeb = p.H - p.hf - yWeb;
            if (hWeb <= 0) throwObject('La altura del alma no es positiva. Revisa H, hf y hi.');
            rects.push({ b: p.bw, h: hWeb, x: (p.bf - p.bw) / 2, y: yWeb });
            rects.push({ b: p.bf, h: p.hf, x: 0, y: p.H - p.hf });
            return C.sectionProps(rects);
        },
        tiles: function (r) {
            return [
                { l: 'Área', v: fmt(r.A / 100, 1) + ' cm²', big: true, s: fmt(r.A, 0) + ' mm²' },
                { l: 'Centroide ȳ desde la base', v: fmt(r.cy / 10, 2) + ' cm', s: 'x̄ = ' + fmt(r.cx / 10, 2) + ' cm' },
                { l: 'Inercia Ix', v: fmt(r.Ix / 1e4, 0) + ' cm⁴', s: fmt(r.Ix, 0) + ' mm⁴' },
                { l: 'Módulo Sx superior', v: fmt(r.SxTop / 1e3, 0) + ' cm³', s: 'c sup = ' + fmt(r.cTop / 10, 2) + ' cm' },
                { l: 'Módulo Sx inferior', v: fmt(r.SxBot / 1e3, 0) + ' cm³', s: 'c inf = ' + fmt(r.cBot / 10, 2) + ' cm' },
                { l: 'Radio de giro', v: fmt(r.ry / 10, 2) + ' cm', s: 'ry = √(Ix/A)' }
            ];
        },
        table: function (r) {
            return '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Rect.</th><th>b × h (mm)</th><th>A (mm²)</th><th>yᵢ (mm)</th><th>Aᵢyᵢ (mm³)</th><th>I₀ (mm⁴)</th><th>Ix (mm⁴)</th></tr></thead><tbody>' +
                r.rects.map(function (x, i) {
                    return '<tr><td>R' + (i + 1) + '</td><td>' + x.b + ' × ' + x.h + '</td><td>' + fmt(x.A, 0) + '</td><td>' + fmt(x.cy, 1) + '</td><td>' + fmt(x.A * x.cy, 0) + '</td><td>' + fmt(x.Ix0, 0) + '</td><td>' + fmt(x.Ix, 0) + '</td></tr>';
                }).join('') + '</tbody></table></div>';
        },
        notas: function (r, p) {
            var arr = [];
            if (Math.abs(r.cTop - r.cBot) < 1) arr.push('La sección es simétrica respecto al eje horizontal: los módulos superior e inferior coinciden.');
            else arr.push('La fibra más alejada es la ' + (r.cTop > r.cBot ? 'superior' : 'inferior') + '; allí se alcanza el mayor esfuerzo por flexión.');
            if (p.bf < p.bw) arr.push('El ancho del ala es menor que el del alma; revisa la geometría.');
            return arr;
        },
        draw: function (ctx, W, H, r) { drawSectionFig(ctx, W, H, r); },
        legend: [['Sección', '#94A3B8'], ['Centroide', '#38BDF8'], ['Eje neutro', '#FBBF24']],
        report: function (r, p) {
            return {
                titulo: 'Estructuras I — Sección compuesta y centroide', norma: this.norma,
                resumen: 'A = ' + fmt(r.A / 100, 1) + ' cm² · ȳ = ' + fmt(r.cy / 10, 2) + ' cm · Ix = ' + fmt(r.Ix / 1e4, 0) + ' cm⁴',
                entradas: p.entradas,
                resultados: this.tiles(r, p).map(function (t) { return { label: t.l, valor: String(t.v) + (t.s ? ' · ' + t.s : '') }; }),
                tablaHtml: this.table(r, p),
                formulas: 'A = Σ bᵢhᵢ · ȳ = Σ(Aᵢyᵢ)/A · Ix = Σ[bᵢhᵢ³/12 + Aᵢ(yᵢ − ȳ)²] · S = Ix/c',
                avisos: this.notas(r, p)
            };
        }
    };

    /* =========================================================
       02 · ESTABILIDAD E INDETERMINACIÓN
       ========================================================= */
    DEFS.indeterminacion = {
        id: 'indeterminacion', title: 'Estabilidad y grado de indeterminación', tag: 'Estabilidad',
        accent: '#A78BFA', rgb: '167,139,250', unidad: 'Generalidades · idealización',
        entrega: 'DSI, grado cinemático y clasificación',
        desc: 'Clasifica vigas, pórticos y cerchas: isostático, hiperestático o mecanismo.',
        objetivo: 'decidir cuántas incógnitas puede resolver la estática y cuántas redundantes hay.',
        norma: 'Hibbeler, Análisis Estructural, cap. 2 · McCormac, cap. 3',
        chips: ['DSI', 'Dk', 'reacciones', 'estabilidad'],
        proc: '<p>Para vigas y pórticos se cuentan ecuaciones de cuerpo libre (3 por miembro) y la compatibilidad de nudos. Para cerchas, cada barra aporta una incógnita axial y cada nudo dos ecuaciones.</p>' +
            '<div class="est-eq">Vigas y pórticos: DSI = 3m + r − 3j · Dk = 3j − r − m<br>Cerchas: DSI = m + r − 2j · Dk = 2j − r − m</div>' +
            '<p><b>DSI &lt; 0</b> indica mecanismo (faltan restricciones). <b>DSI = 0</b> es isostático. <b>DSI &gt; 0</b> es hiperestático y requiere compatibilidad. Un DSI positivo no garantiza estabilidad: la geometría de apoyos y barras también importa.</p>' +
            '<p>El grado cinemático Dk cuenta los desplazamientos independientes de los nudos; si es negativo, el modelo tiene barras redundantes o la idealización es inconsistente.</p>',
        form: function () {
            return '<div class="dm-formrow">' + select('idTipo', 'Tipo de estructura', [['portico', 'Pórtico plano'], ['viga', 'Viga continua / viga'], ['cercha', 'Cercha']], 'portico') + '</div>' +
                '<div class="dm-formrow dm-3">' + field('idM', 'Miembros m', 3, { step: '1', min: 0 }) +
                field('idJ', 'Nudos j', 4, { step: '1', min: 1 }) + field('idR', 'Reacciones r', 6, { step: '1', min: 0 }) + '</div>' +
                '<p class="dm-hint">Pórtico de un vano con bases empotradas: m = 3, j = 4, r = 6. Cercha Pratt de 4 paneles: m = 13, j = 8, r = 3.</p>';
        },
        read: function () {
            var p = { tipo: val('idTipo'), m: num('idM'), j: num('idJ'), r: num('idR') };
            p.entradas = entradas([['Tipo', p.tipo], ['Miembros m', p.m], ['Nudos j', p.j], ['Reacciones r', p.r]]);
            return p;
        },
        calc: function (p) { return C.indeterminacy(p.tipo, p.m, p.j, p.r); },
        tiles: function (r) {
            return [
                { l: 'Grado indeterminación estático', v: 'DSI = ' + r.dsi, big: true, tone: r.tone, s: r.classification },
                { l: 'Grado cinemático', v: 'Dk = ' + r.dk, s: r.dk === 0 ? 'Nudos sin desplazamiento libre' : 'Desplazamientos independientes' },
                { l: 'Reacciones externas', v: r.r, s: r.external },
                { l: 'Clasificación', v: r.classification, tone: r.tone, s: r.stable ? 'Modelo estable' : 'Revisar apoyos y geometría' }
            ];
        },
        table: function (r) {
            return '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Ecuación</th><th>Sustitución</th><th>Resultado</th></tr></thead><tbody>' +
                (r.isTruss
                    ? '<tr><td>DSI = m + r − 2j</td><td>' + r.m + ' + ' + r.r + ' − 2(' + r.j + ')</td><td><b>' + r.dsi + '</b></td></tr>' +
                      '<tr><td>Dk = 2j − r − m</td><td>2(' + r.j + ') − ' + r.r + ' − ' + r.m + '</td><td><b>' + r.dk + '</b></td></tr>'
                    : '<tr><td>DSI = 3m + r − 3j</td><td>3(' + r.m + ') + ' + r.r + ' − 3(' + r.j + ')</td><td><b>' + r.dsi + '</b></td></tr>' +
                      '<tr><td>Dk = 3j − r − m</td><td>3(' + r.j + ') − ' + r.r + ' − ' + r.m + '</td><td><b>' + r.dk + '</b></td></tr>') +
                '</tbody></table></div>';
        },
        notas: function (r) {
            var a = [r.note, r.external];
            if (r.dsi < 0) a.push('Con DSI negativo el modelo es un mecanismo: agrega apoyos o miembros antes de analizarlo.');
            if (r.dsi > 0) a.push('Con DSI positivo necesitas compatibilidad (energía, rigidez o métodos aproximados); la estática sola no alcanza.');
            return a;
        },
        draw: function (ctx, W, H, r, p) { drawIndetFig(ctx, W, H, r, p); },
        legend: [['Miembro', '#93C5FD'], ['Apoyo', '#34D399'], ['Nudo', '#FBBF24']],
        report: function (r, p) {
            return {
                titulo: 'Estructuras I — Estabilidad e indeterminación', norma: this.norma,
                resumen: 'DSI = ' + r.dsi + ' · Dk = ' + r.dk + ' · ' + r.classification,
                entradas: p.entradas,
                resultados: this.tiles(r, p).map(function (t) { return { label: t.l, valor: String(t.v) + (t.s ? ' · ' + t.s : '') }; }),
                tablaHtml: this.table(r, p),
                formulas: r.isTruss ? 'DSI = m + r − 2j · Dk = 2j − r − m' : 'DSI = 3m + r − 3j · Dk = 3j − r − m',
                avisos: this.notas(r)
            };
        }
    };

    /* =========================================================
       03 · VIGA SIMPLEMENTE APOYADA
       ========================================================= */
    DEFS.viga = {
        id: 'viga', ratio: 0.85, title: 'Viga simplemente apoyada', tag: 'Flexión',
        accent: '#3B82F6', rgb: '59,130,246', unidad: 'Unidad 1 · equilibrio y flexión',
        entrega: 'Reacciones, cortante, momento y flecha',
        desc: 'Carga puntual y distribuida: reacciones, diagramas de cortante y momento, flecha máxima.',
        objetivo: 'resolver una viga isostática y relacionar el diagrama de momentos con el esfuerzo y la flecha.',
        norma: 'Hibbeler, Análisis Estructural, caps. 4–5 · NSR-10 C.8',
        chips: ['RA', 'RB', 'M(x)', 'V(x)', 'δmax', 'σ'],
        sim: 'viga',
        proc: '<p>Se aplican equilibrio de fuerzas y de momentos. La carga puntual P actúa a una distancia a del apoyo A; la carga distribuida w cubre toda la luz.</p>' +
            '<div class="est-eq">RA = P(L−a)/L + wL/2 · RB = Pa/L + wL/2<br>V(x) = RA − wx − P⟨x−a⟩⁰ · M(x) = RAx − wx²/2 − P⟨x−a⟩¹</div>' +
            '<p>La flecha se obtiene por superposición de la solución de la carga puntual y la distribuida. El esfuerzo normal máximo es σ = M c / I con c = h/2.</p>' +
            '<p><b>Chequeo de servicio:</b> para vigas de edificación se suele limitar la flecha a L/360 (cargas totales) o L/480 (cargas vivas), según el uso. Verifica la norma aplicable.</p>',
        form: function () {
            return '<div class="dm-formrow dm-3">' + field('vgL', 'Luz L', 6, { unit: 'm', step: '0.1', min: 0.1 }) +
                field('vgP', 'Carga puntual P', 40, { unit: 'kN', step: '1', min: 0 }) +
                field('vgA', 'Posición a desde A', 2.5, { unit: 'm', step: '0.1', min: 0 }) + '</div>' +
                '<div class="dm-formrow dm-3">' + field('vgW', 'Carga distribuida w', 8, { unit: 'kN/m', step: '0.5', min: 0 }) +
                field('vgE', 'Módulo E', 25, { unit: 'GPa', step: '1', min: 1 }) + '</div>' +
                '<div class="dm-formrow dm-3">' + field('vgB', 'Base b', 300, { unit: 'mm', step: '10', min: 10 }) +
                field('vgH', 'Altura h', 500, { unit: 'mm', step: '10', min: 10 }) + '</div>';
        },
        read: function () {
            var p = { L: num('vgL'), P: num('vgP') || 0, a: num('vgA'), w: num('vgW') || 0, E: num('vgE'), b: num('vgB'), h: num('vgH') };
            if (!(p.a >= 0)) p.a = 0;
            p.entradas = entradas([
                ['Luz L (m)', p.L], ['Carga puntual P (kN)', p.P], ['Posición a (m)', p.a],
                ['Carga distribuida w (kN/m)', p.w], ['E (GPa)', p.E], ['Sección b × h (mm)', p.b + ' × ' + p.h]
            ]);
            return p;
        },
        calc: function (p) {
            if (!(p.a <= p.L)) throwObject('La posición de la carga debe estar entre 0 y L.');
            return C.simpleBeam(p);
        },
        tiles: function (r, p) {
            var lim = p.L * 1000 / 360;
            return [
                { l: 'Reacción RA', v: fmt(r.RA, 1) + ' kN', big: true, s: 'RB = ' + fmt(r.RB, 1) + ' kN' },
                { l: 'Cortante máximo', v: fmt(r.Vmax, 1) + ' kN', s: 'V = dM/dx' },
                { l: 'Momento máximo', v: fmt(r.Mabs, 1) + ' kN·m', tone: 'ok', s: 'x = ' + fmt(r.xM, 2) + ' m' },
                { l: 'Flecha máxima', v: fmt(r.dmax, 2) + ' mm', tone: r.dmax > lim ? 'warn' : 'ok', s: 'x = ' + fmt(r.xd, 2) + ' m · límite L/360 = ' + fmt(lim, 1) + ' mm' },
                { l: 'Esfuerzo σ = Mc/I', v: fmt(r.sigma, 2) + ' MPa', s: 'fibra extrema' },
                { l: 'Rigidez EI', v: fmt(r.EI, 0) + ' kN·m²', s: 'I = ' + fmt(r.I * 1e12, 0) + ' mm⁴' }
            ];
        },
        table: function (r) {
            return '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>x (m)</th><th>V (kN)</th><th>M (kN·m)</th><th>δ (mm)</th></tr></thead><tbody>' +
                [0, 0.25, 0.5, 0.75, 1].map(function (t) {
                    var x = r.L * t;
                    return '<tr><td>' + fmt(x, 2) + '</td><td>' + fmt(r.V(x), 2) + '</td><td>' + fmt(r.M(x), 2) + '</td><td>' + fmt(r.defl(x) * 1000, 3) + '</td></tr>';
                }).join('') + '</tbody></table></div>';
        },
        notas: function (r, p) {
            var a = [];
            if (p.P === 0 && p.w === 0) a.push('No hay cargas: la viga solo se analiza geométricamente.');
            if (r.dmax > p.L * 1000 / 360) a.push('La flecha supera L/360. Revisa la sección o el módulo E si el criterio de servicio es exigente.');
            if (r.sigma > 0.5 * 25) a.push('El esfuerzo supera 12.5 MPa: compara con la resistencia de diseño del material antes de aceptar la sección.');
            return a;
        },
        draw: function (ctx, W, H, r, p) { drawSimpleFig(ctx, W, H, r, p); },
        legend: [['Viga', '#93C5FD'], ['Carga', '#FBBF24'], ['Momento', '#34D399'], ['Elástica', '#F472B6']],
        report: function (r, p) {
            return {
                titulo: 'Estructuras I — Viga simplemente apoyada', norma: this.norma,
                resumen: 'RA = ' + fmt(r.RA, 1) + ' kN · Mmax = ' + fmt(r.Mabs, 1) + ' kN·m · δmax = ' + fmt(r.dmax, 2) + ' mm',
                entradas: p.entradas,
                resultados: this.tiles(r, p).map(function (t) { return { label: t.l, valor: String(t.v) + (t.s ? ' · ' + t.s : '') }; }),
                tablaHtml: this.table(r, p),
                formulas: 'RA = P(L−a)/L + wL/2 · RB = Pa/L + wL/2 · M(x) = RAx − wx²/2 − P⟨x−a⟩¹ · δ por superposición',
                avisos: this.notas(r, p)
            };
        }
    };

    /* =========================================================
       04 · VOLADIZO
       ========================================================= */
    DEFS.voladizo = {
        id: 'voladizo', ratio: 0.85, title: 'Viga en voladizo', tag: 'Deformación',
        accent: '#F59E0B', rgb: '245,158,11', unidad: 'Unidad 1 · flexión y empotramiento',
        entrega: 'Momento de empotramiento y flecha en punta',
        desc: 'Empotrada en un extremo: reacción, momento negativo, cortante y flecha en la punta.',
        objetivo: 'entender el momento de empotramiento y la sensibilidad de la flecha a la longitud.',
        norma: 'Hibbeler, Mecánica de Materiales, cap. 12 · Beer & Johnston, cap. 9',
        chips: ['MA', 'RA', 'M(x)', 'δpunta', 'σ'],
        sim: 'voladizo',
        proc: '<p>El empotramiento aporta reacción vertical y momento. La carga puntual actúa en la punta y la distribuida en toda la longitud.</p>' +
            '<div class="est-eq">RA = P + wL · MA = −(PL + wL²/2)<br>M(x) = −[P(L−x) + w(L−x)²/2] · δpunta = PL³/(3EI) + wL⁴/(8EI)</div>' +
            '<p>El momento es máximo (en valor absoluto) en el empotramiento y nulo en la punta. La flecha crece con L³ (carga puntual), por eso duplicar el voladizo multiplica la flecha por ocho si la sección no cambia.</p>',
        form: function () {
            return '<div class="dm-formrow dm-3">' + field('vlL', 'Longitud L', 2.5, { unit: 'm', step: '0.1', min: 0.1 }) +
                field('vlP', 'Carga puntual P', 15, { unit: 'kN', step: '1', min: 0 }) +
                field('vlW', 'Carga distribuida w', 5, { unit: 'kN/m', step: '0.5', min: 0 }) + '</div>' +
                '<div class="dm-formrow dm-3">' + field('vlE', 'Módulo E', 25, { unit: 'GPa', step: '1', min: 1 }) +
                field('vlB', 'Base b', 300, { unit: 'mm', step: '10', min: 10 }) +
                field('vlH', 'Altura h', 400, { unit: 'mm', step: '10', min: 10 }) + '</div>';
        },
        read: function () {
            var p = { L: num('vlL'), P: num('vlP') || 0, w: num('vlW') || 0, E: num('vlE'), b: num('vlB'), h: num('vlH') };
            p.entradas = entradas([
                ['Longitud L (m)', p.L], ['Carga puntual P (kN)', p.P], ['Carga distribuida w (kN/m)', p.w],
                ['E (GPa)', p.E], ['Sección b × h (mm)', p.b + ' × ' + p.h]
            ]);
            return p;
        },
        calc: function (p) { return C.cantilever(p); },
        tiles: function (r, p) {
            var lim = p.L * 1000 / 180;
            return [
                { l: 'Reacción vertical', v: fmt(r.RA, 1) + ' kN', big: true, s: 'en el empotramiento' },
                { l: 'Momento de empotramiento', v: fmt(r.MA, 1) + ' kN·m', tone: 'warn', s: 'M negativo (hogging)' },
                { l: 'Cortante máximo', v: fmt(r.Vmax, 1) + ' kN', s: 'constante si solo hay P' },
                { l: 'Flecha en punta', v: fmt(r.dmax, 2) + ' mm', tone: r.dmax > lim ? 'warn' : 'ok', s: 'límite L/180 = ' + fmt(lim, 1) + ' mm' },
                { l: 'Esfuerzo σ = Mc/I', v: fmt(r.sigma, 2) + ' MPa', s: 'fibra extrema' },
                { l: 'Rigidez EI', v: fmt(r.EI, 0) + ' kN·m²', s: 'I = ' + fmt(r.I * 1e12, 0) + ' mm⁴' }
            ];
        },
        table: function (r) {
            return '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>x (m)</th><th>V (kN)</th><th>M (kN·m)</th><th>δ (mm)</th></tr></thead><tbody>' +
                [0, 0.25, 0.5, 0.75, 1].map(function (t) {
                    var x = r.L * t;
                    return '<tr><td>' + fmt(x, 2) + '</td><td>' + fmt(r.V(x), 2) + '</td><td>' + fmt(r.M(x), 2) + '</td><td>' + fmt(r.defl(x) * 1000, 3) + '</td></tr>';
                }).join('') + '</tbody></table></div>';
        },
        notas: function (r, p) {
            var a = [];
            if (r.dmax > p.L * 1000 / 180) a.push('La flecha en punta supera L/180. En voladizos conviene revisar también vibración y fisuración.');
            if (r.MA < 0) a.push('El momento de empotramiento es negativo: la fibra superior trabaja a tracción en el apoyo.');
            return a;
        },
        draw: function (ctx, W, H, r, p) { drawCantFig(ctx, W, H, r, p); },
        legend: [['Voladizo', '#93C5FD'], ['Carga', '#FBBF24'], ['Momento', '#34D399'], ['Elástica', '#F472B6']],
        report: function (r, p) {
            return {
                titulo: 'Estructuras I — Viga en voladizo', norma: this.norma,
                resumen: 'RA = ' + fmt(r.RA, 1) + ' kN · MA = ' + fmt(r.MA, 1) + ' kN·m · δpunta = ' + fmt(r.dmax, 2) + ' mm',
                entradas: p.entradas,
                resultados: this.tiles(r, p).map(function (t) { return { label: t.l, valor: String(t.v) + (t.s ? ' · ' + t.s : '') }; }),
                tablaHtml: this.table(r, p),
                formulas: 'RA = P + wL · MA = −(PL + wL²/2) · M(x) = −[P(L−x) + w(L−x)²/2] · δ = PL³/(3EI) + wL⁴/(8EI)',
                avisos: this.notas(r, p)
            };
        }
    };

    /* =========================================================
       05 · CERCHA PRATT
       ========================================================= */
    DEFS.cercha = {
        id: 'cercha', title: 'Cercha Pratt por nudos', tag: 'Cerchas',
        accent: '#2DD4BF', rgb: '45,212,191', unidad: 'Unidad 2 · trabajo virtual',
        entrega: 'Fuerzas axiales y desplazamiento vertical',
        desc: 'Solución matricial de una cercha Pratt de cuatro paneles y deflexión por trabajo virtual.',
        objetivo: 'identificar tracción y compresión y cuantificar la flecha con el método de la carga unitaria.',
        norma: 'Hibbeler, Análisis Estructural, caps. 3 y 9 · McCormac, cap. 4',
        chips: ['N axial', 'tracción', 'compresión', 'Δ vertical'],
        sim: 'cercha',
        proc: '<p>Se resuelve el equilibrio nodal de la cercha con 8 nudos y 13 barras. Las reacciones son las de una cercha simplemente apoyada: pasador en B0 y rodillo en B4.</p>' +
            '<div class="est-eq">ΣFx = 0 · ΣFy = 0 en cada nudo · N = fuerza axial (tracción +)<br>Δ = Σ N·n·L / (EA) &nbsp; (trabajo virtual, n = fuerza con carga unitaria)</div>' +
            '<p>La carga P se aplica en el nudo que elijas (por defecto el superior central T2). Las barras del cordón inferior suelen trabajar a tracción y las del cordón superior a compresión; las diagonales cambian según la posición de la carga.</p>' +
            '<p><b>Unidades:</b> L y h en m; P en kN; E en GPa; A en mm². EA se convierte a kN antes de integrar.</p>',
        form: function () {
            return '<div class="dm-formrow dm-3">' + field('ceL', 'Luz L', 8, { unit: 'm', step: '0.5', min: 1 }) +
                field('ceH', 'Altura h', 2, { unit: 'm', step: '0.1', min: 0.2 }) +
                field('ceP', 'Carga P', 40, { unit: 'kN', step: '1', min: 0 }) + '</div>' +
                '<div class="dm-formrow dm-3">' + select('ceN', 'Nudo cargado', [['6', 'T2 · centro, cordón superior'], ['5', 'T1 · cordón superior'], ['7', 'T3 · cordón superior'], ['2', 'B2 · centro, cordón inferior'], ['1', 'B1 · cordón inferior'], ['3', 'B3 · cordón inferior']], '6') + '</div>' +
                '<div class="dm-formrow dm-3">' + field('ceE', 'Módulo E', 200, { unit: 'GPa', step: '5', min: 1 }) +
                field('ceA', 'Área de barra A', 2000, { unit: 'mm²', step: '100', min: 1 }) + '</div>';
        },
        read: function () {
            var p = { L: num('ceL'), h: num('ceH'), P: num('ceP') || 0, E: num('ceE'), A: num('ceA'), node: parseInt(val('ceN') || '6', 10) };
            var NN = { 1: 'B1', 2: 'B2', 3: 'B3', 5: 'T1', 6: 'T2', 7: 'T3' };
            p.entradas = entradas([
                ['Luz L (m)', p.L], ['Altura h (m)', p.h], ['Carga P (kN)', p.P], ['Nudo cargado', NN[p.node] || 'T2'],
                ['E (GPa)', p.E], ['Área A (mm²)', p.A]
            ]);
            return p;
        },
        calc: function (p) { return C.prattTruss(p); },
        tiles: function (r) {
            return [
                { l: 'Tracción máxima', v: fmt(r.maxT, 1) + ' kN', big: true, tone: 'ok', s: 'barras en tracción' },
                { l: 'Compresión máxima', v: fmt(r.maxC, 1) + ' kN', tone: 'bad', s: 'barras en compresión' },
                { l: 'Desplazamiento vertical en ' + r.loadName, v: fmt(r.delta, 2) + ' mm', tone: 'warn', s: 'trabajo virtual' },
                { l: 'Reacción B0', v: fmt(r.reactions.Ry0, 1) + ' kN', s: 'Rx = ' + fmt(r.reactions.Rx0, 1) + ' kN' },
                { l: 'Reacción B4', v: fmt(r.reactions.Ry4, 1) + ' kN', s: 'rodillo vertical' },
                { l: 'Rigidez axial EA', v: fmt(r.EA, 0) + ' kN', s: 'E·A' }
            ];
        },
        table: function (r) {
            return '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Barra</th><th>L (m)</th><th>N (kN)</th><th>Estado</th></tr></thead><tbody>' +
                r.members.map(function (m) {
                    var tone = m.state === 'traccion' ? 'color:#6EE7B7' : (m.state === 'compresion' ? 'color:#FCA5A5' : '');
                    return '<tr><td>' + m.name + '</td><td>' + fmt(m.L, 3) + '</td><td style="' + tone + '">' + fmt(m.force, 2) + '</td><td>' + m.state + '</td></tr>';
                }).join('') + '</tbody></table></div>';
        },
        notas: function (r) {
            var a = ['Convención: N positivo en tracción. El desplazamiento es positivo hacia abajo (en la dirección de la carga unitaria).'];
            if (r.maxC > 0) a.push('Verifica el pandeo de las barras comprimidas: la compresión no se controla solo con el área, también con la esbeltez.');
            if (r.delta > r.L * 1000 / 300) a.push('La flecha supera L/300; revisa las áreas o la altura de la cercha.');
            return a;
        },
        draw: function (ctx, W, H, r, p) { drawTrussFig(ctx, W, H, r, p); },
        legend: [['Tracción', '#F87171'], ['Compresión', '#60A5FA'], ['Carga', '#FBBF24'], ['Nudo', '#E2E8F0']],
        report: function (r, p) {
            return {
                titulo: 'Estructuras I — Cercha Pratt', norma: this.norma,
                resumen: 'Nmax,t = ' + fmt(r.maxT, 1) + ' kN · Nmax,c = ' + fmt(r.maxC, 1) + ' kN · Δ = ' + fmt(r.delta, 2) + ' mm',
                entradas: p.entradas,
                resultados: this.tiles(r, p).map(function (t) { return { label: t.l, valor: String(t.v) + (t.s ? ' · ' + t.s : '') }; }),
                tablaHtml: this.table(r),
                formulas: 'Equilibrio nodal · Δ = Σ N·n·L/(EA)',
                avisos: this.notas(r)
            };
        }
    };

    /* =========================================================
       06 · PÓRTICO POR EL MÉTODO DEL PORTAL
       ========================================================= */
    DEFS.portico = {
        id: 'portico', title: 'Pórtico por el método del portal', tag: 'Pórticos',
        accent: '#F472B6', rgb: '244,114,182', unidad: 'Unidad 4 · métodos aproximados',
        entrega: 'Cortantes, momentos y desplazamiento lateral',
        desc: 'Pórtico de un vano y un piso con carga lateral: cortantes, momentos y deriva estimada.',
        objetivo: 'aplicar las hipótesis del portal para obtener una primera distribución de fuerzas.',
        norma: 'Hibbeler, Análisis Estructural, cap. 12 · McCormac, cap. 7',
        chips: ['Vcol', 'Mcol', 'Mviga', 'deriva'],
        sim: 'portico',
        proc: '<p>El método del portal supone que el cortante total se reparte por igual entre las columnas y que los puntos de inflexión están a media altura en las columnas y a media luz en las vigas.</p>' +
            '<div class="est-eq">Vcol = W/2 · Mcol = Vcol·h/2 · Mviga = Mcol<br>Nviga ≈ W·h/(2b) · Δ ≈ W·h³/(24EIcol)</div>' +
            '<p>Es una estimación para pórticos regulares con cargas laterales; no sustituye un análisis matricial cuando hay irregularidades, vanos desiguales o cargas verticales importantes.</p>' +
            '<p>La deriva se calcula con columnas empotradas en la base y vigas supuestas infinitamente rígidas; sirve para dimensionar preliminarmente y comparar con el límite normativo de deriva.</p>',
        form: function () {
            return '<div class="dm-formrow dm-3">' + field('ptW', 'Carga lateral total W', 30, { unit: 'kN', step: '1', min: 0 }) +
                field('ptH', 'Altura h', 4, { unit: 'm', step: '0.1', min: 0.5 }) +
                field('ptB', 'Luz b', 6, { unit: 'm', step: '0.5', min: 1 }) + '</div>' +
                '<div class="dm-formrow dm-3">' + field('ptE', 'Módulo E', 25, { unit: 'GPa', step: '1', min: 1 }) +
                field('ptBc', 'Base columna', 300, { unit: 'mm', step: '10', min: 10 }) +
                field('ptHc', 'Altura columna', 300, { unit: 'mm', step: '10', min: 10 }) + '</div>';
        },
        read: function () {
            var p = { W: num('ptW') || 0, h: num('ptH'), b: num('ptB'), E: num('ptE'), bc: num('ptBc'), hc: num('ptHc') };
            p.entradas = entradas([
                ['Carga lateral W (kN)', p.W], ['Altura h (m)', p.h], ['Luz b (m)', p.b],
                ['E (GPa)', p.E], ['Columna b × h (mm)', p.bc + ' × ' + p.hc]
            ]);
            return p;
        },
        calc: function (p) { return C.portalFrame(p); },
        tiles: function (r, p) {
            var lim = p.h * 1000 / 250;
            return [
                { l: 'Cortante por columna', v: fmt(r.Vcol, 1) + ' kN', big: true, s: 'W/2' },
                { l: 'Momento en columna', v: fmt(r.Mcol, 1) + ' kN·m', tone: 'warn', s: 'a media altura' },
                { l: 'Momento en viga', v: fmt(r.Mbeam, 1) + ' kN·m', s: 'igual al de columna' },
                { l: 'Deriva lateral estimada', v: fmt(r.sway, 2) + ' mm', tone: r.sway > lim ? 'warn' : 'ok', s: 'límite referencial h/250 = ' + fmt(lim, 1) + ' mm' },
                { l: 'Axial en viga', v: fmt(r.N, 1) + ' kN', s: 'por equilibrio de vuelco' },
                { l: 'Reacción horizontal', v: fmt(r.reactionX, 1) + ' kN', s: 'en cada base' }
            ];
        },
        table: function (r) {
            return '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Elemento</th><th>Fuerza</th><th>Momento</th></tr></thead><tbody>' +
                '<tr><td>Columna izquierda</td><td>V = ' + fmt(r.Vcol, 2) + ' kN</td><td>M = ' + fmt(r.Mcol, 2) + ' kN·m</td></tr>' +
                '<tr><td>Columna derecha</td><td>V = ' + fmt(r.Vcol, 2) + ' kN</td><td>M = ' + fmt(r.Mcol, 2) + ' kN·m</td></tr>' +
                '<tr><td>Viga superior</td><td>N ≈ ' + fmt(r.N, 2) + ' kN</td><td>M = ' + fmt(r.Mbeam, 2) + ' kN·m</td></tr>' +
                '</tbody></table></div>';
        },
        notas: function (r) {
            return [
                r.note,
                'La deriva estimada usa EI de la columna con base empotrada y viga rígida; un modelo matricial puede dar valores distintos.',
                'Para pórticos con vanos desiguales o varios pisos, usa el método del portal modificado o un análisis de rigidez.'
            ];
        },
        draw: function (ctx, W, H, r, p) { drawPortalFig(ctx, W, H, r, p); },
        legend: [['Pórtico', '#93C5FD'], ['Carga lateral', '#FBBF24'], ['Momento', '#F472B6'], ['Punto de inflexión', '#94A3B8']],
        report: function (r, p) {
            return {
                titulo: 'Estructuras I — Pórtico por el método del portal', norma: this.norma,
                resumen: 'Vcol = ' + fmt(r.Vcol, 1) + ' kN · Mcol = ' + fmt(r.Mcol, 1) + ' kN·m · Δ = ' + fmt(r.sway, 2) + ' mm',
                entradas: p.entradas,
                resultados: this.tiles(r, p).map(function (t) { return { label: t.l, valor: String(t.v) + (t.s ? ' · ' + t.s : '') }; }),
                tablaHtml: this.table(r),
                formulas: 'Vcol = W/2 · Mcol = Vcol·h/2 · Mviga = Mcol · N ≈ W·h/(2b) · Δ ≈ W·h³/(24EI)',
                avisos: this.notas(r)
            };
        }
    };

    /* =========================================================
       07 · MATRIZ DE RIGIDEZ DE UN ELEMENTO
       ========================================================= */
    DEFS.rigidez = {
        id: 'rigidez', title: 'Matriz de rigidez de un elemento', tag: 'Matricial',
        accent: '#818CF8', rgb: '129,140,248', unidad: 'Unidad 3 · método directo de rigidez',
        entrega: 'Matriz local 6×6 y rigideces EA, EI',
        desc: 'Elemento viga-columna 2D: matriz local, transformación y términos de rigidez axial y flexional.',
        objetivo: 'construir la matriz que relaciona desplazamientos y fuerzas en un elemento prismático.',
        norma: 'Hibbeler, Análisis Estructural, cap. 15 · McCormac, cap. 12',
        chips: ['6 GDL', 'EA/L', '12EI/L³', 'T'],
        proc: '<p>Cada nudo tiene tres grados de libertad: desplazamiento horizontal u, vertical v y giro θ. La matriz local de un elemento prismático combina el comportamiento axial y el de flexión.</p>' +
            '<div class="est-eq">k = [ EA/L, 0, 0, −EA/L, 0, 0 ;<br>0, 12EI/L³, 6EI/L², 0, −12EI/L³, 6EI/L² ;<br>0, 6EI/L², 4EI/L, 0, −6EI/L², 2EI/L ; … ]</div>' +
            '<p>La matriz global se obtiene con K = Tᵀ k T, donde T contiene los cosenos y senos del ángulo del elemento. El ensamblaje suma las contribuciones en los grados de libertad compartidos.</p>' +
            '<p><b>Unidades:</b> E en GPa, A en cm², I en cm⁴, L en m. La aplicación convierte a kN y m antes de formar la matriz.</p>',
        form: function () {
            return '<div class="dm-formrow dm-3">' + field('rgL', 'Longitud L', 4, { unit: 'm', step: '0.1', min: 0.1 }) +
                field('rgE', 'Módulo E', 200, { unit: 'GPa', step: '5', min: 1 }) +
                field('rgA', 'Área A', 30, { unit: 'cm²', step: '1', min: 0.1 }) + '</div>' +
                '<div class="dm-formrow dm-2">' + field('rgI', 'Inercia I', 4000, { unit: 'cm⁴', step: '100', min: 1 }) +
                '<label class="dm-field"><span class="dm-lab">Ángulo del elemento <em>(°)</em> <output id="estAngleV">0°</output></span>' +
                '<input type="range" id="estAngle" min="-90" max="90" step="5" value="0"></label></div>';
        },
        read: function () {
            var p = { L: num('rgL'), E: num('rgE'), A: num('rgA'), I: num('rgI'), angle: num('estAngle') || 0 };
            p.entradas = entradas([
                ['Longitud L (m)', p.L], ['E (GPa)', p.E], ['Área A (cm²)', p.A],
                ['Inercia I (cm⁴)', p.I], ['Ángulo (°)', p.angle]
            ]);
            return p;
        },
        calc: function (p) { return C.frameElementStiffness(p); },
        tiles: function (r) {
            return [
                { l: 'Rigidez axial EA', v: fmt(r.EA, 0) + ' kN', big: true, s: 'EA/L = ' + fmt(r.EA / r.L, 0) + ' kN/m' },
                { l: 'Rigidez flexional EI', v: fmt(r.EI, 0) + ' kN·m²', s: '12EI/L³ = ' + fmt(12 * r.EI / Math.pow(r.L, 3), 0) },
                { l: 'Término k₁₁', v: fmt(r.Kglobal[0][0], 0), s: 'rigidez global u₁–u₁' },
                { l: 'Término k₃₃', v: fmt(r.Kglobal[2][2], 0), s: 'rigidez global θ₁–θ₁' },
                { l: 'cos θ / sen θ', v: fmt(r.c, 2) + ' / ' + fmt(r.s, 2), s: 'transformación' },
                { l: 'Grados de libertad', v: '6', s: 'u₁ v₁ θ₁ u₂ v₂ θ₂' }
            ];
        },
        table: function (r) {
            var head = '<tr><th>k local</th>' + r.dof.map(function (d) { return '<th>' + d + '</th>'; }).join('') + '</tr>';
            return '<div class="dm-tablewrap"><table class="dm-table est-matrix"><thead>' + head + '</thead><tbody>' +
                r.k.map(function (row, i) {
                    return '<tr><th>' + r.dof[i] + '</th>' + row.map(function (v) {
                        return '<td>' + (Math.abs(v) < 1e-9 ? '0' : fmt(v, Math.abs(v) >= 100 ? 0 : 3)) + '</td>';
                    }).join('') + '</tr>';
                }).join('') + '</tbody></table></div>' +
                '<p class="dm-hint">Matriz local en kN y m. Los términos angulares (θ) se expresan en kN·m/rad.</p>';
        },
        notas: function (r) {
            return [
                'La matriz local es simétrica y semidefinida positiva; el elemento aislado tiene movimientos de cuerpo rígido.',
                'Al ensamblar, impón los apoyos y las cargas nodales antes de resolver K·u = F.',
                r.angle !== 0 ? 'Con ángulo distinto de cero la matriz global mezcla los grados u y v: revisa la transformación.' : 'Con ángulo 0° la matriz global coincide con la local.'
            ];
        },
        draw: function (ctx, W, H, r, p) { drawStiffnessFig(ctx, W, H, r, p); },
        legend: [['Elemento', '#93C5FD'], ['Eje local x', '#F87171'], ['Eje local y', '#34D399'], ['Nudos', '#FBBF24']],
        report: function (r, p) {
            return {
                titulo: 'Estructuras I — Matriz de rigidez del elemento', norma: this.norma,
                resumen: 'EA = ' + fmt(r.EA, 0) + ' kN · EI = ' + fmt(r.EI, 0) + ' kN·m² · L = ' + fmt(r.L, 2) + ' m',
                entradas: p.entradas,
                resultados: this.tiles(r, p).map(function (t) { return { label: t.l, valor: String(t.v) + (t.s ? ' · ' + t.s : '') }; }),
                tablaHtml: this.table(r),
                formulas: 'k axial = EA/L · k flexión = 12EI/L³, 6EI/L², 4EI/L, 2EI/L · K = Tᵀ k T',
                avisos: this.notas(r)
            };
        }
    };

    /* =========================================================
       08 · VIGA CONTINUA DE DOS LUCES
       ========================================================= */
    DEFS.continuas = {
        id: 'continuas', title: 'Viga continua de dos luces', tag: 'Continuas',
        accent: '#34D399', rgb: '52,211,153', unidad: 'Unidad 3 · compatibilidad',
        entrega: 'Momento en el apoyo central y reacciones',
        desc: 'Dos luces con carga distribuida: momento de continuidad, reacciones y diagrama de momentos.',
        objetivo: 'resolver una viga hiperestática con pendiente-deflexión y entender la redistribución de momentos.',
        norma: 'Hibbeler, Análisis Estructural, cap. 11 · McCormac, cap. 5',
        chips: ['MB', 'RA', 'RB', 'RC', 'M(x)'],
        proc: '<p>La viga tiene tres apoyos simples y dos luces. La incógnita es el momento en el apoyo central B; se obtiene imponiendo continuidad de giro en B (pendiente-deflexión).</p>' +
            '<div class="est-eq">MB = −(w₁L₁³ + w₂L₂³) / [8(L₁ + L₂)]<br>RA = w₁L₁/2 + MB/L₁ · RC = w₂L₂/2 + MB/L₂</div>' +
            '<p>El momento negativo en B reduce el momento positivo en el centro de cada luz. Las reacciones se obtienen sumando el cortante de cada tramo y el efecto del momento de continuidad.</p>' +
            '<p><b>Hipótesis:</b> apoyos rígidos, sin asentamientos, comportamiento elástico lineal y sección constante en cada tramo.</p>',
        form: function () {
            return '<div class="dm-formrow dm-2">' + field('cnL1', 'Luz 1 L₁', 5, { unit: 'm', step: '0.1', min: 0.1 }) +
                field('cnL2', 'Luz 2 L₂', 4, { unit: 'm', step: '0.1', min: 0.1 }) + '</div>' +
                '<div class="dm-formrow dm-2">' + field('cnW1', 'Carga w₁', 10, { unit: 'kN/m', step: '0.5', min: 0 }) +
                field('cnW2', 'Carga w₂', 8, { unit: 'kN/m', step: '0.5', min: 0 }) + '</div>' +
                '<div class="dm-formrow dm-3">' + field('cnE', 'Módulo E', 25, { unit: 'GPa', step: '1', min: 1 }) +
                field('cnB', 'Base b', 300, { unit: 'mm', step: '10', min: 10 }) +
                field('cnH', 'Altura h', 500, { unit: 'mm', step: '10', min: 10 }) + '</div>';
        },
        read: function () {
            var p = { L1: num('cnL1'), L2: num('cnL2'), w1: num('cnW1') || 0, w2: num('cnW2') || 0, E: num('cnE'), b: num('cnB'), h: num('cnH') };
            p.entradas = entradas([
                ['Luz 1 L₁ (m)', p.L1], ['Luz 2 L₂ (m)', p.L2], ['Carga w₁ (kN/m)', p.w1],
                ['Carga w₂ (kN/m)', p.w2], ['E (GPa)', p.E], ['Sección b × h (mm)', p.b + ' × ' + p.h]
            ]);
            return p;
        },
        calc: function (p) { return C.continuousBeam(p); },
        tiles: function (r) {
            return [
                { l: 'Momento en el apoyo B', v: fmt(r.MB, 1) + ' kN·m', big: true, tone: 'warn', s: 'negativo (hogging)' },
                { l: 'Reacción RA', v: fmt(r.RA, 1) + ' kN', s: 'apoyo izquierdo' },
                { l: 'Reacción RB', v: fmt(r.RB, 1) + ' kN', s: 'apoyo central' },
                { l: 'Reacción RC', v: fmt(r.RC, 1) + ' kN', s: 'apoyo derecho' },
                { l: 'Momento positivo máximo', v: fmt(r.Mpos, 1) + ' kN·m', tone: 'ok', s: 'en los tramos' },
                { l: 'Momento máximo absoluto', v: fmt(r.Mabs, 1) + ' kN·m', s: 'gobierna el diseño' }
            ];
        },
        table: function (r) {
            return '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Posición</th><th>Momento (kN·m)</th></tr></thead><tbody>' +
                '<tr><td>Apoyo A</td><td>0</td></tr>' +
                '<tr><td>Centro luz 1</td><td>' + fmt(r.M1(r.L1 / 2), 2) + '</td></tr>' +
                '<tr><td>Apoyo B</td><td>' + fmt(r.MB, 2) + '</td></tr>' +
                '<tr><td>Centro luz 2</td><td>' + fmt(r.M2(r.L2 / 2), 2) + '</td></tr>' +
                '<tr><td>Apoyo C</td><td>0</td></tr>' +
                '</tbody></table></div>';
        },
        notas: function (r, p) {
            var a = ['El momento negativo en B es ' + fmt(Math.abs(r.MB) / Math.max(1e-9, r.Mabs) * 100, 0) + ' % del momento máximo absoluto.'];
            if (r.MB < -0.5 * r.Mabs && r.Mabs > 0) a.push('La continuidad concentra momento negativo en el apoyo central: revisa el refuerzo superior allí.');
            if (p.L1 !== p.L2) a.push('Las luces desiguales hacen que el momento de continuidad dependa de la suma de rigideces; no uses fórmulas de luces iguales.');
            return a;
        },
        draw: function (ctx, W, H, r, p) { drawContinuousFig(ctx, W, H, r, p); },
        legend: [['Viga', '#93C5FD'], ['Carga', '#FBBF24'], ['Momento', '#34D399'], ['Apoyo', '#E2E8F0']],
        report: function (r, p) {
            return {
                titulo: 'Estructuras I — Viga continua de dos luces', norma: this.norma,
                resumen: 'MB = ' + fmt(r.MB, 1) + ' kN·m · RA = ' + fmt(r.RA, 1) + ' kN · RB = ' + fmt(r.RB, 1) + ' kN · RC = ' + fmt(r.RC, 1) + ' kN',
                entradas: p.entradas,
                resultados: this.tiles(r, p).map(function (t) { return { label: t.l, valor: String(t.v) + (t.s ? ' · ' + t.s : '') }; }),
                tablaHtml: this.table(r),
                formulas: 'MB = −(w₁L₁³ + w₂L₂³)/[8(L₁ + L₂)] · RA = w₁L₁/2 + MB/L₁ · RC = w₂L₂/2 + MB/L₂',
                avisos: this.notas(r, p)
            };
        }
    };

    function throwObject(msg) { var e = new Error(msg); e.userMessage = msg; throw e; }

    /* =========================================================
       HERRAMIENTAS DE DIBUJO (canvas 2D)
       ========================================================= */
    function bg(ctx, W, H) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#101c30'); g.addColorStop(1, '#0B1220');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(167,180,200,.06)'; ctx.lineWidth = 1;
        for (var x = 0; x < W; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (var y = 0; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(167,180,200,.18)'; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    }
    function tx(ctx, s, x, y, o) {
        o = o || {};
        ctx.save();
        ctx.font = (o.weight || 600) + ' ' + (o.size || 11) + 'px Inter, Arial, sans-serif';
        ctx.fillStyle = o.color || COL.txt;
        ctx.textAlign = o.align || 'left';
        ctx.textBaseline = o.baseline || 'middle';
        ctx.fillText(s, x, y);
        ctx.restore();
    }
    function ln(ctx, x1, y1, x2, y2, color, w, dash) {
        ctx.save(); ctx.strokeStyle = color || COL.axis; ctx.lineWidth = w || 1.4;
        ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    }
    function arrow(ctx, x1, y1, x2, y2, color, w) {
        var ang = Math.atan2(y2 - y1, x2 - x1), hd = 7;
        ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w || 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - hd * Math.cos(ang - 0.45), y2 - hd * Math.sin(ang - 0.45));
        ctx.lineTo(x2 - hd * Math.cos(ang + 0.45), y2 - hd * Math.sin(ang + 0.45));
        ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function arrowDown(ctx, x, yTop, yBot, color, w) { arrow(ctx, x, yTop, x, yBot, color, w); }
    function pin(ctx, x, y, color) {
        color = color || '#E2E8F0';
        ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = 'rgba(226,232,240,.12)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 16); ctx.lineTo(x + 9, y + 16); ctx.closePath(); ctx.fill(); ctx.stroke();
        ln(ctx, x - 14, y + 17, x + 14, y + 17, color, 2);
        for (var i = -12; i <= 12; i += 6) ln(ctx, x + i, y + 17, x + i - 4, y + 22, color, 1);
        ctx.restore();
    }
    function roller(ctx, x, y, color) {
        color = color || '#E2E8F0';
        ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = 'rgba(226,232,240,.12)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 14); ctx.lineTo(x + 9, y + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x - 4.5, y + 18, 3.4, 0, 6.283); ctx.arc(x + 4.5, y + 18, 3.4, 0, 6.283); ctx.fill(); ctx.stroke();
        ln(ctx, x - 14, y + 22, x + 14, y + 22, color, 2);
        ctx.restore();
    }
    function fixedWall(ctx, x, y1, y2, side, color) {
        color = color || '#E2E8F0';
        ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = 'rgba(226,232,240,.10)'; ctx.lineWidth = 2;
        var d = side === 'left' ? -1 : 1;
        ctx.fillRect(side === 'left' ? x - 7 : x, y1, 7, y2 - y1); ctx.strokeRect(side === 'left' ? x - 7 : x, y1, 7, y2 - y1);
        for (var y = y1 + 5; y < y2; y += 9) ln(ctx, x, y, x + d * 9, y + 9, color, 1);
        ctx.restore();
    }
    function dimH(ctx, x1, x2, y, label, color) {
        color = color || COL.dim;
        ln(ctx, x1, y, x1, y + 8, color, 1); ln(ctx, x2, y, x2, y + 8, color, 1);
        ln(ctx, x1, y + 4, x2, y + 4, color, 1);
        tx(ctx, label, (x1 + x2) / 2, y - 2, { align: 'center', size: 10.5, color: color });
    }
    function dimV(ctx, x, y1, y2, label, color) {
        color = color || COL.dim;
        ln(ctx, x, y1, x + 8, y1, color, 1); ln(ctx, x, y2, x + 8, y2, color, 1);
        ln(ctx, x + 4, y1, x + 4, y2, color, 1);
        ctx.save(); ctx.translate(x - 4, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2);
        tx(ctx, label, 0, 0, { align: 'center', size: 10.5, color: color }); ctx.restore();
    }
    function tag(ctx, s, x, y, color) {
        ctx.save();
        ctx.font = '700 10px Inter, Arial, sans-serif';
        var w = ctx.measureText(s).width + 14;
        ctx.fillStyle = 'rgba(11,18,32,.75)'; ctx.strokeStyle = color; ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y - 9, w, 18, 9); else ctx.rect(x, y - 9, w, 18);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, x + 7, y + 1);
        ctx.restore();
    }

    /* ---------- 01 · sección ---------- */
    function drawSectionFig(ctx, W, H, r) {
        bg(ctx, W, H);
        var padX = W * 0.16, padT = H * 0.10, padB = H * 0.14;
        var sw = r.xmax - r.xmin, sh = r.ymax - r.ymin;
        var sc = Math.min((W - 2 * padX) / Math.max(1, sw), (H - padT - padB) / Math.max(1, sh));
        var ox = (W - sw * sc) / 2 - r.xmin * sc;
        var oy = H - padB + r.ymin * sc;
        function X(x) { return ox + x * sc; }
        function Y(y) { return oy - y * sc; }
        r.rects.forEach(function (rc, i) {
            ctx.save();
            ctx.fillStyle = 'rgba(148,163,184,.22)'; ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1.6;
            ctx.fillRect(X(rc.x), Y(rc.y + rc.h), rc.b * sc, rc.h * sc);
            ctx.strokeRect(X(rc.x), Y(rc.y + rc.h), rc.b * sc, rc.h * sc);
            ctx.globalAlpha = 0.25; ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 1;
            for (var hx = rc.x; hx < rc.x + rc.b + rc.h; hx += 14) {
                var x1 = Math.max(rc.x, hx - rc.h), y1 = Math.max(rc.y, rc.y + (hx - x1));
                var x2 = Math.min(rc.x + rc.b, hx), y2 = Math.min(rc.y + rc.h, rc.y + (hx - rc.x));
                if (x1 < x2) ln(ctx, X(x1), Y(y1 + (x2 - x1)), X(x2), Y(y2), '#94A3B8', 0.8);
            }
            ctx.restore();
            tx(ctx, 'R' + (i + 1), X(rc.x + rc.b / 2), Y(rc.y + rc.h / 2), { align: 'center', size: 10, color: '#CBD5E1' });
        });
        // eje centroidal
        ln(ctx, X(r.xmin) - 10, Y(r.cy), X(r.xmax) + 10, Y(r.cy), COL.load, 1.3, [6, 4]);
        ln(ctx, X(r.cx), Y(r.ymin) - 10, X(r.cx), Y(r.ymax) + 10, 'rgba(251,191,36,.55)', 1.1, [4, 4]);
        // símbolo de centroide
        ctx.save(); ctx.strokeStyle = '#38BDF8'; ctx.fillStyle = '#0B1220'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(r.cx), Y(r.cy), 6, 0, 6.283); ctx.fill(); ctx.stroke();
        ln(ctx, X(r.cx) - 11, Y(r.cy), X(r.cx) + 11, Y(r.cy), '#38BDF8', 1.4);
        ln(ctx, X(r.cx), Y(r.cy) - 11, X(r.cx), Y(r.cy) + 11, '#38BDF8', 1.4);
        ctx.restore();
        tag(ctx, 'C', X(r.cx) + 10, Y(r.cy) - 16, '#38BDF8');
        dimH(ctx, X(r.xmin), X(r.xmax), H - 16, 'b = ' + fmt(Math.max(r.xmax - r.xmin, 0), 0) + ' mm', '#A7B4C8');
        dimV(ctx, X(r.xmax) + 22, Y(r.ymax), Y(r.ymin), 'H = ' + fmt(r.ymax - r.ymin, 0) + ' mm', '#A7B4C8');
        tx(ctx, 'ȳ = ' + fmt(r.cy / 10, 2) + ' cm', X(r.xmin) + 4, Y(r.cy) - 12, { size: 10.5, color: '#FBBF24' });
        tx(ctx, 'Sección y eje neutro', W - 12, H - 8, { align: 'right', size: 10, color: '#94A3B8' });
    }

    /* ---------- 02 · indeterminación ---------- */
    function drawIndetFig(ctx, W, H, r, p) {
        bg(ctx, W, H);
        var color = r.dsi < 0 ? COL.bad : (r.dsi === 0 ? COL.ok : COL.warn);
        var x0 = W * 0.16, x1 = W * 0.84, y = H * 0.55;
        if (p.tipo === 'viga') {
            ln(ctx, x0, y, x1, y, COL.beam, 7);
            pin(ctx, x0, y + 2); roller(ctx, x1, y + 2);
            tx(ctx, 'A', x0, y + 34, { align: 'center', size: 10, color: '#A7B4C8' });
            tx(ctx, 'B', x1, y + 34, { align: 'center', size: 10, color: '#A7B4C8' });
            dimH(ctx, x0, x1, y - 44, 'L', '#A7B4C8');
        } else if (p.tipo === 'cercha') {
            var n0 = { x: x0, y: y + 40 }, n1 = { x: x0 + (x1 - x0) * 0.25, y: y + 40 }, n2 = { x: x0 + (x1 - x0) * 0.5, y: y + 40 }, n3 = { x: x0 + (x1 - x0) * 0.75, y: y + 40 }, n4 = { x: x1, y: y + 40 };
            var t1 = { x: n1.x, y: y - 45 }, t2 = { x: n2.x, y: y - 45 }, t3 = { x: n3.x, y: y - 45 };
            var bars = [[n0, n1], [n1, n2], [n2, n3], [n3, n4], [t1, t2], [t2, t3], [n1, t1], [n2, t2], [n3, t3], [n0, t1], [t1, n2], [t2, n3], [t3, n4]];
            bars.forEach(function (b) { ln(ctx, b[0].x, b[0].y, b[1].x, b[1].y, COL.beam, 2.2); });
            [n0, n1, n2, n3, n4, t1, t2, t3].forEach(function (n) {
                ctx.save(); ctx.fillStyle = '#FBBF24'; ctx.beginPath(); ctx.arc(n.x, n.y, 3.4, 0, 6.283); ctx.fill(); ctx.restore();
            });
            pin(ctx, n0.x, n0.y + 2); roller(ctx, n4.x, n4.y + 2);
            arrowDown(ctx, t2.x, y - 92, y - 58, COL.load, 2);
            dimH(ctx, x0, x1, y + 62, 'L', '#A7B4C8');
        } else {
            var lx = W * 0.28, rx = W * 0.72, top = y - 55, base = y + 55;
            ln(ctx, lx, top, lx, base, COL.beam, 7); ln(ctx, rx, top, rx, base, COL.beam, 7); ln(ctx, lx, top, rx, top, COL.beam, 7);
            fixedWall(ctx, lx, base - 2, base + 2, 'left'); fixedWall(ctx, rx, base - 2, base + 2, 'right');
            ctx.save(); ctx.fillStyle = '#FBBF24';
            ctx.beginPath(); ctx.arc(lx, top, 4, 0, 6.283); ctx.arc(rx, top, 4, 0, 6.283); ctx.fill(); ctx.restore();
            tx(ctx, 'nudos j = ' + r.j, W / 2, H * 0.13, { align: 'center', size: 11, color: '#A7B4C8' });
            dimH(ctx, lx, rx, top - 18, 'b', '#A7B4C8');
            dimV(ctx, lx - 22, top, base, 'h', '#A7B4C8');
        }
        tag(ctx, 'm = ' + r.m + '   j = ' + r.j + '   r = ' + r.r, W / 2 - 72, H * 0.90, color);
        tag(ctx, 'DSI = ' + r.dsi + '  ·  ' + r.classification, W / 2 - 105, H * 0.13, color);
        tx(ctx, 'Modelo ' + (p.tipo === 'cercha' ? 'de cercha' : (p.tipo === 'viga' ? 'de viga' : 'de pórtico')), W - 12, H - 8, { align: 'right', size: 10, color: '#94A3B8' });
    }

    /* ---------- 03 · viga simplemente apoyada ---------- */
    function drawSimpleFig(ctx, W, H, r, p) {
        bg(ctx, W, H);
        var L = 54, R = 20, x0 = L, x1 = W - R;
        var beamY = H * 0.24;
        function X(x) { return x0 + (x / r.L) * (x1 - x0); }
        // viga
        ctx.save(); ctx.strokeStyle = COL.beam; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, beamY); ctx.lineTo(x1, beamY); ctx.stroke(); ctx.restore();
        pin(ctx, x0, beamY + 3); roller(ctx, x1, beamY + 3);
        tx(ctx, 'A', x0, beamY + 38, { align: 'center', size: 10, color: '#A7B4C8' });
        tx(ctx, 'B', x1, beamY + 38, { align: 'center', size: 10, color: '#A7B4C8' });
        dimH(ctx, x0, x1, beamY - 80, 'L = ' + fmt(r.L, 2) + ' m', '#A7B4C8');
        // UDL
        if (r.w > 0) {
            var udlTop = beamY - 34;
            ln(ctx, x0, udlTop, x1, udlTop, COL.load, 2);
            var n = 12;
            for (var i = 0; i <= n; i++) {
                var xu = x0 + (x1 - x0) * i / n;
                arrowDown(ctx, xu, udlTop, beamY - 5, 'rgba(251,191,36,.75)', 1.3);
            }
            tag(ctx, 'w = ' + fmt(r.w, 1) + ' kN/m', x0 + 6, udlTop - 12, '#FBBF24');
        }
        // carga puntual
        if (r.P > 0) {
            var xp = X(r.a);
            arrowDown(ctx, xp, beamY - 54, beamY - 5, '#F87171', 2.5);
            tag(ctx, 'P = ' + fmt(r.P, 1) + ' kN', xp + 8, beamY - 48, '#F87171');
            tx(ctx, 'a = ' + fmt(r.a, 2) + ' m', xp, beamY + 52, { align: 'center', size: 10, color: '#A7B4C8' });
        }
        // diagrama de momento
        var mt = H * 0.40, mb = H * 0.67, amp = H * 0.17;
        var maxM = Math.max(1e-9, Math.max(Math.abs(r.Mpos), Math.abs(r.Mneg)));
        ln(ctx, x0, mb, x1, mb, 'rgba(167,180,200,.4)', 1);
        tx(ctx, 'M (kN·m)', 12, mt - 4, { size: 10, color: '#94A3B8' });
        // relleno positivo/negativo
        ctx.save();
        ctx.beginPath(); ctx.moveTo(x0, mb);
        for (var k = 0; k < r.xs.length; k++) ctx.lineTo(X(r.xs[k]), mb - (r.ms[k] / maxM) * amp);
        ctx.lineTo(x1, mb); ctx.closePath();
        var gr = ctx.createLinearGradient(0, mb - amp, 0, mb + amp);
        gr.addColorStop(0, 'rgba(52,211,153,.28)'); gr.addColorStop(1, 'rgba(52,211,153,.02)');
        ctx.fillStyle = gr; ctx.fill();
        ctx.strokeStyle = '#34D399'; ctx.lineWidth = 2; ctx.beginPath();
        for (var k2 = 0; k2 < r.xs.length; k2++) { var xx = X(r.xs[k2]), yy = mb - (r.ms[k2] / maxM) * amp; k2 ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke(); ctx.restore();
        var xm = X(r.xM);
        ln(ctx, xm, mb, xm, mb - (r.Mpos / maxM) * amp, 'rgba(52,211,153,.6)', 1, [3, 3]);
        tag(ctx, 'Mmax = ' + fmt(r.Mpos, 1) + ' kN·m', Math.min(xm + 6, W - 150), mb - (r.Mpos / maxM) * amp - 14, '#34D399');
        // elástica
        var db = H * 0.88, damp = H * 0.11;
        var dmax = Math.max(1e-12, r.dmax);
        tx(ctx, 'δ (mm)', 12, db + 4, { size: 10, color: '#94A3B8' });
        ln(ctx, x0, db, x1, db, 'rgba(167,180,200,.35)', 1, [4, 4]);
        ctx.save(); ctx.strokeStyle = '#F472B6'; ctx.lineWidth = 2; ctx.beginPath();
        for (var j = 0; j < r.xs.length; j++) {
            var xd = X(r.xs[j]), yd = db + (Math.abs(r.ds[j]) * 1000 / dmax) * damp;
            j ? ctx.lineTo(xd, yd) : ctx.moveTo(xd, yd);
        }
        ctx.stroke(); ctx.restore();
        tag(ctx, 'δmax = ' + fmt(r.dmax, 2) + ' mm', Math.min(X(r.xd) + 6, W - 150), db + damp + 12, '#F472B6');
        tx(ctx, 'Equilibrio, cortante y momento', W - 12, H - 8, { align: 'right', size: 10, color: '#94A3B8' });
    }

    /* ---------- 04 · voladizo ---------- */
    function drawCantFig(ctx, W, H, r, p) {
        bg(ctx, W, H);
        var x0 = 58, x1 = W - 24, beamY = H * 0.24;
        function X(x) { return x0 + (x / r.L) * (x1 - x0); }
        ctx.save(); ctx.strokeStyle = COL.beam; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, beamY); ctx.lineTo(x1, beamY); ctx.stroke(); ctx.restore();
        fixedWall(ctx, x0, beamY - 28, beamY + 28, 'left');
        tx(ctx, 'empotramiento', x0 + 6, beamY + 44, { size: 10, color: '#A7B4C8' });
        dimH(ctx, x0, x1, beamY - 70, 'L = ' + fmt(r.L, 2) + ' m', '#A7B4C8');
        if (r.w > 0) {
            var udlTop = beamY - 30;
            ln(ctx, x0, udlTop, x1, udlTop, COL.load, 2);
            for (var i = 0; i <= 10; i++) {
                var xu = x0 + (x1 - x0) * i / 10;
                arrowDown(ctx, xu, udlTop, beamY - 5, 'rgba(251,191,36,.75)', 1.3);
            }
            tag(ctx, 'w = ' + fmt(r.w, 1) + ' kN/m', x0 + 8, udlTop - 12, '#FBBF24');
        }
        if (r.P > 0) {
            arrowDown(ctx, x1, beamY - 52, beamY - 5, '#F87171', 2.5);
            tag(ctx, 'P = ' + fmt(r.P, 1) + ' kN', x1 - 92, beamY - 48, '#F87171');
        }
        // momento negativo
        var mt = H * 0.40, mb = H * 0.56, amp = H * 0.22;
        var maxM = Math.max(1e-9, r.Mabs);
        tx(ctx, 'M (kN·m)', 12, mt - 2, { size: 10, color: '#94A3B8' });
        ln(ctx, x0, mb, x1, mb, 'rgba(167,180,200,.4)', 1);
        ctx.save(); ctx.beginPath(); ctx.moveTo(x0, mb);
        for (var k = 0; k < r.xs.length; k++) ctx.lineTo(X(r.xs[k]), mb - (r.ms[k] / maxM) * amp);
        ctx.lineTo(x1, mb); ctx.closePath();
        var gr = ctx.createLinearGradient(0, mb - amp, 0, mb + amp);
        gr.addColorStop(0, 'rgba(248,113,113,.05)'); gr.addColorStop(1, 'rgba(248,113,113,.26)');
        ctx.fillStyle = gr; ctx.fill();
        ctx.strokeStyle = '#F87171'; ctx.lineWidth = 2; ctx.beginPath();
        for (var k2 = 0; k2 < r.xs.length; k2++) {
            var xx = X(r.xs[k2]), yy = mb - (r.ms[k2] / maxM) * amp;
            k2 ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.stroke(); ctx.restore();
        tag(ctx, 'MA = ' + fmt(r.MA, 1) + ' kN·m', x0 + 8, mb + amp + 14, '#F87171');
        // elástica
        var db = H * 0.86, damp = H * 0.13;
        ln(ctx, x0, db, x1, db, 'rgba(167,180,200,.35)', 1, [4, 4]);
        tx(ctx, 'δ (mm)', 12, db + 4, { size: 10, color: '#94A3B8' });
        var dmax = Math.max(1e-12, r.dmax);
        ctx.save(); ctx.strokeStyle = '#F472B6'; ctx.lineWidth = 2; ctx.beginPath();
        for (var j = 0; j < r.xs.length; j++) {
            var xd = X(r.xs[j]), yd = db + (Math.abs(r.ds[j]) * 1000 / dmax) * damp;
            j ? ctx.lineTo(xd, yd) : ctx.moveTo(xd, yd);
        }
        ctx.stroke(); ctx.restore();
        tag(ctx, 'δpunta = ' + fmt(r.dmax, 2) + ' mm', x1 - 132, db + damp + 12, '#F472B6');
        tx(ctx, 'Empotramiento y flecha en punta', W - 12, H - 8, { align: 'right', size: 10, color: '#94A3B8' });
    }

    /* ---------- 05 · cercha ---------- */
    function drawTrussFig(ctx, W, H, r, p) {
        bg(ctx, W, H);
        var padX = 54, padT = 40, padB = 54;
        var sc = Math.min((W - 2 * padX) / Math.max(1, r.L), (H - padT - padB) / Math.max(1, r.h));
        var ox = (W - r.L * sc) / 2, oy = H - padB;
        function X(x) { return ox + x * sc; }
        function Y(y) { return oy - y * sc; }
        r.members.forEach(function (m) {
            var a = r.nodes[m.a], b = r.nodes[m.b];
            var f = m.force / r.maxAbs;
            var col = Math.abs(f) < 1e-6 ? '#64748B' : (f > 0 ? '#F87171' : '#60A5FA');
            ln(ctx, X(a.x), Y(a.y), X(b.x), Y(b.y), col, 1.6 + 3.2 * Math.abs(f));
        });
        r.nodes.forEach(function (n) {
            ctx.save(); ctx.fillStyle = '#0B1220'; ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(X(n.x), Y(n.y), 3.6, 0, 6.283); ctx.fill(); ctx.stroke();
            ctx.restore();
            tx(ctx, n.n, X(n.x), Y(n.y) + (n.y > 0 ? -13 : 16), { align: 'center', size: 9.5, color: '#94A3B8' });
        });
        pin(ctx, X(0), Y(0) + 3); roller(ctx, X(r.L), Y(0) + 3);
        var ldn = r.nodes[r.loadNode];
        if (ldn.y > 0) {
            arrowDown(ctx, X(ldn.x), Y(ldn.y) - 44, Y(ldn.y) - 10, COL.load, 2.6);
            tag(ctx, 'P = ' + fmt(r.P, 1) + ' kN', X(ldn.x) + 8, Y(ldn.y) - 38, '#FBBF24');
        } else {
            arrowDown(ctx, X(ldn.x), Y(0) + 6, Y(0) + 34, COL.load, 2.6);
            tag(ctx, 'P = ' + fmt(r.P, 1) + ' kN', X(ldn.x) + 8, Y(0) + 12, '#FBBF24');
        }
        dimH(ctx, X(0), X(r.L), H - 12, 'L = ' + fmt(r.L, 2) + ' m', '#A7B4C8');
        dimV(ctx, X(0) - 24, Y(r.h), Y(0), 'h = ' + fmt(r.h, 2) + ' m', '#A7B4C8');
        tag(ctx, 'tracción ' + fmt(r.maxT, 1) + ' kN', 14, H - 22, '#F87171');
        tag(ctx, 'compresión ' + fmt(r.maxC, 1) + ' kN', 152, H - 22, '#60A5FA');
        tx(ctx, 'Cercha Pratt · fuerzas axiales', W - 12, H - 8, { align: 'right', size: 10, color: '#94A3B8' });
    }

    /* ---------- 06 · pórtico ---------- */
    function drawPortalFig(ctx, W, H, r, p) {
        bg(ctx, W, H);
        var lx = W * 0.28, rx = W * 0.72, top = H * 0.26, base = H * 0.78;
        ctx.save(); ctx.strokeStyle = COL.beam; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lx, base); ctx.lineTo(lx, top); ctx.lineTo(rx, top); ctx.lineTo(rx, base); ctx.stroke(); ctx.restore();
        fixedWall(ctx, lx, base - 2, base + 2, 'left'); fixedWall(ctx, rx, base - 2, base + 2, 'right');
        // carga lateral
        arrow(ctx, lx - 72, top - 8, lx - 10, top - 8, COL.load, 3);
        tag(ctx, 'W = ' + fmt(r.W, 1) + ' kN', lx - 76, top - 26, '#FBBF24');
        // puntos de inflexión
        [0.5].forEach(function (t) {
            var ym = top + (base - top) * t;
            ln(ctx, lx - 12, ym, lx + 12, ym, '#94A3B8', 1, [3, 3]);
            ln(ctx, rx - 12, ym, rx + 12, ym, '#94A3B8', 1, [3, 3]);
            ctx.save(); ctx.fillStyle = '#94A3B8'; ctx.beginPath(); ctx.arc(lx, ym, 2.8, 0, 6.283); ctx.arc(rx, ym, 2.8, 0, 6.283); ctx.fill(); ctx.restore();
        });
        var xm = (lx + rx) / 2;
        ln(ctx, xm - 12, top, xm + 12, top, '#94A3B8', 1, [3, 3]);
        ctx.save(); ctx.fillStyle = '#94A3B8'; ctx.beginPath(); ctx.arc(xm, top, 2.8, 0, 6.283); ctx.fill(); ctx.restore();
        // momentos en esquinas
        function corner(x, y, dir) {
            ctx.save(); ctx.strokeStyle = '#F472B6'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, 17, dir > 0 ? Math.PI * 0.1 : Math.PI * 0.9, dir > 0 ? Math.PI * 1.1 : Math.PI * 1.9, dir < 0); ctx.stroke(); ctx.restore();
        }
        corner(lx, top, 1); corner(rx, top, -1);
        tag(ctx, 'Mcol = ' + fmt(r.Mcol, 1) + ' kN·m', lx - 92, top + 30, '#F472B6');
        tag(ctx, 'Mviga = ' + fmt(r.Mbeam, 1) + ' kN·m', rx - 60, top + 30, '#F472B6');
        // deriva
        arrow(ctx, rx + 20, top + 10, rx + 20 + Math.min(40, r.sway * 1.5), top + 10, '#34D399', 2);
        tag(ctx, 'Δ ≈ ' + fmt(r.sway, 2) + ' mm', rx - 10, top + 62, '#34D399');
        dimH(ctx, lx, rx, base + 34, 'b = ' + fmt(p.b, 2) + ' m', '#A7B4C8');
        dimV(ctx, lx - 24, top, base, 'h = ' + fmt(p.h, 2) + ' m', '#A7B4C8');
        tx(ctx, 'Método del portal · momentos y deriva', W - 12, H - 8, { align: 'right', size: 10, color: '#94A3B8' });
    }

    /* ---------- 07 · rigidez ---------- */
    function drawStiffnessFig(ctx, W, H, r, p) {
        bg(ctx, W, H);
        var cx = W * 0.30, cy = H * 0.55, len = Math.min(W * 0.36, 210);
        var th = r.angle * Math.PI / 180;
        var x1 = cx - Math.cos(th) * len / 2, y1 = cy + Math.sin(th) * len / 2;
        var x2 = cx + Math.cos(th) * len / 2, y2 = cy - Math.sin(th) * len / 2;
        ctx.save(); ctx.strokeStyle = '#93C5FD'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
        [ [x1, y1], [x2, y2] ].forEach(function (n, i) {
            ctx.save(); ctx.fillStyle = '#0B1220'; ctx.strokeStyle = '#FBBF24'; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.arc(n[0], n[1], 7, 0, 6.283); ctx.fill(); ctx.stroke();
            ctx.restore();
            tx(ctx, i ? '2' : '1', n[0], n[1] - 15, { align: 'center', size: 11, color: '#FBBF24' });
        });
        // ejes locales
        var ux = Math.cos(th), uy = -Math.sin(th);
        arrow(ctx, x1, y1, x1 + ux * 44, y1 + uy * 44, '#F87171', 2);
        arrow(ctx, x1, y1, x1 - uy * 34, y1 + ux * 34, '#34D399', 2);
        tx(ctx, 'x local', x1 + ux * 52, y1 + uy * 52, { size: 10, color: '#F87171' });
        tx(ctx, 'y local', x1 - uy * 40, y1 + ux * 40, { size: 10, color: '#34D399' });
        // ángulo
        ctx.save(); ctx.strokeStyle = '#A7B4C8'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x1, y1, 30, 0, -th, th > 0); ctx.stroke(); ctx.restore();
        tx(ctx, 'θ = ' + fmt(r.angle, 0) + '°', x1 + 40, y1 + 20, { size: 10, color: '#A7B4C8' });
        dimH(ctx, Math.min(x1, x2), Math.max(x1, x2), Math.max(y1, y2) + 32, 'L = ' + fmt(r.L, 2) + ' m', '#A7B4C8');
        // heatmap de la matriz local
        var n = 6, cs = Math.min(24, (W * 0.34) / n), hx = W * 0.58, hy = H * 0.17;
        var maxAbs = 0;
        r.k.forEach(function (row) { row.forEach(function (v) { maxAbs = Math.max(maxAbs, Math.abs(v)); }); });
        tx(ctx, 'Matriz local k (6×6)', hx, hy - 14, { size: 10.5, color: '#A7B4C8' });
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                var v = r.k[i][j] / (maxAbs || 1);
                var col = v >= 0 ? 'rgba(52,211,153,' + (0.08 + 0.62 * Math.abs(v)) + ')' : 'rgba(248,113,113,' + (0.08 + 0.62 * Math.abs(v)) + ')';
                ctx.fillStyle = col; ctx.fillRect(hx + j * cs, hy + i * cs, cs - 1, cs - 1);
                ctx.strokeStyle = 'rgba(11,18,32,.55)'; ctx.lineWidth = 1; ctx.strokeRect(hx + j * cs, hy + i * cs, cs - 1, cs - 1);
            }
        }
        tx(ctx, 'verde +   ·   rojo −', hx, hy + n * cs + 12, { size: 9.5, color: '#718096' });
        tag(ctx, 'EA = ' + fmt(r.EA, 0) + ' kN', 14, H - 20, '#34D399');
        tx(ctx, 'Elemento viga-columna 2D', W - 12, H - 8, { align: 'right', size: 10, color: '#94A3B8' });
    }

    /* ---------- 08 · viga continua ---------- */
    function drawContinuousFig(ctx, W, H, r, p) {
        bg(ctx, W, H);
        var x0 = 48, x1 = W - 20, beamY = H * 0.24;
        var total = r.L1 + r.L2;
        function X(x) { return x0 + (x / total) * (x1 - x0); }
        ctx.save(); ctx.strokeStyle = COL.beam; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, beamY); ctx.lineTo(x1, beamY); ctx.stroke(); ctx.restore();
        var xb = X(r.L1);
        pin(ctx, x0, beamY + 3); pin(ctx, xb, beamY + 3); roller(ctx, x1, beamY + 3);
        tx(ctx, 'A', x0, beamY + 38, { align: 'center', size: 10, color: '#A7B4C8' });
        tx(ctx, 'B', xb, beamY + 38, { align: 'center', size: 10, color: '#A7B4C8' });
        tx(ctx, 'C', x1, beamY + 38, { align: 'center', size: 10, color: '#A7B4C8' });
        dimH(ctx, x0, xb, beamY - 68, 'L₁ = ' + fmt(r.L1, 2) + ' m', '#A7B4C8');
        dimH(ctx, xb, x1, beamY - 68, 'L₂ = ' + fmt(r.L2, 2) + ' m', '#A7B4C8');
        // UDL por tramo
        function udl(a, b, w) {
            if (!(w > 0)) return;
            var top = beamY - 26;
            ln(ctx, a, top, b, top, COL.load, 1.8);
            for (var i = 0; i <= 8; i++) { var x = a + (b - a) * i / 8; arrowDown(ctx, x, top, beamY - 5, 'rgba(251,191,36,.7)', 1.2); }
            tag(ctx, fmt(w, 1) + ' kN/m', a + 6, top - 12, '#FBBF24');
        }
        udl(x0, xb, r.w1); udl(xb, x1, r.w2);
        // momento
        var mt = H * 0.38, mb = H * 0.57, amp = H * 0.22;
        var maxM = Math.max(1e-9, r.Mabs);
        tx(ctx, 'M (kN·m)', 12, mt - 2, { size: 10, color: '#94A3B8' });
        ln(ctx, x0, mb, x1, mb, 'rgba(167,180,200,.4)', 1);
        ctx.save(); ctx.beginPath(); ctx.moveTo(x0, mb);
        for (var k = 0; k < r.xs.length; k++) ctx.lineTo(X(r.xs[k]), mb - (r.ms[k] / maxM) * amp);
        ctx.lineTo(x1, mb); ctx.closePath();
        ctx.fillStyle = 'rgba(52,211,153,.14)'; ctx.fill();
        ctx.strokeStyle = '#34D399'; ctx.lineWidth = 2; ctx.beginPath();
        for (var k2 = 0; k2 < r.xs.length; k2++) {
            var xx = X(r.xs[k2]), yy = mb - (r.ms[k2] / maxM) * amp;
            k2 ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.stroke(); ctx.restore();
        tag(ctx, 'MB = ' + fmt(r.MB, 1) + ' kN·m', xb + 8, mb + 16, '#F87171');
        tag(ctx, 'M+ = ' + fmt(r.Mpos, 1) + ' kN·m', X(r.L1 * 0.45), mb - amp * 0.85, '#34D399');
        // línea de momentos nulos aprox
        [ [r.L1, 'M=0'], [r.L1 + r.L2, 'M=0'] ].forEach(function (q) { ln(ctx, X(q[0]), mb - 8, X(q[0]), mb + 8, '#94A3B8', 1); });
        tx(ctx, 'Continuidad en B · pendiente-deflexión', W - 12, H - 8, { align: 'right', size: 10, color: '#94A3B8' });
    }

    /*__END__*/

})(typeof window !== 'undefined' ? window : globalThis);
