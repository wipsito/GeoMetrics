/* =========================================================
   GeoMetrics — Diseño de Mezclas: interfaz (teoría + ensayos)
   Requiere: js/mezclas-calc.js  (motor de cálculo sin DOM)
   Los simuladores viven en js/mezclas-sim.js
========================================================= */
(function (root) {
    'use strict';
    var C = root.MezclasCalc;
    if (!C) { if (root.console) console.error('Diseño de Mezclas: falta js/mezclas-calc.js'); return; }

    var M = root.Mezclas = root.Mezclas || {};
    M.C = C;
    M.last = null;          // último resultado calculado (para guardar / imprimir)
    M.lastACI = null;       // últimos parámetros del diseño ACI (los usa el simulador)
    M.mat = {};             // datos de materiales aprobados desde los ensayos
    M.state = { ens: null };

    var MAT_KEY = 'geometrics_dm_materiales';
    try { M.mat = JSON.parse(localStorage.getItem(MAT_KEY) || '{}') || {}; } catch (e) { M.mat = {}; }
    function saveMat(part) {
        for (var k in part) if (Object.prototype.hasOwnProperty.call(part, k)) M.mat[k] = part[k];
        try { localStorage.setItem(MAT_KEY, JSON.stringify(M.mat)); } catch (e) {}
    }
    function clearMat() { M.mat = {}; try { localStorage.removeItem(MAT_KEY); } catch (e) {} }

    /* ---------- utilidades DOM ---------- */
    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
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
    function setHtml(id, h) { var el = $(id); if (el) el.innerHTML = h; }

    function field(id, label, value, o) {
        o = o || {};
        return '<label class="dm-field' + (o.wide ? ' dm-wide' : '') + '" for="' + id + '"><span class="dm-lab">' + label +
            (o.unit ? ' <em>(' + o.unit + ')</em>' : '') + '</span>' +
            '<input type="number" inputmode="decimal" id="' + id + '" value="' + (value == null ? '' : value) + '"' +
            (o.step ? ' step="' + o.step + '"' : ' step="any"') + (o.min != null ? ' min="' + o.min + '"' : '') +
            (o.max != null ? ' max="' + o.max + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' +
            (o.hint ? '<small class="dm-hint">' + o.hint + '</small>' : '') + '</label>';
    }
    function select(id, label, opts, sel, o) {
        o = o || {};
        return '<label class="dm-field' + (o.wide ? ' dm-wide' : '') + '" for="' + id + '"><span class="dm-lab">' + label + '</span>' +
            '<select id="' + id + '">' + opts.map(function (op) {
                var v = Array.isArray(op) ? op[0] : op, t = Array.isArray(op) ? op[1] : op;
                return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(t) + '</option>';
            }).join('') + '</select>' + (o.hint ? '<small class="dm-hint">' + o.hint + '</small>' : '') + '</label>';
    }
    function tiles(items) {
        return '<div class="dm-tiles">' + items.map(function (it) {
            return '<div class="dm-tile' + (it.tone ? ' is-' + it.tone : '') + (it.big ? ' is-big' : '') + '"><span>' + it.l + '</span><strong>' + it.v + '</strong>' + (it.s ? '<small>' + it.s + '</small>' : '') + '</div>';
        }).join('') + '</div>';
    }
    function alerts(list) {
        if (!list || !list.length) return '';
        return '<ul class="dm-alerts">' + list.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    }
    function errorBox(msg) { return '<div class="dm-error" role="alert">⚠ ' + esc(msg) + '</div>'; }
    function toast(msg) {
        var t = $('dmToast');
        if (!t) {
            t = document.createElement('div'); t.id = 'dmToast'; t.className = 'dm-toast'; t.setAttribute('role', 'status');
            document.body.appendChild(t);
        }
        t.textContent = msg; t.classList.add('is-on');
        clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
    }

    /* =========================================================
       CANVAS: ajuste a pantalla HiDPI y gráfico de granulometría
    ========================================================= */
    function fitCanvas(c, ratio) {
        if (!c) return null;
        var w = Math.round(c.getBoundingClientRect().width || c.parentNode.clientWidth || 0);
        if (w < 40) return null;
        var h = Math.round(w * (ratio || parseFloat(c.getAttribute('data-ratio')) || 0.75));
        var dpr = Math.min(2.5, root.devicePixelRatio || 1);
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
            c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        }
        c.style.height = h + 'px';
        var ctx = c.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, W: w, H: h };
    }

    var COL = { bg: '#0f1c2e', grid: 'rgba(255,255,255,0.10)', axis: 'rgba(255,255,255,0.55)', txt: '#c9d4df', acc: '#4d8fd9',
                arena: '#d6b86a', grava: '#9aa5b1', cem: '#7d8da1', agua: '#4d8fd9', aire: '#cfe3f7', rojo: '#e0706b', ok: '#5fb98a', warn: '#e6b34a' };

    /**
     * Gráfico semilogarítmico de granulometría (abertura decreciente hacia la derecha).
     * o = { xmin, xmax, series:[{pts:[[mm,%pasa]], color, width, dash, dots, label}], envelope:[[mm,min,max]], aberturas:[mm] }
     */
    function gradChart(c, o) {
        var f = fitCanvas(c, 0.72); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H;
        var L = 44, R = 14, T = 16, B = 62, w = W - L - R, h = H - T - B;
        var lx0 = Math.log10(o.xmin), lx1 = Math.log10(o.xmax);
        function X(mm) { return L + (lx1 - Math.log10(mm)) / (lx1 - lx0) * w; }
        function Y(p) { return T + (100 - p) / 100 * h; }
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
        ctx.font = '11px Arial, sans-serif'; ctx.textBaseline = 'middle';
        // rejilla horizontal
        ctx.lineWidth = 1;
        for (var p = 0; p <= 100; p += 20) {
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(L, Y(p)); ctx.lineTo(W - R, Y(p)); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.textAlign = 'right'; ctx.fillText(p, L - 6, Y(p));
        }
        // envolvente
        if (o.envelope && o.envelope.length) {
            ctx.beginPath();
            o.envelope.forEach(function (e, i) { var x = X(e[0]), y = Y(e[2]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            for (var i = o.envelope.length - 1; i >= 0; i--) ctx.lineTo(X(o.envelope[i][0]), Y(o.envelope[i][1]));
            ctx.closePath(); ctx.fillStyle = 'rgba(95,185,138,0.16)'; ctx.fill();
            ctx.strokeStyle = 'rgba(95,185,138,0.7)'; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
        }
        // rejilla vertical = tamices
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        (o.aberturas || []).forEach(function (mm) {
            var x = X(mm);
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + h); ctx.stroke();
            ctx.save(); ctx.translate(x, T + h + 6); ctx.rotate(-Math.PI / 4); ctx.fillStyle = COL.txt; ctx.textAlign = 'right';
            ctx.fillText(C.etiquetaTamiz(mm), 4, 0); ctx.restore();
        });
        ctx.strokeStyle = COL.axis; ctx.strokeRect(L, T, w, h);
        ctx.save(); ctx.translate(12, T + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = COL.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('% que pasa', 0, 0); ctx.restore();
        ctx.fillStyle = COL.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Abertura del tamiz (mm, escala log.)', L + w / 2, H - 6);
        // series
        (o.series || []).forEach(function (s) {
            if (!s.pts || s.pts.length < 1) return;
            ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []);
            ctx.beginPath();
            s.pts.forEach(function (pt, i) { var x = X(pt[0]), y = Y(pt[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            ctx.stroke(); ctx.setLineDash([]);
            if (s.dots) s.pts.forEach(function (pt) { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(pt[0]), Y(pt[1]), 3, 0, 6.283); ctx.fill(); });
        });
        // leyenda
        var items = (o.series || []).concat(o.envelope ? [{ label: 'Límites ASTM C33', color: 'rgba(95,185,138,0.9)', width: 8 }] : []).filter(function (s) { return s.label; });
        var lx = L + 8, ly = T + h - 12 - 15 * (items.length - 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '11px Arial, sans-serif';
        items.forEach(function (s) {
            ctx.fillStyle = s.color; ctx.fillRect(lx, ly - 2, 14, s.width > 5 ? 6 : 3);
            ctx.fillStyle = COL.txt; ctx.fillText(s.label, lx + 20, ly);
            ly += 15;
        });
    }
    M.draw = { fit: fitCanvas, COL: COL, gradChart: gradChart };

    /* =========================================================
       INFORME (imprimir / guardar PDF) y guardado en historial
    ========================================================= */
    function usuarioActual() {
        try { var s = typeof root.aulaGetSession === 'function' ? root.aulaGetSession() : null; return s ? (s.nombre || s.email || '') : ''; } catch (e) { return ''; }
    }
    M.imprimirInforme = function (rep) {
        if (!rep) { toast('Calcula primero para generar el informe.'); return; }
        var w = root.open('', '_blank');
        if (!w) { toast('El navegador bloqueó la ventana. Permite ventanas emergentes e inténtalo de nuevo.'); return; }
        var rows = function (arr) {
            return (arr || []).map(function (r) { return '<tr><td>' + esc(r.label) + '</td><td>' + esc(r.valor) + '</td></tr>'; }).join('');
        };
        var html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + esc(rep.titulo) + ' — GeoMetrics</title><style>' +
            'body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;max-width:820px}h1{font-size:20px;margin:0 0 4px;color:#003366}' +
            'h2{font-size:14px;margin:22px 0 6px;color:#003366;border-bottom:2px solid #003366;padding-bottom:3px}.m{color:#555;font-size:12px}' +
            'table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #bbb;padding:5px 8px;text-align:left}th{background:#eef2f7}' +
            'td:last-child{text-align:right;font-variant-numeric:tabular-nums}li{font-size:12px;margin:3px 0}.f{margin-top:30px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:8px}' +
            '@media print{body{margin:14mm}}</style></head><body>' +
            '<h1>' + esc(rep.titulo) + '</h1><div class="m">Universidad de Pamplona · Ingeniería Civil · Diseño de Mezclas (165019) · GeoMetrics<br>' +
            (rep.norma ? 'Norma de referencia: ' + esc(rep.norma) + '<br>' : '') + 'Fecha: ' + esc(rep.fecha || new Date().toLocaleString('es-CO')) +
            (rep.usuario ? ' · Estudiante/Docente: ' + esc(rep.usuario) : '') + '</div>' +
            '<h2>Datos ingresados</h2><table><tbody>' + rows(rep.entradas) + '</tbody></table>' +
            '<h2>Resultados</h2><table><tbody>' + rows(rep.resultados) + '</tbody></table>' +
            (rep.tablaHtml ? '<h2>' + esc(rep.tablaTitulo || 'Detalle') + '</h2>' + rep.tablaHtml : '') +
            ((rep.avisos && rep.avisos.length) ? '<h2>Observaciones</h2><ul>' + rep.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
            '<div class="f">Informe generado con fines académicos. Los valores del método ACI 211.1 son una primera aproximación y deben verificarse con mezclas de prueba.</div>' +
            '<script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script></body></html>';
        w.document.open(); w.document.write(html); w.document.close();
    };
    function guardarUltimo() {
        if (!M.last) { toast('Primero pulsa CALCULAR para tener un resultado que guardar.'); return; }
        var r = M.last;
        if (typeof root.guardarResultado !== 'function') { toast('No se pudo guardar: historial no disponible.'); return; }
        r.reporte.usuario = usuarioActual();
        r.reporte.fecha = new Date().toLocaleString('es-CO');
        root.guardarResultado('Diseño de Mezclas — ' + r.titulo, r.resumen, { tipo: 'dm-' + r.id, entradas: r.reporte.entradas, reporte: r.reporte });
        toast('Guardado en «Mis resultados».');
    }

    /** Publica el resultado de un cálculo y lo deja listo para guardar/imprimir. */
    function publicar(def, o) {
        var html = '';
        if (o.error) html = errorBox(o.error);
        else {
            html = tiles(o.tiles) + (o.extra || '') + alerts(o.avisos);
            M.last = {
                id: def.id, titulo: def.titulo, resumen: o.resumen,
                reporte: { titulo: def.titulo, norma: def.norma, entradas: o.entradas, resultados: o.tiles.map(function (t) { return { label: t.l.replace(/<[^>]+>/g, ''), valor: String(t.v).replace(/<[^>]+>/g, '') + (t.s ? ' · ' + t.s.replace(/<[^>]+>/g, '') : '') }; }),
                           avisos: o.avisos || [], tablaHtml: o.tablaImpresion || '', tablaTitulo: o.tablaTitulo }
            };
        }
        setHtml('dmRes', html);
        var res = $('dmRes'); if (res) res.classList.toggle('is-empty', !!o.error);
    }

    /* =========================================================
       ENSAYOS — catálogo
    ========================================================= */
    var GRUPOS = [
        { n: 1, t: 'Caracterización de agregados', d: 'Datos que alimentan el diseño' },
        { n: 2, t: 'Diseño de la mezcla', d: 'Proporciones por m³' },
        { n: 3, t: 'Concreto fresco', d: 'Control en obra / laboratorio' },
        { n: 4, t: 'Concreto endurecido', d: 'Verificación de resistencia' }
    ];
    var ENS = {};      // id → definición
    var ORDEN = [];
    function reg(def) { ENS[def.id] = def; ORDEN.push(def.id); }

    /* ---------- 1. Granulometría ---------- */
    var GR_EJ = {
        fino: { masas: [0, 25, 65, 100, 110, 115, 55], fondo: 30, m0: 500 },
        grueso: { masas: [0, 0, 0, 350, 1550, 1200, 1600, 200], fondo: 100, m0: 5000 }
    };
    reg({
        id: 'granulometria', grupo: 1, icon: '📊', titulo: 'Granulometría de agregados', norma: 'NTC 77 · ASTM C136',
        desc: 'Análisis por tamices: porcentaje que pasa, módulo de finura, tamaño máximo nominal y comparación con ASTM C33.',
        obtiene: 'MF · TMN · curva granulométrica',
        proc: '<ol><li>Seca la muestra al horno (110 ± 5 °C) hasta masa constante y pésala (M₀).</li><li>Tamiza con agitación mecánica ≈ 10 min; pesa lo retenido en cada tamiz y en el fondo.</li>' +
            '<li>La suma de retenidos debe diferir de M₀ ≤ 0.3 %.</li><li>% retenido = masa / M₀ · 100;  % acumulado = Σ % retenidos;  % que pasa = 100 − % acumulado.</li>' +
            '<li><b>Módulo de finura</b> MF = Σ(% retenido acumulado en 3″, 1½″, ¾″, 3/8″, N.º 4, 8, 16, 30, 50 y 100) / 100.</li>' +
            '<li><b>TMN</b>: tamiz inmediatamente mayor al primero que retiene más del 10 %.</li></ol>',
        render: function () {
            return '<div class="dm-formrow">' + select('grTipo', 'Tipo de agregado', [['fino', 'Fino (arena)'], ['grueso', 'Grueso (grava / triturado)']], 'fino') +
                field('grM0', 'Masa seca inicial M₀', GR_EJ.fino.m0, { unit: 'g', hint: 'Opcional: permite verificar la pérdida de material.' }) + '</div>' +
                '<div class="dm-tablewrap"><table class="dm-table dm-inputs"><thead><tr><th>Tamiz</th><th>mm</th><th>Masa retenida (g)</th></tr></thead><tbody id="grRows"></tbody></table></div>' +
                '<div class="dm-actions"><button type="button" class="btn-calcular" id="grCalc">CALCULAR</button><button type="button" class="btn-limpiar" id="grEj">Cargar ejemplo</button><button type="button" class="btn-limpiar" id="grClr">Limpiar</button></div>';
        },
        after: '<div class="dm-panel dm-chartpanel"><h4>Curva granulométrica</h4><canvas id="grChart" data-ratio="0.72" role="img" aria-label="Curva granulométrica"></canvas></div>',
        bind: function () {
            function rows(tipo, ejemplo) {
                var set = tipo === 'fino' ? C.JUEGO_FINO : C.JUEGO_GRUESO, ej = GR_EJ[tipo];
                setHtml('grRows', set.map(function (mm, i) {
                    return '<tr><td>' + C.etiquetaTamiz(mm) + '</td><td>' + mm + '</td><td><input type="number" step="any" min="0" class="dm-gr" data-mm="' + mm + '" aria-label="Masa retenida en ' + C.etiquetaTamiz(mm) + '" value="' + (ejemplo ? ej.masas[i] : '') + '"></td></tr>';
                }).join('') + '<tr><td>Fondo</td><td>—</td><td><input type="number" step="any" min="0" id="grFondo" aria-label="Masa en el fondo" value="' + (ejemplo ? ej.fondo : '') + '"></td></tr>');
                $('grM0').value = ejemplo ? ej.m0 : '';
            }
            rows('fino', true);
            $('grTipo').addEventListener('change', function () { rows(this.value, true); $('grCalc').click(); });
            $('grEj').addEventListener('click', function () { rows($('grTipo').value, true); $('grCalc').click(); });
            $('grClr').addEventListener('click', function () { rows($('grTipo').value, false); setHtml('dmRes', '<p class="dm-empty">Ingresa las masas retenidas y pulsa CALCULAR.</p>'); M.last = null; });
            $('grCalc').addEventListener('click', function () {
                var tipo = val('grTipo'), filas = [];
                document.querySelectorAll('.dm-gr').forEach(function (inp) {
                    var s = inp.value.trim().replace(',', '.');
                    filas.push({ mm: parseFloat(inp.getAttribute('data-mm')), masa: s === '' ? NaN : parseFloat(s) });
                });
                var r = C.granulometria(filas, num('grFondo'), num('grM0'), tipo);
                if (!r.ok) { publicar(ENS.granulometria, { error: r.error }); return; }
                var tb = '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Tamiz</th><th>mm</th><th>Ret. (g)</th><th>% ret.</th><th>% acum.</th><th>% pasa</th></tr></thead><tbody>' +
                    r.tabla.map(function (t) { return '<tr><td>' + t.label + '</td><td>' + t.mm + '</td><td>' + fmt(t.masa, 1) + '</td><td>' + fmt(t.pctRet, 1) + '</td><td>' + fmt(t.pctAcum, 1) + '</td><td><b>' + fmt(t.pctPasa, 1) + '</b></td></tr>'; }).join('') +
                    '<tr><td>Fondo</td><td>—</td><td>' + fmt(r.fondo.masa, 1) + '</td><td>' + fmt(r.fondo.pctRet, 1) + '</td><td>100.0</td><td>0.0</td></tr></tbody></table></div>';
                var t = [];
                if (r.mf != null) t.push({ l: 'Módulo de finura', v: fmt(r.mf, 2), s: r.clasMF, big: true, tone: tipo === 'fino' ? (r.mf >= 2.3 && r.mf <= 3.1 ? 'ok' : 'warn') : '' });
                t.push({ l: 'TMN', v: r.tmn != null ? r.tmn + ' mm' : '—', s: r.tmn != null ? C.etiquetaTamiz(r.tmn) : 'ningún tamiz retiene > 10 %' });
                t.push({ l: 'Tamaño máximo', v: r.tm != null ? r.tm + ' mm' : '—' });
                if (tipo === 'fino') t.push({ l: 'ASTM C33 (fino)', v: r.cumpleC33 ? 'Cumple' : 'No cumple', tone: r.cumpleC33 ? 'ok' : 'bad' });
                if (r.perdida != null) t.push({ l: 'Pérdida de masa', v: fmt(r.perdida, 2) + ' %', tone: Math.abs(r.perdida) > 0.3 ? 'bad' : 'ok', s: 'máx. 0.3 %' });
                var av = r.avisos.slice();
                if (tipo === 'fino' && !r.cumpleC33) r.fueraC33.forEach(function (f) { av.push('Fuera de ASTM C33: ' + f); });
                var uso = '<div class="dm-actions"><button type="button" class="btn-limpiar" id="grUsar">Usar MF' + (r.tmn != null ? ' / TMN' : '') + ' en el diseño ACI</button></div>';
                publicar(ENS.granulometria, {
                    tiles: t, extra: tb + (tipo === 'fino' && r.mf != null || r.tmn != null ? uso : ''), avisos: av,
                    resumen: (r.mf != null ? 'MF = ' + fmt(r.mf, 2) + ' · ' : '') + (r.tmn != null ? 'TMN = ' + r.tmn + ' mm' : ''),
                    entradas: [{ label: 'Tipo de agregado', valor: tipo }, { label: 'Masa inicial M₀ (g)', valor: val('grM0') || '—' }].concat(r.tabla.map(function (x) { return { label: 'Retenido en ' + x.label + ' (g)', valor: fmt(x.masa, 1) }; })).concat([{ label: 'Fondo (g)', valor: fmt(r.fondo.masa, 1) }]),
                    tablaTitulo: 'Análisis granulométrico', tablaImpresion: tb
                });
                var b = $('grUsar');
                if (b) b.addEventListener('click', function () {
                    var p = {}; if (tipo === 'fino' && r.mf != null) p.mf = round2(r.mf);
                    if (r.tmn != null && tipo === 'grueso') { if (C.ACI.tmn.indexOf(r.tmn) >= 0) p.tmn = r.tmn; else { toast('El TMN ' + r.tmn + ' mm no está en las tablas ACI.'); return; } }
                    if (!Object.keys(p).length) { toast(tipo === 'fino' ? 'Falta la serie completa de tamices para el MF.' : 'No se pudo determinar el TMN.'); return; }
                    saveMat(p); toast('Datos enviados al diseño ACI.');
                });
                var ser = [{ pts: r.tabla.map(function (x) { return [x.mm, x.pctPasa]; }), color: COL.acc, width: 2.5, dots: true, label: 'Muestra' }];
                var mms = r.tabla.map(function (x) { return x.mm; });
                gradChart($('grChart'), { xmin: Math.min.apply(null, mms) / 1.5, xmax: Math.max.apply(null, mms) * 1.5, series: ser, aberturas: mms,
                    envelope: tipo === 'fino' ? C.LIMITES_C33_FINO.map(function (l) { return [l[0], l[1], l[2]]; }) : null });
                M._redraw = function () { $('grCalc') && $('grCalc').click(); };
            });
            $('grCalc').click();
        }
    });
    function round2(v) { return Math.round(v * 100) / 100; }

    /* ---------- 2. Gravedad específica y absorción ---------- */
    reg({
        id: 'gravedad', grupo: 1, icon: '⚖️', titulo: 'Gravedad específica y absorción', norma: 'NTC 237 / 176 · ASTM C128 / C127',
        desc: 'Densidad relativa seca, SSS y aparente, y absorción de arena (picnómetro) o grava (pesada hidrostática).',
        obtiene: 'Gs seca · Gs SSS · absorción %',
        proc: '<p><b>Arena (picnómetro):</b> A = masa seca al horno; B = picnómetro + agua; C = picnómetro + muestra + agua; S = masa SSS (≈ 500 g).</p>' +
            '<p class="dm-formula">Gs (seca) = A / (B + S − C) &nbsp;·&nbsp; Gs (SSS) = S / (B + S − C) &nbsp;·&nbsp; Gs (ap.) = A / (B + A − C) &nbsp;·&nbsp; Abs = (S − A)/A · 100</p>' +
            '<p><b>Grava:</b> A = masa seca al horno; B = masa SSS en aire; C = masa SSS sumergida.</p>' +
            '<p class="dm-formula">Gs (seca) = A / (B − C) &nbsp;·&nbsp; Gs (SSS) = B / (B − C) &nbsp;·&nbsp; Gs (ap.) = A / (A − C) &nbsp;·&nbsp; Abs = (B − A)/A · 100</p>' +
            '<p>Para el diseño ACI por volumen absoluto se usa la <b>Gs seca (bulk)</b>.</p>',
        render: function () {
            return select('gsTipo', 'Tipo de agregado', [['fino', 'Fino — método del picnómetro'], ['grueso', 'Grueso — pesada hidrostática']], 'fino', { wide: true }) +
                '<div class="dm-formrow" id="gsCampos"></div>' +
                '<div class="dm-actions"><button type="button" class="btn-calcular" id="gsCalc">CALCULAR</button></div>';
        },
        bind: function () {
            var EJ = { fino: [490, 670, 980, 500], grueso: [2000, 2030, 1260] };
            function campos(t) {
                setHtml('gsCampos', t === 'fino'
                    ? field('gsA', 'A · masa seca al horno', EJ.fino[0], { unit: 'g' }) + field('gsB', 'B · picnómetro + agua', EJ.fino[1], { unit: 'g' }) + field('gsC', 'C · picnómetro + muestra + agua', EJ.fino[2], { unit: 'g' }) + field('gsS', 'S · masa SSS', EJ.fino[3], { unit: 'g' })
                    : field('gsA', 'A · masa seca al horno', EJ.grueso[0], { unit: 'g' }) + field('gsB', 'B · masa SSS en aire', EJ.grueso[1], { unit: 'g' }) + field('gsC', 'C · masa SSS sumergida', EJ.grueso[2], { unit: 'g' }));
            }
            campos('fino');
            $('gsTipo').addEventListener('change', function () { campos(this.value); $('gsCalc').click(); });
            $('gsCalc').addEventListener('click', function () {
                var t = val('gsTipo'), A = num('gsA'), B = num('gsB'), Cc = num('gsC'), S = num('gsS');
                var r = t === 'fino' ? C.gravedadFino(A, B, Cc, S) : C.gravedadGrueso(A, B, Cc);
                if (!r.ok) { publicar(ENS.gravedad, { error: r.error }); return; }
                var tl = [{ l: 'Gs seca (bulk)', v: fmt(r.gsSeca, 3), big: true }, { l: 'Gs SSS', v: fmt(r.gsSSS, 3) }, { l: 'Gs aparente', v: fmt(r.gsAparente, 3) }, { l: 'Absorción', v: fmt(r.absorcion, 2) + ' %', big: true }];
                publicar(ENS.gravedad, {
                    tiles: tl, avisos: r.avisos, extra: '<div class="dm-actions"><button type="button" class="btn-limpiar" id="gsUsar">Usar Gs y absorción en el diseño ACI</button></div>',
                    resumen: 'Gs seca = ' + fmt(r.gsSeca, 3) + ' · Absorción = ' + fmt(r.absorcion, 2) + ' %',
                    entradas: [{ label: 'Tipo', valor: t }, { label: 'A (g)', valor: A }, { label: 'B (g)', valor: B }, { label: 'C (g)', valor: Cc }].concat(t === 'fino' ? [{ label: 'S (g)', valor: S }] : [])
                });
                $('gsUsar').addEventListener('click', function () {
                    saveMat(t === 'fino' ? { gsF: round2(r.gsSeca), absF: round2(r.absorcion) } : { gsG: round2(r.gsSeca), absG: round2(r.absorcion) });
                    toast('Gs y absorción del agregado ' + t + ' enviados al diseño ACI.');
                });
            });
            $('gsCalc').click();
        }
    });

    /* ---------- 3. Peso unitario y vacíos ---------- */
    reg({
        id: 'pesounit', grupo: 1, icon: '🧮', titulo: 'Peso unitario y vacíos', norma: 'NTC 92 · ASTM C29',
        desc: 'Masa unitaria suelta o compactada del agregado y porcentaje de vacíos entre partículas.',
        obtiene: 'PU (kg/m³) · % vacíos',
        proc: '<ol><li>Calibra el recipiente: volumen V = masa de agua que lo llena / ρagua (≈ 998 kg/m³ a 20 °C).</li><li><b>Compactado (varillado):</b> 3 capas, 25 golpes por capa. <b>Suelto:</b> descarga desde ≤ 50 mm de altura.</li>' +
            '<li>Enrasa y pesa: G = recipiente + agregado, T = recipiente vacío.</li></ol>' +
            '<p class="dm-formula">PU = (G − T) / V &nbsp;·&nbsp; % vacíos = (Gs · ρw − PU) / (Gs · ρw) · 100</p>' +
            '<p>El <b>PU compactado seco del grueso</b> es el dato que usa la tabla ACI 211.1 (b/b₀ · PUC).</p>',
        render: function () {
            return '<div class="dm-formrow">' + select('puAgg', 'Agregado', [['grueso', 'Grueso'], ['fino', 'Fino']], 'grueso') + select('puProc', 'Procedimiento', [['varillado', 'Compactado (varillado)'], ['suelto', 'Suelto']], 'varillado') +
                field('puG', 'G · recipiente + agregado', 18.2, { unit: 'kg', step: '0.01' }) + field('puT', 'T · recipiente vacío', 2.5, { unit: 'kg', step: '0.01' }) +
                field('puV', 'V · volumen del recipiente', 0.01, { unit: 'm³', step: '0.0001', hint: 'o deja vacío y usa la masa de agua →' }) + field('puW', 'Masa de agua de calibración', '', { unit: 'kg', step: '0.01', hint: 'Si V está vacío: V = masa / 998' }) +
                field('puGs', 'Gs seca del agregado', M.mat.gsG || 2.65, { step: '0.01', hint: 'Para calcular vacíos (opcional)' }) + '</div>' +
                '<div class="dm-actions"><button type="button" class="btn-calcular" id="puCalc">CALCULAR</button></div>';
        },
        bind: function () {
            $('puCalc').addEventListener('click', function () {
                var r = C.pesoUnitarioAgregado(num('puG'), num('puT'), num('puV'), num('puW'), num('puGs'));
                if (!r.ok) { publicar(ENS.pesounit, { error: r.error }); return; }
                var tl = [{ l: 'Peso unitario', v: fmt(r.pu, 0) + ' kg/m³', big: true, s: fmt(r.pu / 1000, 3) + ' t/m³' }, { l: 'Volumen del recipiente', v: fmt(r.volumen, 5) + ' m³' }];
                if (r.vacios != null) tl.push({ l: '% de vacíos', v: fmt(r.vacios, 1) + ' %' });
                var puedeUsar = val('puAgg') === 'grueso' && val('puProc') === 'varillado';
                publicar(ENS.pesounit, {
                    tiles: tl, avisos: r.avisos, extra: puedeUsar ? '<div class="dm-actions"><button type="button" class="btn-limpiar" id="puUsar">Usar PUC en el diseño ACI</button></div>' : '<p class="dm-hint">Para el diseño ACI usa el PU <b>compactado del agregado grueso</b>.</p>',
                    resumen: 'PU = ' + fmt(r.pu, 0) + ' kg/m³' + (r.vacios != null ? ' · vacíos ' + fmt(r.vacios, 1) + ' %' : ''),
                    entradas: [{ label: 'Agregado', valor: val('puAgg') }, { label: 'Procedimiento', valor: val('puProc') }, { label: 'G (kg)', valor: val('puG') }, { label: 'T (kg)', valor: val('puT') }, { label: 'V (m³)', valor: fmt(r.volumen, 5) }, { label: 'Gs seca', valor: val('puGs') || '—' }]
                });
                var b = $('puUsar'); if (b) b.addEventListener('click', function () { saveMat({ puc: Math.round(r.pu) }); toast('PUC enviado al diseño ACI.'); });
            });
            $('puCalc').click();
        }
    });

    /* ---------- 4. Humedad de agregados ---------- */
    reg({
        id: 'humedad', grupo: 1, icon: '💧', titulo: 'Humedad de los agregados', norma: 'NTC 1776 · ASTM C566',
        desc: 'Contenido de humedad evaporable y humedad libre para corregir el agua de mezclado en obra.',
        obtiene: 'w % · humedad libre · estado',
        proc: '<ol><li>Pesa la muestra húmeda (Mh), sécala al horno hasta masa constante y pésala (Ms).</li></ol><p class="dm-formula">w = (Mh − Ms) / Ms · 100 &nbsp;·&nbsp; Humedad libre = w − absorción</p>' +
            '<p>Si la humedad libre es positiva el agregado <b>aporta agua</b>; si es negativa la <b>absorbe</b>. Corrección del agua: Δagua = Σ Ms · (w − abs)/100.</p>',
        render: function () {
            return '<div class="dm-formrow">' + select('huAgg', 'Agregado', [['fino', 'Fino'], ['grueso', 'Grueso']], 'fino') +
                field('huH', 'Masa húmeda Mh', 520, { unit: 'g', step: '0.1' }) + field('huS', 'Masa seca Ms', 505, { unit: 'g', step: '0.1' }) +
                field('huAbs', 'Absorción', M.mat.absF != null ? M.mat.absF : 1.2, { unit: '%', step: '0.01', hint: 'Del ensayo de gravedad específica' }) + '</div>' +
                '<div class="dm-actions"><button type="button" class="btn-calcular" id="huCalc">CALCULAR</button></div>';
        },
        bind: function () {
            $('huAgg').addEventListener('change', function () { var a = M.mat[this.value === 'fino' ? 'absF' : 'absG']; if (a != null) $('huAbs').value = a; });
            $('huCalc').addEventListener('click', function () {
                var r = C.humedadAgregado(num('huH'), num('huS'), num('huAbs'));
                if (!r.ok) { publicar(ENS.humedad, { error: r.error }); return; }
                var tl = [{ l: 'Humedad total w', v: fmt(r.w, 2) + ' %', big: true }];
                if (r.libre != null) { tl.push({ l: 'Humedad libre (w − abs)', v: fmt(r.libre, 2) + ' %', tone: r.libre > 0.05 ? 'warn' : 'ok' }); tl.push({ l: 'Estado', v: r.estado }); }
                var t = val('huAgg');
                publicar(ENS.humedad, {
                    tiles: tl, avisos: r.avisos, extra: '<div class="dm-actions"><button type="button" class="btn-limpiar" id="huUsar">Usar humedad en el diseño ACI</button></div>',
                    resumen: 'w = ' + fmt(r.w, 2) + ' %' + (r.libre != null ? ' · libre ' + fmt(r.libre, 2) + ' %' : ''),
                    entradas: [{ label: 'Agregado', valor: t }, { label: 'Mh (g)', valor: val('huH') }, { label: 'Ms (g)', valor: val('huS') }, { label: 'Absorción (%)', valor: val('huAbs') || '—' }]
                });
                $('huUsar').addEventListener('click', function () {
                    var p = t === 'fino' ? { wF: round2(r.w) } : { wG: round2(r.w) };
                    if (!isNaN(num('huAbs'))) p[t === 'fino' ? 'absF' : 'absG'] = num('huAbs');
                    saveMat(p); toast('Humedad del agregado ' + t + ' enviada al diseño ACI.');
                });
            });
            $('huCalc').click();
        }
    });

    /* ---------- 5. Diseño ACI 211.1 ---------- */
    function aciLeer() {
        var m = M.mat;
        return {
            fc: num('acFc'), s: num('acS'), slump: num('acSl'), tmn: num('acTmn'), aire: val('acAire'),
            acMax: num('acAcMax'), ajusteAgua: isNaN(num('acAjuste')) ? 0 : num('acAjuste'),
            mf: num('acMf'), puc: num('acPuc'), gsC: num('acGsC'), gsG: num('acGsG'), gsF: num('acGsF'),
            wG: num('acWg'), absG: num('acAbsG'), wF: num('acWf'), absF: num('acAbsF'), volLab: num('acVol')
        };
    }
    var AIRE_OP = [['atrapado', 'Sin aire incorporado (atrapado)'], ['leve', 'Aire incorporado — exposición leve'], ['moderada', 'Aire incorporado — exposición moderada'], ['severa', 'Aire incorporado — exposición severa']];
    reg({
        id: 'aci211', grupo: 2, icon: '📐', titulo: 'Diseño de mezcla ACI 211.1', norma: 'ACI 211.1-91 · NSR-10 Título C',
        desc: 'Proporciones por m³ por el método del volumen absoluto, con corrección por humedad y tanda de laboratorio.',
        obtiene: 'a/c · cemento · agua · arena · grava',
        proc: '<ol><li>Resistencia requerida f′cr (NSR-10 C.5.3.2).</li><li>Agua de mezclado y aire según asentamiento y TMN (tabla ACI).</li><li>Relación a/c por resistencia y por durabilidad: manda la menor.</li>' +
            '<li>Cemento = agua / (a/c).</li><li>Grueso = (b/b₀) · PUC, con b/b₀ según TMN y MF de la arena.</li><li>Arena por volumen absoluto: V<sub>arena</sub> = 1 − (V<sub>c</sub> + V<sub>a</sub> + V<sub>aire</sub> + V<sub>g</sub>).</li>' +
            '<li>Corrección por humedad y absorción de los agregados.</li><li>Mezcla de prueba y ajustes.</li></ol>',
        render: function () {
            var m = M.mat;
            var banner = Object.keys(m).length ? '<div class="dm-banner">Datos tomados de tus ensayos: ' + Object.keys(m).map(function (k) { return '<code>' + k + ' = ' + m[k] + '</code>'; }).join(' ') + ' <button type="button" class="dm-link" id="acBorrarMat">borrar</button></div>' : '';
            return banner + '<fieldset class="dm-fs"><legend>1 · Requisitos</legend><div class="dm-formrow">' +
                field('acFc', 'f′c especificada', 28, { unit: 'MPa', step: '0.5' }) + field('acS', 'Desviación estándar s', '', { unit: 'MPa', step: '0.1', hint: 'Vacío = sin registros histórico (NSR-10 C.5.3.2.2)' }) +
                field('acSl', 'Asentamiento', 100, { unit: 'mm', step: '5' }) +
                select('acTmn', 'TMN del agregado grueso', C.ACI.tmn.map(function (v) { return [v, v + ' mm']; }), m.tmn || 19) + select('acAire', 'Aire', AIRE_OP, 'atrapado', { wide: true }) +
                field('acAcMax', 'a/c máx. por durabilidad', '', { step: '0.01', hint: 'Opcional (NSR-10 C.4.3)' }) + field('acAjuste', 'Ajuste de agua', 0, { unit: 'kg/m³', step: '1', hint: 'p. ej. −15 si el agregado es redondeado' }) +
                '</div></fieldset><fieldset class="dm-fs"><legend>2 · Materiales</legend><div class="dm-formrow">' +
                field('acMf', 'MF de la arena', m.mf || 2.7, { step: '0.05' }) + field('acPuc', 'PUC grueso (seco, varillado)', m.puc || 1600, { unit: 'kg/m³', step: '10' }) +
                field('acGsC', 'Gs cemento', 3.15, { step: '0.01' }) + field('acGsG', 'Gs seca grueso', m.gsG || 2.7, { step: '0.01' }) + field('acGsF', 'Gs seca fino', m.gsF || 2.65, { step: '0.01' }) +
                '</div></fieldset><fieldset class="dm-fs"><legend>3 · Humedad de agregados (opcional)</legend><p class="dm-hint">Llena los cuatro campos para corregir el agua y las masas en obra.</p><div class="dm-formrow">' +
                field('acWg', 'Humedad grueso', m.wG != null ? m.wG : '', { unit: '%', step: '0.1' }) + field('acAbsG', 'Absorción grueso', m.absG != null ? m.absG : '', { unit: '%', step: '0.1' }) +
                field('acWf', 'Humedad fino', m.wF != null ? m.wF : '', { unit: '%', step: '0.1' }) + field('acAbsF', 'Absorción fino', m.absF != null ? m.absF : '', { unit: '%', step: '0.1' }) +
                field('acVol', 'Volumen de tanda de laboratorio', 30, { unit: 'L', step: '1' }) + '</div></fieldset>' +
                '<div class="dm-actions"><button type="button" class="btn-calcular" id="acCalc">CALCULAR PROPORCIONES</button></div>';
        },
        bind: function () {
            var bm = $('acBorrarMat'); if (bm) bm.addEventListener('click', function () { clearMat(); M.renderEnsayos(); });
            $('acCalc').addEventListener('click', function () {
                var p = aciLeer(), r = C.disenoACI(p);
                if (!r.ok) { publicar(ENS.aci211, { error: r.error }); return; }
                M.lastACI = p;
                var tl = [
                    { l: 'a/c de diseño', v: fmt(r.ac, 3), big: true, s: 'controla ' + r.controla },
                    { l: 'Cemento', v: fmt(r.cemento, 0) + ' kg/m³', big: true },
                    { l: 'Agua de mezclado', v: fmt(r.humedad ? r.aguaCorregida : r.agua, 0) + ' kg/m³', big: true, s: r.humedad ? 'corregida por humedad' : 'sin corrección' },
                    { l: 'Grava ' + (r.humedad ? '(húmeda)' : '(seca)'), v: fmt(r.humedad ? r.gruesoHumedo : r.grueso, 0) + ' kg/m³' },
                    { l: 'Arena ' + (r.humedad ? '(húmeda)' : '(seca)'), v: fmt(r.humedad ? r.finoHumedo : r.fino, 0) + ' kg/m³' },
                    { l: 'Proporción en peso', v: '1 : ' + fmt(r.proporcion.fino, 2) + ' : ' + fmt(r.proporcion.grueso, 2), s: 'cemento : arena : grava' },
                    { l: 'Agua por bulto de 50 kg', v: fmt(r.proporcion.aguaLitros50kg, 1) + ' L' },
                    { l: 'Peso unitario teórico', v: fmt(r.pesoUnitarioTeorico, 0) + ' kg/m³', s: 'agregados SSS' }
                ];
                var paso = function (n, t, v, f) { return '<tr><td>' + n + '</td><td>' + t + '</td><td><b>' + v + '</b></td><td>' + f + '</td></tr>'; };
                var tb = '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>#</th><th>Paso</th><th>Valor</th><th>Fuente / fórmula</th></tr></thead><tbody>' +
                    paso(1, 'Resistencia requerida f′cr', fmt(r.fcr, 1) + ' MPa', 'NSR-10 C.5.3.2') +
                    paso(2, 'Agua de mezclado', fmt(r.agua, 1) + ' kg/m³', 'ACI 211.1 tabla 6.3.3') +
                    paso(2, 'Aire ' + (r.aireIncorporado ? 'total' : 'atrapado'), fmt(r.aire, 1) + ' %', 'ACI 211.1 tabla 6.3.3') +
                    paso(3, 'Relación a/c', fmt(r.ac, 3) + (r.controla === 'durabilidad' ? ' (durab.)' : ''), 'ACI 211.1 tabla 6.3.4(a)') +
                    paso(4, 'Cemento', fmt(r.cemento, 1) + ' kg/m³', 'agua / (a/c)') +
                    paso(5, 'Volumen de grueso b/b₀', fmt(r.vg, 3), 'ACI 211.1 tabla 6.3.6') +
                    paso(5, 'Masa de grava seca', fmt(r.grueso, 1) + ' kg/m³', '(b/b₀) · PUC') +
                    paso(6, 'Volumen de arena', fmt(r.vol.fino * 1000, 0) + ' L/m³', '1 − ΣV (cem + agua + aire + grava)') +
                    paso(6, 'Masa de arena seca', fmt(r.fino, 1) + ' kg/m³', 'V · Gs · 1000') +
                    (r.humedad ? paso(7, 'Aporte neto de agua de agregados', fmt(r.aporteAgua, 1) + ' kg/m³', 'Σ Ms·(w − abs)') : '') +
                    '</tbody></table></div>';
                var vol = r.vol, tot = vol.cemento + vol.agua + vol.aire + vol.grueso + vol.fino;
                var bar = '<div class="dm-volbar" role="img" aria-label="Composición por volumen absoluto">' +
                    [['Arena', vol.fino, COL.arena], ['Grava', vol.grueso, COL.grava], ['Cemento', vol.cemento, COL.cem], ['Agua', vol.agua, COL.agua], ['Aire', vol.aire, COL.aire]].map(function (x) {
                        return '<span style="width:' + (x[1] / tot * 100).toFixed(2) + '%;background:' + x[2] + '" title="' + x[0] + ': ' + fmt(x[1] * 1000, 0) + ' L"></span>'; }).join('') + '</div>' +
                    '<div class="dm-legend">' + [['Arena', vol.fino, COL.arena], ['Grava', vol.grueso, COL.grava], ['Cemento', vol.cemento, COL.cem], ['Agua', vol.agua, COL.agua], ['Aire', vol.aire, COL.aire]].map(function (x) {
                        return '<span><i style="background:' + x[2] + '"></i>' + x[0] + ' ' + fmt(x[1] * 1000, 0) + ' L</span>'; }).join('') + '</div>';
                var tanda = r.tanda ? '<h5>Tanda de laboratorio (' + fmt(r.tanda.volL, 0) + ' L)</h5>' + tiles([
                    { l: 'Cemento', v: fmt(r.tanda.cemento, 2) + ' kg' }, { l: 'Agua', v: fmt(r.tanda.agua, 2) + ' kg' }, { l: 'Arena', v: fmt(r.tanda.fino, 2) + ' kg' }, { l: 'Grava', v: fmt(r.tanda.grueso, 2) + ' kg' }]) : '';
                publicar(ENS.aci211, {
                    tiles: tl, extra: '<h5>Volumen absoluto por m³</h5>' + bar + tanda + '<h5>Paso a paso</h5>' + tb +
                        '<div class="dm-actions"><button type="button" class="btn-limpiar" id="acSim">Ver paso a paso en el simulador →</button></div>',
                    avisos: r.avisos, resumen: 'a/c ' + fmt(r.ac, 3) + ' · C ' + fmt(r.cemento, 0) + ' · A ' + fmt(r.humedad ? r.aguaCorregida : r.agua, 0) + ' kg/m³ · 1:' + fmt(r.proporcion.fino, 2) + ':' + fmt(r.proporcion.grueso, 2),
                    entradas: [
                        { label: "f′c (MPa)", valor: p.fc }, { label: 's (MPa)', valor: isNaN(p.s) ? '—' : p.s }, { label: 'Asentamiento (mm)', valor: p.slump }, { label: 'TMN (mm)', valor: p.tmn }, { label: 'Aire', valor: p.aire },
                        { label: 'a/c máx. durabilidad', valor: isNaN(p.acMax) ? '—' : p.acMax }, { label: 'MF arena', valor: p.mf }, { label: 'PUC grueso (kg/m³)', valor: p.puc },
                        { label: 'Gs cemento / grueso / fino', valor: p.gsC + ' / ' + p.gsG + ' / ' + p.gsF },
                        { label: 'Humedad / absorción grueso (%)', valor: r.humedad ? p.wG + ' / ' + p.absG : '—' }, { label: 'Humedad / absorción fino (%)', valor: r.humedad ? p.wF + ' / ' + p.absF : '—' }],
                    tablaTitulo: 'Paso a paso del diseño', tablaImpresion: tb
                });
                $('acSim').addEventListener('click', function () { if (M.openSim) M.openSim('aci211'); });
            });
            $('acCalc').click();
        }
    });

    /* ---------- 6. Revenimiento ---------- */
    function slumpMini(c, H0, Hf) {
        var f = fitCanvas(c, 0.5); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, sc = (H - 36) / 320, y0 = H - 14, cx = W * 0.5;
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = COL.axis; ctx.beginPath(); ctx.moveTo(10, y0); ctx.lineTo(W - 10, y0); ctx.stroke();
        // molde de referencia
        ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.moveTo(cx - 100 * sc * 0.8, y0); ctx.lineTo(cx - 50 * sc * 0.8, y0 - H0 * sc); ctx.lineTo(cx + 50 * sc * 0.8, y0 - H0 * sc); ctx.lineTo(cx + 100 * sc * 0.8, y0); ctx.stroke(); ctx.setLineDash([]);
        var s = Math.max(0, H0 - Hf), h = Hf, K = 17500 * 300 / Math.max(h, 30), rp = 50 + 0.35 * s;
        var Rp = (-rp + Math.sqrt(rp * rp - 4 * (rp * rp - K))) / 2, k = sc * 0.8;
        ctx.fillStyle = '#8b7a58'; ctx.beginPath(); ctx.moveTo(cx - Rp * k, y0);
        ctx.bezierCurveTo(cx - Rp * k * 1.05, y0 - h * sc * 0.35, cx - rp * k * 1.1, y0 - h * sc * 0.8, cx - rp * k, y0 - h * sc);
        ctx.quadraticCurveTo(cx, y0 - h * sc - 6, cx + rp * k, y0 - h * sc);
        ctx.bezierCurveTo(cx + rp * k * 1.1, y0 - h * sc * 0.8, cx + Rp * k * 1.05, y0 - h * sc * 0.35, cx + Rp * k, y0); ctx.closePath(); ctx.fill();
        // varilla de referencia + cota
        ctx.strokeStyle = '#e8edf2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 110 * k, y0 - H0 * sc); ctx.lineTo(cx + 110 * k, y0 - H0 * sc); ctx.stroke(); ctx.lineWidth = 1;
        ctx.strokeStyle = COL.rojo; ctx.beginPath(); ctx.moveTo(cx, y0 - H0 * sc); ctx.lineTo(cx, y0 - h * sc); ctx.stroke();
        ctx.fillStyle = COL.txt; ctx.font = '12px Arial'; ctx.textAlign = 'left';
        ctx.fillText('Asentamiento = ' + fmt(s, 0) + ' mm', cx + 14, y0 - (H0 + h) / 2 * sc);
    }
    reg({
        id: 'revenimiento', grupo: 3, icon: '🥣', titulo: 'Revenimiento (cono de Abrams)', norma: 'NTC 396 · ASTM C143',
        desc: 'Mide la consistencia del concreto fresco y verifica la tolerancia respecto al asentamiento especificado.',
        obtiene: 'Asentamiento · consistencia · conformidad',
        proc: '<ol><li>Humedece el molde (300 mm de alto) y colócalo sobre superficie plana, rígida y no absorbente.</li><li>Llena en 3 capas de igual volumen, <b>25 golpes por capa</b> con la varilla de 16 mm.</li>' +
            '<li>Enrasa, levanta el molde verticalmente en 5 ± 2 s. Todo el ensayo ≤ 2.5 min.</li><li>Mide la distancia entre la altura del molde y el centro desplazado de la muestra.</li></ol>' +
            '<p class="dm-formula">Asentamiento = H₀ − H<sub>f</sub></p><p>Tolerancias ASTM C94 sobre el valor especificado: ±15 mm (≤ 50 mm), ±25 mm (50–100 mm), ±40 mm (&gt; 100 mm). Si la muestra falla por cortante se repite el ensayo.</p>',
        render: function () {
            return '<div class="dm-formrow">' + field('rvH0', 'Altura del molde H₀', 300, { unit: 'mm' }) + field('rvHf', 'Altura final en el centro H_f', 220, { unit: 'mm' }) +
                field('rvEsp', 'Asentamiento especificado', 80, { unit: 'mm', hint: 'Opcional' }) + field('rvT', 'Temperatura del concreto', 24, { unit: '°C', hint: 'Opcional' }) +
                select('rvFalla', 'Forma de falla', [['verdadero', 'Asentamiento verdadero'], ['cortante', 'Cortante (la masa se desliza)'], ['colapso', 'Colapso total']], 'verdadero', { wide: true }) + '</div>' +
                '<div class="dm-actions"><button type="button" class="btn-calcular" id="rvCalc">CALCULAR</button></div>';
        },
        after: '<div class="dm-panel dm-chartpanel"><h4>Esquema del ensayo</h4><canvas id="rvMini" data-ratio="0.5" role="img" aria-label="Esquema del cono de Abrams"></canvas></div>',
        bind: function () {
            $('rvCalc').addEventListener('click', function () {
                var r = C.revenimiento(num('rvH0'), num('rvHf'), num('rvEsp'), num('rvT'), val('rvFalla'));
                if (!r.ok) { publicar(ENS.revenimiento, { error: r.error }); return; }
                var tl = [{ l: 'Asentamiento', v: fmt(r.slump, 0) + ' mm', big: true }, { l: 'Consistencia', v: r.clase }];
                if (r.cumple != null) tl.push({ l: 'Frente a lo especificado', v: r.cumple ? 'Cumple' : 'No cumple', tone: r.cumple ? 'ok' : 'bad', s: 'dif. ' + (r.dif >= 0 ? '+' : '') + fmt(r.dif, 0) + ' mm · tol. ±' + r.tolerancia + ' mm' });
                if (r.temp != null) tl.push({ l: 'Temperatura', v: fmt(r.temp, 1) + ' °C', tone: r.temp < 10 || r.temp > 32 ? 'warn' : '' });
                publicar(ENS.revenimiento, {
                    tiles: tl, avisos: r.avisos, resumen: 'Asentamiento = ' + fmt(r.slump, 0) + ' mm (' + r.clase + ')',
                    entradas: [{ label: 'H₀ (mm)', valor: val('rvH0') }, { label: 'H_f (mm)', valor: val('rvHf') }, { label: 'Especificado (mm)', valor: val('rvEsp') || '—' }, { label: 'Temperatura (°C)', valor: val('rvT') || '—' }, { label: 'Forma de falla', valor: val('rvFalla') }]
                });
                slumpMini($('rvMini'), num('rvH0'), num('rvHf'));
            });
            $('rvCalc').click();
        }
    });

    /* ---------- 7. Peso unitario del concreto fresco ---------- */
    reg({
        id: 'pesofresco', grupo: 3, icon: '🧪', titulo: 'Peso unitario, rendimiento y aire', norma: 'NTC 1926 · ASTM C138',
        desc: 'Densidad del concreto fresco, rendimiento de la tanda, contenido real de cemento y aire gravimétrico.',
        obtiene: 'γ fresco · rendimiento · aire %',
        proc: '<ol><li>Llena el recipiente calibrado en 3 capas (25 golpes c/u), golpea los costados y enrasa.</li><li>Pesa el recipiente lleno (Mc) y vacío (Mm).</li></ol>' +
            '<p class="dm-formula">γ = (Mc − Mm) / V<sub>m</sub> &nbsp;·&nbsp; Rendimiento Y = masa de la tanda / γ &nbsp;·&nbsp; Cemento real = cemento tanda / Y &nbsp;·&nbsp; Aire = (γ<sub>teórico</sub> − γ) / γ<sub>teórico</sub> · 100</p>' +
            '<p>El γ teórico sale del diseño (suma de masas con agregados SSS por m³).</p>',
        render: function () {
            return '<div class="dm-formrow">' + field('pfMc', 'Mc · recipiente lleno', 27.4, { unit: 'kg', step: '0.01' }) + field('pfMm', 'Mm · recipiente vacío', 4.2, { unit: 'kg', step: '0.01' }) + field('pfV', 'V · volumen del recipiente', 0.01, { unit: 'm³', step: '0.0001' }) +
                field('pfTanda', 'Masa total de la tanda', 60, { unit: 'kg', step: '0.1', hint: 'Todos los materiales cargados' }) + field('pfCem', 'Cemento de la tanda', 8, { unit: 'kg', step: '0.1', hint: 'Opcional' }) +
                field('pfTeo', 'γ teórico del diseño', M.lastACI ? '' : '', { unit: 'kg/m³', hint: 'Opcional — usa el valor del diseño ACI' }) + '</div>' +
                '<div class="dm-actions"><button type="button" class="btn-calcular" id="pfCalc">CALCULAR</button></div>';
        },
        bind: function () {
            if (M.lastACI) { var d = C.disenoACI(M.lastACI); if (d.ok && $('pfTeo')) $('pfTeo').value = Math.round(d.pesoUnitarioTeorico); }
            $('pfCalc').addEventListener('click', function () {
                var r = C.concretoFresco(num('pfMc'), num('pfMm'), num('pfV'), num('pfTanda'), num('pfTeo'));
                if (!r.ok) { publicar(ENS.pesofresco, { error: r.error }); return; }
                var tl = [{ l: 'Peso unitario fresco', v: fmt(r.gamma, 0) + ' kg/m³', big: true, s: fmt(r.gamma / 1000, 3) + ' t/m³' }];
                if (r.rendimiento != null) { tl.push({ l: 'Rendimiento', v: fmt(r.rendimiento, 4) + ' m³', s: 'de la tanda' }); if (!isNaN(num('pfCem'))) tl.push({ l: 'Cemento real', v: fmt(num('pfCem') / r.rendimiento, 0) + ' kg/m³' }); }
                if (r.aire != null) tl.push({ l: 'Aire gravimétrico', v: fmt(r.aire, 1) + ' %' });
                publicar(ENS.pesofresco, {
                    tiles: tl, avisos: r.avisos, resumen: 'γ = ' + fmt(r.gamma, 0) + ' kg/m³' + (r.aire != null ? ' · aire ' + fmt(r.aire, 1) + ' %' : ''),
                    entradas: [{ label: 'Mc (kg)', valor: val('pfMc') }, { label: 'Mm (kg)', valor: val('pfMm') }, { label: 'V (m³)', valor: val('pfV') }, { label: 'Masa tanda (kg)', valor: val('pfTanda') || '—' }, { label: 'Cemento tanda (kg)', valor: val('pfCem') || '—' }, { label: 'γ teórico (kg/m³)', valor: val('pfTeo') || '—' }]
                });
            });
            $('pfCalc').click();
        }
    });

    /* ---------- 8. Resistencia a compresión ---------- */
    var FALLAS = [['1', 'Tipo 1 · conos bien formados'], ['2', 'Tipo 2 · cono + grietas verticales'], ['3', 'Tipo 3 · grietas verticales en columna'], ['4', 'Tipo 4 · fractura diagonal'], ['5', 'Tipo 5 · fractura lateral en extremos'], ['6', 'Tipo 6 · extremo puntiagudo']];
    function cilFila(i, d, L, P) {
        return '<tr data-i="' + i + '"><td>' + (i + 1) + '</td><td><input type="number" step="any" class="cl-d" value="' + d + '" aria-label="Diámetro probeta ' + (i + 1) + '"></td><td><input type="number" step="any" class="cl-L" value="' + L + '" aria-label="Longitud probeta ' + (i + 1) + '"></td>' +
            '<td><input type="number" step="any" class="cl-P" value="' + P + '" aria-label="Carga probeta ' + (i + 1) + '"></td><td><select class="cl-F" aria-label="Tipo de falla probeta ' + (i + 1) + '">' + FALLAS.map(function (f) { return '<option value="' + f[0] + '">' + f[1] + '</option>'; }).join('') + '</select></td></tr>';
    }
    function cilBarras(c, r) {
        var f = fitCanvas(c, 0.55); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, L = 44, R = 14, T = 18, B = 30, w = W - L - R, h = H - T - B;
        var fm = Math.max.apply(null, r.cil.map(function (x) { return x.f; }).concat([r.fcEsp || 0])) * 1.2;
        function Y(v) { return T + h - v / fm * h; }
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
        ctx.font = '11px Arial'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
        var step = fm > 60 ? 10 : 5;
        for (var v = 0; v <= fm; v += step) { ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(W - R, Y(v)); ctx.stroke(); ctx.fillStyle = COL.txt; ctx.fillText(v, L - 6, Y(v)); }
        var bw = Math.min(60, w / r.cil.length * 0.6);
        r.cil.forEach(function (x, i) {
            var cx = L + w * (i + 0.5) / r.cil.length;
            ctx.fillStyle = (r.fcEsp && x.f < r.minimoIndividual) ? COL.rojo : COL.acc;
            ctx.fillRect(cx - bw / 2, Y(x.f), bw, Y(0) - Y(x.f));
            ctx.fillStyle = COL.txt; ctx.textAlign = 'center'; ctx.fillText(fmt(x.f, 1), cx, Y(x.f) - 9); ctx.fillText('#' + x.n, cx, H - 14);
        });
        if (r.fcEsp) {
            ctx.setLineDash([6, 4]); ctx.strokeStyle = COL.ok; ctx.beginPath(); ctx.moveTo(L, Y(r.fcEsp)); ctx.lineTo(W - R, Y(r.fcEsp)); ctx.stroke();
            ctx.strokeStyle = COL.warn; ctx.beginPath(); ctx.moveTo(L, Y(r.minimoIndividual)); ctx.lineTo(W - R, Y(r.minimoIndividual)); ctx.stroke(); ctx.setLineDash([]);
            ctx.textAlign = 'left'; ctx.fillStyle = COL.ok; ctx.fillText("f′c = " + fmt(r.fcEsp, 1), L + 6, Y(r.fcEsp) - 8);
            ctx.fillStyle = COL.warn; ctx.fillText('mínimo individual ' + fmt(r.minimoIndividual, 1), L + 6, Y(r.minimoIndividual) + 10);
        }
        ctx.save(); ctx.translate(12, T + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = COL.txt; ctx.textAlign = 'center'; ctx.fillText('f′c (MPa)', 0, 0); ctx.restore();
    }
    reg({
        id: 'compresion', grupo: 4, icon: '🏛️', titulo: 'Resistencia a la compresión de cilindros', norma: 'NTC 673 · ASTM C39 · NSR-10 C.5.6',
        desc: 'Resistencia de probetas cilíndricas, estadística del grupo, corrección por esbeltez y criterio de aceptación.',
        obtiene: "f′c por probeta · media · CV · aceptación",
        proc: '<ol><li>Cura los cilindros (23 ± 2 °C, húmedos) hasta la edad de ensayo y refrenta o usa almohadillas.</li><li>Carga a velocidad constante: <b>0.25 ± 0.05 MPa/s</b>. Registra la carga máxima P y el tipo de falla.</li></ol>' +
            '<p class="dm-formula">f′c = 4 · P / (π · D²) &nbsp;·&nbsp; si L/D &lt; 1.75 se multiplica por un factor de corrección (0.98 a 0.87)</p>' +
            '<p><b>Aceptación (NSR-10 C.5.6.3.3):</b> el promedio de cada 3 ensayos consecutivos ≥ f′c y ningún ensayo individual menor que f′c − 3.5 MPa (f′c ≤ 35 MPa) o 0.90 f′c (f′c &gt; 35 MPa).</p>' +
            '<p>Si ensayas a una edad distinta de 28 d, se estima f′c(28 d) con la relación hiperbólica de ACI 209R (curado húmedo, cemento tipo I): <em>referencia aproximada</em>.</p>',
        render: function () {
            return '<div class="dm-formrow">' + field('cmFc', "f′c especificada (28 d)", 28, { unit: 'MPa', step: '0.5' }) + field('cmEdad', 'Edad de ensayo', 28, { unit: 'días', step: '1' }) + '</div>' +
                '<div class="dm-tablewrap"><table class="dm-table dm-inputs"><thead><tr><th>#</th><th>Ø (mm)</th><th>L (mm)</th><th>P máx. (kN)</th><th>Falla</th></tr></thead><tbody id="cmRows">' +
                cilFila(0, 150, 300, 450) + cilFila(1, 150, 300, 470) + cilFila(2, 150, 300, 455) + '</tbody></table></div>' +
                '<div class="dm-actions"><button type="button" class="btn-calcular" id="cmCalc">CALCULAR</button><button type="button" class="btn-limpiar" id="cmAdd">+ Probeta</button><button type="button" class="btn-limpiar" id="cmDel">− Quitar</button></div>';
        },
        after: '<div class="dm-panel dm-chartpanel"><h4>Resistencia por probeta</h4><canvas id="cmChart" data-ratio="0.55" role="img" aria-label="Barras de resistencia por probeta"></canvas></div>',
        bind: function () {
            $('cmAdd').addEventListener('click', function () { var n = document.querySelectorAll('#cmRows tr').length; if (n >= 6) { toast('Máximo 6 probetas.'); return; } $('cmRows').insertAdjacentHTML('beforeend', cilFila(n, 150, 300, '')); });
            $('cmDel').addEventListener('click', function () { var rs = document.querySelectorAll('#cmRows tr'); if (rs.length > 1) rs[rs.length - 1].remove(); });
            $('cmCalc').addEventListener('click', function () {
                var cil = [], fallas = [];
                document.querySelectorAll('#cmRows tr').forEach(function (tr) {
                    var g = function (c) { var s = tr.querySelector(c).value.trim().replace(',', '.'); return s === '' ? NaN : parseFloat(s); };
                    cil.push({ d: g('.cl-d'), L: g('.cl-L'), P: g('.cl-P') }); fallas.push(tr.querySelector('.cl-F').value);
                });
                var r = C.compresionCilindros(cil, num('cmFc'), num('cmEdad'));
                if (!r.ok) { publicar(ENS.compresion, { error: r.error }); return; }
                var tl = [{ l: "f′c promedio", v: fmt(r.media, 2) + ' MPa', big: true, s: fmt(r.media * 10.197, 0) + ' kgf/cm²' }];
                if (r.sd != null) tl.push({ l: 'Desv. estándar / CV', v: fmt(r.sd, 2) + ' MPa', s: 'CV = ' + fmt(r.cv, 1) + ' %' });
                if (r.f28 != null && r.edad !== 28) tl.push({ l: "f′c estimada a 28 d", v: fmt(r.f28, 1) + ' MPa', s: 'factor edad ' + fmt(r.factorEdad, 2) });
                if (r.fcEsp != null) {
                    tl.push({ l: 'Promedio vs f′c', v: fmt(r.relacion, 0) + ' %', tone: r.mediaOk ? 'ok' : 'bad' });
                    tl.push({ l: 'Criterio NSR-10 C.5.6.3.3', v: r.cumple ? 'Cumple' : 'No cumple', tone: r.cumple ? 'ok' : 'bad', s: 'mín. individual ' + fmt(r.minimoIndividual, 1) + ' MPa' });
                }
                var tb = '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>#</th><th>Ø</th><th>A (mm²)</th><th>P (kN)</th><th>f′c (MPa)</th><th>Falla</th></tr></thead><tbody>' +
                    r.cil.map(function (x, i) { return '<tr><td>' + x.n + '</td><td>' + x.d + '</td><td>' + fmt(x.A, 0) + '</td><td>' + x.P + '</td><td><b>' + fmt(x.f, 2) + '</b></td><td>Tipo ' + fallas[i] + '</td></tr>'; }).join('') + '</tbody></table></div>';
                publicar(ENS.compresion, {
                    tiles: tl, extra: tb, avisos: r.avisos, tablaTitulo: 'Probetas ensayadas', tablaImpresion: tb,
                    resumen: "f′c prom. = " + fmt(r.media, 2) + ' MPa' + (r.fcEsp != null ? ' (' + fmt(r.relacion, 0) + ' % de f′c) · ' + (r.cumple ? 'cumple' : 'no cumple') : ''),
                    entradas: [{ label: "f′c especificada (MPa)", valor: val('cmFc') || '—' }, { label: 'Edad (días)', valor: val('cmEdad') || '—' }].concat(r.cil.map(function (x, i) { return { label: 'Probeta ' + x.n, valor: 'Ø ' + x.d + ' mm · P = ' + x.P + ' kN · falla tipo ' + fallas[i] }; }))
                });
                cilBarras($('cmChart'), r);
            });
            $('cmCalc').click();
        }
    });

    /* =========================================================
       RENDER DEL TAB «ENSAYOS»
    ========================================================= */
    function ensayosHome() {
        var h = '<div class="dm dm-intro"><p>Sigue la ruta de trabajo de un diseño de mezcla: <b>caracteriza los agregados → diseña → verifica en estado fresco → controla la resistencia</b>. ' +
            'Los datos que apruebes en un ensayo («Usar en el diseño ACI») se precargan en el diseño.</p></div>';
        GRUPOS.forEach(function (g) {
            var items = ORDEN.filter(function (id) { return ENS[id].grupo === g.n; });
            h += '<section class="dm dm-group"><header class="dm-grouphead"><span class="dm-num">' + g.n + '</span><div><h4>' + g.t + '</h4><p>' + g.d + '</p></div></header><div class="dm-cards">' +
                items.map(function (id) {
                    var e = ENS[id];
                    return '<button type="button" class="dm-card" data-ens="' + id + '"><span class="dm-card-ico" aria-hidden="true">' + e.icon + '</span><span class="dm-card-t">' + e.titulo + '</span><span class="dm-card-n">' + e.norma + '</span>' +
                        '<span class="dm-card-d">' + e.desc + '</span><span class="dm-card-o">' + e.obtiene + '</span><span class="dm-card-go">ABRIR ENSAYO →</span></button>';
                }).join('') + '</div></section>';
        });
        return h;
    }
    function ensayoView(id) {
        var e = ENS[id];
        return '<div class="dm dm-view"><header class="dm-viewhead"><button type="button" class="btn-limpiar" id="dmBackEns">← Ensayos</button>' +
            '<div class="dm-viewtitle"><h3>' + e.titulo + '</h3><span class="dm-norma">' + e.norma + '</span></div></header>' +
            '<div class="dm-cols"><div class="dm-col"><div class="dm-panel"><h4>Datos del ensayo</h4>' + e.render() + '</div>' + (e.after || '') +
            '</div><div class="dm-col"><div class="dm-panel dm-resultpanel"><h4>Resultados</h4><div id="dmRes" class="dm-res"><p class="dm-empty">Ingresa los datos y pulsa CALCULAR.</p></div>' +
            '<div class="dm-actions dm-savebar"><button type="button" class="btn-calcular" id="dmSave">Guardar en Mis resultados</button><button type="button" class="btn-limpiar" id="dmPrint">Informe (imprimir / PDF)</button></div></div>' +
            '<details class="dm-panel dm-proc" open><summary>Procedimiento y fórmulas</summary>' + e.proc + '</details></div></div></div>';
    }
    M.renderEnsayos = function () {
        var rootEl = $('dmEnsayosRoot'); if (!rootEl) return;
        M.last = null;
        if (!M.state.ens) { rootEl.innerHTML = ensayosHome(); rootEl.querySelectorAll('[data-ens]').forEach(function (b) { b.addEventListener('click', function () { M.abrirEnsayo(b.getAttribute('data-ens')); }); }); return; }
        rootEl.innerHTML = ensayoView(M.state.ens);
        $('dmBackEns').addEventListener('click', function () { M.state.ens = null; M.renderEnsayos(); scrollArriba(); });
        $('dmSave').addEventListener('click', guardarUltimo);
        $('dmPrint').addEventListener('click', function () { M.imprimirInforme(M.last && M.last.reporte ? Object.assign({ usuario: usuarioActual(), fecha: new Date().toLocaleString('es-CO') }, M.last.reporte) : null); });
        ENS[M.state.ens].bind(rootEl);
    };
    function scrollArriba() { try { var t = $('pantallaDisenoMezclas'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start' }); else root.scrollTo(0, 0); } catch (e) { root.scrollTo(0, 0); } }
    M.abrirEnsayo = function (id) {
        if (!ENS[id]) return;
        M.state.ens = id;
        // cambiar a la pestaña Ensayos si hace falta
        var btn = document.querySelector('#pantallaDisenoMezclas .tab-btn[data-tab="dm-ensayos"]');
        if (btn && !btn.classList.contains('active')) btn.click();
        M.renderEnsayos(); scrollArriba();
    };

    /* =========================================================
       TEORÍA
    ========================================================= */
    function tablaACI() {
        var A = C.ACI, th = A.tmn.map(function (v) { return '<th>' + v + '</th>'; }).join('');
        function filas(arr, lim) { return arr.map(function (f, i) { return '<tr><td>' + lim[i] + '</td>' + f.map(function (v) { return '<td>' + (v == null ? '—' : v) + '</td>'; }).join('') + '</tr>'; }).join(''); }
        var rangos = ['25 – 50', '75 – 100', '150 – 175'];
        return '<h5>Agua de mezclado (kg/m³) y aire — ACI 211.1 tabla 6.3.3</h5><div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Asentamiento (mm)</th><th colspan="8">Tamaño máximo nominal (mm)</th></tr><tr><th></th>' + th + '</tr></thead><tbody>' +
            '<tr class="dm-sub"><td colspan="9">Concreto sin aire incorporado</td></tr>' + filas(A.agua.sin, rangos) +
            '<tr><td><em>Aire atrapado (%)</em></td>' + A.aireAtrapado.map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr>' +
            '<tr class="dm-sub"><td colspan="9">Concreto con aire incorporado</td></tr>' + filas(A.agua.con, rangos) +
            '<tr><td><em>Aire total, exposición moderada (%)</em></td>' + A.aireIncorp.moderada.map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr></tbody></table></div>' +
            '<h5>Relación agua/cemento máxima — ACI 211.1 tabla 6.3.4(a)</h5><div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>f′cr a 28 d (MPa)</th><th>Sin aire incorporado</th><th>Con aire incorporado</th></tr></thead><tbody>' +
            A.acFcr.slice().reverse().map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1].toFixed(2) + '</td><td>' + (r[2] == null ? '—' : r[2].toFixed(2)) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
            '<h5>Volumen de agregado grueso seco-varillado por m³ — ACI 211.1 tabla 6.3.6</h5><div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>TMN (mm)</th>' + A.vgMF.map(function (m) { return '<th>MF = ' + m.toFixed(1) + '</th>'; }).join('') + '</tr></thead><tbody>' +
            A.tmn.map(function (t) { return '<tr><td>' + t + '</td>' + A.vg[String(t)].map(function (v) { return '<td>' + v.toFixed(2) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    }
    function ejemploACI() {
        var p = { fc: 28, slump: 100, tmn: 19, mf: 2.7, puc: 1600, gsC: 3.15, gsG: 2.7, gsF: 2.65, aire: 'atrapado' };
        var r = C.disenoACI(p);
        if (!r.ok) return '';
        return '<div class="dm-example"><h5>Ejemplo resuelto</h5><p>Viga de edificio: f′c = 28 MPa, asentamiento 100 mm, grava triturada TMN 19 mm (Gs seca 2.70, PUC 1600 kg/m³), arena con MF 2.7 (Gs 2.65), cemento Gs 3.15, sin aire incorporado.</p><ol>' +
            '<li>f′cr = f′c + 8.5 = <b>' + fmt(r.fcr, 1) + ' MPa</b> (sin registros de s).</li>' +
            '<li>Agua (TMN 19 mm, 100 mm) = <b>' + fmt(r.agua, 0) + ' kg/m³</b>; aire atrapado = <b>' + r.aire + ' %</b>.</li>' +
            '<li>a/c (interpolando 35 → 0.47 y 40 → 0.42) = <b>' + fmt(r.ac, 3) + '</b>.</li>' +
            '<li>Cemento = ' + fmt(r.agua, 0) + ' / ' + fmt(r.ac, 3) + ' = <b>' + fmt(r.cemento, 0) + ' kg/m³</b>.</li>' +
            '<li>b/b₀ = ' + fmt(r.vg, 2) + ' ⇒ grava = ' + fmt(r.vg, 2) + ' · 1600 = <b>' + fmt(r.grueso, 0) + ' kg/m³</b>.</li>' +
            '<li>Volúmenes (m³): cemento ' + fmt(r.vol.cemento, 3) + ' + agua ' + fmt(r.vol.agua, 3) + ' + aire ' + fmt(r.vol.aire, 3) + ' + grava ' + fmt(r.vol.grueso, 3) + ' = ' + fmt(1 - r.vol.fino, 3) + ' ⇒ arena = ' + fmt(r.vol.fino, 3) + ' m³ = <b>' + fmt(r.fino, 0) + ' kg/m³</b>.</li>' +
            '<li>Proporción en peso 1 : ' + fmt(r.fino / r.cemento, 2) + ' : ' + fmt(r.grueso / r.cemento, 2) + ' con a/c = ' + fmt(r.ac, 2) + '.</li></ol>' +
            '<p><a href="#" class="dm-link" data-go="aci211">Abrir este diseño en el ensayo →</a></p></div>';
    }
    function svgHumedad() {
        var estados = [['Seco al horno', 0, 0, 'Poros vacíos'], ['Seco al aire', 0.4, 0, 'Poros parcialmente llenos'], ['SSS', 1, 0, 'Poros llenos, superficie seca'], ['Húmedo', 1, 1, 'Poros llenos + agua libre']];
        return '<div class="dm-estados" role="img" aria-label="Estados de humedad de un agregado">' + estados.map(function (e, i) {
            return '<figure><svg viewBox="0 0 100 100" width="96" height="96"><circle cx="50" cy="50" r="' + (e[2] ? 44 : 38) + '" fill="rgba(77,143,217,' + (e[2] ? 0.35 : 0) + ')" stroke="rgba(77,143,217,' + (e[2] ? 0.9 : 0) + ')"/>' +
                '<circle cx="50" cy="50" r="36" fill="#8b7a58" stroke="#d6c9a8" stroke-width="2"/>' +
                [[38, 40], [58, 36], [48, 56], [62, 58], [36, 62], [52, 46]].map(function (p, k) { var lleno = k / 6 < e[1]; return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="' + (lleno ? '#4d8fd9' : '#2a2418') + '"/>'; }).join('') +
                '</svg><figcaption><b>' + e[0] + '</b><br><small>' + e[3] + '</small></figcaption></figure>';
        }).join('') + '</div>';
    }
    function teoriaHtml() {
        var sec = [
            ['ruta', 'Ruta de trabajo'], ['fund', 'Fundamentos'], ['agg', 'Agregados'], ['fresco', 'Concreto fresco'], ['duro', 'Concreto endurecido'],
            ['aci', 'Método ACI 211.1'], ['prueba', 'Mezcla de prueba y ajustes'], ['esp', 'Mezclas especiales'], ['bib', 'Bibliografía y normas']
        ];
        var toc = '<nav class="dm-toc" aria-label="Contenido de la teoría"><b>Contenido</b>' + sec.map(function (s, i) { return '<a href="#dm-t-' + s[0] + '" data-t="' + s[0] + '"><span>' + (i + 1) + '</span>' + s[1] + '</a>'; }).join('') + '</nav>';
        var h = '<div class="dm dm-teoria"><header class="dm-teohead"><h3>Diseño de Mezclas — Contenido programático (165019)</h3><p>Concreto, control de calidad y método ACI 211.1 con valores de las tablas y ejemplos calculados por la propia aplicación.</p></header><div class="dm-teolayout">' + toc + '<div class="dm-teobody">';
        h += '<section class="dm-sec" id="dm-t-ruta"><h4><span>1</span>Ruta de trabajo</h4><div class="dm-ruta">' +
            [['Caracterizar agregados', 'Granulometría, Gs, absorción, PU, humedad', 'granulometria'], ['Diseñar la mezcla', 'ACI 211.1: a/c, agua, cemento, arena, grava', 'aci211'], ['Mezcla de prueba', 'Revenimiento, peso unitario, aire', 'revenimiento'], ['Controlar resistencia', 'Cilindros a 7 y 28 d', 'compresion']].map(function (r, i) {
                return '<a href="#" class="dm-paso" data-go="' + r[2] + '"><span>' + (i + 1) + '</span><b>' + r[0] + '</b><small>' + r[1] + '</small></a>'; }).join('') + '</div></section>';
        h += '<section class="dm-sec" id="dm-t-fund"><h4><span>2</span>Fundamentos del diseño de mezclas</h4>' +
            '<p>El concreto es el material de construcción más usado en infraestructura. Un buen diseño busca cumplir a la vez <strong>resistencia, trabajabilidad, durabilidad y economía</strong>.</p>' +
            '<ul><li><strong>Cemento + agua = pasta</strong>: aglomerante que une los agregados; su cantidad define costo, calor y retracción.</li><li><strong>Agregados (≈ 60–75 % del volumen)</strong>: esqueleto del concreto; su granulometría y forma controlan la demanda de agua.</li><li><strong>Aire</strong>: atrapado (≈ 1–3 %) o incorporado (4–8 %) para durabilidad frente a congelamiento.</li><li><strong>Aditivos y adiciones</strong>: reductores de agua, plastificantes, retardantes, ceniza, escoria, humo de sílice.</li></ul>' +
            '<div class="dm-formula">f′c ≈ A / B<sup>(a/c)</sup> &nbsp; (ley de Abrams: a menor a/c, mayor resistencia)</div>' +
            '<p>La relación <strong>a/c</strong> gobierna porosidad, resistencia y durabilidad. La trabajabilidad se logra con el contenido de agua, no subiendo a/c: para mantener a/c con más agua hay que subir el cemento o usar aditivo.</p>' +
            '<div class="dm-callout"><b>Error común:</b> «agregar agua en obra para que fluya» sube el a/c y baja la resistencia y la durabilidad. 10 L/m³ de agua extra pueden costar ≈ 2–3 MPa.</div></section>';
        h += '<section class="dm-sec" id="dm-t-agg"><h4><span>3</span>Agregados: propiedades que entran al diseño</h4>' +
            '<p><strong>Gravedad específica</strong> (densidad relativa) en tres condiciones, y <strong>absorción</strong> (agua que llenan los poros):</p>' +
            '<div class="dm-formula">Gs (seca) = A / (B − C) &nbsp;·&nbsp; Absorción = (B − A) / A · 100</div>' + svgHumedad() +
            '<p>El agua de mezclado de las tablas ACI supone agregados <strong>saturados superficialmente secos (SSS)</strong>. En obra se corrige:</p>' +
            '<div class="dm-formula">Δagua = Σ M<sub>seca</sub> · (w − absorción) / 100 &nbsp;&nbsp; agua a mezclar = agua de diseño − Δagua</div>' +
            '<p><strong>Granulometría y módulo de finura:</strong> MF = Σ(% retenido acumulado en los tamices de la serie) / 100. Arena para concreto: MF entre <b>2.3 y 3.1</b> (ASTM C33). El <strong>TMN</strong> del grueso fija el agua y el volumen b/b₀: mayor TMN ⇒ menos agua y menos cemento para la misma resistencia, limitado por el espaciamiento del refuerzo (≤ 1/5 del lado menor del encofrado, ≤ 3/4 de la separación libre entre barras, ≤ 1/3 del espesor de losa — NSR-10 C.3.3.2).</p>' +
            '<p><strong>Peso unitario y vacíos:</strong> % vacíos = (Gs · ρw − PU) / (Gs · ρw) · 100. Una buena granulometría reduce vacíos y, con ellos, el volumen de pasta necesario.</p>' +
            '<p>Límites ASTM C33 para arena (% que pasa): 3/8″ 100 · N.º 4 95–100 · N.º 8 80–100 · N.º 16 50–85 · N.º 30 25–60 · N.º 50 5–30 · N.º 100 0–10.</p></section>';
        h += '<section class="dm-sec" id="dm-t-fresco"><h4><span>4</span>Control de calidad: estado fresco</h4>' +
            '<ul><li><strong>Revenimiento (slump, ASTM C143):</strong> consistencia. Asentamiento = H₀ − H<sub>f</sub>.</li><li><strong>Peso unitario y rendimiento (ASTM C138):</strong> γ = (Mc − Mm) / V; Rendimiento = masa de tanda / γ.</li><li><strong>Aire (ASTM C231 / C173):</strong> método de presión o volumétrico; gravimétrico por diferencia con γ teórico.</li><li><strong>Temperatura (ASTM C1064):</strong> típicamente 10–32 °C.</li></ul>' +
            '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Asentamiento</th><th>Consistencia</th><th>Uso típico</th></tr></thead><tbody>' +
            '<tr><td>0 – 25 mm</td><td>Muy seca</td><td>Prefabricados vibrados, concreto compactado con rodillo</td></tr><tr><td>25 – 50 mm</td><td>Seca / baja</td><td>Pavimentos con vibrador, concreto masivo</td></tr><tr><td>50 – 100 mm</td><td>Plástica / media</td><td>Losas, vigas, columnas (uso general)</td></tr><tr><td>100 – 150 mm</td><td>Blanda / alta</td><td>Muros esbeltos, elementos muy armados</td></tr><tr><td>150 – 200 mm</td><td>Fluida</td><td>Bombeo, tremie (normalmente con superplastificante)</td></tr></tbody></table></div>' +
            '<p>Asentamientos recomendados por ACI 211.1 (tabla 6.3.1), máx./mín. en mm: ' + C.ACI.asentamientos.map(function (a) { return a[0] + ' <b>' + a[1] + '/' + a[2] + '</b>'; }).join(' · ') + ' (con vibración).</p>' +
            '<div class="dm-callout">Tolerancias de recepción (ASTM C94): ±15 mm si el asentamiento especificado es ≤ 50 mm, ±25 mm entre 50 y 100 mm y ±40 mm si es mayor.</div></section>';
        h += '<section class="dm-sec" id="dm-t-duro"><h4><span>5</span>Estado endurecido: resistencia a la compresión</h4>' +
            '<div class="dm-formula">f′c = P / A = 4P / (π D²)</div>' +
            '<p><strong>Resistencia requerida de diseño (f′cr, NSR-10 C.5.3.2):</strong> con registros de desviación estándar s:</p>' +
            '<div class="dm-formula">f′cr = máx( f′c + 1.34 s ; f′c + 2.33 s − 3.5 ) &nbsp; [MPa]</div>' +
            '<p>Sin registros: f′c &lt; 21 → <b>f′c + 7.0</b> · 21 ≤ f′c ≤ 35 → <b>f′c + 8.5</b> · f′c &gt; 35 → <b>1.10 f′c + 5.0</b> (MPa).</p>' +
            '<p><strong>Otras propiedades:</strong> E<sub>c</sub> = 4700 √f′c (MPa) · módulo de rotura f<sub>r</sub> = 0.62 √f′c (MPa) (ACI 318 / NSR-10 C.8.5 y C.9.5.2.3).</p>' +
            '<p><strong>Edad y curado:</strong> la resistencia crece con la hidratación. Valores orientativos (cemento tipo I, curado húmedo): 3 d ≈ 45 %, 7 d ≈ 70 %, 28 d = 100 %, 90 d ≈ 111 % (relación hiperbólica de ACI 209R). Sin curado el concreto puede quedar 30 % por debajo.</p>' +
            '<p><strong>Aceptación (NSR-10 C.5.6.3.3):</strong> promedio de cada 3 ensayos consecutivos ≥ f′c y ningún ensayo individual por debajo de f′c − 3.5 MPa (o 0.90 f′c si f′c &gt; 35 MPa).</p></section>';
        h += '<section class="dm-sec" id="dm-t-aci"><h4><span>6</span>Método ACI 211.1 — proporciones por volumen absoluto</h4>' +
            '<p>Secuencia: resistencia requerida → asentamiento y TMN → agua y aire → relación a/c → cemento → volumen de grueso → arena por diferencia de volúmenes → corrección por humedad → mezcla de prueba.</p>' +
            '<div class="dm-formula">V = masa / (Gs · 1000) &nbsp;·&nbsp; V<sub>c</sub> + V<sub>agua</sub> + V<sub>aire</sub> + V<sub>g</sub> + V<sub>f</sub> = 1 m³</div>' +
            '<p>Las tablas siguientes son las que usa la aplicación (interpolación lineal entre filas y columnas):</p>' + tablaACI() + ejemploACI() +
            '<div class="dm-callout"><b>Ojo:</b> el b/b₀ se multiplica por el peso unitario <u>compactado (varillado) seco</u> del grueso, no por el suelto. Las tablas son una primera aproximación: la mezcla final se ajusta con ensayos.</div></section>';
        h += '<section class="dm-sec" id="dm-t-prueba"><h4><span>7</span>Mezcla de prueba y ajustes</h4>' +
            '<ol><li>Prepara una tanda de laboratorio (≥ 20–30 L) con las masas corregidas por humedad.</li><li>Mide asentamiento, peso unitario, aire y temperatura.</li><li>Si el asentamiento no coincide: ≈ 2 kg/m³ de agua por cada 10 mm (mantén a/c subiendo cemento) o ajusta con aditivo.</li><li>Moldea cilindros (mín. 3 por edad) y rompe a 7 y 28 d.</li><li>Recalcula el rendimiento: Y = masa de la tanda / γ y el cemento real = C / Y.</li><li>Si f′c a 28 d &lt; f′cr, baja a/c ≈ 0.02–0.03 y repite.</li></ol></section>';
        h += '<section class="dm-sec" id="dm-t-esp"><h4><span>8</span>Mezclas especiales e innovación</h4><ul>' +
            '<li><strong>Autocompactante (CAC):</strong> fluye sin vibrar; extensión de flujo típica 550–850 mm; más finos y superplastificante; control de segregación.</li>' +
            '<li><strong>Ligero:</strong> agregado ligero (arcilla expandida); densidad ≈ 1400–1900 kg/m³ (ACI 213R para estructural).</li>' +
            '<li><strong>Alta resistencia:</strong> a/c &lt; 0.35, humo de sílice y superplastificante; f′c ≥ 55 MPa (ACI 363R).</li>' +
            '<li><strong>Permeable:</strong> poco o nada de arena; vacíos ≈ 15–35 % (ACI 522R); drenaje urbano sostenible.</li>' +
            '<li><strong>Adiciones y fibras:</strong> escoria, ceniza volante, sílice, metacaolín; fibras de acero, sintéticas o de vidrio para control de fisuración.</li>' +
            '<li><strong>Sostenibilidad:</strong> sustituir cemento por adiciones reduce CO₂; agregados reciclados (RCA) exigen mayor absorción y ajuste de agua.</li></ul></section>';
        h += '<section class="dm-sec" id="dm-t-bib"><h4><span>9</span>Bibliografía y normas</h4><ul class="dm-bib">' +
            '<li>Sánchez de Guzmán, D. <em>Tecnología del concreto y del mortero</em>. Bhandar Editores, Bogotá.</li>' +
            '<li>Neville, A. M. <em>Properties of Concrete</em>, 5.ª ed. Pearson, 2011.</li>' +
            '<li>Mehta, P. K. y Monteiro, P. J. M. <em>Concrete: Microstructure, Properties, and Materials</em>, 4.ª ed. McGraw-Hill, 2014.</li>' +
            '<li>ACI Committee 211. <em>ACI 211.1-91: Standard Practice for Selecting Proportions for Normal, Heavyweight, and Mass Concrete</em> (reaprobada 2002).</li>' +
            '<li>Reglamento Colombiano de Construcción Sismo Resistente <em>NSR-10</em>, Título C — Concreto estructural.</li>' +
            '<li>ASTM C136, C128, C127, C29, C566, C143, C138, C39, C33, C94 · NTC 77, 237, 176, 92, 1776, 396, 673, 1926 (normas equivalentes colombianas).</li></ul>' +
            '<p class="dm-hint">Verifica siempre la edición vigente de cada norma y las tablas originales antes de usar los resultados en un diseño real.</p></section>';
        h += '</div></div></div>';
        return h;
    }
    function bindTeoria(rootEl) {
        rootEl.querySelectorAll('.dm-toc a').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                var t = $('dm-t-' + a.getAttribute('data-t')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
        rootEl.querySelectorAll('[data-go]').forEach(function (a) {
            a.addEventListener('click', function (e) { e.preventDefault(); M.abrirEnsayo(a.getAttribute('data-go')); });
        });
        if ('IntersectionObserver' in root) {
            var links = {};
            rootEl.querySelectorAll('.dm-toc a').forEach(function (a) { links[a.getAttribute('data-t')] = a; });
            var io = new IntersectionObserver(function (es) {
                es.forEach(function (en) {
                    if (en.isIntersecting) {
                        Object.keys(links).forEach(function (k) { links[k].classList.remove('is-on'); });
                        var k = en.target.id.replace('dm-t-', ''); if (links[k]) links[k].classList.add('is-on');
                    }
                });
            }, { rootMargin: '-15% 0px -70% 0px' });
            rootEl.querySelectorAll('.dm-sec').forEach(function (s) { io.observe(s); });
        }
    }

    /* =========================================================
       Arranque
    ========================================================= */
    M.init = function () {
        var t = $('dmTeoriaRoot'), e = $('dmEnsayosRoot');
        if (!t || !e || M._init) return; M._init = true;
        t.innerHTML = teoriaHtml(); bindTeoria(t);
        M.renderEnsayos();
        // al volver a mostrar una pestaña se vuelven a dibujar los canvas (estaban ocultos)
        var tabs = document.querySelectorAll('#pantallaDisenoMezclas .tab-btn');
        tabs.forEach(function (b) {
            b.addEventListener('click', function () {
                if (M.stopSim) M.stopSim();
                setTimeout(function () { if (b.getAttribute('data-tab') === 'dm-ensayos' && M._redraw && M.state.ens === 'granulometria') M._redraw(); if (M.redrawSim) M.redrawSim(); }, 60);
            });
        });
        var rz;
        root.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (M.state.ens === 'granulometria' && M._redraw) M._redraw(); if (M.redrawSim) M.redrawSim(); }, 150); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', M.init); else M.init();
    M.util = { $: $, esc: esc, fmt: fmt, num: num, val: val, field: field, select: select, tiles: tiles, alerts: alerts, errorBox: errorBox, toast: toast, setHtml: setHtml, saveMat: saveMat };
})(typeof window !== 'undefined' ? window : globalThis);
