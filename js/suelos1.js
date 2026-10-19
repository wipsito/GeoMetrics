/* =========================================================
   GeoMetrics — Mecánica de Suelos I: interfaz (teoría + ensayos)
   Requiere: js/suelos1-calc.js (motor de cálculo sin DOM)
   Misma arquitectura que Diseño de Mezclas: catálogo de ensayos,
   ficha con datos + resultados + procedimiento y teoría con TOC.
   ========================================================= */
(function (root) {
    'use strict';
    var C = root.Suelos1Calc;
    if (!C) { if (root.console) console.error('Mecánica de Suelos I: falta js/suelos1-calc.js'); return; }

    var S = root.Suelos1 = root.Suelos1 || {};
    S.C = C;
    S.last = null;
    S.state = { ens: null };

    /* ---------- utilidades DOM ---------- */
    function $(id) { return document.getElementById(id); }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function fmt(v, d) { return C.fmt(v, d == null ? 2 : d); }
    function num(id) { var el = $(id); return el ? C.num(el.value) : NaN; }
    function val(id) { var el = $(id); return el ? el.value : ''; }
    function setVal(id, v) { var el = $(id); if (el) el.value = v == null ? '' : v; }
    function setHtml(id, h) { var el = $(id); if (el) el.innerHTML = h; }
    function field(id, label, value, o) {
        o = o || {};
        return '<label class="s1-field' + (o.wide ? ' s1-wide' : '') + '" for="' + id + '"><span class="s1-lab">' + label +
            (o.unit ? ' <em>(' + o.unit + ')</em>' : '') + '</span>' +
            '<input type="number" inputmode="decimal" id="' + id + '" value="' + (value == null ? '' : value) + '"' +
            (o.step ? ' step="' + o.step + '"' : ' step="any"') + (o.min != null ? ' min="' + o.min + '"' : '') +
            (o.max != null ? ' max="' + o.max + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' +
            (o.hint ? '<small class="s1-hint">' + o.hint + '</small>' : '') + '</label>';
    }
    function select(id, label, opts, sel, o) {
        o = o || {};
        return '<label class="s1-field' + (o.wide ? ' s1-wide' : '') + '" for="' + id + '"><span class="s1-lab">' + label + '</span>' +
            '<select id="' + id + '">' + opts.map(function (op) {
                var v = Array.isArray(op) ? op[0] : op, t = Array.isArray(op) ? op[1] : op;
                return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(t) + '</option>';
            }).join('') + '</select>' + (o.hint ? '<small class="s1-hint">' + o.hint + '</small>' : '') + '</label>';
    }
    function tiles(items) {
        return '<div class="s1-tiles">' + items.map(function (it) {
            return '<div class="s1-tile' + (it.tone ? ' is-' + it.tone : '') + (it.big ? ' is-big' : '') + '"><span>' + it.l + '</span><strong>' + it.v + '</strong>' + (it.s ? '<small>' + it.s + '</small>' : '') + '</div>';
        }).join('') + '</div>';
    }
    function alerts(list) {
        if (!list || !list.length) return '';
        return '<ul class="s1-alerts">' + list.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    }
    function errorBox(msg) { return '<div class="s1-error" role="alert">⚠ ' + esc(msg) + '</div>'; }
    function toast(msg) {
        var t = $('s1Toast');
        if (!t) {
            t = document.createElement('div'); t.id = 's1Toast'; t.className = 's1-toast'; t.setAttribute('role', 'status');
            document.body.appendChild(t);
        }
        t.textContent = msg; t.classList.add('is-on');
        clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('is-on'); }, 2800);
    }
    function emptyHtml(txt) { return '<p class="s1-empty">' + (txt || 'Ingresa los datos y pulsa CALCULAR.') + '</p>'; }

    /* =========================================================
       MEMORIA DE LA PRÁCTICA (datos que pasan entre ensayos)
       ========================================================= */
    var MEM_KEY = 'geometrics_s1_memoria';
    S.mem = {};
    try { S.mem = JSON.parse(localStorage.getItem(MEM_KEY) || '{}') || {}; } catch (e) { S.mem = {}; }
    function memSave(part) {
        for (var k in part) if (Object.prototype.hasOwnProperty.call(part, k)) S.mem[k] = part[k];
        try { localStorage.setItem(MEM_KEY, JSON.stringify(S.mem)); } catch (e) {}
    }
    function memClear() {
        S.mem = {};
        try { localStorage.removeItem(MEM_KEY); } catch (e) {}
    }
    function memVal(key, prop) { return S.mem && S.mem[key] ? S.mem[key][prop] : null; }
    function memoriaHtml() {
        var parts = [];
        if (S.mem.gran) parts.push('<button type="button" class="s1-chip" data-go="granulometria">Granulometría <b>#200 ' + fmt(S.mem.gran.p200, 1) + ' %</b> <small>#4 ' + fmt(S.mem.gran.p4, 1) + ' %</small></button>');
        if (S.mem.limites) parts.push('<button type="button" class="s1-chip" data-go="limites">Límites <b>LL ' + fmt(S.mem.limites.ll, 1) + ' %</b> <small>IP ' + fmt(S.mem.limites.ip, 1) + ' %</small></button>');
        if (S.mem.gravedad) parts.push('<button type="button" class="s1-chip" data-go="gravedad">Gravedad específica <b>Gs ' + fmt(S.mem.gravedad.gs, 3) + '</b></button>');
        if (S.mem.proctor) parts.push('<button type="button" class="s1-chip" data-go="compactacion">Proctor <b>γd ' + fmt(S.mem.proctor.gdmax, 3) + ' g/cm³</b> <small>wópt ' + fmt(S.mem.proctor.wopt, 1) + ' %</small></button>');
        if (!parts.length) return '';
        return '<div class="s1-memory"><b>Memoria de la práctica</b>' + parts.join('') +
            '<button type="button" class="s1-btn s1-btn-ghost s1-memclear" id="s1MemClear">Borrar memoria</button></div>';
    }

    /* =========================================================
       INFORME (imprimir / guardar PDF) y guardado en historial
       ========================================================= */
    function usuarioActual() {
        try { var s = typeof root.aulaGetSession === 'function' ? root.aulaGetSession() : null; return s ? (s.nombre || s.email || '') : ''; } catch (e) { return ''; }
    }
    S.imprimirInforme = function (rep) {
        if (!rep) { toast('Calcula primero para generar el informe.'); return; }
        var w = root.open('', '_blank');
        if (!w) { toast('El navegador bloqueó la ventana. Permite ventanas emergentes e inténtalo de nuevo.'); return; }
        var rows = function (arr) {
            return (arr || []).map(function (r) { return '<tr><td>' + esc(r.label) + '</td><td>' + esc(r.valor) + '</td></tr>'; }).join('');
        };
        var html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + esc(rep.titulo) + ' — GeoMetrics</title><style>' +
            'body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;max-width:840px}h1{font-size:20px;margin:0 0 4px;color:#003366}' +
            'h2{font-size:14px;margin:22px 0 6px;color:#003366;border-bottom:2px solid #003366;padding-bottom:3px}.m{color:#555;font-size:12px;line-height:1.6}' +
            'table{border-collapse:collapse;width:100%;font-size:13px;margin-bottom:6px}td,th{border:1px solid #bbb;padding:5px 8px;text-align:left}th{background:#eef2f7}' +
            'td:last-child{text-align:right;font-variant-numeric:tabular-nums}li{font-size:12px;margin:3px 0}.f{margin-top:30px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:8px}' +
            '.badge{display:inline-block;padding:2px 8px;border:1px solid #003366;border-radius:10px;font-size:11px;color:#003366}' +
            '@media print{body{margin:14mm}}</style></head><body>' +
            '<h1>' + esc(rep.titulo) + '</h1><div class="m">Universidad de Pamplona · Ingeniería Civil · Mecánica de Suelos I · GeoMetrics<br>' +
            (rep.norma ? 'Norma de referencia: ' + esc(rep.norma) + '<br>' : '') + 'Fecha: ' + esc(rep.fecha || new Date().toLocaleString('es-CO')) +
            (rep.usuario ? ' · Estudiante/Docente: ' + esc(rep.usuario) : '') + '</div>' +
            '<h2>Datos ingresados</h2><table><tbody>' + rows(rep.entradas) + '</tbody></table>' +
            '<h2>Resultados</h2><table><tbody>' + rows(rep.resultados) + '</tbody></table>' +
            (rep.tablaHtml ? '<h2>' + esc(rep.tablaTitulo || 'Detalle') + '</h2>' + rep.tablaHtml : '') +
            ((rep.avisos && rep.avisos.length) ? '<h2>Observaciones</h2><ul>' + rep.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
            '<div class="f">Informe generado con fines académicos. Los resultados deben verificarse con la norma vigente, la calibración de los equipos y la supervisión del docente.</div>' +
            '<script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script></body></html>';
        w.document.open(); w.document.write(html); w.document.close();
    };
    function guardarUltimo() {
        if (!S.last) { toast('Primero pulsa CALCULAR para tener un resultado que guardar.'); return; }
        var r = S.last;
        if (typeof root.guardarResultado !== 'function') { toast('No se pudo guardar: historial no disponible.'); return; }
        r.reporte.usuario = usuarioActual();
        r.reporte.fecha = new Date().toLocaleString('es-CO');
        root.guardarResultado('Mecánica de Suelos I — ' + r.titulo, r.resumen, {
            tipo: 's1-' + r.id, modulo: 'suelos1', entradas: r.reporte.entradas, reporte: r.reporte
        });
        toast('Guardado en «Mis resultados».');
    }
    function publicar(def, o) {
        var html = '';
        if (o.error) html = errorBox(o.error);
        else {
            html = tiles(o.tiles) + (o.extra || '') + alerts(o.avisos);
            S.last = {
                id: def.id, titulo: def.titulo, resumen: o.resumen,
                reporte: {
                    titulo: def.titulo, norma: def.norma, entradas: o.entradas || [],
                    resultados: o.tiles.map(function (t) {
                        return { label: t.l.replace(/<[^>]+>/g, ''), valor: String(t.v).replace(/<[^>]+>/g, '') + (t.s ? ' · ' + t.s.replace(/<[^>]+>/g, '') : '') };
                    }), avisos: o.avisos || [], tablaHtml: o.tablaImpresion || '', tablaTitulo: o.tablaTitulo
                }
            };
        }
        if (o.error) S.last = null;
        setHtml('s1Res', html + '<div class="s1-actions s1-savebar"><button type="button" class="s1-btn s1-btn-primary" id="s1Save">Guardar en Mis resultados</button><button type="button" class="s1-btn" id="s1Print">Informe (imprimir / PDF)</button></div>');
        var sv = $('s1Save'), pr = $('s1Print');
        if (sv) sv.addEventListener('click', guardarUltimo);
        if (pr) pr.addEventListener('click', function () {
            S.imprimirInforme(S.last && S.last.reporte ? Object.assign({ usuario: usuarioActual(), fecha: new Date().toLocaleString('es-CO') }, S.last.reporte) : null);
        });
    }

    /* =========================================================
       CANVAS: HiDPI y gráficos del módulo
       ========================================================= */
    var COL = {
        bg: '#0f1c2e', grid: 'rgba(255,255,255,0.10)', axis: 'rgba(255,255,255,0.55)',
        txt: '#c9d4df', acc: '#4d8fd9', arena: '#d6b86a', grava: '#9aa5b1',
        agua: '#4d8fd9', rojo: '#e0706b', ok: '#5fb98a', warn: '#e6b34a', soft: '#8fa3b8'
    };
    function fitCanvas(c, ratio) {
        if (!c) return null;
        var w = Math.round(c.getBoundingClientRect().width || (c.parentNode ? c.parentNode.clientWidth : 0) || 0);
        if (w < 40) return null;
        var h = Math.round(w * (ratio || parseFloat(c.getAttribute('data-ratio')) || 0.62));
        var dpr = Math.min(2.5, root.devicePixelRatio || 1);
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
            c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        }
        c.style.height = h + 'px';
        var ctx = c.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, w, h);
        return { ctx: ctx, W: w, H: h };
    }
    function axisBox(ctx, L, T, w, h) {
        ctx.strokeStyle = COL.axis; ctx.lineWidth = 1;
        ctx.strokeRect(L, T, w, h);
    }
    function title(ctx, text, W, T) {
        ctx.fillStyle = '#e6eef6'; ctx.font = 'bold 12px Arial, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(text, 12, Math.max(14, T - 8));
    }
    function chartHumedad(c, r) {
        var f = fitCanvas(c, 0.56); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, L = 48, R = 20, T = 30, B = 44, w = W - L - R, h = H - T - B;
        var ws = r.filas.map(function (x) { return x.w; });
        var yMax = Math.max.apply(null, ws.concat([r.promedio, 5])) * 1.25;
        function X(i) { return L + (i + 0.5) / ws.length * w; }
        function Y(v) { return T + h - (v / yMax) * h; }
        for (var gy = 0; gy <= 4; gy++) {
            var v = yMax * gy / 4;
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + w, Y(v)); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.font = '11px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(v.toFixed(1), L - 6, Y(v));
        }
        ws.forEach(function (v, i) {
            var bw = Math.max(18, w / ws.length * 0.55);
            ctx.fillStyle = 'rgba(77,143,217,.75)';
            ctx.fillRect(X(i) - bw / 2, Y(v), bw, Y(0) - Y(v));
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = 'bold 11px Arial';
            ctx.fillText(v.toFixed(2), X(i), Y(v) - 4);
            ctx.fillStyle = COL.soft; ctx.textBaseline = 'top'; ctx.font = '11px Arial';
            ctx.fillText('M' + (i + 1), X(i), T + h + 7);
        });
        ctx.save(); ctx.strokeStyle = COL.ok; ctx.setLineDash([6, 4]); ctx.beginPath();
        ctx.moveTo(L, Y(r.promedio)); ctx.lineTo(L + w, Y(r.promedio)); ctx.stroke(); ctx.restore();
        ctx.fillStyle = COL.ok; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.font = 'bold 11px Arial';
        ctx.fillText('prom. ' + r.promedio.toFixed(2) + ' %', L + w, Y(r.promedio) - 4);
        axisBox(ctx, L, T, w, h);
        title(ctx, 'Contenido de humedad por determinación (%)', W, T);
        ctx.fillStyle = COL.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.font = '11px Arial';
        ctx.fillText('Determinaciones', L + w / 2, H - 6);
    }
    function chartGranulometria(c, r) {
        var f = fitCanvas(c, 0.68); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, L = 52, R = 18, T = 34, B = 66, w = W - L - R, h = H - T - B;
        var pts = r.tabla.filter(function (x) { return x.mm > 0; }).map(function (x) { return { mm: x.mm, p: x.pctPasa, label: x.label }; });
        pts.sort(function (a, b) { return a.mm - b.mm; });
        if (!pts.length) return;
        var dmin = Math.min.apply(null, pts.map(function (x) { return x.mm; }));
        var dmax = Math.max.apply(null, pts.map(function (x) { return x.mm; }));
        var xmin = dmin / 1.6, xmax = dmax * 1.6;
        function X(mm) { return L + (Math.log10(xmax) - Math.log10(mm)) / (Math.log10(xmax) - Math.log10(xmin)) * w; }
        function Y(p) { return T + (100 - p) / 100 * h; }
        // zonas granulométricas
        var zones = [
            { x0: X(xmax), x1: X(4.75), color: 'rgba(154,165,177,.10)', name: 'GRAVA' },
            { x0: X(4.75), x1: X(0.075), color: 'rgba(214,184,106,.10)', name: 'ARENA' },
            { x0: X(0.075), x1: X(xmin), color: 'rgba(77,143,217,.10)', name: 'FINOS' }
        ];
        zones.forEach(function (z) {
            ctx.fillStyle = z.color; ctx.fillRect(z.x0, T, Math.max(0, z.x1 - z.x0), h);
            ctx.fillStyle = COL.soft; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            if (z.x1 - z.x0 > 30) ctx.fillText(z.name, (z.x0 + z.x1) / 2, T + 4);
        });
        // rejilla horizontal
        for (var p = 0; p <= 100; p += 20) {
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(L, Y(p)); ctx.lineTo(L + w, Y(p)); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.font = '11px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(p, L - 6, Y(p));
        }
        // rejilla vertical en tamices
        pts.forEach(function (x) {
            var xp = X(x.mm);
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(xp, T); ctx.lineTo(xp, T + h); ctx.stroke();
            ctx.save(); ctx.translate(xp, T + h + 6); ctx.rotate(-Math.PI / 4);
            ctx.fillStyle = COL.txt; ctx.font = '10px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(x.label, 4, 0); ctx.restore();
        });
        // curva
        ctx.strokeStyle = COL.acc; ctx.lineWidth = 2.5; ctx.beginPath();
        pts.forEach(function (x, i) { i ? ctx.lineTo(X(x.mm), Y(x.p)) : ctx.moveTo(X(x.mm), Y(x.p)); });
        ctx.stroke();
        pts.forEach(function (x) { ctx.fillStyle = COL.acc; ctx.beginPath(); ctx.arc(X(x.mm), Y(x.p), 3.4, 0, 6.283); ctx.fill(); });
        // D10, D30, D60
        [['D₁₀', r.D10], ['D₃₀', r.D30], ['D₆₀', r.D60]].forEach(function (d, i) {
            if (!d[1] || d[1] <= 0) return;
            var xp = X(d[1]);
            if (!isFinite(xp)) return;
            ctx.save(); ctx.strokeStyle = [COL.rojo, COL.warn, COL.ok][i]; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(xp, T); ctx.lineTo(xp, T + h); ctx.stroke(); ctx.restore();
            ctx.fillStyle = [COL.rojo, COL.warn, COL.ok][i]; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(d[0] + ' = ' + (d[1] >= 0.1 ? d[1].toFixed(2) : d[1].toFixed(3)) + ' mm', xp, T + h - 3);
        });
        axisBox(ctx, L, T, w, h);
        title(ctx, 'Curva granulométrica (% que pasa vs. abertura)', W, T);
        ctx.fillStyle = COL.txt; ctx.font = '11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Abertura del tamiz (mm, escala logarítmica decreciente)', L + w / 2, H - 6);
        ctx.save(); ctx.translate(14, T + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = COL.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('% que pasa', 0, 0); ctx.restore();
    }
    function chartLimites(c, r) {
        var f = fitCanvas(c, 0.68); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, L = 48, R = 18, T = 32, B = 46, w = W - L - R, h = H - T - B;
        var ns = r.puntos.map(function (p) { return p.n; });
        var ws = r.puntos.map(function (p) { return p.w; });
        var nmin = Math.max(5, Math.min.apply(null, ns) * 0.7), nmax = Math.max(25, Math.max.apply(null, ns) * 1.4);
        var wmin = Math.min.apply(null, ws.concat([r.ll])) - 2, wmax = Math.max.apply(null, ws.concat([r.ll])) + 2;
        function X(n) { return L + (Math.log10(n) - Math.log10(nmin)) / (Math.log10(nmax) - Math.log10(nmin)) * w; }
        function Y(v) { return T + h - (v - wmin) / (wmax - wmin) * h; }
        [10, 15, 20, 25, 30, 40, 50, 60, 80, 100].forEach(function (n) {
            if (n < nmin || n > nmax) return;
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(n), T); ctx.lineTo(X(n), T + h); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText(n, X(n), T + h + 5);
        });
        for (var gy = 0; gy <= 4; gy++) {
            var v = wmin + (wmax - wmin) * gy / 4;
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + w, Y(v)); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.font = '11px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(v.toFixed(1), L - 6, Y(v));
        }
        // recta ajustada
        ctx.strokeStyle = COL.acc; ctx.lineWidth = 2;
        var n1 = Math.max(nmin, 10), n2 = Math.min(nmax, 100);
        ctx.beginPath(); ctx.moveTo(X(n1), Y(r.m * Math.log10(n1) + r.b)); ctx.lineTo(X(n2), Y(r.m * Math.log10(n2) + r.b)); ctx.stroke();
        r.puntos.forEach(function (p) {
            ctx.fillStyle = COL.acc; ctx.beginPath(); ctx.arc(X(p.n), Y(p.w), 3.6, 0, 6.283); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = '10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
            ctx.fillText(p.n + ' golpes', X(p.n) + 5, Y(p.w) - 4);
        });
        // LL a 25 golpes
        ctx.save(); ctx.strokeStyle = COL.ok; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X(25), T); ctx.lineTo(X(25), T + h); ctx.stroke(); ctx.restore();
        ctx.fillStyle = COL.ok; ctx.beginPath(); ctx.arc(X(25), Y(r.ll), 4.5, 0, 6.283); ctx.fill();
        ctx.fillStyle = COL.ok; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('LL = ' + r.ll.toFixed(1) + ' % (25 golpes)', X(25) + 7, Y(r.ll) - 5);
        axisBox(ctx, L, T, w, h);
        title(ctx, 'Curva de fluidez (humedad vs. número de golpes)', W, T);
        ctx.fillStyle = COL.txt; ctx.font = '11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Número de golpes (escala log)', L + w / 2, H - 6);
        ctx.save(); ctx.translate(14, T + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = COL.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Contenido de humedad (%)', 0, 0); ctx.restore();
    }
    function chartPlasticidad(c, r) {
        var f = fitCanvas(c, 0.68); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, L = 48, R = 18, T = 32, B = 46, w = W - L - R, h = H - T - B;
        var ipMax = Math.max(60, (r.ip || 0) * 1.25, 20);
        function X(ll) { return L + (Math.max(0, Math.min(100, ll)) / 100) * w; }
        function Y(ip) { return T + h - (Math.max(0, Math.min(ipMax, ip)) / ipMax) * h; }
        for (var ll = 0; ll <= 100; ll += 10) {
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(ll), T); ctx.lineTo(X(ll), T + h); ctx.stroke();
            if (ll % 20 === 0) { ctx.fillStyle = COL.txt; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(ll, X(ll), T + h + 5); }
        }
        for (var ip = 0; ip <= ipMax; ip += 10) {
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(L, Y(ip)); ctx.lineTo(L + w, Y(ip)); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.font = '10px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(ip, L - 6, Y(ip));
        }
        // línea A
        ctx.strokeStyle = COL.rojo; ctx.lineWidth = 2; ctx.beginPath();
        var started = false;
        for (var l = 0; l <= 100; l += 1) {
            var a = 0.73 * (l - 20);
            if (a < 0) continue;
            if (!started) { ctx.moveTo(X(l), Y(a)); started = true; } else ctx.lineTo(X(l), Y(a));
        }
        ctx.stroke();
        // línea U
        ctx.save(); ctx.strokeStyle = 'rgba(230,179,74,.75)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; ctx.beginPath();
        for (var l2 = 8; l2 <= 100; l2 += 1) { var u = 0.9 * (l2 - 8); if (l2 === 8) ctx.moveTo(X(l2), Y(u)); else ctx.lineTo(X(l2), Y(u)); }
        ctx.stroke(); ctx.restore();
        ctx.fillStyle = COL.soft; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('CL', X(30), Y(16)); ctx.fillText('CH', X(70), Y(34)); ctx.fillText('ML', X(38), Y(4)); ctx.fillText('MH', X(70), Y(6)); ctx.fillText('CL-ML', X(25), Y(5.5));
        if (r.ip != null) {
            var xp = X(r.ll), yp = Y(r.ip);
            ctx.fillStyle = COL.warn; ctx.beginPath(); ctx.arc(xp, yp, 5, 0, 6.283); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
            ctx.fillText('LL ' + r.ll.toFixed(1) + ' · IP ' + r.ip.toFixed(1), xp + 8, yp - 5);
        }
        axisBox(ctx, L, T, w, h);
        title(ctx, 'Carta de plasticidad (Casagrande)', W, T);
        ctx.fillStyle = COL.txt; ctx.font = '11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Límite líquido LL (%)', L + w / 2, H - 6);
        ctx.save(); ctx.translate(14, T + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = COL.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Índice de plasticidad IP (%)', 0, 0); ctx.restore();
    }
    function chartProctor(c, r) {
        var f = fitCanvas(c, 0.66); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, L = 56, R = 18, T = 32, B = 48, w = W - L - R, h = H - T - B;
        var ws = r.puntos.map(function (p) { return p.w; });
        var gds = r.puntos.map(function (p) { return p.gd; });
        var wmin = Math.min.apply(null, ws) - 2, wmax = Math.max.apply(null, ws) + 3;
        var vals = gds.concat([r.gdmax]);
        (r.curvaZav || []).forEach(function (p) { if (p.w >= wmin && p.w <= wmax) vals.push(p.gd); });
        var gmin = Math.max(0, Math.min.apply(null, vals) - 0.05), gmax = Math.max.apply(null, vals) + 0.05;
        function X(v) { return L + (v - wmin) / (wmax - wmin) * w; }
        function Y(v) { return T + h - (v - gmin) / (gmax - gmin) * h; }
        for (var i = 0; i <= 5; i++) {
            var wv = wmin + (wmax - wmin) * i / 5;
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(wv), T); ctx.lineTo(X(wv), T + h); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(wv.toFixed(0), X(wv), T + h + 5);
        }
        for (var j = 0; j <= 4; j++) {
            var gv = gmin + (gmax - gmin) * j / 4;
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(L, Y(gv)); ctx.lineTo(L + w, Y(gv)); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.font = '11px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(gv.toFixed(2), L - 6, Y(gv));
        }
        // ZAV
        if (r.curvaZav && r.curvaZav.length) {
            ctx.save(); ctx.strokeStyle = COL.warn; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.6; ctx.beginPath();
            r.curvaZav.forEach(function (p, k) { if (p.w < wmin || p.w > wmax) return; k ? ctx.lineTo(X(p.w), Y(p.gd)) : ctx.moveTo(X(p.w), Y(p.gd)); });
            ctx.stroke(); ctx.restore();
            ctx.fillStyle = COL.warn; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
            ctx.fillText('ZAV (S = 100 %)', L + w - 6, T + 14);
        }
        // curva ajustada
        if (r.curva && r.curva.a != null) {
            ctx.strokeStyle = COL.acc; ctx.lineWidth = 2.4; ctx.beginPath();
            var first = true;
            for (var k = 0; k <= 120; k++) {
                var x = wmin + (wmax - wmin) * k / 120;
                var y = r.curva.a * x * x + r.curva.b * x + r.curva.c;
                if (y < gmin - 0.1 || y > gmax + 0.1) continue;
                if (first) { ctx.moveTo(X(x), Y(y)); first = false; } else ctx.lineTo(X(x), Y(y));
            }
            ctx.stroke();
        }
        r.puntos.forEach(function (p) {
            ctx.fillStyle = COL.acc; ctx.beginPath(); ctx.arc(X(p.w), Y(p.gd), 4, 0, 6.283); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        });
        // óptimo
        var xo = X(r.wopt), yo = Y(r.gdmax);
        ctx.save(); ctx.strokeStyle = COL.ok; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(xo, T); ctx.lineTo(xo, T + h); ctx.moveTo(L, yo); ctx.lineTo(L + w, yo); ctx.stroke(); ctx.restore();
        ctx.fillStyle = COL.ok; ctx.beginPath(); ctx.arc(xo, yo, 5.5, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('óptimo: ' + r.wopt.toFixed(1) + ' % · ' + r.gdmax.toFixed(3) + ' g/cm³', Math.min(xo + 8, L + w - 190), Math.max(yo - 8, T + 12));
        axisBox(ctx, L, T, w, h);
        title(ctx, 'Curva de compactación Proctor', W, T);
        ctx.fillStyle = COL.txt; ctx.font = '11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Contenido de humedad w (%)', L + w / 2, H - 6);
        ctx.save(); ctx.translate(14, T + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = COL.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Densidad seca γd (g/cm³)', 0, 0); ctx.restore();
    }
    function chartDensidad(c, r) {
        var f = fitCanvas(c, 0.42); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, L = 46, R = 22, T = 40, B = 40, w = W - L - R, h = H - T - B;
        function X(p) { return L + (Math.max(80, Math.min(110, p)) - 80) / 30 * w; }
        var bands = [[80, 95, 'rgba(224,112,107,.30)'], [95, 100, 'rgba(95,185,138,.30)'], [100, 110, 'rgba(77,143,217,.28)']];
        bands.forEach(function (b) { ctx.fillStyle = b[2]; ctx.fillRect(X(b[0]), T, X(b[1]) - X(b[0]), h); });
        [80, 85, 90, 95, 100, 105, 110].forEach(function (p) {
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(p), T); ctx.lineTo(X(p), T + h); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(p + '%', X(p), T + h + 5);
        });
        ctx.strokeStyle = COL.axis; ctx.strokeRect(L, T, w, h);
        title(ctx, 'Grado de compactación en campo (referencia Proctor)', W, T);
        if (r.gc == null) {
            ctx.fillStyle = COL.soft; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('Sin γd máxima de Proctor no se puede calcular el grado de compactación.', L + w / 2, T + h / 2);
            return;
        }
        var x = X(r.gc);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + h); ctx.stroke();
        ctx.fillStyle = r.gc >= 95 ? COL.ok : COL.rojo; ctx.beginPath(); ctx.arc(x, T + h / 2, 6, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(r.gc.toFixed(1) + ' %', x, T + h / 2 - 9);
        ctx.fillStyle = COL.soft; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('95 % mín.', X(95), T + 4); ctx.fillText('100 %', X(100), T + 4);
    }
    function chartPerm(c, r) {
        var f = fitCanvas(c, 0.45); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, L = 42, R = 20, T = 42, B = 54, w = W - L - R, h = H - T - B;
        var lo = -9, hi = -1;
        function X(v) { return L + (Math.log10(v) - lo) / (hi - lo) * w; }
        ctx.fillStyle = 'rgba(224,112,107,.22)'; ctx.fillRect(X(1e-9), T, X(1e-7) - X(1e-9), h);
        ctx.fillStyle = 'rgba(230,179,74,.22)'; ctx.fillRect(X(1e-7), T, X(1e-5) - X(1e-7), h);
        ctx.fillStyle = 'rgba(95,185,138,.22)'; ctx.fillRect(X(1e-5), T, X(1e-3) - X(1e-5), h);
        ctx.fillStyle = 'rgba(77,143,217,.22)'; ctx.fillRect(X(1e-3), T, X(1e-1) - X(1e-3), h);
        var marcas = [[1e-9, '10⁻⁹'], [1e-8, '10⁻⁸'], [1e-7, '10⁻⁷'], [1e-6, '10⁻⁶'], [1e-5, '10⁻⁵'], [1e-4, '10⁻⁴'], [1e-3, '10⁻³'], [1e-2, '10⁻²'], [1e-1, '10⁻¹']];
        marcas.forEach(function (m) {
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(m[0]), T); ctx.lineTo(X(m[0]), T + h); ctx.stroke();
            ctx.save(); ctx.translate(X(m[0]), T + h + 6); ctx.rotate(-Math.PI / 4); ctx.fillStyle = COL.txt; ctx.font = '10px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(m[1], 3, 0); ctx.restore();
        });
        ctx.fillStyle = COL.soft; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('ARCILLA', (X(1e-9) + X(1e-7)) / 2, T + 5);
        ctx.fillText('LIMO', (X(1e-7) + X(1e-5)) / 2, T + 5);
        ctx.fillText('ARENA', (X(1e-5) + X(1e-3)) / 2, T + 5);
        ctx.fillText('GRAVA', (X(1e-3) + X(1e-1)) / 2, T + 5);
        var k = Math.max(1e-9, Math.min(1e-1, r.k));
        var x = X(k);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + h); ctx.stroke();
        ctx.fillStyle = COL.acc; ctx.beginPath(); ctx.arc(x, T + h / 2, 6, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('k = ' + r.k.toExponential(2), x, T + h / 2 - 9);
        ctx.strokeStyle = COL.axis; ctx.strokeRect(L, T, w, h);
        title(ctx, 'Coeficiente de permeabilidad k (cm/s, escala log)', W, T);
    }
    function chartSucs(c, r) {
        var f = fitCanvas(c, 0.38); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, L = 30, R = 24, T = 42, B = 54, w = W - L - R, h = H - T - B;
        function X(p) { return L + p / 100 * w; }
        var segs = [
            { v: r.grava, color: COL.grava, label: 'Grava' },
            { v: r.arena, color: COL.arena, label: 'Arena' },
            { v: r.finos, color: COL.acc, label: 'Finos' }
        ];
        var acc = 0;
        segs.forEach(function (s) {
            var x0 = X(acc), x1 = X(acc + s.v);
            ctx.fillStyle = s.color; ctx.fillRect(x0, T, Math.max(0, x1 - x0), h);
            if (s.v > 7) {
                ctx.fillStyle = '#001a33'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(s.v.toFixed(1) + '%', (x0 + x1) / 2, T + h / 2);
            }
            acc += s.v;
        });
        [0, 25, 50, 75, 100].forEach(function (p) {
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(p), T); ctx.lineTo(X(p), T + h); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(p, X(p), T + h + 5);
        });
        ctx.strokeStyle = COL.axis; ctx.strokeRect(L, T, w, h);
        title(ctx, 'Composición granulométrica de la muestra', W, T);
        var lx = L;
        segs.forEach(function (s) {
            ctx.fillStyle = s.color; ctx.fillRect(lx, H - 18, 12, 8);
            ctx.fillStyle = COL.txt; ctx.font = '10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(s.label + ' ' + s.v.toFixed(1) + ' %', lx + 17, H - 14);
            lx += 100;
        });
        ctx.fillStyle = COL.soft; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = 'bold 11px Arial';
        ctx.fillText('SUCS: ' + r.simbolo, L + w, H - 14);
    }
    function chartGravedad(c, r) {
        var f = fitCanvas(c, 0.38); if (!f) return;
        var ctx = f.ctx, W = f.W, H = f.H, L = 30, R = 24, T = 42, B = 46, w = W - L - R, h = H - T - B;
        function X(v) { return L + (v - 2.4) / 0.6 * w; }
        ctx.fillStyle = 'rgba(95,185,138,.18)'; ctx.fillRect(X(2.55), T, X(2.80) - X(2.55), h);
        var ticks = [2.4, 2.5, 2.55, 2.6, 2.7, 2.8, 2.9, 3.0];
        ticks.forEach(function (v) {
            ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + h); ctx.stroke();
            ctx.fillStyle = COL.txt; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(v.toFixed(2), X(v), T + h + 5);
        });
        ctx.strokeStyle = COL.axis; ctx.strokeRect(L, T, w, h);
        var x = X(Math.max(2.4, Math.min(3.0, r.gs)));
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + h); ctx.stroke();
        ctx.fillStyle = COL.acc; ctx.beginPath(); ctx.arc(x, T + h / 2, 6, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('Gs = ' + r.gs.toFixed(3), x, T + h / 2 - 9);
        ctx.fillStyle = COL.soft; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('rango típico 2.55 – 2.80', X(2.675), T + 4);
        title(ctx, 'Gravedad específica de sólidos', W, T);
    }
    /* =========================================================
       CATÁLOGO DE ENSAYOS
       ========================================================= */
    var GRUPOS = [
        { n: 1, t: 'Propiedades índice', d: 'Caracterización básica del suelo' },
        { n: 2, t: 'Compactación y campo', d: 'Energía de compactación y control en obra' },
        { n: 3, t: 'Clasificación e hidráulica', d: 'Nombre del suelo y flujo de agua' }
    ];
    var ENS = {}, ORDEN = [];
    function reg(def) { ENS[def.id] = def; ORDEN.push(def.id); }

    /* ---------- 1. Contenido de humedad ---------- */
    reg({
        id: 'humedad', grupo: 1, icon: '💧', titulo: 'Contenido de humedad', norma: 'ASTM D2216 · NTC 1495',
        desc: 'Relación entre la masa de agua y la masa de sólidos. Se determina secando la muestra en horno a 110 ± 5 °C.',
        obtiene: 'w promedio · masa de agua · masa de sólidos',
        proc: '<ol><li>Pesa el recipiente limpio y seco (tara).</li><li>Coloca la muestra húmeda y pesa recipiente + suelo húmedo.</li>' +
            '<li>Seca en horno a 110 ± 5 °C hasta masa constante (normalmente 12 – 24 h). Enfría en desecador y pesa.</li>' +
            '<li>Calcula w = (M<sub>húmeda</sub> − M<sub>seca</sub>) / (M<sub>seca</sub> − M<sub>tara</sub>) × 100.</li>' +
            '<li>Repite por duplicado. La diferencia entre determinaciones debe ser ≤ 0.5 % para la mayoría de suelos.</li></ol>' +
            '<p class="s1-formula">w = (W<sub>w</sub> / W<sub>s</sub>) · 100 = (M<sub>h</sub> − M<sub>s</sub>) / (M<sub>s</sub> − M<sub>t</sub>) · 100</p>',
        render: function () {
            return '<div class="s1-tablewrap"><table class="s1-table s1-inputs"><thead><tr><th>Det.</th><th>Tara (g)</th><th>Tara + húmedo (g)</th><th>Tara + seco (g)</th></tr></thead><tbody>' +
                [1, 2, 3].map(function (i) {
                    return '<tr><td>M' + i + '</td><td><input type="number" step="any" id="s1H_tara' + i + '" aria-label="Tara determinación ' + i + '"></td>' +
                        '<td><input type="number" step="any" id="s1H_humeda' + i + '" aria-label="Masa húmeda determinación ' + i + '"></td>' +
                        '<td><input type="number" step="any" id="s1H_seca' + i + '" aria-label="Masa seca determinación ' + i + '"></td></tr>';
                }).join('') + '</tbody></table></div>' +
                '<div class="s1-formrow">' + field('s1H_tol', 'Tolerancia entre duplicados', 0.5, { unit: '%', step: '0.1', hint: 'Valor orientativo; consulta la norma de tu laboratorio.' }) + '</div>' +
                '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-primary" id="s1H_calc">CALCULAR</button>' +
                '<button type="button" class="s1-btn" id="s1H_ej">Cargar ejemplo</button>' +
                '<button type="button" class="s1-btn" id="s1H_clr">Vaciar</button></div>';
        },
        after: '<div class="s1-panel s1-chartpanel"><h4>Gráfica — humedad por determinación</h4><canvas id="s1H_chart" data-ratio="0.56" role="img" aria-label="Contenido de humedad por determinación"></canvas></div>',
        bind: function () {
            var EJ = [
                [25.4, 125.8, 105.2], [24.8, 122.3, 102.2], [26.1, 118.9, 99.6]
            ];
            function cargar(ejemplo) {
                EJ.forEach(function (row, i) {
                    setVal('s1H_tara' + (i + 1), ejemplo ? row[0] : '');
                    setVal('s1H_humeda' + (i + 1), ejemplo ? row[1] : '');
                    setVal('s1H_seca' + (i + 1), ejemplo ? row[2] : '');
                });
                if (ejemplo) setVal('s1H_tol', 0.5);
            }
            function calc() {
                var filas = [1, 2, 3].map(function (i) {
                    return { tara: val('s1H_tara' + i), humeda: val('s1H_humeda' + i), seca: val('s1H_seca' + i) };
                });
                var r = C.humedad(filas, { tolerancia: num('s1H_tol') });
                if (!r.ok) { publicar(ENS.humedad, { error: r.error }); return; }
                var mediaAgua = r.filas.reduce(function (s, x) { return s + x.agua; }, 0) / r.filas.length;
                var mediaSuelo = r.filas.reduce(function (s, x) { return s + x.suelo; }, 0) / r.filas.length;
                var t = [
                    { l: 'Contenido de humedad', v: fmt(r.promedio, 2) + ' %', big: true, tone: 'ok', s: r.n + ' determinación(es)' },
                    { l: 'Masa de agua media', v: fmt(mediaAgua, 2) + ' g' },
                    { l: 'Masa de sólidos media', v: fmt(mediaSuelo, 2) + ' g' },
                    { l: 'Rango entre determinaciones', v: fmt(r.rango, 2) + ' %', tone: r.rango > (num('s1H_tol') || 0.5) ? 'warn' : 'ok' }
                ];
                var tabla = '<div class="s1-tablewrap"><table class="s1-table"><thead><tr><th>Det.</th><th>Tara (g)</th><th>Húmeda (g)</th><th>Seca (g)</th><th>Agua (g)</th><th>Sólidos (g)</th><th>w (%)</th></tr></thead><tbody>' +
                    r.filas.map(function (x) {
                        return '<tr><td>M' + x.n + '</td><td>' + fmt(x.tara, 2) + '</td><td>' + fmt(x.humeda, 2) + '</td><td>' + fmt(x.seca, 2) + '</td><td>' + fmt(x.agua, 2) + '</td><td>' + fmt(x.suelo, 2) + '</td><td><b>' + fmt(x.w, 2) + '</b></td></tr>';
                    }).join('') + '</tbody></table></div>';
                publicar(ENS.humedad, {
                    tiles: t, extra: tabla, avisos: r.avisos, resumen: 'w = ' + fmt(r.promedio, 2) + ' %',
                    entradas: r.filas.map(function (x) { return { label: 'M' + x.n + ': tara / húmeda / seca (g)', valor: fmt(x.tara, 2) + ' / ' + fmt(x.humeda, 2) + ' / ' + fmt(x.seca, 2) }; }),
                    tablaTitulo: 'Determinaciones de humedad', tablaImpresion: tabla
                });
                chartHumedad($('s1H_chart'), r);
            }
            cargar(true);
            $('s1H_calc').addEventListener('click', calc);
            $('s1H_ej').addEventListener('click', function () { cargar(true); calc(); });
            $('s1H_clr').addEventListener('click', function () { cargar(false); setHtml('s1Res', emptyHtml()); S.last = null; });
            calc();
        }
    });

    /* ---------- 2. Granulometría ---------- */
    var GR_MALLAS = [50.8, 25.4, 19.1, 12.7, 9.52, 4.75, 2.00, 0.850, 0.425, 0.250, 0.150, 0.075];
    var GR_EJEMPLO = { 50.8: 0, 25.4: 0, 19.1: 0, 12.7: 0, 9.52: 0, 4.75: 150, 2.00: 200, 0.850: 150, 0.425: 120, 0.250: 100, 0.150: 80, 0.075: 120, fondo: 80, m0: 1000, ll: 28, lp: 12 };
    reg({
        id: 'granulometria', grupo: 1, icon: '📊', titulo: 'Análisis granulométrico', norma: 'ASTM D6913 · NTC 1527',
        desc: 'Distribución de tamaños de partícula por tamizado. Calcula grava, arena, finos, D₁₀, D₃₀, D₆₀, Cu, Cc y la clasificación SUCS.',
        obtiene: 'curva granulométrica · Cu · Cc · SUCS',
        proc: '<ol><li>Seca la muestra al horno y pesa la masa inicial M₀.</li><li>Tamiza con agitación mecánica durante unos 10 min. Pesa lo retenido en cada tamiz y el fondo.</li>' +
            '<li>Verifica que la suma de retenidos + fondo no difiera de M₀ en más de 0.3 %.</li>' +
            '<li>% retenido = masa retenida / M₀ × 100; % acumulado = suma de retenidos; % que pasa = 100 − % acumulado.</li>' +
            '<li>Interpola D₁₀, D₃₀ y D₆₀ sobre la curva. Calcula Cu = D₆₀/D₁₀ y Cc = D₃₀²/(D₁₀·D₆₀).</li></ol>' +
            '<p class="s1-formula">Cu = D₆₀ / D₁₀ &nbsp;&nbsp;·&nbsp;&nbsp; Cc = D₃₀² / (D₁₀ · D₆₀)</p>' +
            '<p>Para gravas bien graduadas: Cu ≥ 4 y 1 ≤ Cc ≤ 3. Para arenas bien graduadas: Cu ≥ 6 y 1 ≤ Cc ≤ 3 (ASTM D2487).</p>',
        render: function () {
            return '<div class="s1-formrow">' + field('s1G_m0', 'Masa seca inicial M₀', null, { unit: 'g', step: '0.1', hint: 'Masa total de la muestra antes de tamizar.' }) +
                field('s1G_ll', 'Límite líquido LL (opcional)', null, { unit: '%', step: '0.1', hint: 'Necesario si hay finos para clasificar por SUCS.' }) +
                field('s1G_lp', 'Límite plástico LP (opcional)', null, { unit: '%', step: '0.1', hint: 'Permite calcular el IP automáticamente.' }) + '</div>' +
                '<div class="s1-tablewrap"><table class="s1-table s1-inputs"><thead><tr><th>Tamiz</th><th>Abertura (mm)</th><th>Masa retenida (g)</th></tr></thead><tbody id="s1GR_rows"></tbody></table></div>' +
                '<div class="s1-formrow">' + field('s1G_fondo', 'Fondo / pasante del último tamiz', null, { unit: 'g', step: '0.1', hint: 'Si se deja vacío se calcula por diferencia con M₀.' }) + '</div>' +
                '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-primary" id="s1G_calc">CALCULAR</button>' +
                '<button type="button" class="s1-btn" id="s1G_ej">Cargar ejemplo</button>' +
                '<button type="button" class="s1-btn" id="s1G_clr">Vaciar</button></div>';
        },
        after: '<div class="s1-panel s1-chartpanel"><h4>Gráfica — curva granulométrica</h4><canvas id="s1G_chart" data-ratio="0.68" role="img" aria-label="Curva granulométrica"></canvas></div>',
        bind: function () {
            function rows(ejemplo) {
                setHtml('s1GR_rows', GR_MALLAS.map(function (mm) {
                    return '<tr><td>' + C.etiquetaMalla(mm) + '</td><td>' + mm + '</td><td><input type="number" step="any" min="0" class="s1-gr" data-mm="' + mm + '" aria-label="Masa retenida en ' + C.etiquetaMalla(mm) + '" value="' + (ejemplo ? (GR_EJEMPLO[mm] || 0) : '') + '"></td></tr>';
                }).join(''));
                setVal('s1G_m0', ejemplo ? GR_EJEMPLO.m0 : '');
                setVal('s1G_fondo', ejemplo ? GR_EJEMPLO.fondo : '');
                setVal('s1G_ll', ejemplo ? GR_EJEMPLO.ll : (memVal('limites', 'll') || ''));
                setVal('s1G_lp', ejemplo ? GR_EJEMPLO.lp : (memVal('limites', 'lp') || ''));
            }
            function calc() {
                var filas = [];
                document.querySelectorAll('#s1GR_rows .s1-gr').forEach(function (inp) {
                    var mm = parseFloat(inp.getAttribute('data-mm'));
                    filas.push({ mm: mm, label: C.etiquetaMalla(mm), masa: inp.value });
                });
                var r = C.granulometria({
                    m0: val('s1G_m0'), filas: filas, fondo: val('s1G_fondo'),
                    ll: val('s1G_ll'), lp: val('s1G_lp')
                });
                if (!r.ok) { publicar(ENS.granulometria, { error: r.error }); return; }
                var t = [
                    { l: 'Clasificación SUCS', v: r.sucs ? r.sucs.simbolo : '—', big: true, tone: r.sucs ? 'ok' : 'warn', s: r.sucs ? r.sucs.nombre : 'Incluye N.º 200, LL y LP' },
                    { l: 'Grava', v: fmt(r.grava, 1) + ' %' },
                    { l: 'Arena', v: fmt(r.arena, 1) + ' %' },
                    { l: 'Finos', v: r.finos == null ? '—' : fmt(r.finos, 1) + ' %' },
                    { l: 'D₁₀', v: r.D10 ? (r.D10 >= 0.1 ? fmt(r.D10, 3) : fmt(r.D10, 4)) + ' mm' : '—' },
                    { l: 'D₃₀', v: r.D30 ? (r.D30 >= 0.1 ? fmt(r.D30, 3) : fmt(r.D30, 4)) + ' mm' : '—' },
                    { l: 'D₆₀', v: r.D60 ? (r.D60 >= 0.1 ? fmt(r.D60, 3) : fmt(r.D60, 4)) + ' mm' : '—' },
                    { l: 'Cu', v: r.Cu ? fmt(r.Cu, 2) : '—' },
                    { l: 'Cc', v: r.Cc ? fmt(r.Cc, 2) : '—' },
                    { l: 'Pérdida de masa', v: fmt(r.perdida, 2) + ' %', tone: Math.abs(r.perdida) > 0.3 ? 'bad' : 'ok' }
                ];
                var tabla = '<div class="s1-tablewrap"><table class="s1-table"><thead><tr><th>Tamiz</th><th>mm</th><th>Ret. (g)</th><th>% ret.</th><th>% acum.</th><th>% pasa</th></tr></thead><tbody>' +
                    r.tabla.map(function (x) {
                        return '<tr><td>' + x.label + '</td><td>' + (x.mm || '—') + '</td><td>' + fmt(x.masa, 1) + '</td><td>' + fmt(x.pctRet, 1) + '</td><td>' + fmt(x.pctAcum, 1) + '</td><td><b>' + fmt(x.pctPasa, 1) + '</b></td></tr>';
                    }).join('') + '</tbody></table></div>';
                var uso = '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-ok" id="s1G_use">Enviar #200, #4, Cu y Cc a Clasificación SUCS</button></div>';
                var criterios = r.sucs ? '<div class="s1-note"><b>Criterios SUCS:</b><br>' + r.sucs.criterios.map(function (x) { return '• ' + x; }).join('<br>') + '</div>' : '';
                publicar(ENS.granulometria, {
                    tiles: t, extra: tabla + uso + criterios, avisos: r.avisos,
                    resumen: (r.sucs ? r.sucs.simbolo + ' · ' : '') + 'Grava ' + fmt(r.grava, 1) + ' % · Arena ' + fmt(r.arena, 1) + ' % · Finos ' + (r.finos == null ? '—' : fmt(r.finos, 1) + ' %'),
                    entradas: [{ label: 'Masa inicial M₀ (g)', valor: val('s1G_m0') || '—' }, { label: 'Fondo (g)', valor: fmt(r.fondo, 1) }, { label: 'LL (%)', valor: val('s1G_ll') || '—' }, { label: 'LP (%)', valor: val('s1G_lp') || '—' }]
                        .concat(r.tabla.filter(function (x) { return x.mm > 0; }).map(function (x) { return { label: 'Retenido ' + x.label + ' (g)', valor: fmt(x.masa, 1) }; })),
                    tablaTitulo: 'Análisis granulométrico', tablaImpresion: tabla
                });
                var b = $('s1G_use');
                if (b) b.addEventListener('click', function () {
                    if (r.finos == null) { toast('Falta el tamiz N.º 200 para enviar los datos.'); return; }
                    memSave({ gran: { p200: C.round(r.finos, 2), p4: C.round(r.p4, 2), cu: r.Cu ? C.round(r.Cu, 3) : null, cc: r.Cc ? C.round(r.Cc, 3) : null } });
                    toast('Datos granulométricos guardados. Ábrelos en Clasificación SUCS.');
                });
                chartGranulometria($('s1G_chart'), r);
            }
            rows(true);
            $('s1G_calc').addEventListener('click', calc);
            $('s1G_ej').addEventListener('click', function () { rows(true); calc(); });
            $('s1G_clr').addEventListener('click', function () { rows(false); setHtml('s1Res', emptyHtml()); S.last = null; });
            calc();
        }
    });

    /* ---------- 3. Límites de Atterberg ---------- */
    reg({
        id: 'limites', grupo: 1, icon: '📏', titulo: 'Límites de Atterberg', norma: 'ASTM D4318 · NTC 4630',
        desc: 'Límite líquido por Casagrande, límite plástico e índice de plasticidad. Incluye curva de fluidez y carta de plasticidad.',
        obtiene: 'LL · LP · IP · clasificación fina · IF',
        proc: '<ol><li><b>Límite líquido:</b> ajusta la muestra y cuenta los golpes necesarios para cerrar 13 mm de la ranura. Realiza al menos 3 puntos entre 10 y 40 golpes.</li>' +
            '<li>Pesa la humedad de cada punto y ajusta w = m·log₁₀(N) + b por mínimos cuadrados. El LL es la humedad a 25 golpes.</li>' +
            '<li><b>Límite plástico:</b> forma rollitos de 3 mm hasta que se agrieten; determina la humedad de al menos 2 o 3 porciones y promedia.</li>' +
            '<li><b>IP = LL − LP.</b> Clasifica con la línea A (IP = 0.73(LL − 20)) y la línea U (IP = 0.9(LL − 8)).</li></ol>' +
            '<p class="s1-formula">LL = m · log₁₀(25) + b &nbsp;&nbsp;·&nbsp;&nbsp; IP = LL − LP &nbsp;&nbsp;·&nbsp;&nbsp; Línea A: IP = 0.73(LL − 20)</p>',
        render: function () {
            return '<h5>Curva de fluidez — ensayos de golpes</h5><div class="s1-tablewrap"><table class="s1-table s1-inputs"><thead><tr><th>Punto</th><th>N.º de golpes</th><th>Humedad (%)</th></tr></thead><tbody>' +
                [1, 2, 3, 4].map(function (i) {
                    return '<tr><td>' + i + '</td><td><input type="number" step="any" min="1" id="s1L_n' + i + '" aria-label="Golpes punto ' + i + '"></td><td><input type="number" step="any" id="s1L_w' + i + '" aria-label="Humedad punto ' + i + '"></td></tr>';
                }).join('') + '</tbody></table></div>' +
                '<h5>Límite plástico — humedades de los rollitos</h5><div class="s1-tablewrap"><table class="s1-table s1-inputs"><thead><tr><th>Determinación</th><th>w LP (%)</th></tr></thead><tbody>' +
                [1, 2, 3].map(function (i) {
                    return '<tr><td>LP ' + i + '</td><td><input type="number" step="any" id="s1L_lp' + i + '" aria-label="Límite plástico determinación ' + i + '"></td></tr>';
                }).join('') + '</tbody></table></div>' +
                '<div class="s1-formrow">' + field('s1L_wn', 'Humedad natural (opcional)', null, { unit: '%', step: '0.1', hint: 'Permite calcular el índice de liquidez LI.' }) + '</div>' +
                '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-primary" id="s1L_calc">CALCULAR</button>' +
                '<button type="button" class="s1-btn" id="s1L_ej">Cargar ejemplo</button>' +
                '<button type="button" class="s1-btn" id="s1L_clr">Vaciar</button></div>';
        },
        after: '<div class="s1-panel"><h4>Gráficas — fluidez y plasticidad</h4><div class="s1-chartgrid"><canvas id="s1L_chart" data-ratio="0.68" role="img" aria-label="Curva de fluidez"></canvas><canvas id="s1L_chart2" data-ratio="0.68" role="img" aria-label="Carta de plasticidad"></canvas></div></div>',
        bind: function () {
            var EJN = [18, 24, 31, 38], EJW = [36.2, 34.7, 33.3, 32.0], EJLP = [21.6, 22.0, 21.9];
            function cargar(ejemplo) {
                [1, 2, 3, 4].forEach(function (i) {
                    setVal('s1L_n' + i, ejemplo ? EJN[i - 1] : '');
                    setVal('s1L_w' + i, ejemplo ? EJW[i - 1] : '');
                });
                [1, 2, 3].forEach(function (i) { setVal('s1L_lp' + i, ejemplo ? EJLP[i - 1] : ''); });
                setVal('s1L_wn', ejemplo ? 30 : '');
            }
            function calc() {
                var puntos = [];
                [1, 2, 3, 4].forEach(function (i) {
                    var n = val('s1L_n' + i), w = val('s1L_w' + i);
                    if (n !== '' || w !== '') puntos.push({ n: n, w: w });
                });
                var lps = [];
                [1, 2, 3].forEach(function (i) { var v = val('s1L_lp' + i); if (v !== '') lps.push(v); });
                var r = C.limites({ puntos: puntos, lpValores: lps, wn: val('s1L_wn') });
                if (!r.ok) { publicar(ENS.limites, { error: r.error }); return; }
                var t = [
                    { l: 'Límite líquido LL', v: fmt(r.ll, 1) + ' %', big: true },
                    { l: 'Límite plástico LP', v: r.lp == null ? '—' : fmt(r.lp, 1) + ' %' },
                    { l: 'Índice de plasticidad IP', v: r.ip == null ? '—' : fmt(r.ip, 1) + ' %', big: true, tone: r.ip != null && r.ip >= 0 ? 'ok' : 'warn' },
                    { l: 'Clasificación fina', v: r.clasif ? r.clasif.simbolo : '—', tone: 'ok', s: r.clasif ? r.clasif.nombre : 'Ingresa LP' },
                    { l: 'Índice de fluidez IF', v: fmt(r.if, 2) },
                    { l: 'R² del ajuste', v: fmt(r.r2, 4), tone: r.r2 >= 0.98 ? 'ok' : 'warn' },
                    { l: 'Línea A', v: fmt(0.73 * (r.ll - 20), 1) + ' %' },
                    { l: 'Índice de liquidez LI', v: r.li == null ? '—' : fmt(r.li, 2), s: r.consistencia || 'Requiere humedad natural' }
                ];
                var tabla = '<div class="s1-tablewrap"><table class="s1-table"><thead><tr><th>Golpes</th><th>w medido (%)</th><th>w ajustado (%)</th><th>Desviación</th></tr></thead><tbody>' +
                    r.puntos.map(function (p) {
                        var fit = r.m * Math.log10(p.n) + r.b;
                        return '<tr><td>' + p.n + '</td><td>' + fmt(p.w, 2) + '</td><td>' + fmt(fit, 2) + '</td><td>' + fmt(p.w - fit, 2) + '</td></tr>';
                    }).join('') + '</tbody></table></div>';
                var extra = '<div class="s1-note"><b>' + (r.clasif ? r.clasif.simbolo + ' — ' + r.clasif.nombre : 'Clasificación pendiente') + '</b>' +
                    (r.clasif ? '<br>' + r.clasif.criterio + '. IP = ' + fmt(r.ip, 1) + ' %; línea A = ' + fmt(r.clasif.lineaA, 1) + ' %.' : '') +
                    (r.consistencia ? '<br>Consistencia relativa: <b>' + r.consistencia + '</b> (LI = ' + fmt(r.li, 2) + ').' : '') + '</div>' + tabla +
                    '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-ok" id="s1L_use">Enviar LL e IP a Clasificación SUCS</button></div>';
                publicar(ENS.limites, {
                    tiles: t, extra: extra, avisos: r.avisos,
                    resumen: 'LL = ' + fmt(r.ll, 1) + ' % · LP = ' + (r.lp == null ? '—' : fmt(r.lp, 1) + ' %') + ' · IP = ' + (r.ip == null ? '—' : fmt(r.ip, 1) + ' %'),
                    entradas: r.puntos.map(function (p) { return { label: p.n + ' golpes — humedad (%)', valor: fmt(p.w, 2) }; })
                        .concat(r.lpValores.length ? [{ label: 'LP promedio (%)', valor: fmt(r.lp, 2) }] : [])
                        .concat(val('s1L_wn') !== '' ? [{ label: 'Humedad natural (%)', valor: val('s1L_wn') }] : []),
                    tablaTitulo: 'Curva de fluidez', tablaImpresion: tabla
                });
                var b = $('s1L_use');
                if (b) b.addEventListener('click', function () {
                    if (r.ip == null) { toast('Falta el límite plástico para enviar el IP.'); return; }
                    memSave({ limites: { ll: C.round(r.ll, 2), lp: C.round(r.lp, 2), ip: C.round(r.ip, 2) } });
                    toast('LL e IP guardados. Ábrelos en Clasificación SUCS.');
                });
                chartLimites($('s1L_chart'), r);
                chartPlasticidad($('s1L_chart2'), r);
            }
            cargar(true);
            $('s1L_calc').addEventListener('click', calc);
            $('s1L_ej').addEventListener('click', function () { cargar(true); calc(); });
            $('s1L_clr').addEventListener('click', function () { cargar(false); setHtml('s1Res', emptyHtml()); S.last = null; });
            calc();
        }
    });
    /* ---------- 4. Gravedad específica ---------- */
    reg({
        id: 'gravedad', grupo: 1, icon: '⚖️', titulo: 'Gravedad específica de sólidos', norma: 'ASTM D854 · NTC 4481',
        desc: 'Relación entre la densidad de los sólidos y la densidad del agua. Se corrige por temperatura y alimenta la curva ZAV de compactación.',
        obtiene: 'Gs · Gs SSS · absorción · volumen de sólidos',
        proc: '<p><b>Método del picnómetro (suelos finos):</b> A = masa del suelo seco; B = masa del picnómetro + agua; C = masa del picnómetro + suelo + agua; S = masa saturada superficialmente seca (opcional).</p>' +
            '<p class="s1-formula">Gs = A / (A + B − C) &nbsp;·&nbsp; Gs(SSS) = S / (A + B − C) &nbsp;·&nbsp; Abs = (S − A)/A · 100</p>' +
            '<p><b>Pesada hidrostática (gravas):</b> A = masa seca; B = masa saturada en aire; C = masa sumergida.</p>' +
            '<p class="s1-formula">Gs = A / (B − C) &nbsp;·&nbsp; Gs(SSS) = B / (B − C) &nbsp;·&nbsp; Abs = (B − A)/A · 100</p>' +
            '<p>Elimina el aire atrapado con vacío o agitación. Corrige a 20 °C: Gs(20 °C) = Gs(T) · ρw(T) / ρw(20 °C).</p>',
        render: function () {
            return select('s1GE_metodo', 'Método', [['fino', 'Picnómetro — suelo fino'], ['grueso', 'Pesada hidrostática — grava']], 'fino', { wide: true }) +
                '<div class="s1-formrow" id="s1GE_fields" style="margin-top:12px"></div>' +
                '<div class="s1-formrow" style="margin-top:12px">' + field('s1GE_temp', 'Temperatura del agua', 20, { unit: '°C', step: '0.1', hint: 'Se usa para corregir Gs a 20 °C.' }) + '</div>' +
                '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-primary" id="s1GE_calc">CALCULAR</button>' +
                '<button type="button" class="s1-btn" id="s1GE_ej">Cargar ejemplo</button>' +
                '<button type="button" class="s1-btn" id="s1GE_clr">Vaciar</button></div>';
        },
        after: '<div class="s1-panel s1-chartpanel"><h4>Gráfica — ubicación de Gs</h4><canvas id="s1GE_chart" data-ratio="0.38" role="img" aria-label="Gravedad específica de sólidos"></canvas></div>',
        bind: function () {
            var EJ = {
                fino: [490, 670, 980, 500],
                grueso: [2000, 2030, 1260, '']
            };
            function campos(metodo, ejemplo) {
                var e = EJ[metodo] || EJ.fino;
                if (metodo === 'fino') {
                    setHtml('s1GE_fields',
                        field('s1GE_a', 'A · masa suelo seco', ejemplo ? e[0] : '', { unit: 'g', step: '0.01' }) +
                        field('s1GE_b', 'B · picnómetro + agua', ejemplo ? e[1] : '', { unit: 'g', step: '0.01' }) +
                        field('s1GE_c', 'C · picnómetro + suelo + agua', ejemplo ? e[2] : '', { unit: 'g', step: '0.01' }) +
                        field('s1GE_s', 'S · masa SSS (opcional)', ejemplo ? e[3] : '', { unit: 'g', step: '0.01', hint: 'Permite calcular Gs SSS y absorción.' }));
                } else {
                    setHtml('s1GE_fields',
                        field('s1GE_a', 'A · masa seca al horno', ejemplo ? e[0] : '', { unit: 'g', step: '0.01' }) +
                        field('s1GE_b', 'B · masa SSS en aire', ejemplo ? e[1] : '', { unit: 'g', step: '0.01' }) +
                        field('s1GE_c', 'C · masa sumergida', ejemplo ? e[2] : '', { unit: 'g', step: '0.01' }));
                }
            }
            function calc() {
                var r = C.gravedad({
                    metodo: val('s1GE_metodo'), a: val('s1GE_a'), b: val('s1GE_b'), c: val('s1GE_c'),
                    s: val('s1GE_s'), temperatura: val('s1GE_temp')
                });
                if (!r.ok) { publicar(ENS.gravedad, { error: r.error }); return; }
                var t = [
                    { l: 'Gravedad específica Gs', v: fmt(r.gs, 3), big: true, tone: 'ok', s: 'corregida a 20 °C' },
                    { l: 'Gs saturada (SSS)', v: r.gsSSS == null ? '—' : fmt(r.gsSSS, 3) },
                    { l: 'Absorción', v: r.absorcion == null ? '—' : fmt(r.absorcion, 2) + ' %' },
                    { l: 'Masa de sólidos', v: fmt(r.ms, 2) + ' g' },
                    { l: 'Volumen de sólidos', v: fmt(r.vs, 3) + ' cm³' },
                    { l: 'Tipo de material', v: r.tipo, s: 'rango típico 2.55 – 2.80' }
                ];
                var extra = '<div class="s1-tablewrap"><table class="s1-table"><tbody>' +
                    '<tr><td>Denominador del método</td><td>' + fmt(r.den, 3) + ' g</td></tr>' +
                    '<tr><td>Corrección por temperatura</td><td>' + fmt(r.kTemp, 6) + '</td></tr>' +
                    '<tr><td>Gs sin corregir (T = ' + fmt(r.temperatura, 1) + ' °C)</td><td>' + fmt(r.gsT, 3) + '</td></tr>' +
                    '</tbody></table></div>' +
                    '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-ok" id="s1GE_use">Usar Gs en Compactación Proctor</button></div>';
                publicar(ENS.gravedad, {
                    tiles: t, extra: extra, avisos: r.avisos, resumen: 'Gs = ' + fmt(r.gs, 3),
                    entradas: [{ label: 'Método', valor: r.metodo === 'fino' ? 'Picnómetro' : 'Pesada hidrostática' },
                        { label: 'A (g)', valor: val('s1GE_a') }, { label: 'B (g)', valor: val('s1GE_b') },
                        { label: 'C (g)', valor: val('s1GE_c') }, { label: 'Temperatura (°C)', valor: val('s1GE_temp') }]
                });
                var b = $('s1GE_use');
                if (b) b.addEventListener('click', function () {
                    memSave({ gravedad: { gs: C.round(r.gs, 3) } });
                    toast('Gs guardada. Ábrela en Compactación Proctor.');
                });
                chartGravedad($('s1GE_chart'), r);
            }
            campos('fino', true);
            $('s1GE_metodo').addEventListener('change', function () { campos(this.value, true); calc(); });
            $('s1GE_calc').addEventListener('click', calc);
            $('s1GE_ej').addEventListener('click', function () { campos(val('s1GE_metodo'), true); setVal('s1GE_temp', 20); calc(); });
            $('s1GE_clr').addEventListener('click', function () { campos(val('s1GE_metodo'), false); setHtml('s1Res', emptyHtml()); S.last = null; });
            S._redrawView = calc;
            calc();
        }
    });

    /* ---------- 5. Compactación Proctor ---------- */
    reg({
        id: 'compactacion', grupo: 2, icon: '🏗️', titulo: 'Compactación Proctor', norma: 'ASTM D698 / D1557 · NTC 1410 / 1422',
        desc: 'Relación entre humedad y densidad seca. Ajusta la curva, obtiene la humedad óptima, la densidad máxima y la curva de saturación total (ZAV).',
        obtiene: 'wópt · γd máx · grado de saturación · energía',
        proc: '<ol><li>Prepara 4 o 5 porciones de suelo con humedades crecientes alrededor del contenido óptimo estimado.</li>' +
            '<li>Compacta cada porción en el molde con el martillo y la energía normalizados (ver tabla). Enrasa y pesa.</li>' +
            '<li>Determina la humedad de una muestra de cada punto.</li>' +
            '<li>Calcula γ<sub>h</sub> = (M<sub>molde+suelo</sub> − M<sub>molde</sub>)/V y γ<sub>d</sub> = γ<sub>h</sub>/(1 + w/100).</li>' +
            '<li>Ajusta una parábola γ<sub>d</sub> = a·w² + b·w + c. El vértice da w<sub>ópt</sub> = −b/(2a) y γ<sub>d,máx</sub> = c − b²/(4a).</li></ol>' +
            '<p class="s1-formula">γ<sub>d</sub> = γ<sub>h</sub> / (1 + w/100) &nbsp;&nbsp;·&nbsp;&nbsp; ZAV: γ<sub>d</sub> = G<sub>s</sub>·γ<sub>w</sub> / (1 + w·G<sub>s</sub>/100)</p>' +
            '<p><b>Proctor estándar:</b> martillo 2.5 kg, caída 30.5 cm, 3 capas × 25 golpes, energía ≈ 593 kJ/m³. <b>Proctor modificado:</b> martillo 4.54 kg, caída 45.7 cm, 5 capas × 25 golpes, energía ≈ 2703 kJ/m³.</p>',
        render: function () {
            return '<div class="s1-formrow">' +
                select('s1CP_metodo', 'Energía', [['estandar', 'Proctor estándar'], ['modificado', 'Proctor modificado']], 'estandar') +
                field('s1CP_molde', 'Masa del molde', null, { unit: 'g', step: '0.1' }) +
                field('s1CP_vol', 'Volumen del molde', null, { unit: 'cm³', step: '0.1' }) +
                field('s1CP_gs', 'Gravedad específica Gs', null, { step: '0.001', hint: 'Opcional: activa la curva ZAV.' }) + '</div>' +
                '<div class="s1-tablewrap"><table class="s1-table s1-inputs"><thead><tr><th>Punto</th><th>Masa molde + suelo húmedo (g)</th><th>Humedad w (%)</th></tr></thead><tbody>' +
                [1, 2, 3, 4, 5].map(function (i) {
                    return '<tr><td>' + i + '</td><td><input type="number" step="any" id="s1CP_masa' + i + '" aria-label="Masa molde y suelo punto ' + i + '"></td><td><input type="number" step="any" id="s1CP_w' + i + '" aria-label="Humedad punto ' + i + '"></td></tr>';
                }).join('') + '</tbody></table></div>' +
                '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-primary" id="s1CP_calc">CALCULAR</button>' +
                '<button type="button" class="s1-btn" id="s1CP_ej">Cargar ejemplo</button>' +
                '<button type="button" class="s1-btn" id="s1CP_clr">Vaciar</button></div>';
        },
        after: '<div class="s1-panel s1-chartpanel"><h4>Gráfica — curva de compactación</h4><canvas id="s1CP_chart" data-ratio="0.66" role="img" aria-label="Curva de compactación Proctor"></canvas></div>',
        bind: function () {
            var EJM = [8750, 8900, 9000, 9050, 8950], EJW = [11.0, 13.0, 15.0, 17.0, 19.0];
            function cargar(ejemplo) {
                setVal('s1CP_metodo', 'estandar');
                setVal('s1CP_molde', ejemplo ? 4500 : '');
                setVal('s1CP_vol', ejemplo ? 2120 : '');
                setVal('s1CP_gs', ejemplo ? (memVal('gravedad', 'gs') || 2.70) : (memVal('gravedad', 'gs') || ''));
                [1, 2, 3, 4, 5].forEach(function (i) {
                    setVal('s1CP_masa' + i, ejemplo ? EJM[i - 1] : '');
                    setVal('s1CP_w' + i, ejemplo ? EJW[i - 1] : '');
                });
            }
            function calc() {
                var puntos = [];
                [1, 2, 3, 4, 5].forEach(function (i) {
                    var m = val('s1CP_masa' + i), w = val('s1CP_w' + i);
                    if (m !== '' || w !== '') puntos.push({ masa: m, w: w });
                });
                var r = C.compactacion({
                    molde: val('s1CP_molde'), vol: val('s1CP_vol'), puntos: puntos,
                    gs: val('s1CP_gs'), metodo: val('s1CP_metodo')
                });
                if (!r.ok) { publicar(ENS.compactacion, { error: r.error }); return; }
                var t = [
                    { l: 'Humedad óptima wópt', v: fmt(r.wopt, 1) + ' %', big: true, tone: 'ok' },
                    { l: 'Densidad seca máxima', v: fmt(r.gdmax, 3) + ' g/cm³', big: true, tone: 'ok' },
                    { l: 'En kN/m³', v: fmt(r.gdmaxKn, 2) + ' kN/m³' },
                    { l: 'Energía de compactación', v: fmt(r.energia, 1) + ' kJ/m³', s: r.metodo === 'estandar' ? 'Proctor estándar' : 'Proctor modificado' },
                    { l: 'Ajuste de la curva', v: r.ajuste, s: r.r2 == null ? 'Sin R²' : 'R² = ' + fmt(r.r2, 4), tone: r.r2 != null && r.r2 >= 0.9 ? 'ok' : 'warn' },
                    { l: 'Saturación en el óptimo', v: r.satOpt == null ? '—' : fmt(r.satOpt, 1) + ' %', s: r.satOpt == null ? 'Requiere Gs' : 'S = w·Gs/e' },
                    { l: 'γd máx medida', v: fmt(Math.max.apply(null, r.puntos.map(function (p) { return p.gd; })), 3) + ' g/cm³' }
                ];
                var tabla = '<div class="s1-tablewrap"><table class="s1-table"><thead><tr><th>Punto</th><th>Masa (g)</th><th>w (%)</th><th>γh (g/cm³)</th><th>γd (g/cm³)</th></tr></thead><tbody>' +
                    r.puntos.map(function (p) {
                        return '<tr><td>' + p.n + '</td><td>' + fmt(p.masa, 1) + '</td><td>' + fmt(p.w, 1) + '</td><td>' + fmt(p.gh, 3) + '</td><td><b>' + fmt(p.gd, 3) + '</b></td></tr>';
                    }).join('') + '</tbody></table></div>';
                var extra = tabla + '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-ok" id="s1CP_use">Usar γd máx en Densidad de campo</button></div>' +
                    '<div class="s1-note">La curva ZAV representa la condición teórica de saturación total (S = 100 %). Ningún punto de compactación puede quedar por encima de ella.</div>';
                publicar(ENS.compactacion, {
                    tiles: t, extra: extra, avisos: r.avisos,
                    resumen: 'wópt = ' + fmt(r.wopt, 1) + ' % · γd máx = ' + fmt(r.gdmax, 3) + ' g/cm³',
                    entradas: [{ label: 'Método', valor: r.metodo }, { label: 'Masa del molde (g)', valor: val('s1CP_molde') },
                        { label: 'Volumen del molde (cm³)', valor: val('s1CP_vol') }, { label: 'Gs', valor: val('s1CP_gs') || '—' }]
                        .concat(r.puntos.map(function (p) { return { label: 'Punto ' + p.n + ': masa / humedad', valor: fmt(p.masa, 1) + ' g / ' + fmt(p.w, 1) + ' %' }; })),
                    tablaTitulo: 'Puntos de compactación', tablaImpresion: tabla
                });
                var b = $('s1CP_use');
                if (b) b.addEventListener('click', function () {
                    memSave({ proctor: { gdmax: C.round(r.gdmax, 3), wopt: C.round(r.wopt, 2) } });
                    toast('γd máxima guardada. Ábrela en Densidad de campo.');
                });
                chartProctor($('s1CP_chart'), r);
            }
            cargar(true);
            $('s1CP_calc').addEventListener('click', calc);
            $('s1CP_ej').addEventListener('click', function () { cargar(true); calc(); });
            $('s1CP_clr').addEventListener('click', function () { cargar(false); setHtml('s1Res', emptyHtml()); S.last = null; });
            S._redrawView = calc;
            calc();
        }
    });

    /* ---------- 6. Densidad de campo ---------- */
    reg({
        id: 'densidad', grupo: 2, icon: '📦', titulo: 'Densidad de campo — cono de arena', norma: 'ASTM D1556 · NTC 1667',
        desc: 'Determina la densidad seca del suelo compactado en obra con el método del cono de arena y compara con la densidad máxima de Proctor.',
        obtiene: 'γd campo · γh · volumen del hoyo · grado de compactación',
        proc: '<ol><li>Calibra la masa de arena que queda en el cono (M<sub>cono</sub>) y la densidad aparente seca de la arena patrón.</li>' +
            '<li>Pesa el frasco + arena inicial (M<sub>i</sub>). Excava el hoyo, recoge todo el suelo húmedo y pesa (M<sub>suelo</sub>).</li>' +
            '<li>Llena el hoyo con arena, pesa el frasco + arena restante (M<sub>f</sub>) y determina la humedad del suelo extraído.</li>' +
            '<li>Masa de arena en el hoyo = M<sub>i</sub> − M<sub>f</sub> − M<sub>cono</sub>. Volumen = masa de arena / densidad de la arena.</li></ol>' +
            '<p class="s1-formula">V = (M<sub>i</sub> − M<sub>f</sub> − M<sub>cono</sub>) / ρ<sub>arena</sub> &nbsp;·&nbsp; γ<sub>h</sub> = M<sub>suelo</sub>/V &nbsp;·&nbsp; γ<sub>d</sub> = γ<sub>h</sub>/(1 + w/100)</p>' +
            '<p class="s1-formula">Grado de compactación GC = γ<sub>d,campo</sub> / γ<sub>d,máx Proctor</sub> × 100</p>',
        render: function () {
            return '<div class="s1-formrow">' +
                field('s1D_mi', 'Masa inicial frasco + arena', null, { unit: 'g', step: '0.1' }) +
                field('s1D_mf', 'Masa final frasco + arena', null, { unit: 'g', step: '0.1' }) +
                field('s1D_mcono', 'Masa de arena en el cono (calibración)', null, { unit: 'g', step: '0.1', hint: 'Si no se conoce, deja 0.' }) +
                field('s1D_darena', 'Densidad seca de la arena patrón', null, { unit: 'g/cm³', step: '0.001' }) +
                field('s1D_msuelo', 'Masa del suelo húmedo extraído', null, { unit: 'g', step: '0.1' }) +
                field('s1D_w', 'Contenido de humedad', null, { unit: '%', step: '0.1' }) +
                field('s1D_gdmax', 'γd máx de Proctor (referencia)', null, { unit: 'g/cm³', step: '0.001', hint: 'Opcional: activa el grado de compactación.' }) + '</div>' +
                '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-primary" id="s1D_calc">CALCULAR</button>' +
                '<button type="button" class="s1-btn" id="s1D_ej">Cargar ejemplo</button>' +
                '<button type="button" class="s1-btn" id="s1D_clr">Vaciar</button></div>';
        },
        after: '<div class="s1-panel s1-chartpanel"><h4>Gráfica — grado de compactación</h4><canvas id="s1D_chart" data-ratio="0.42" role="img" aria-label="Grado de compactación"></canvas></div>',
        bind: function () {
            var EJ = { mi: 6000, mf: 3200, mcono: 350, darena: 1.45, msuelo: 3500, w: 12.5, gdmax: 1.85 };
            function cargar(ejemplo) {
                setVal('s1D_mi', ejemplo ? EJ.mi : '');
                setVal('s1D_mf', ejemplo ? EJ.mf : '');
                setVal('s1D_mcono', ejemplo ? EJ.mcono : '');
                setVal('s1D_darena', ejemplo ? EJ.darena : '');
                setVal('s1D_msuelo', ejemplo ? EJ.msuelo : '');
                setVal('s1D_w', ejemplo ? EJ.w : '');
                setVal('s1D_gdmax', ejemplo ? (memVal('proctor', 'gdmax') || EJ.gdmax) : (memVal('proctor', 'gdmax') || ''));
            }
            function calc() {
                var r = C.densidadCampo({
                    mi: val('s1D_mi'), mf: val('s1D_mf'), mcono: val('s1D_mcono'),
                    darena: val('s1D_darena'), msuelo: val('s1D_msuelo'), w: val('s1D_w'), gdmax: val('s1D_gdmax')
                });
                if (!r.ok) { publicar(ENS.densidad, { error: r.error }); return; }
                var t = [
                    { l: 'Densidad seca en campo', v: fmt(r.gd, 3) + ' g/cm³', big: true, tone: r.gc == null ? '' : (r.gc >= 95 ? 'ok' : 'bad') },
                    { l: 'Densidad húmeda', v: fmt(r.gh, 3) + ' g/cm³' },
                    { l: 'Volumen del hoyo', v: fmt(r.vol, 1) + ' cm³' },
                    { l: 'Masa de arena en el hoyo', v: fmt(r.masaHoyo, 1) + ' g' },
                    { l: 'En kN/m³', v: fmt(r.gdKn, 2) + ' kN/m³' },
                    { l: 'Grado de compactación', v: r.gc == null ? '—' : fmt(r.gc, 1) + ' %', big: true, tone: r.gc == null ? 'warn' : (r.gc >= 95 ? 'ok' : 'bad'), s: r.gdmax ? 'respecto a ' + fmt(r.gdmax, 3) + ' g/cm³' : 'sin γd máx de referencia' }
                ];
                var tabla = '<div class="s1-tablewrap"><table class="s1-table"><tbody>' +
                    '<tr><td>Masa de arena usada (Mi − Mf)</td><td>' + fmt(C.num(val('s1D_mi')) - C.num(val('s1D_mf')), 1) + ' g</td></tr>' +
                    '<tr><td>Masa de arena en el cono</td><td>' + fmt(C.num(val('s1D_mcono')) || 0, 1) + ' g</td></tr>' +
                    '<tr><td>Masa de arena en el hoyo</td><td>' + fmt(r.masaHoyo, 1) + ' g</td></tr>' +
                    '<tr><td>Volumen del hoyo</td><td>' + fmt(r.vol, 1) + ' cm³</td></tr>' +
                    '<tr><td>γh / γd</td><td>' + fmt(r.gh, 3) + ' / ' + fmt(r.gd, 3) + ' g/cm³</td></tr>' +
                    '</tbody></table></div>';
                publicar(ENS.densidad, {
                    tiles: t, extra: tabla, avisos: r.avisos,
                    resumen: 'γd = ' + fmt(r.gd, 3) + ' g/cm³' + (r.gc != null ? ' · GC = ' + fmt(r.gc, 1) + ' %' : ''),
                    entradas: [{ label: 'Mi (g)', valor: val('s1D_mi') }, { label: 'Mf (g)', valor: val('s1D_mf') },
                        { label: 'Masa en el cono (g)', valor: val('s1D_mcono') }, { label: 'Densidad arena (g/cm³)', valor: val('s1D_darena') },
                        { label: 'Masa suelo húmedo (g)', valor: val('s1D_msuelo') }, { label: 'Humedad (%)', valor: val('s1D_w') },
                        { label: 'γd máx Proctor (g/cm³)', valor: val('s1D_gdmax') || '—' }],
                    tablaTitulo: 'Cálculo del hoyo', tablaImpresion: tabla
                });
                chartDensidad($('s1D_chart'), r);
            }
            cargar(true);
            $('s1D_calc').addEventListener('click', calc);
            $('s1D_ej').addEventListener('click', function () { cargar(true); calc(); });
            $('s1D_clr').addEventListener('click', function () { cargar(false); setHtml('s1Res', emptyHtml()); S.last = null; });
            S._redrawView = calc;
            calc();
        }
    });

    /* ---------- 7. Clasificación SUCS ---------- */
    reg({
        id: 'clasificacion', grupo: 3, icon: '🗂️', titulo: 'Clasificación SUCS', norma: 'ASTM D2487 · NTC 1515',
        desc: 'Sistema Unificado de Clasificación de Suelos. Combina granulometría, límites de Atterberg y plasticidad para asignar símbolo y nombre.',
        obtiene: 'símbolo SUCS · nombre · criterios · advertencias',
        proc: '<ol><li><b>¿Pasa N.º 200 ≥ 50 %?</b> Si sí, el suelo es fino y se clasifica con LL, LP e IP en la carta de plasticidad.</li>' +
            '<li>Si pasa N.º 200 &lt; 50 %, el suelo es grueso. Si predomina la grava (retenido N.º 4 &gt; arena) el prefijo es <b>G</b>; si predomina la arena, <b>S</b>.</li>' +
            '<li>Con menos de 5 % de finos se usan Cu y Cc para decidir <b>W</b> (bien graduado) o <b>P</b> (mal graduado).</li>' +
            '<li>Con más de 12 % de finos se añade <b>M</b> (limo) o <b>C</b> (arcilla) según la clasificación fina.</li>' +
            '<li>Entre 5 y 12 % de finos se reporta un doble símbolo (por ejemplo GW-GM).</li></ol>' +
            '<p class="s1-formula">Suelo fino: LL &lt; 50 → L · LL ≥ 50 → H &nbsp;·&nbsp; sobre línea A → C · bajo línea A → M</p>',
        render: function () {
            var g = S.mem.gran || {}, l = S.mem.limites || {};
            return '<div class="s1-formrow">' +
                field('s1C_p200', '% que pasa N.º 200', g.p200 != null ? g.p200 : 35, { unit: '%', step: '0.1', hint: 'Finos: limo + arcilla.' }) +
                field('s1C_p4', '% que pasa N.º 4', g.p4 != null ? g.p4 : 85, { unit: '%', step: '0.1', hint: 'No confundir con % retenido.' }) +
                field('s1C_ll', 'Límite líquido LL', l.ll != null ? l.ll : 45, { unit: '%', step: '0.1' }) +
                field('s1C_lp', 'Límite plástico LP', l.lp != null ? l.lp : 20, { unit: '%', step: '0.1' }) +
                field('s1C_cu', 'Coeficiente de uniformidad Cu', g.cu != null ? g.cu : 18, { step: '0.01', hint: 'Solo para suelos gruesos con pocos finos.' }) +
                field('s1C_cc', 'Coeficiente de curvatura Cc', g.cc != null ? g.cc : 1.4, { step: '0.01', hint: 'Solo para suelos gruesos con pocos finos.' }) + '</div>' +
                '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-primary" id="s1C_calc">CLASIFICAR</button>' +
                '<button type="button" class="s1-btn" id="s1C_ej">Cargar ejemplo</button>' +
                '<button type="button" class="s1-btn" id="s1C_clr">Vaciar</button></div>';
        },
        after: '<div class="s1-panel"><h4>Gráficas — composición y carta de plasticidad</h4><div class="s1-chartgrid"><canvas id="s1C_chart" data-ratio="0.38" role="img" aria-label="Composición granulométrica"></canvas><canvas id="s1C_chart2" data-ratio="0.68" role="img" aria-label="Carta de plasticidad"></canvas></div></div>',
        bind: function () {
            var EJ = { p200: 35, p4: 85, ll: 45, lp: 20, cu: 18, cc: 1.4 };
            function cargar(ejemplo) {
                var g = S.mem.gran || {}, l = S.mem.limites || {};
                setVal('s1C_p200', ejemplo ? EJ.p200 : (g.p200 != null ? g.p200 : EJ.p200));
                setVal('s1C_p4', ejemplo ? EJ.p4 : (g.p4 != null ? g.p4 : EJ.p4));
                setVal('s1C_ll', ejemplo ? EJ.ll : (l.ll != null ? l.ll : EJ.ll));
                setVal('s1C_lp', ejemplo ? EJ.lp : (l.lp != null ? l.lp : EJ.lp));
                setVal('s1C_cu', ejemplo ? EJ.cu : (g.cu != null ? g.cu : EJ.cu));
                setVal('s1C_cc', ejemplo ? EJ.cc : (g.cc != null ? g.cc : EJ.cc));
            }
            function limpiar() {
                ['s1C_p200', 's1C_p4', 's1C_ll', 's1C_lp', 's1C_cu', 's1C_cc'].forEach(function (id) { setVal(id, ''); });
            }
            function calc() {
                var r = C.clasificarSUCS({
                    p200: val('s1C_p200'), p4: val('s1C_p4'), ll: val('s1C_ll'),
                    lp: val('s1C_lp'), cu: val('s1C_cu'), cc: val('s1C_cc')
                });
                if (!r.ok) { publicar(ENS.clasificacion, { error: r.error }); return; }
                var t = [
                    { l: 'Grupo SUCS', v: r.simbolo, big: true, tone: 'ok', s: r.nombre },
                    { l: 'Grupo general', v: r.grupo },
                    { l: 'Grava', v: fmt(r.grava, 1) + ' %' },
                    { l: 'Arena', v: fmt(r.arena, 1) + ' %' },
                    { l: 'Finos', v: fmt(r.finos, 1) + ' %' },
                    { l: 'IP', v: r.ip == null ? '—' : fmt(r.ip, 1) + ' %' },
                    { l: 'Cu', v: r.cu == null ? '—' : fmt(r.cu, 2) },
                    { l: 'Cc', v: r.cc == null ? '—' : fmt(r.cc, 2) }
                ];
                var extra = '<div class="s1-note"><b>' + r.simbolo + ' — ' + r.nombre + '</b><br>' +
                    r.criterios.map(function (x) { return '• ' + x; }).join('<br>') + '</div>';
                publicar(ENS.clasificacion, {
                    tiles: t, extra: extra, avisos: r.avisos, resumen: r.simbolo + ' — ' + r.nombre,
                    entradas: [{ label: '% pasa N.º 200', valor: val('s1C_p200') }, { label: '% pasa N.º 4', valor: val('s1C_p4') },
                        { label: 'LL (%)', valor: val('s1C_ll') }, { label: 'LP (%)', valor: val('s1C_lp') },
                        { label: 'Cu', valor: val('s1C_cu') || '—' }, { label: 'Cc', valor: val('s1C_cc') || '—' }]
                });
                chartSucs($('s1C_chart'), r);
                chartPlasticidad($('s1C_chart2'), r);
            }
            cargar(false);
            $('s1C_calc').addEventListener('click', calc);
            $('s1C_ej').addEventListener('click', function () { cargar(true); calc(); });
            $('s1C_clr').addEventListener('click', function () { limpiar(); setHtml('s1Res', emptyHtml()); S.last = null; });
            S._redrawView = calc;
            calc();
        }
    });

    /* ---------- 8. Permeabilidad ---------- */
    reg({
        id: 'permeabilidad', grupo: 3, icon: '💦', titulo: 'Permeabilidad — Ley de Darcy', norma: 'ASTM D2434 / D5084 · NTC 5534',
        desc: 'Coeficiente de permeabilidad k con carga constante o variable. Incluye caudal, gradiente, velocidad de descarga y velocidad de filtración.',
        obtiene: 'k · q · i · v · clasificación del suelo',
        proc: '<p><b>Carga constante</b> (suelos granulares): se mide el volumen Q que atraviesa la muestra en un tiempo t con una carga h constante.</p>' +
            '<p class="s1-formula">q = Q/t &nbsp;·&nbsp; i = h/L &nbsp;·&nbsp; k = Q·L / (A·t·h) &nbsp;·&nbsp; v = q/A</p>' +
            '<p><b>Carga variable</b> (suelos finos): el agua sube o baja en un tubo piezométrico de área a.</p>' +
            '<p class="s1-formula">k = (a·L)/(A·t) · ln(h₁/h₂) &nbsp;·&nbsp; v<sub>s</sub> = v/n</p>' +
            '<p>La ley de Darcy es válida para flujo laminar. En gravas gruesas o gradientes muy altos puede aparecer turbulencia y la relación v–i deja de ser lineal.</p>',
        render: function () {
            return select('s1P_metodo', 'Método de laboratorio', [['constante', 'Carga constante'], ['variable', 'Carga variable']], 'constante', { wide: true }) +
                '<div class="s1-formrow" id="s1P_fields" style="margin-top:12px"></div>' +
                '<div class="s1-formrow" style="margin-top:12px">' + field('s1P_n', 'Porosidad n (opcional)', null, { step: '0.01', min: 0, max: 1, hint: 'Para calcular la velocidad de filtración vs = v/n.' }) + '</div>' +
                '<div class="s1-actions"><button type="button" class="s1-btn s1-btn-primary" id="s1P_calc">CALCULAR</button>' +
                '<button type="button" class="s1-btn" id="s1P_ej">Cargar ejemplo</button>' +
                '<button type="button" class="s1-btn" id="s1P_clr">Vaciar</button></div>';
        },
        after: '<div class="s1-panel s1-chartpanel"><h4>Gráfica — escala de permeabilidad</h4><canvas id="s1P_chart" data-ratio="0.45" role="img" aria-label="Escala de permeabilidad"></canvas></div>',
        bind: function () {
            var EJ = {
                constante: { q: 50, t: 180, a: 100, l: 10, h: 80, n: 0.35, aTubo: '', h1: '', h2: '' },
                variable: { q: '', t: 300, a: 50, l: 10, h: '', n: 0.40, aTubo: 1.0, h1: 80, h2: 40 }
            };
            function campos(metodo, ejemplo) {
                var e = EJ[metodo] || EJ.constante;
                if (metodo === 'constante') {
                    setHtml('s1P_fields',
                        field('s1P_q', 'Volumen de agua Q', ejemplo ? e.q : '', { unit: 'cm³', step: '0.1' }) +
                        field('s1P_t', 'Tiempo t', ejemplo ? e.t : '', { unit: 's', step: '0.1' }) +
                        field('s1P_a', 'Área de la muestra A', ejemplo ? e.a : '', { unit: 'cm²', step: '0.1' }) +
                        field('s1P_l', 'Longitud de la muestra L', ejemplo ? e.l : '', { unit: 'cm', step: '0.1' }) +
                        field('s1P_h', 'Carga hidráulica h', ejemplo ? e.h : '', { unit: 'cm', step: '0.1' }));
                    setVal('s1P_n', ejemplo ? e.n : '');
                } else {
                    setHtml('s1P_fields',
                        field('s1P_aTubo', 'Área del tubo piezométrico a', ejemplo ? e.aTubo : '', { unit: 'cm²', step: '0.001' }) +
                        field('s1P_a', 'Área de la muestra A', ejemplo ? e.a : '', { unit: 'cm²', step: '0.1' }) +
                        field('s1P_l', 'Longitud de la muestra L', ejemplo ? e.l : '', { unit: 'cm', step: '0.1' }) +
                        field('s1P_t', 'Tiempo t', ejemplo ? e.t : '', { unit: 's', step: '0.1' }) +
                        field('s1P_h1', 'Carga inicial h₁', ejemplo ? e.h1 : '', { unit: 'cm', step: '0.1' }) +
                        field('s1P_h2', 'Carga final h₂', ejemplo ? e.h2 : '', { unit: 'cm', step: '0.1' }));
                    setVal('s1P_n', ejemplo ? e.n : '');
                }
            }
            function calc() {
                var r = C.permeabilidad({
                    metodo: val('s1P_metodo'), q: val('s1P_q'), t: val('s1P_t'), a: val('s1P_a'), l: val('s1P_l'),
                    h: val('s1P_h'), aTubo: val('s1P_aTubo'), h1: val('s1P_h1'), h2: val('s1P_h2'), n: val('s1P_n')
                });
                if (!r.ok) { publicar(ENS.permeabilidad, { error: r.error }); return; }
                var t = [
                    { l: 'Coeficiente k', v: r.k.toExponential(3) + ' cm/s', big: true, tone: 'ok', s: r.tipo },
                    { l: 'Caudal q', v: fmt(r.q, 4) + ' cm³/s' },
                    { l: 'Gradiente hidráulico i', v: fmt(r.i, 3) },
                    { l: 'Velocidad de descarga v', v: fmt(r.v, 6) + ' cm/s' },
                    { l: 'Velocidad de filtración vs', v: r.vs == null ? '—' : fmt(r.vs, 6) + ' cm/s', s: r.vs == null ? 'Requiere porosidad' : 'vs = v/n' },
                    { l: 'Método', v: r.metodo === 'constante' ? 'Carga constante' : 'Carga variable' }
                ];
                var extra = '<div class="s1-tablewrap"><table class="s1-table"><tbody>' +
                    '<tr><td>Área A</td><td>' + fmt(r.area, 2) + ' cm²</td></tr>' +
                    '<tr><td>Longitud L</td><td>' + fmt(r.largo, 2) + ' cm</td></tr>' +
                    '<tr><td>Tiempo t</td><td>' + fmt(r.tiempo, 1) + ' s</td></tr>' +
                    '</tbody></table></div>';
                publicar(ENS.permeabilidad, {
                    tiles: t, extra: extra, avisos: r.avisos, resumen: 'k = ' + r.k.toExponential(3) + ' cm/s',
                    entradas: [{ label: 'Método', valor: r.metodo }, { label: 'Área A (cm²)', valor: val('s1P_a') },
                        { label: 'Longitud L (cm)', valor: val('s1P_l') }, { label: 'Tiempo t (s)', valor: val('s1P_t') },
                        { label: 'Porosidad n', valor: val('s1P_n') || '—' }],
                    tablaTitulo: 'Datos del permeámetro', tablaImpresion: extra
                });
                chartPerm($('s1P_chart'), r);
            }
            campos('constante', true);
            $('s1P_metodo').addEventListener('change', function () { campos(this.value, true); calc(); });
            $('s1P_calc').addEventListener('click', calc);
            $('s1P_ej').addEventListener('click', function () { campos(val('s1P_metodo'), true); calc(); });
            $('s1P_clr').addEventListener('click', function () { campos(val('s1P_metodo'), false); setHtml('s1Res', emptyHtml()); S.last = null; });
            S._redrawView = calc;
            calc();
        }
    });
    /* =========================================================
       RENDER DEL TAB «ENSAYOS»
       ========================================================= */
    function ensayosHome() {
        var h = '<div class="s1"><div class="s1-intro"><p><b>Ruta de trabajo:</b> caracteriza el suelo con humedad, granulometría, límites y gravedad específica; después estudia su compactación y su comportamiento hidráulico. ' +
            'Los resultados que apruebes con los botones verdes viajan automáticamente entre ensayos (por ejemplo, el #200 y el #4 alimentan la clasificación SUCS, y la Gs alimenta la curva ZAV de Proctor).</p></div>' +
            memoriaHtml();
        GRUPOS.forEach(function (g) {
            var items = ORDEN.filter(function (id) { return ENS[id].grupo === g.n; });
            h += '<section class="s1-group"><header class="s1-grouphead"><span class="s1-num">' + g.n + '</span><div><h4>' + g.t + '</h4><p>' + g.d + '</p></div></header><div class="s1-cards">' +
                items.map(function (id) {
                    var e = ENS[id];
                    return '<button type="button" class="s1-card" data-ens="' + id + '"><span class="s1-card-ico" aria-hidden="true">' + e.icon + '</span><span class="s1-card-t">' + e.titulo + '</span><span class="s1-card-n">' + e.norma + '</span>' +
                        '<span class="s1-card-d">' + e.desc + '</span><span class="s1-card-o">' + e.obtiene + '</span><span class="s1-card-go">ABRIR ENSAYO →</span></button>';
                }).join('') + '</div></section>';
        });
        h += '</div>';
        return h;
    }
    function ensayoView(id) {
        var e = ENS[id];
        return '<div class="s1"><header class="s1-viewhead"><button type="button" class="s1-btn" id="s1BackEns">← Ensayos</button>' +
            '<div class="s1-viewtitle"><h3>' + e.titulo + '</h3><span class="s1-norma">' + e.norma + '</span><p>' + e.desc + '</p></div></header>' +
            '<div class="s1-cols"><div class="s1-col"><div class="s1-panel"><h4>Datos del ensayo</h4>' + e.render() + '</div>' + (e.after || '') + '</div>' +
            '<div class="s1-col"><div class="s1-panel"><h4>Resultados</h4><div id="s1Res" class="s1-res">' + emptyHtml('Los datos de ejemplo están precargados. Revisa el resultado o pulsa «Vaciar» para ingresar tus propios datos.') + '</div></div>' +
            '<details class="s1-panel s1-proc" open><summary>Procedimiento y fórmulas</summary>' + e.proc + '</details></div></div></div>';
    }
    S.renderEnsayos = function () {
        var rootEl = $('ms1EnsayosRoot'); if (!rootEl) return;
        S.last = null;
        if (!S.state.ens) {
            rootEl.innerHTML = ensayosHome();
            rootEl.querySelectorAll('[data-ens]').forEach(function (b) {
                b.addEventListener('click', function () { S.abrirEnsayo(b.getAttribute('data-ens')); });
            });
            rootEl.querySelectorAll('[data-go]').forEach(function (b) {
                b.addEventListener('click', function () { S.abrirEnsayo(b.getAttribute('data-go')); });
            });
            var mc = $('s1MemClear');
            if (mc) mc.addEventListener('click', function () { memClear(); S.renderEnsayos(); toast('Memoria de la práctica borrada.'); });
            return;
        }
        rootEl.innerHTML = ensayoView(S.state.ens);
        $('s1BackEns').addEventListener('click', function () { S.state.ens = null; S.renderEnsayos(); scrollArriba(); });
        ENS[S.state.ens].bind(rootEl);
    };
    function scrollArriba() {
        try { var t = $('pantallaSuelos'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start' }); else root.scrollTo(0, 0); }
        catch (e) { root.scrollTo(0, 0); }
    }
    S.abrirEnsayo = function (id) {
        if (!ENS[id]) return;
        S.state.ens = id;
        var btn = document.querySelector('#pantallaSuelos .tab-btn[data-tab="ms1-ensayos"]');
        if (btn && !btn.classList.contains('active')) btn.click();
        S.renderEnsayos();
        scrollArriba();
    };

    /* =========================================================
       TEORÍA
       ========================================================= */
    function teoriaHtml() {
        var sec = [
            ['ruta', 'Ruta de trabajo'], ['fases', 'El suelo como sistema trifásico'], ['indice', 'Propiedades índice'],
            ['gran', 'Granulometría'], ['limites', 'Límites de Atterberg'], ['sucs', 'Clasificación SUCS'],
            ['proctor', 'Compactación Proctor'], ['campo', 'Densidad de campo'], ['perm', 'Permeabilidad'],
            ['normas', 'Normas, bibliografía y errores comunes']
        ];
        var toc = '<nav class="s1-toc" aria-label="Contenido de la teoría"><b>Contenido</b>' + sec.map(function (s, i) {
            return '<a href="#s1-t-' + s[0] + '" data-t="' + s[0] + '"><span>' + (i + 1) + '</span>' + s[1] + '</a>';
        }).join('') + '</nav>';
        var h = '<div class="s1"><header class="s1-teohead"><h3>Mecánica de Suelos I — Fundamentos y laboratorio</h3>' +
            '<p>Teoría organizada para acompañar los ocho ensayos del módulo: propiedades índice, granulometría, límites, clasificación, compactación, densidad de campo y permeabilidad. ' +
            'Cada fórmula se conecta con un ensayo y con las decisiones de ingeniería que dependen de ella.</p></header><div class="s1-teolayout">' + toc + '<div class="s1-teobody">';

        h += `<section class="s1-sec" id="s1-t-ruta"><h4><span>1</span>Ruta de trabajo</h4>
            <p>La mecánica de suelos parte de una muestra alterada o inalterada y avanza de lo simple a lo complejo. En el laboratorio conviene seguir este orden para que los datos de un ensayo alimenten al siguiente:</p>
            <div class="s1-ruta">
                <a href="#" class="s1-paso" data-go="humedad"><span>1</span><b>Humedad</b><small>Condición inicial de la muestra y base de todos los cálculos gravimétricos.</small></a>
                <a href="#" class="s1-paso" data-go="granulometria"><span>2</span><b>Granulometría</b><small>Tamaños de partícula, grava, arena, finos, Cu y Cc.</small></a>
                <a href="#" class="s1-paso" data-go="limites"><span>3</span><b>Límites de Atterberg</b><small>LL, LP e IP: comportamiento plástico de los finos.</small></a>
                <a href="#" class="s1-paso" data-go="gravedad"><span>4</span><b>Gravedad específica</b><small>Gs: densidad de los sólidos y curva de saturación total.</small></a>
                <a href="#" class="s1-paso" data-go="clasificacion"><span>5</span><b>Clasificación SUCS</b><small>Nombre y grupo del suelo a partir de los ensayos anteriores.</small></a>
                <a href="#" class="s1-paso" data-go="compactacion"><span>6</span><b>Compactación Proctor</b><small>wópt y γd máx para especificar el relleno.</small></a>
                <a href="#" class="s1-paso" data-go="densidad"><span>7</span><b>Densidad de campo</b><small>Control de calidad: ¿se compactó como se especificó?</small></a>
                <a href="#" class="s1-paso" data-go="permeabilidad"><span>8</span><b>Permeabilidad</b><small>Flujo de agua: drenaje, filtración y estabilidad.</small></a>
            </div>
            <div class="s1-callout"><b>Buena práctica:</b> registra siempre la fecha, el operador, el equipo, la calibración y las condiciones ambientales. Un resultado sin trazabilidad no es un dato de laboratorio: es solo un número.</div>
        </section>`;

        h += `<section class="s1-sec" id="s1-t-fases"><h4><span>2</span>El suelo como sistema trifásico</h4>
            <p>El suelo es una mezcla de <b>sólidos</b>, <b>agua</b> y <b>aire</b>. Las relaciones entre las tres fases explican la humedad, la densidad, la compressibilidad y la resistencia. En el diagrama, a la izquierda se muestra el volumen y a la derecha la masa de cada fase.</p>
            <div class="s1-fases">
                <div class="s1-fase-stack" role="img" aria-label="Diagrama de fases del suelo">
                    <div class="s1-aire">AIRE</div><div class="s1-agua">AGUA</div><div class="s1-solidos">SÓLIDOS</div>
                </div>
                <div>
                    <div class="s1-relaciones">
                        <div class="s1-rel"><b>Volumen total</b><code>V = V<sub>a</sub> + V<sub>w</sub> + V<sub>s</sub></code></div>
                        <div class="s1-rel"><b>Masa total</b><code>M = M<sub>w</sub> + M<sub>s</sub></code> (el aire se desprecia)</div>
                        <div class="s1-rel"><b>Relación de vacíos</b><code>e = V<sub>v</sub> / V<sub>s</sub></code></div>
                        <div class="s1-rel"><b>Porosidad</b><code>n = V<sub>v</sub> / V = e / (1 + e)</code></div>
                        <div class="s1-rel"><b>Grado de saturación</b><code>S = V<sub>w</sub> / V<sub>v</sub></code></div>
                        <div class="s1-rel"><b>Contenido de humedad</b><code>w = M<sub>w</sub> / M<sub>s</sub></code></div>
                    </div>
                    <p>Un suelo saturado tiene S = 100 %; un suelo seco tiene S = 0 %. La fase sólida se caracteriza con la gravedad específica G<sub>s</sub>, que relaciona la densidad de las partículas con la del agua.</p>
                </div>
            </div>
            <div class="s1-formula">γ = M·g / V &nbsp;·&nbsp; γ<sub>d</sub> = M<sub>s</sub>·g / V = γ / (1 + w) &nbsp;·&nbsp; γ<sub>sat</sub> = (G<sub>s</sub> + e)·γ<sub>w</sub> / (1 + e) &nbsp;·&nbsp; γ′ = γ<sub>sat</sub> − γ<sub>w</sub></div>
            <p>En geotecnia se usan dos convenciones: el contenido de humedad w se expresa en porcentaje y la densidad seca γ<sub>d</sub> en g/cm³ o kN/m³. Para pasar de g/cm³ a kN/m³ multiplica por 9.81.</p>
        </section>`;

        h += `<section class="s1-sec" id="s1-t-indice"><h4><span>3</span>Propiedades índice</h4>
            <p>Las propiedades índice son mediciones simples y repetibles que describen la naturaleza del suelo. No sustituyen los ensayos de resistencia, pero permiten clasificarlo, correlacionar su comportamiento y diseñar el programa experimental.</p>
            <h5>Contenido de humedad</h5>
            <div class="s1-formula">w = (M<sub>h</sub> − M<sub>s</sub>) / (M<sub>s</sub> − M<sub>t</sub>) · 100 %</div>
            <p>M<sub>h</sub> es la masa del recipiente con suelo húmedo, M<sub>s</sub> la del recipiente con suelo seco y M<sub>t</sub> la tara. El secado se hace a 110 ± 5 °C hasta masa constante. La humedad se reporta con dos decimales y se verifica por duplicado.</p>
            <h5>Gravedad específica</h5>
            <div class="s1-formula">G<sub>s</sub> = W<sub>s</sub> / (W<sub>s</sub> + W<sub>pw</sub> − W<sub>pws</sub>)</div>
            <p>W<sub>s</sub> es la masa de sólidos secos, W<sub>pw</sub> la masa del picnómetro con agua y W<sub>pws</sub> la masa del picnómetro con suelo y agua. Valores típicos: arenas 2.60 – 2.70, limos 2.65 – 2.75, arcillas 2.70 – 2.90. Valores menores que 2.0 sugieren materia orgánica.</p>
            <h5>Relaciones derivadas</h5>
            <div class="s1-relaciones">
                <div class="s1-rel"><b>Peso específico húmedo</b><code>γ = W/V</code></div>
                <div class="s1-rel"><b>Peso específico seco</b><code>γ<sub>d</sub> = γ/(1 + w)</code></div>
                <div class="s1-rel"><b>Relación de vacíos</b><code>e = G<sub>s</sub>γ<sub>w</sub>/γ<sub>d</sub> − 1</code></div>
                <div class="s1-rel"><b>Porosidad</b><code>n = e/(1 + e)</code></div>
                <div class="s1-rel"><b>Saturación</b><code>S = w·G<sub>s</sub>/e</code></div>
                <div class="s1-rel"><b>Peso sumergido</b><code>γ′ = γ<sub>sat</sub> − γ<sub>w</sub></code></div>
            </div>
            <div class="s1-callout"><b>Ojo con las unidades:</b> en las fórmulas, w debe entrar como decimal (12.5 % = 0.125). Si usas w en porcentaje, divide por 100 en los denominadores.</div>
        </section>`;

        h += `<section class="s1-sec" id="s1-t-gran"><h4><span>4</span>Granulometría</h4>
            <p>El análisis granulométrico separa el suelo por tamaños. Para partículas mayores que el tamiz N.º 200 se usa tamizado; para los finos se complementa con sedimentación (hidrómetro o pipeta). La curva se dibuja con la abertura en escala logarítmica y el porcentaje que pasa en escala lineal.</p>
            <div class="s1-tablewrap"><table class="s1-table"><thead><tr><th>Fracción</th><th>Rango de tamaño</th><th>Tamiz de referencia</th></tr></thead><tbody>
                <tr><td>Grava</td><td>4.75 mm – 75 mm</td><td>N.º 4 a 3"</td></tr>
                <tr><td>Arena gruesa</td><td>2.00 – 4.75 mm</td><td>N.º 10 a N.º 4</td></tr>
                <tr><td>Arena media</td><td>0.425 – 2.00 mm</td><td>N.º 40 a N.º 10</td></tr>
                <tr><td>Arena fina</td><td>0.075 – 0.425 mm</td><td>N.º 200 a N.º 40</td></tr>
                <tr><td>Finos (limo + arcilla)</td><td>&lt; 0.075 mm</td><td>Pasa N.º 200</td></tr>
            </tbody></table></div>
            <h5>Coeficientes de forma de la curva</h5>
            <div class="s1-formula">Cu = D<sub>60</sub>/D<sub>10</sub> &nbsp;&nbsp;·&nbsp;&nbsp; Cc = D<sub>30</sub>²/(D<sub>10</sub>·D<sub>60</sub>)</div>
            <p><b>Cu</b> mide la amplitud de la distribución: cuanto mayor sea, más tamaños contiene el suelo. <b>Cc</b> describe la forma de la parte central de la curva. Para gravas bien graduadas se exige Cu ≥ 4 y 1 ≤ Cc ≤ 3; para arenas bien graduadas, Cu ≥ 6 y 1 ≤ Cc ≤ 3.</p>
            <div class="s1-example"><h5>Ejemplo resuelto</h5><p>De una curva se leen D<sub>10</sub> = 0.15 mm, D<sub>30</sub> = 0.45 mm y D<sub>60</sub> = 1.20 mm.</p>
                <p>Cu = 1.20/0.15 = <b>8.0</b> y Cc = 0.45²/(0.15 × 1.20) = <b>1.125</b>. Si el suelo es una arena (pasa N.º 4 &gt; 50 % y pasa N.º 200 &lt; 5 %), cumple Cu ≥ 6 y 1 ≤ Cc ≤ 3: sería <b>SW</b>.</p></div>
            <p>La interpolación de D<sub>10</sub>, D<sub>30</sub> y D<sub>60</sub> se hace en escala semilogarítmica entre los tamices que rodean el porcentaje buscado. Si la curva no cruza el porcentaje, el valor no se puede determinar con los tamices ensayados.</p>
        </section>`;

        h += `<section class="s1-sec" id="s1-t-limites"><h4><span>5</span>Límites de Atterberg y carta de plasticidad</h4>
            <p>Los límites de consistencia describen cómo cambia el comportamiento de un suelo fino al variar su humedad:</p>
            <ul>
                <li><b>Límite líquido LL:</b> humedad a la que el suelo pasa de plástico a líquido. Se determina con la copa de Casagrande y se reporta a 25 golpes.</li>
                <li><b>Límite plástico LP:</b> humedad a la que un rollito de 3 mm se agrieta y no puede seguir deformándose.</li>
                <li><b>Límite de contracción LC:</b> humedad por debajo de la cual el suelo ya no reduce más su volumen al secarse.</li>
                <li><b>Índice de plasticidad IP = LL − LP:</b> amplitud del intervalo plástico. Un IP alto indica mayor contenido de arcilla y mayor potencial de cambios volumétricos.</li>
            </ul>
            <h5>Curva de fluidez</h5>
            <p>Se ajusta una recta entre la humedad y el logaritmo del número de golpes:</p>
            <div class="s1-formula">w = m·log<sub>10</sub>(N) + b &nbsp;&nbsp;⇒&nbsp;&nbsp; LL = m·log<sub>10</sub>(25) + b</div>
            <p>El <b>índice de fluidez IF = −m</b> indica cuánto cambia la humedad por ciclo logarítmico de golpes. Un ajuste con R² ≥ 0.98 es señal de puntos consistentes; si es menor, revisa la ejecución del ensayo.</p>
            <h5>Carta de plasticidad</h5>
            <div class="s1-formula">Línea A: IP = 0.73(LL − 20) &nbsp;&nbsp;·&nbsp;&nbsp; Línea U: IP = 0.9(LL − 8)</div>
            <p>La línea A separa las arcillas (CL, CH) de los limos (ML, MH). La zona entre IP = 4 e IP = 7 por encima de la línea A corresponde a CL-ML. La línea U es el límite superior empírico de los suelos naturales.</p>
            <div class="s1-example"><h5>Ejemplo resuelto</h5><p>LL = 35 %, LP = 22 % ⇒ IP = 13 %. La línea A vale 0.73(35 − 20) = 10.95 %. Como LL &lt; 50 e IP &gt; línea A, el suelo es <b>CL</b> (arcilla de baja plasticidad). Si la humedad natural fuera 30 %, LI = (30 − 22)/13 = 0.62: consistencia media.</p></div>
        </section>`;

        h += `<section class="s1-sec" id="s1-t-sucs"><h4><span>6</span>Clasificación SUCS (ASTM D2487)</h4>
            <p>El Sistema Unificado de Clasificación de Suelos usa un símbolo de dos letras y un nombre descriptivo. La primera letra indica el tipo principal (G grava, S arena, C arcilla, M limo, O orgánico, Pt turba) y la segunda la graduación o plasticidad (W bien graduado, P mal graduado, L baja plasticidad, H alta plasticidad).</p>
            <div class="s1-tablewrap"><table class="s1-table"><thead><tr><th>Grupo</th><th>Criterio principal</th><th>Nombre</th></tr></thead><tbody>
                <tr><td>GW</td><td>Grava, finos &lt; 5 %, Cu ≥ 4 y 1 ≤ Cc ≤ 3</td><td>Grava bien graduada</td></tr>
                <tr><td>GP</td><td>Grava, finos &lt; 5 %, no cumple GW</td><td>Grava mal graduada</td></tr>
                <tr><td>GM</td><td>Grava, finos &gt; 12 %, finos ML o MH</td><td>Grava limosa</td></tr>
                <tr><td>GC</td><td>Grava, finos &gt; 12 %, finos CL o CH</td><td>Grava arcillosa</td></tr>
                <tr><td>SW</td><td>Arena, finos &lt; 5 %, Cu ≥ 6 y 1 ≤ Cc ≤ 3</td><td>Arena bien graduada</td></tr>
                <tr><td>SP</td><td>Arena, finos &lt; 5 %, no cumple SW</td><td>Arena mal graduada</td></tr>
                <tr><td>SM</td><td>Arena, finos &gt; 12 %, finos ML o MH</td><td>Arena limosa</td></tr>
                <tr><td>SC</td><td>Arena, finos &gt; 12 %, finos CL o CH</td><td>Arena arcillosa</td></tr>
                <tr><td>CL</td><td>Finos ≥ 50 %, LL &lt; 50, IP &gt; 7 y sobre línea A</td><td>Arcilla de baja plasticidad</td></tr>
                <tr><td>ML</td><td>Finos ≥ 50 %, LL &lt; 50, IP &lt; 4 o bajo línea A</td><td>Limo de baja plasticidad</td></tr>
                <tr><td>CH</td><td>Finos ≥ 50 %, LL ≥ 50 y sobre línea A</td><td>Arcilla de alta plasticidad</td></tr>
                <tr><td>MH</td><td>Finos ≥ 50 %, LL ≥ 50 y bajo línea A</td><td>Limo de alta plasticidad</td></tr>
                <tr><td>CL-ML</td><td>Finos ≥ 50 %, 4 ≤ IP ≤ 7 y sobre línea A</td><td>Arcilla limosa / limo arcilloso</td></tr>
                <tr><td>Pt</td><td>Suelo altamente orgánico, turba</td><td>Turba</td></tr>
            </tbody></table></div>
            <div class="s1-callout"><b>Entre 5 y 12 % de finos</b> el suelo cae en una zona de transición y se reporta con doble símbolo (GW-GM, SP-SC, etc.). No fuerces una clasificación simple: indica ambos componentes.</div>
        </section>`;

        h += `<section class="s1-sec" id="s1-t-proctor"><h4><span>7</span>Compactación Proctor</h4>
            <p>Compactar es reducir el volumen de vacíos aplicando energía. Al aumentar la humedad, el agua lubrica las partículas y la densidad seca crece; pasado un punto, el agua ocupa espacio y la densidad disminuye. Ese máximo define la <b>humedad óptima w<sub>ópt</sub></b> y la <b>densidad seca máxima γ<sub>d,máx</sub></b>.</p>
            <div class="s1-tablewrap"><table class="s1-table"><thead><tr><th>Parámetro</th><th>Proctor estándar (D698)</th><th>Proctor modificado (D1557)</th></tr></thead><tbody>
                <tr><td>Masa del martillo</td><td>2.5 kg</td><td>4.54 kg</td></tr>
                <tr><td>Altura de caída</td><td>30.5 cm</td><td>45.7 cm</td></tr>
                <tr><td>Capas</td><td>3</td><td>5</td></tr>
                <tr><td>Golpes por capa</td><td>25</td><td>25</td></tr>
                <tr><td>Energía específica</td><td>≈ 593 kJ/m³</td><td>≈ 2703 kJ/m³</td></tr>
                <tr><td>Uso típico</td><td>Rellenos, subrasantes, presas de tierra</td><td>Pavimentos, aeropistas, rellenos de alta exigencia</td></tr>
            </tbody></table></div>
            <div class="s1-formula">γ<sub>h</sub> = (M<sub>molde+suelo</sub> − M<sub>molde</sub>)/V &nbsp;·&nbsp; γ<sub>d</sub> = γ<sub>h</sub>/(1 + w/100)</div>
            <p>Con al menos tres puntos se ajusta una parábola. El vértice se obtiene derivando:</p>
            <div class="s1-formula">γ<sub>d</sub> = a·w² + b·w + c &nbsp;⇒&nbsp; w<sub>ópt</sub> = −b/(2a) &nbsp;·&nbsp; γ<sub>d,máx</sub> = c − b²/(4a)</div>
            <p>La <b>curva de saturación total (ZAV)</b> es el límite teórico para S = 100 %. Se dibuja con la G<sub>s</sub> del suelo:</p>
            <div class="s1-formula">γ<sub>d,ZAV</sub> = G<sub>s</sub>·γ<sub>w</sub> / (1 + w·G<sub>s</sub>/100)</div>
            <p>Ningún punto de compactación puede quedar por encima de la ZAV. Si ocurre, hay un error en la G<sub>s</sub>, en el volumen del molde o en las masas.</p>
            <div class="s1-example"><h5>Ejemplo resuelto</h5><p>Con cinco puntos se obtiene la parábola γ<sub>d</sub> = −0.0018w² + 0.055w + 1.43. Entonces w<sub>ópt</sub> = −0.055/(2 × −0.0018) ≈ <b>15.3 %</b> y γ<sub>d,máx</sub> = 1.43 − 0.055²/(4 × 0.0018) ≈ <b>1.85 g/cm³</b> (≈ 18.1 kN/m³).</p></div>
        </section>`;

        h += `<section class="s1-sec" id="s1-t-campo"><h4><span>8</span>Densidad de campo y control de compactación</h4>
            <p>El ensayo de cono de arena mide el volumen del hoyo a partir de la arena calibrada que lo llena. Es un método directo y adecuado para suelos granulares y rellenos.</p>
            <div class="s1-formula">V = (M<sub>i</sub> − M<sub>f</sub> − M<sub>cono</sub>)/ρ<sub>arena</sub> &nbsp;·&nbsp; γ<sub>h</sub> = M<sub>suelo</sub>/V &nbsp;·&nbsp; γ<sub>d</sub> = γ<sub>h</sub>/(1 + w/100)</div>
            <p>El <b>grado de compactación</b> compara la densidad seca de campo con la densidad seca máxima de laboratorio:</p>
            <div class="s1-formula">GC = γ<sub>d,campo</sub> / γ<sub>d,máx,Proctor</sub> × 100 %</div>
            <p>Para rellenos estructurales suele exigirse GC ≥ 95 %; para capas de base y subbase, valores mayores según la especificación. El control debe hacerse por capas y con un número suficiente de puntos para representar el lote.</p>
            <div class="s1-callout"><b>Errores frecuentes:</b> olvidar la masa de arena del cono, usar una densidad de arena no calibrada, perder suelo al excavar, medir la humedad de una muestra no representativa o comparar con una densidad máxima de un material diferente.</div>
        </section>`;

        h += `<section class="s1-sec" id="s1-t-perm"><h4><span>9</span>Permeabilidad y Ley de Darcy</h4>
            <p>La permeabilidad describe la facilidad con que el agua atraviesa el suelo. Para flujo laminar, la Ley de Darcy establece que la velocidad de descarga es proporcional al gradiente hidráulico:</p>
            <div class="s1-formula">v = k·i &nbsp;·&nbsp; q = k·i·A &nbsp;·&nbsp; i = h/L</div>
            <h5>Carga constante</h5>
            <p>Adecuada para suelos granulares. Se mide el volumen Q en un tiempo t con una diferencia de carga h constante:</p>
            <div class="s1-formula">k = Q·L / (A·t·h)</div>
            <h5>Carga variable</h5>
            <p>Adecuada para suelos finos. El agua fluye por un tubo piezométrico de área a y la carga baja de h₁ a h₂ en un tiempo t:</p>
            <div class="s1-formula">k = (a·L)/(A·t) · ln(h₁/h₂)</div>
            <p>La velocidad de descarga v no es la velocidad real del agua en los poros. La velocidad de filtración es v<sub>s</sub> = v/n, donde n es la porosidad.</p>
            <div class="s1-tablewrap"><table class="s1-table"><thead><tr><th>Material</th><th>k típico (cm/s)</th><th>Comportamiento</th></tr></thead><tbody>
                <tr><td>Grava limpia</td><td>10⁻¹ – 10⁰</td><td>Muy permeable; drenaje rápido</td></tr>
                <tr><td>Arena gruesa</td><td>10⁻³ – 10⁻¹</td><td>Permeable; buen drenaje</td></tr>
                <tr><td>Arena fina / limo arenoso</td><td>10⁻⁵ – 10⁻³</td><td>Drenaje lento</td></tr>
                <tr><td>Limo</td><td>10⁻⁷ – 10⁻⁵</td><td>Baja permeabilidad</td></tr>
                <tr><td>Arcilla</td><td>&lt; 10⁻⁷</td><td>Prácticamente impermeable</td></tr>
            </tbody></table></div>
            <div class="s1-callout">La Ley de Darcy supone flujo laminar y suelo saturado. En gravas gruesas, gradientes altos o suelos con fisuras, la relación puede dejar de ser lineal y el ensayo debe interpretarse con cuidado.</div>
        </section>`;

        h += `<section class="s1-sec" id="s1-t-normas"><h4><span>10</span>Normas, bibliografía y errores comunes</h4>
            <h5>Normas de referencia</h5>
            <ul class="s1-bib">
                <li><b>ASTM D2216 / NTC 1495:</b> contenido de humedad.</li>
                <li><b>ASTM D6913 / NTC 1527:</b> análisis granulométrico por tamizado.</li>
                <li><b>ASTM D4318 / NTC 4630:</b> límites líquido y plástico.</li>
                <li><b>ASTM D854 / NTC 4481:</b> gravedad específica de sólidos.</li>
                <li><b>ASTM D2487 / NTC 1515:</b> clasificación SUCS.</li>
                <li><b>ASTM D698 / D1557 / NTC 1410 y 1422:</b> compactación Proctor estándar y modificada.</li>
                <li><b>ASTM D1556 / NTC 1667:</b> densidad de campo por cono de arena.</li>
                <li><b>ASTM D2434 / D5084 / NTC 5534:</b> permeabilidad en laboratorio.</li>
            </ul>
            <h5>Bibliografía</h5>
            <ul class="s1-bib">
                <li>Das, B. M. y Sobhan, K. <em>Principles of Geotechnical Engineering</em>. Cengage Learning.</li>
                <li>Holtz, R. D., Kovacs, W. D. y Sheahan, T. C. <em>An Introduction to Geotechnical Engineering</em>. Pearson.</li>
                <li>Budhu, M. <em>Soil Mechanics and Foundations</em>. Wiley.</li>
                <li>Juárez Badillo, E. y Rico Rodríguez, A. <em>Mecánica de Suelos</em>. Limusa.</li>
                <li>Guías de laboratorio FLA-23, Universidad de Pamplona.</li>
            </ul>
            <h5>Errores comunes que cambian el resultado</h5>
            <ul>
                <li>No secar la muestra hasta masa constante o pesarla caliente sin desecador.</li>
                <li>Confundir % retenido con % que pasa al ingresar la granulometría.</li>
                <li>Usar el tamiz N.º 40 donde la norma pide N.º 200, o no lavar los finos antes de tamizar.</li>
                <li>Ajustar el límite líquido con puntos fuera del intervalo 10 – 40 golpes o con R² bajo.</li>
                <li>Reportar LP como un solo rollito sin duplicado.</li>
                <li>Olvidar la corrección por temperatura en G<sub>s</sub> o dejar aire atrapado en el picnómetro.</li>
                <li>Calcular el grado de compactación con una densidad máxima de otro material o con una energía distinta.</li>
                <li>No calibrar la arena del cono o no descontar la arena del cono.</li>
                <li>Interpretar k sin verificar el régimen laminar y la saturación de la muestra.</li>
            </ul>
            <p class="s1-hint">Verifica siempre la edición vigente de cada norma y las guías de tu laboratorio antes de usar los resultados en un proyecto real.</p>
        </section>`;

        h += '</div></div></div>';
        return h;
    }
    function bindTeoria(rootEl) {
        rootEl.querySelectorAll('.s1-toc a').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                var t = $('s1-t-' + a.getAttribute('data-t'));
                if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
        rootEl.querySelectorAll('[data-go]').forEach(function (a) {
            a.addEventListener('click', function (e) { e.preventDefault(); S.abrirEnsayo(a.getAttribute('data-go')); });
        });
        if ('IntersectionObserver' in root) {
            var links = {};
            rootEl.querySelectorAll('.s1-toc a').forEach(function (a) { links[a.getAttribute('data-t')] = a; });
            var io = new IntersectionObserver(function (es) {
                es.forEach(function (en) {
                    if (en.isIntersecting) {
                        Object.keys(links).forEach(function (k) { links[k].classList.remove('is-on'); });
                        var k = en.target.id.replace('s1-t-', '');
                        if (links[k]) links[k].classList.add('is-on');
                    }
                });
            }, { rootMargin: '-15% 0px -70% 0px' });
            rootEl.querySelectorAll('.s1-sec').forEach(function (s) { io.observe(s); });
        }
    }

    /* =========================================================
       Arranque
       ========================================================= */
    S.init = function () {
        var t = $('ms1TeoriaRoot'), e = $('ms1EnsayosRoot');
        if (!t || !e || S._init) return;
        S._init = true;
        t.innerHTML = teoriaHtml();
        bindTeoria(t);
        S.renderEnsayos();
        var tabs = document.querySelectorAll('#pantallaSuelos .tab-btn');
        tabs.forEach(function (b) {
            b.addEventListener('click', function () {
                setTimeout(function () {
                    if (b.getAttribute('data-tab') === 'ms1-ensayos' && S._redrawView) S._redrawView();
                }, 80);
            });
        });
        var rz;
        root.addEventListener('resize', function () {
            clearTimeout(rz);
            rz = setTimeout(function () { if (S.state.ens && S._redrawView) S._redrawView(); }, 180);
        });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', S.init); else S.init();
    S.util = { $: $, esc: esc, fmt: fmt, num: num, val: val, setVal: setVal, field: field, select: select, tiles: tiles, alerts: alerts, errorBox: errorBox, toast: toast, setHtml: setHtml, memSave: memSave };
})(typeof window !== 'undefined' ? window : globalThis);
