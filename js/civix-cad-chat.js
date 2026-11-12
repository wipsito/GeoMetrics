/**
 * Civix CAD — PLANOS DESDE EL CHAT con los mismos diseños de «Planos y CAD».
 * Si el estudiante pide por chat «diseña / dibuja una viga, columna, zapata, muro, losa, escalera, cercha…»,
 * se usa el generador local (cálculo + despiece + cotas + cantidades) en lugar de que la IA dibuje un DXF.
 * Interpreta datos básicos del texto (longitud, sección, cargas, f′c, fy, apoyos…) y completa el resto con valores típicos.
 * Puente y pórtico los atiende civix-cad-struct6.js. Sin IA, sin tokens.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !CAD.struct || CAD.__chatDesign) return; CAD.__chatDesign = true; var S = CAD.struct;
    function norm(s) { s = String(s || '').toLowerCase(); try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { } return s; }
    function nx(m) { return m == null ? NaN : parseFloat(String(m).replace(',', '.')); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    var N = '(\\d+(?:[.,]\\d+)?)';
    function g(q, re, i) { var m = q.match(re); return m ? nx(m[i || 1]) : undefined; }

    /* ---------- tipo de elemento ---------- */
    function classify(q) {
        if (/puente|portico/.test(q)) return null;
        if (/despiece/.test(q) && /columna/.test(q)) return 'despieceColumna';
        if (/despiece/.test(q) && /viga/.test(q)) return 'despieceViga';
        if (/viga/.test(q) && /(acero|metalic|perfil\s*w|\bw\d{3})/.test(q)) return 'aceroViga';
        if (/columna/.test(q) && /(acero|metalic|perfil\s*w)/.test(q)) return 'aceroColumna';
        if (/muro/.test(q) && /(corte|estructural|sismic)/.test(q) && !/contenci/.test(q)) return 'muroCorte';
        if (/muro/.test(q) && /(contenci|voladizo|retenci|sosten)/.test(q)) return 'muroC';
        if (/zapata/.test(q) && /combinad/.test(q)) return 'zapataComb';
        if (/zapata/.test(q) && /(corrida|bajo muro|continua)/.test(q)) return 'zapataCorr';
        if (/pilote|pilotes|pilotaje|pilotaje/.test(q)) return 'pilote';
        if (/zapata|cimentacion|cimiento/.test(q)) return 'zapata';
        if (/losa/.test(q) && /(nervad|aligerad|casetonad|reticular)/.test(q)) return 'losaNerv';
        if (/losa/.test(q) && /(dos direcciones|2 direcciones|bidireccional|dos sentidos)/.test(q)) return 'losa2d';
        if (/losa/.test(q)) return 'losa';
        if (/escalera|gradas/.test(q)) return 'escalera';
        if (/cercha|armadura de techo|truss/.test(q)) return /pratt|howe/.test(q) ? 'cerchaPH' : (/warren/.test(q) ? 'cercha' : 'cerchaPH');
        if (/columna/.test(q) && /(flexocompres|interaccion|momento)/.test(q)) return 'columnaFlex';
        if (/columna/.test(q) && /(circular|espiral|redonda|zuncho)/.test(q)) return 'columnaC';
        if (/columna/.test(q)) return 'columna';
        if (/viga/.test(q) && /viga\s*(?:en\s*)?[tl]\b|seccion\s*[tl]\b/.test(q)) return 'vigaT';
        if (/viga/.test(q) && /(voladizo|ménsula|mensula|cantilever|empotrad|articulad|rodillo|biempotr)/.test(q) && !/continua/.test(q)) return 'vigaApoyos';
        if (/viga/.test(q) && /(continua|\d\s*tramos|dos tramos|tres tramos)/.test(q)) return 'vigaCont';
        if (/viga|vigueta/.test(q)) return 'viga';
        return null;
    }

    /* ---------- datos del texto ---------- */
    function section(q) { // b×h → mm
        var m = q.match(new RegExp(N + '\\s*[x×]\\s*' + N + '(?:\\s*[x×]\\s*' + N + ')?\\s*(mm|cm|m\\b)?'));
        if (!m) return null; var a = nx(m[1]), b = nx(m[2]), u = m[4], k = u === 'mm' ? 1 : (u === 'cm' ? 10 : (u === 'm' ? 1000 : (Math.max(a, b) <= 3 ? 1000 : (Math.max(a, b) <= 150 ? 10 : 1))));
        return { a: a * k, b: b * k, raw: m[0], c: m[3] ? nx(m[3]) * k : null, hasM: u === 'm' };
    }
    function parse(q, type) {
        var o = {}, sec = section(q), q2 = sec ? q.replace(sec.raw, ' ') : q, m, v;
        var L = g(q2, new RegExp('(?:luz|longitud|largo|tramo)\\s*(?:total\\s*)?(?:de|=|:)?\\s*' + N)) || g(q2, new RegExp(N + '\\s*(?:m|metros?)\\s*(?:de\\s*)?(?:luz|longitud|largo)')) || g(q2, new RegExp('(?:de|con|=)\\s*' + N + '\\s*(?:m|metros?)\\b')) || g(q2, new RegExp(N + '\\s*(?:m|metros?)\\b'));
        var wD = g(q2, new RegExp('carga\\s*muerta\\s*(?:de|=|:)?\\s*' + N)), wL = g(q2, new RegExp('carga\\s*viva\\s*(?:de|=|:)?\\s*' + N)), wT = g(q2, new RegExp('(?:carga|q|w)\\s*(?:distribuida|uniforme|total)?\\s*(?:de|=|:)?\\s*' + N + '\\s*kn\\s*/\\s*m(?![²2])'));
        if (wT == null) wT = g(q2, new RegExp(N + '\\s*kn\\s*/\\s*m(?![²2])'));
        var fc = g(q, /f['’´]?c\s*(?:=|de|:)?\s*(\d+)/), fy = g(q, /\bfy\s*(?:=|de|:)?\s*(\d+)/), H = g(q2, new RegExp('altura\\s*(?:libre|total|del vastago|de)?\\s*(?:=|:)?\\s*' + N)) || g(q2, new RegExp(N + '\\s*(?:m|metros?)\\s*de\\s*altura'));
        var P = g(q2, new RegExp('(?:carga|pu|p|axial|carga axial|para)\\s*(?:de|=|:)?\\s*' + N + '\\s*(?:kn|kilonewtons?)\\b')), tonP = g(q2, new RegExp('(?:carga|pu|p)\\s*(?:de|=|:)?\\s*' + N + '\\s*(?:ton|t)\\b'));
        if (P == null && tonP != null) P = tonP * 9.81;
        var qa = g(q2, new RegExp('(?:qadm|capacidad portante|esfuerzo admisible)\\s*(?:de|=|:)?\\s*' + N + '\\s*kpa')); if (qa == null) { v = g(q2, new RegExp('(?:qadm|capacidad portante|esfuerzo admisible)\\s*(?:de|=|:)?\\s*' + N + '\\s*(?:kg\\s*/\\s*cm)')); if (v != null) qa = v * 98; }
        if (fc && [17, 21, 24, 28, 35, 42].indexOf(fc) >= 0) o.fc = fc; if (fy && [240, 420, 500].indexOf(fy) >= 0) o.fy = fy;
        switch (type) {
            case 'viga': case 'despieceViga': case 'vigaApoyos': case 'vigaT': case 'vigaCont': case 'aceroViga':
                if (L) { if (type === 'vigaCont') { o.L1 = o.L2 = o.L3 = L; } else o.L = L; }
                if (sec && type !== 'aceroViga') { if (type === 'vigaT') { o.bw = sec.a; o.h = sec.b; } else { o.b = sec.a; o.h = sec.b; } }
                if (wD != null) o.wD = wD; if (wL != null) o.wL = wL; if (wT != null && wD == null && wL == null) { o.wD = wT; o.wL = 0; o.__tot = wT; }
                if (type === 'vigaCont') { m = q.match(/(\d)\s*tramos/); o.n = (m && +m[1] === 3) || /tres tramos/.test(q) ? 3 : 2; }
                if (type === 'vigaT') o.tipo = /viga\s*(?:en\s*)?l\b/.test(q) ? 2 : 1;
                if (type === 'vigaApoyos') {
                    var sl = 1, sr = 2;
                    if (/biempotr|ambos extremos empotrad|doblemente empotrad|empotrad[ao]\s*(?:y|-|en)\s*empotrad|empotrad[ao]s?\s*en\s*ambos/.test(q)) { sl = 3; sr = 3; }
                    else if (/voladizo|cantilever|mensula|empotrad[ao]\s*(?:y|-|con)\s*libre/.test(q)) { sl = 3; sr = 4; }
                    else if (/empotrad/.test(q)) { sl = 3; sr = /rodillo/.test(q) ? 2 : 1; }
                    else if (/pasador\s*(?:y|-|con)\s*rodillo|articulad[ao]\s*(?:y|-|con)\s*rodillo/.test(q)) { sl = 1; sr = 2; }
                    else if (/articulad[ao]s?\s*(?:en\s*)?(?:ambos|y articulad)/.test(q)) { sl = 1; sr = 1; }
                    o.sl = sl; o.sr = sr;
                }
                if (type === 'aceroViga' && wT != null && wD == null && wL == null) { o.wD = wT * 0.5; o.wL = wT * 0.5; }
                break;
            case 'columna': case 'despieceColumna': case 'columnaFlex': if (P != null) o.Pu = P; if (sec) { o.b = sec.a; o.h = sec.b; } if (H) o.Lu = H; else if (L) o.Lu = L; if (type === 'columnaFlex') { var Mu = g(q2, new RegExp('(?:mu|momento)\\s*(?:de|=|:)?\\s*' + N)); if (Mu != null) o.Mu = Mu; } break;
            case 'columnaC': if (P != null) o.Pu = P; if ((m = q.match(new RegExp('diametro\\s*(?:de|=)?\\s*' + N + '\\s*(mm|cm|m\\b)?')))) { var d = nx(m[1]), u = m[2]; o.D = d * (u === 'mm' ? 1 : (u === 'cm' ? 10 : (u === 'm' ? 1000 : (d <= 3 ? 1000 : (d <= 150 ? 10 : 1))))); } if (H) o.Lu = H; break;
            case 'zapata': if (P != null) o.P = P; if (qa != null) o.qadm = qa; if (sec) { o.c1 = sec.a; o.c2 = sec.b; } if ((v = g(q2, new RegExp('(?:profundidad|df|desplante)\\s*(?:de|=)?\\s*' + N)))) o.Df = v; break;
            case 'zapataComb': if (qa != null) o.qadm = qa; break;
            case 'zapataCorr': if (qa != null) o.qadm = qa; if (P != null) o.P = P; break;
            case 'muroC': if (H) o.H = H; else if (L) o.H = L; if (qa != null) o.qadm = qa; if ((v = g(q2, new RegExp('(?:phi|φ|friccion)\\s*(?:de|=)?\\s*' + N)))) o.phi = v; if ((v = g(q2, new RegExp('sobrecarga\\s*(?:de|=)?\\s*' + N)))) o.q = v; break;
            case 'muroCorte': if (H) o.hw = H; if ((v = g(q2, new RegExp('longitud\\s*(?:de|=)?\\s*' + N)))) o.Lw = v; break;
            case 'losa': case 'losa2d': case 'losaNerv': {
                var p2 = q.match(new RegExp(N + '\\s*[x×]\\s*' + N + '\\s*(?:m\\b|metros?)?')); if (p2) { var a1 = nx(p2[1]), a2 = nx(p2[2]); if (a1 < 40 && a2 < 40) { if (type === 'losaNerv') { o.L = Math.max(a1, a2); o.Ly = Math.min(a1, a2); } else { o.Lx = Math.min(a1, a2); o.Ly = Math.max(a1, a2); } } }
                if (wL != null) o.wL = wL; break; }
            case 'escalera': if (H) o.H = H; else if (L) o.H = L; if ((v = g(q2, new RegExp('ancho\\s*(?:de|=)?\\s*' + N)))) o.b = v; break;
            case 'cercha': case 'cerchaPH': if (L) o.L = L; if ((v = g(q2, new RegExp('altura\\s*(?:de|=)?\\s*' + N)))) o.h = v; if ((m = q.match(/(\d+)\s*paneles/))) o.n = +m[1]; if (type === 'cerchaPH') o.tipo = /howe/.test(q) ? 2 : 1; if ((v = g(q2, new RegExp('(?:carga|p)\\s*(?:por nudo|de)?\\s*(?:=)?\\s*' + N + '\\s*kn')))) o.P = v; break;
            case 'pilote': if (P != null) o.P = P; if (L) o.L = L; if ((m = q.match(/(\d)\s*pilotes/))) o.n = +m[1] === 2 ? 2 : 4;
                { var dm = q.match(new RegExp(N + '\\s*(mm|cm|m)\\b\\s*de\\s*diametro')) || q.match(new RegExp('diametro\\s*(?:de|=)?\\s*' + N + '\\s*(mm|cm|m)?')); if (dm) { var dd = nx(dm[1]), du = dm[2]; o.D = Math.round(dd * (du === 'mm' ? 1 : (du === 'cm' ? 10 : (du === 'm' ? 1000 : (dd <= 3 ? 1000 : (dd <= 150 ? 10 : 1)))))); }
                  var sp = q.match(new RegExp('separacion\\s*(?:entre\\s*(?:ejes|pilotes)\\s*)?(?:de|=)?\\s*' + N + '\\s*(mm|cm|m)?')); if (sp) { var sv = nx(sp[1]), su = sp[2], smm = sv * (su === 'mm' ? 1 : (su === 'cm' ? 10 : (su === 'm' ? 1000 : (sv <= 10 ? 1000 : 10)))); var Dn = o.D || 400; o.sD = Math.max(2, Math.min(6, Math.round(smm / Dn * 100) / 100)); } }
                break;
            case 'aceroColumna': if (P != null) o.Pu = P; if (H || L) o.KL = H || L; break;
        }
        return o;
    }
    var NAMES = { viga: 'viga simplemente apoyada', vigaApoyos: 'viga con apoyos a elección', vigaCont: 'viga continua', vigaT: 'viga T/L', despieceViga: 'despiece de viga', columna: 'columna rectangular', columnaC: 'columna circular (espiral)', columnaFlex: 'columna en flexocompresión', despieceColumna: 'despiece de columna', zapata: 'zapata aislada', zapataComb: 'zapata combinada', zapataCorr: 'zapata corrida', pilote: 'cimentación con pilotes', muroC: 'muro de contención', muroCorte: 'muro de corte', losa: 'losa maciza', losa2d: 'losa en dos direcciones', losaNerv: 'losa nervada', escalera: 'escalera de concreto', cercha: 'cercha Warren', cerchaPH: 'cercha Pratt/Howe', aceroViga: 'viga de acero', aceroColumna: 'columna de acero' };
    var SUPN = { 1: 'articulado', 2: 'rodillo', 3: 'empotrado', 4: 'libre' };
    function used(o) { var out = [], k; for (k in o) { if (k[0] === '_' || o[k] == null) continue; out.push(k + ' = ' + (k === 'sl' || k === 'sr' ? SUPN[o[k]] : o[k])); } return out.join(' · '); }
    function qtyHtml(q) { if (!q || !q.items || !q.items.length) return ''; return '<table class="cxp-tbl"><thead><tr><th>Concepto</th><th>Cantidad</th><th>Peso / dato</th></tr></thead><tbody>' + q.items.map(function (r) { return '<tr' + (/TOTAL/.test(r[0]) ? ' class="tot"' : '') + '><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>'; }

    function card(type, o, r, texto) {
        var chat = document.getElementById('chatMensajes'); if (!chat) return false; var nm = type + '_civix', name = NAMES[type];
        var c = el('div', 'mensaje mensaje-bot mensaje-bot-rich cx-card'); chat.appendChild(c);
        var d = el('div', 'civix-md', '📐 Diseñé ' + (/^(muroC|muroCorte|despieceViga|despieceColumna)$/.test(type) ? 'un' : 'una') + ' <b>' + esc(name) + '</b> con el generador de <b>Planos y CAD</b> (cálculo + armado + cotas + cantidades, todo en tu navegador y sin gastar tokens).<br><small>Datos usados: ' + (esc(used(o)) || 'valores típicos') + '. Lo que no indicaste se completó con valores típicos' + (o.__tot ? '; la carga de ' + o.__tot + ' kN/m se tomó como carga muerta de servicio' : '') + '. Puedes cambiarlos en <b>Planos y CAD → Diseño estructural</b>.</small>');
        c.appendChild(d); (r.warns || []).forEach(function (w) { c.appendChild(el('p', 'cxp-warn', '⚠ ' + esc(w))); });
        var bar = el('div', 'cxs-row'), host = el('div', 'cx-box'); c.appendChild(bar); c.appendChild(host);
        CAD.viewer(host, r.model, { name: nm, extra: 'Dibujo en metros · varillas en pulgadas · el botón <b>⬇ DXF</b> descarga el plano para AutoCAD / Civil 3D.' });
        function btn(label, fn) { var x = el('button', 'cx-btn', label); x.type = 'button'; x.style.marginRight = '6px'; x.addEventListener('click', function () { try { fn(x); } catch (e) { x.textContent = '⚠ ' + (e.message || 'error'); } }); bar.appendChild(x); }
        btn('⬇ Descargar DXF', function () { CAD.download(nm + '.dxf', new Blob([CAD.writeDXF(r.model)], { type: 'application/dxf' })); });
        btn('⬇ Memoria .pdf', function () { CAD.download(nm + '_memoria.pdf', S.memoPDF(r.memo, 'MEMORIA DE CALCULO — ' + name.toUpperCase())); });
        btn('📄 Lámina PDF', function (x) { var m = S.lamina(r, { titulo: name.toUpperCase() }); CAD.exportRaster(m, 'pdf', nm + '_lamina'); x.textContent = '📄 Lámina PDF ✓'; });
        btn('🛠 Editar en Planos y CAD', function () { if (typeof civixShowView === 'function') civixShowView('cad'); });
        if (r.qty) { var qd = el('details', 'cxp-memo'); qd.open = true; qd.innerHTML = '<summary>Cantidades de obra</summary>' + qtyHtml(r.qty); c.appendChild(qd); }
        var memo = el('details', 'cxp-memo'); memo.innerHTML = '<summary>Memoria de cálculo</summary><pre>' + esc(r.memo.join('\n')) + '</pre>'; c.appendChild(memo);
        try { if (typeof chatHistory !== 'undefined') { chatHistory.push({ role: 'user', content: texto }); chatHistory.push({ role: 'assistant', content: 'Diseñé una ' + name + ' con el generador local de Planos y CAD (datos: ' + used(o) + '). ' + r.memo.slice(1, 9).join(' · ').slice(0, 800) }); } if (typeof civixGuardarConversacionActual === 'function') civixGuardarConversacionActual(); } catch (e) { }
        chat.scrollTop = chat.scrollHeight; return true;
    }

    var prevSend = CAD.onSend;
    CAD.onSend = function (texto, adj) {
        try {
            var q = norm(texto);
            /* también pedidos cortos sin verbo: «zapata combinada», «cercha de 12 m», «muro de contencion 3 m» */
            var corto = q && q.trim().split(/\s+/).length <= 7 && !/[?¿]/.test(q);
            if (q && !adj && (/dise[nñ]|dibuj|calcul|predimension|\bhaz\b|hazme|genera|crea\b|elabora|dame|quiero|necesito|plano|dxf|despiece|armado|detalle|esquema|muestrame|muestra/.test(q) || corto) && !/^(que es|que son|como funciona|cual es|por que|explica|define)/.test(q.trim())) {
                var type = classify(q);
                if (type && typeof S[type] === 'function') {
                    var o = parse(q, type), clean = {}, k; for (k in o) if (k[0] !== '_') clean[k] = o[k];
                    var r = S[type](clean);
                    if (r && r.ok && r.model) { if (card(type, o, r, texto)) return true; }
                    else if (r && r.warns && r.warns.length) {
                        var chat = document.getElementById('chatMensajes');
                        if (chat) { var c = el('div', 'mensaje mensaje-bot mensaje-bot-rich cx-card'); c.innerHTML = '<div class="civix-md">⚠️ No pude diseñar la <b>' + esc(NAMES[type]) + '</b> con esos datos (' + esc(used(o) || 'valores típicos') + '):<br>' + r.warns.map(esc).join('<br>') + '<br><small>Ajusta las dimensiones o cargas e inténtalo de nuevo, o usa <b>Planos y CAD → Diseño estructural</b>.</small></div>'; chat.appendChild(c); chat.scrollTop = chat.scrollHeight; try { if (typeof chatHistory !== 'undefined') { chatHistory.push({ role: 'user', content: texto }); chatHistory.push({ role: 'assistant', content: 'No pude diseñar con esos datos: ' + r.warns.join(' ') }); } } catch (e) { } return true; }
                    }
                }
            }
        } catch (e) { try { console.warn('CivixCAD chat diseño', e); } catch (e2) { } }
        try {
            var q2 = norm(texto);
            if (q2 && !adj && /dibuj|plano|dxf|despiece|planta|elevacion|corte/.test(q2) && !/\[nivel de detalle/.test(q2) && !/^(que es|que son|como funciona|cual es|por que|explica|define)/.test(q2.trim())) {
                texto = texto + '\n[Nivel de detalle del plano: entrégalo como los planos de Planos y CAD — unidades en metros, varillas en pulgadas, capas EJES/CONTORNO/ARMADURA/COTAS/TEXTO/MARCO, cotas lineales azules (capa COTAS) con todas las dimensiones y la separación entre barras o estribos consecutivos, secciones con armado, cuadro de acero (marca, barra, cantidad, longitud, peso), cajetín y marco.]';
                arguments[0] = texto;
            }
        } catch (e3) { }
        return prevSend ? prevSend.apply(this, arguments) : false;
    };
    CAD.chatDesign = { classify: classify, parse: parse };
})(typeof window !== 'undefined' ? window : globalThis);
