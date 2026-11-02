/* =========================================================
   GeoMetrics — Herramientas de Civix: Calculadora científica
   y Conversor de unidades de ingeniería (sin IA, 100 % local)
   Se abren como ventana desde cualquier botón con data-tool="calc" | "conv"
   ========================================================= */
(function () {
    'use strict';

    /* ───────────── Evaluador seguro de expresiones ───────────── */
    var FUN = {
        sin: 'trig', cos: 'trig', tan: 'trig', asin: 'atrig', acos: 'atrig', atan: 'atrig',
        sqrt: Math.sqrt, cbrt: Math.cbrt, ln: Math.log, log: Math.log10, exp: Math.exp, abs: Math.abs
    };
    var state = { deg: true, ans: 0 };

    function fact(n) {
        if (n < 0 || Math.floor(n) !== n || n > 170) throw new Error('n! solo para enteros 0–170');
        var r = 1; for (var i = 2; i <= n; i++) r *= i; return r;
    }

    function evaluar(src) {
        var s = String(src).toLowerCase()
            .replace(/×|·/g, '*').replace(/÷/g, '/').replace(/−|–/g, '-')
            .replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/,/g, '.').replace(/\s+/g, '');
        var pos = 0;
        function peek() { return s.charAt(pos); }
        function num() {
            var m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(pos));
            if (!m) return null;
            // evitar confundir "2e" (constante e) con notación científica
            pos += m[0].length;
            return parseFloat(m[0]);
        }
        function expr() {
            var v = term();
            while (peek() === '+' || peek() === '-') {
                var op = s.charAt(pos++);
                var r = term();
                v = op === '+' ? v + r : v - r;
            }
            return v;
        }
        function term() {
            var v = unario();
            for (;;) {
                var c = peek();
                if (c === '*' || c === '/') {
                    pos++;
                    var r = unario();
                    if (c === '/' && r === 0) throw new Error('División entre cero');
                    v = c === '*' ? v * r : v / r;
                } else if (c && (/[0-9.(a-z]/.test(c))) {
                    v = v * potencia();            // multiplicación implícita: 2π, 3(4), 2sin(x)
                } else break;
            }
            return v;
        }
        function unario() {
            if (peek() === '-') { pos++; return -unario(); }
            if (peek() === '+') { pos++; return unario(); }
            return potencia();
        }
        function potencia() {
            var b = postfijo();
            if (peek() === '^') {
                pos++;
                var e = unario();                    // asociativa a la derecha
                return Math.pow(b, e);
            }
            return b;
        }
        function postfijo() {
            var v = primario();
            for (;;) {
                if (peek() === '!') { pos++; v = fact(v); }
                else if (peek() === '%') { pos++; v = v / 100; }
                else break;
            }
            return v;
        }
        function primario() {
            var c = peek();
            if (c === '(') {
                pos++;
                var v = expr();
                if (peek() !== ')') throw new Error('Falta cerrar un paréntesis');
                pos++;
                return v;
            }
            var n = num();
            if (n !== null) return n;
            var m = /^[a-z]+/.exec(s.slice(pos));
            if (m) {
                var id = m[0];
                if (id.indexOf('pi') === 0) { pos += 2; return Math.PI; }
                if (id.indexOf('ans') === 0) { pos += 3; return state.ans; }
                // e (constante) o función
                var fname = null;
                Object.keys(FUN).forEach(function (k) { if (id.indexOf(k) === 0 && (!fname || k.length > fname.length)) fname = k; });
                if (fname) {
                    pos += fname.length;
                    var arg;
                    if (peek() === '(') { pos++; arg = expr(); if (peek() !== ')') throw new Error('Falta cerrar un paréntesis'); pos++; }
                    else arg = potencia();
                    return aplicar(fname, arg);
                }
                if (id.charAt(0) === 'e') { pos += 1; return Math.E; }
                throw new Error('No entiendo “' + id + '”');
            }
            throw new Error(c ? 'Símbolo inesperado “' + c + '”' : 'Expresión incompleta');
        }
        function aplicar(f, x) {
            var t = FUN[f];
            if (t === 'trig') {
                var r = state.deg ? x * Math.PI / 180 : x;
                if (f === 'tan' && state.deg && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-12) throw new Error('tan indefinida');
                var y = Math[f](r);
                return Math.abs(y) < 1e-15 ? 0 : y;
            }
            if (t === 'atrig') {
                if ((f === 'asin' || f === 'acos') && Math.abs(x) > 1) throw new Error('Dominio inválido');
                var a = Math[f](x);
                return state.deg ? a * 180 / Math.PI : a;
            }
            if ((f === 'ln' || f === 'log') && x <= 0) throw new Error('El logaritmo requiere un valor positivo');
            if (f === 'sqrt' && x < 0) throw new Error('Raíz de un número negativo');
            return t(x);
        }
        if (!s) throw new Error('');
        var res = expr();
        if (pos < s.length) throw new Error('Símbolo inesperado “' + s.charAt(pos) + '”');
        if (!isFinite(res)) throw new Error('Resultado fuera de rango');
        return res;
    }

    function fmt(v, dig) {
        dig = dig || 12;
        if (v === 0) return '0';
        var a = Math.abs(v);
        if (a >= 1e12 || a < 1e-6) {
            return v.toExponential(Math.min(dig - 1, 8)).replace(/\.?0+e/, 'e').replace('e+', '×10^').replace('e-', '×10^-').replace('e', '×10^');
        }
        var r = parseFloat(v.toPrecision(dig));
        var txt = r.toLocaleString('es-CO', { maximumFractionDigits: 10 });
        return txt;
    }
    function fmtPlano(v) {      // para copiar / reutilizar en expresiones
        if (v === 0) return '0';
        return String(parseFloat(v.toPrecision(12)));
    }

    /* ───────────── Datos del conversor ───────────── */
    var CATS = [
        { id: 'presion', n: 'Presión / Esfuerzo', i: '🧱', b: 'Pa', u: [
            ['Pa', 1], ['kPa', 1e3], ['MPa', 1e6], ['GPa', 1e9], ['bar', 1e5], ['atm', 101325],
            ['kgf/cm²', 98066.5], ['kgf/m²', 9.80665], ['tf/m²', 9806.65], ['psi', 6894.757293168],
            ['ksi', 6894757.293168], ['mmHg', 133.322387415]], def: ['kgf/cm²', 'kPa'] },
        { id: 'fuerza', n: 'Fuerza / Carga', i: '⬇️', b: 'N', u: [
            ['N', 1], ['kN', 1e3], ['MN', 1e6], ['kgf', 9.80665], ['tf', 9806.65],
            ['lbf', 4.4482216152605], ['kip', 4448.2216152605]], def: ['kN', 'kgf'] },
        { id: 'momento', n: 'Momento', i: '🔄', b: 'N·m', u: [
            ['N·m', 1], ['kN·m', 1e3], ['kgf·m', 9.80665], ['tf·m', 9806.65],
            ['kip·ft', 1355.8179483], ['lbf·ft', 1.3558179483], ['lbf·in', 0.112984829]], def: ['kN·m', 'tf·m'] },
        { id: 'lineal', n: 'Carga distribuida', i: '📏', b: 'N/m', u: [
            ['N/m', 1], ['kN/m', 1e3], ['kgf/m', 9.80665], ['tf/m', 9806.65],
            ['kip/ft', 14593.9029], ['lbf/ft', 14.5939029]], def: ['kN/m', 'kgf/m'] },
        { id: 'longitud', n: 'Longitud', i: '↔️', b: 'm', u: [
            ['mm', 1e-3], ['cm', 1e-2], ['m', 1], ['km', 1e3], ['in', 0.0254], ['ft', 0.3048],
            ['yd', 0.9144], ['mi', 1609.344]], def: ['m', 'ft'] },
        { id: 'area', n: 'Área', i: '⬛', b: 'm²', u: [
            ['mm²', 1e-6], ['cm²', 1e-4], ['m²', 1], ['ha', 1e4], ['km²', 1e6], ['in²', 6.4516e-4],
            ['ft²', 0.09290304]], def: ['m²', 'ft²'] },
        { id: 'volumen', n: 'Volumen', i: '🧊', b: 'm³', u: [
            ['mm³', 1e-9], ['cm³', 1e-6], ['L', 1e-3], ['m³', 1], ['in³', 1.6387064e-5],
            ['ft³', 0.028316846592], ['gal (US)', 0.003785411784]], def: ['m³', 'L'] },
        { id: 'masa', n: 'Masa', i: '⚖️', b: 'kg', u: [
            ['g', 1e-3], ['kg', 1], ['t', 1e3], ['lb', 0.45359237], ['oz', 0.028349523125],
            ['ton corta', 907.18474]], def: ['kg', 'lb'] },
        { id: 'pesoesp', n: 'Peso unitario (γ)', i: '🪨', b: 'N/m³', u: [
            ['N/m³', 1], ['kN/m³', 1e3], ['kgf/m³', 9.80665], ['tf/m³', 9806.65],
            ['lbf/ft³ (pcf)', 157.087464]], def: ['kN/m³', 'tf/m³'] },
        { id: 'densidad', n: 'Densidad (ρ)', i: '💧', b: 'kg/m³', u: [
            ['kg/m³', 1], ['g/cm³', 1e3], ['t/m³', 1e3], ['lb/ft³', 16.01846337], ['lb/in³', 27679.9047]], def: ['g/cm³', 'kg/m³'] },
        { id: 'caudal', n: 'Caudal', i: '🌊', b: 'm³/s', u: [
            ['m³/s', 1], ['L/s', 1e-3], ['m³/h', 1 / 3600], ['L/min', 1 / 60000],
            ['gal/min', 6.30901964e-5], ['ft³/s', 0.028316846592]], def: ['L/s', 'm³/h'] },
        { id: 'angulo', n: 'Ángulo', i: '📐', b: 'rad', u: [
            ['grados (°)', Math.PI / 180], ['radianes', 1], ['gradianes', Math.PI / 200]], def: ['grados (°)', 'radianes'] },
        { id: 'temp', n: 'Temperatura', i: '🌡️', special: true, u: [['°C'], ['°F'], ['K']], def: ['°C', '°F'] }
    ];
    var PRESETS = [
        ['kgf/cm² → kPa', 'presion', 'kgf/cm²', 'kPa', 2.5],
        ['psi → MPa', 'presion', 'psi', 'MPa', 3000],
        ['kN → kgf', 'fuerza', 'kN', 'kgf', 100],
        ['tf·m → kN·m', 'momento', 'tf·m', 'kN·m', 12],
        ['kN/m³ → tf/m³', 'pesoesp', 'kN/m³', 'tf/m³', 18.5],
        ['ft → m', 'longitud', 'ft', 'm', 30]
    ];

    function convertir(cat, v, from, to) {
        if (cat.special) {
            var c;
            if (from === '°C') c = v; else if (from === '°F') c = (v - 32) * 5 / 9; else c = v - 273.15;
            if (to === '°C') return c; if (to === '°F') return c * 9 / 5 + 32; return c + 273.15;
        }
        var f = cat.u.filter(function (x) { return x[0] === from; })[0][1];
        var t = cat.u.filter(function (x) { return x[0] === to; })[0][1];
        return v * f / t;
    }

    /* ───────────── UI ───────────── */
    var overlay = null, hist = [];

    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        return e;
    }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function cerrar() {
        if (overlay) { overlay.remove(); overlay = null; }
        document.removeEventListener('keydown', onKeyGlobal, true);
        document.body.classList.remove('cvx-open');
    }
    function onKeyGlobal(e) { if (e.key === 'Escape') cerrar(); }

    function abrir(tab) {
        cerrar();
        overlay = el('div', 'cvx-overlay');
        var win = el('div', 'cvx-win');
        win.setAttribute('role', 'dialog');
        var head = el('div', 'cvx-head');
        var tabs = el('div', 'cvx-tabs');
        var bCalc = el('button', 'cvx-tab', '🧮 Calculadora');
        var bConv = el('button', 'cvx-tab', '↔️ Conversor');
        bCalc.type = bConv.type = 'button';
        tabs.appendChild(bCalc); tabs.appendChild(bConv);
        var x = el('button', 'cvx-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
        x.onclick = cerrar;
        head.appendChild(tabs); head.appendChild(x);
        var body = el('div', 'cvx-body');
        win.appendChild(head); win.appendChild(body);
        overlay.appendChild(win);
        overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) cerrar(); });
        document.body.appendChild(overlay);
        document.body.classList.add('cvx-open');
        document.addEventListener('keydown', onKeyGlobal, true);

        function show(t) {
            bCalc.classList.toggle('on', t === 'calc');
            bConv.classList.toggle('on', t === 'conv');
            body.innerHTML = '';
            if (t === 'calc') construirCalc(body); else construirConv(body);
        }
        bCalc.onclick = function () { show('calc'); };
        bConv.onclick = function () { show('conv'); };
        show(tab === 'conv' ? 'conv' : 'calc');
    }

    /* ───── Calculadora ───── */
    function construirCalc(root) {
        var wrap = el('div', 'cvx-calc');
        var main = el('div', 'cvx-calc-main');
        var screen = el('div', 'cvx-screen');
        var inp = el('input', 'cvx-expr');
        inp.type = 'text'; inp.placeholder = 'Escribe: 3.5*(2+4)^2 / sqrt(9) …';
        inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('inputmode', 'none');
        var live = el('div', 'cvx-live', '0');
        var err = el('div', 'cvx-err', '');
        screen.appendChild(inp); screen.appendChild(live); screen.appendChild(err);
        main.appendChild(screen);

        var bar = el('div', 'cvx-calcbar');
        var degBtn = el('button', 'cvx-pill', state.deg ? 'DEG' : 'RAD'); degBtn.type = 'button';
        degBtn.title = 'Alternar grados / radianes';
        var cpy = el('button', 'cvx-pill', '📋 Copiar'); cpy.type = 'button';
        var ask = el('button', 'cvx-pill cvx-pill-ai', '💬 Explicar con Civix'); ask.type = 'button';
        bar.appendChild(degBtn); bar.appendChild(cpy); bar.appendChild(ask);
        main.appendChild(bar);

        var keys = [
            ['sin(', 'sin', 'fn'], ['cos(', 'cos', 'fn'], ['tan(', 'tan', 'fn'], ['^', 'xʸ', 'fn'], ['AC', 'AC', 'danger'], ['DEL', '⌫', 'danger'],
            ['asin(', 'sin⁻¹', 'fn'], ['acos(', 'cos⁻¹', 'fn'], ['atan(', 'tan⁻¹', 'fn'], ['sqrt(', '√', 'fn'], ['(', '(', 'op'], [')', ')', 'op'],
            ['ln(', 'ln', 'fn'], ['log(', 'log', 'fn'], ['exp(', 'eˣ', 'fn'], ['^2', 'x²', 'fn'], ['!', 'n!', 'fn'], ['/', '÷', 'op'],
            ['7', '7', 'n'], ['8', '8', 'n'], ['9', '9', 'n'], ['pi', 'π', 'fn'], ['e', 'e', 'fn'], ['*', '×', 'op'],
            ['4', '4', 'n'], ['5', '5', 'n'], ['6', '6', 'n'], ['ans', 'Ans', 'fn'], ['%', '%', 'fn'], ['-', '−', 'op'],
            ['1', '1', 'n'], ['2', '2', 'n'], ['3', '3', 'n'], ['0', '0', 'n'], ['.', '.', 'n'], ['+', '+', 'op'],
            ['E', '×10ˣ', 'fn'], ['1/(', '1/x', 'fn'], ['=', '=', 'eq']
        ];
        var grid = el('div', 'cvx-keys');
        keys.forEach(function (k) {
            var b = el('button', 'cvx-key cvx-' + k[2], esc(k[1])); b.type = 'button';
            if (k[0] === '=') b.style.gridColumn = 'span 4';
            b.addEventListener('click', function () { tecla(k[0]); inp.focus(); });
            grid.appendChild(b);
        });
        main.appendChild(grid);

        var side = el('div', 'cvx-calc-side');
        side.appendChild(el('h4', '', '🕘 Historial'));
        var list = el('div', 'cvx-hist');
        side.appendChild(list);
        var clr = el('button', 'cvx-pill', 'Borrar historial'); clr.type = 'button';
        side.appendChild(clr);
        wrap.appendChild(main); wrap.appendChild(side);
        root.appendChild(wrap);

        function pintarHist() {
            list.innerHTML = '';
            if (!hist.length) { list.appendChild(el('p', 'cvx-empty', 'Aquí aparecerán tus cálculos. Toca uno para reutilizarlo.')); return; }
            hist.slice().reverse().forEach(function (h) {
                var d = el('button', 'cvx-h'); d.type = 'button';
                d.innerHTML = '<span>' + esc(h.e) + '</span><b>= ' + esc(fmt(h.r)) + '</b>';
                d.onclick = function () { inp.value = fmtPlano(h.r); previsualizar(); inp.focus(); };
                list.appendChild(d);
            });
        }
        function previsualizar() {
            err.textContent = '';
            if (!inp.value.trim()) { live.textContent = '0'; return; }
            try { live.textContent = fmt(evaluar(inp.value)); live.classList.remove('bad'); }
            catch (e) { live.classList.add('bad'); err.textContent = e.message; }
        }
        function igual() {
            if (!inp.value.trim()) return;
            try {
                var r = evaluar(inp.value);
                hist.push({ e: inp.value, r: r });
                if (hist.length > 40) hist.shift();
                state.ans = r;
                live.textContent = fmt(r); live.classList.remove('bad'); err.textContent = '';
                inp.value = fmtPlano(r);
                pintarHist();
            } catch (e) { live.classList.add('bad'); err.textContent = e.message || 'Revisa la expresión'; }
        }
        function tecla(t) {
            var i = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
            var j = inp.selectionEnd == null ? i : inp.selectionEnd;
            if (t === 'AC') { inp.value = ''; previsualizar(); return; }
            if (t === '=') { igual(); return; }
            if (t === 'DEL') {
                if (i === j && i > 0) { inp.value = inp.value.slice(0, i - 1) + inp.value.slice(j); i--; }
                else inp.value = inp.value.slice(0, i) + inp.value.slice(j);
                inp.setSelectionRange(i, i); previsualizar(); return;
            }
            if (t === 'E') t = 'e'; // notación científica: 3e5
            inp.value = inp.value.slice(0, i) + t + inp.value.slice(j);
            inp.setSelectionRange(i + t.length, i + t.length);
            previsualizar();
        }
        inp.addEventListener('input', previsualizar);
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); igual(); }
        });
        degBtn.onclick = function () { state.deg = !state.deg; degBtn.textContent = state.deg ? 'DEG' : 'RAD'; previsualizar(); inp.focus(); };
        cpy.onclick = function () {
            var t = live.classList.contains('bad') ? '' : fmtPlano((function () { try { return evaluar(inp.value || '0'); } catch (e) { return 0; } })());
            copiar(t, cpy);
        };
        ask.onclick = function () {
            var q = 'Explícame paso a paso cómo se resuelve: ' + (inp.value || (hist.length ? hist[hist.length - 1].e : '')) + ' (ingeniería civil)';
            cerrar(); enviarAlChat(q);
        };
        clr.onclick = function () { hist = []; pintarHist(); };
        pintarHist(); previsualizar();
        setTimeout(function () { inp.focus(); }, 30);
    }

    /* ───── Conversor ───── */
    var convEstado = { cat: 'presion', from: null, to: null, val: '1' };

    function construirConv(root) {
        var wrap = el('div', 'cvx-conv');
        var cats = el('div', 'cvx-cats');
        var panel = el('div', 'cvx-conv-panel');
        wrap.appendChild(cats); wrap.appendChild(panel);
        root.appendChild(wrap);

        function cat() { return CATS.filter(function (c) { return c.id === convEstado.cat; })[0]; }
        function pintarCats() {
            cats.innerHTML = '';
            CATS.forEach(function (c) {
                var b = el('button', 'cvx-cat' + (c.id === convEstado.cat ? ' on' : ''), '<span>' + c.i + '</span>' + esc(c.n));
                b.type = 'button';
                b.onclick = function () {
                    convEstado.cat = c.id; convEstado.from = c.def[0]; convEstado.to = c.def[1];
                    pintarCats(); pintarPanel();
                };
                cats.appendChild(b);
            });
        }
        function opts(c, sel) {
            return c.u.map(function (u) { return '<option' + (u[0] === sel ? ' selected' : '') + '>' + esc(u[0]) + '</option>'; }).join('');
        }
        function pintarPanel() {
            var c = cat();
            if (!convEstado.from || !c.u.some(function (u) { return u[0] === convEstado.from; })) convEstado.from = c.def[0];
            if (!convEstado.to || !c.u.some(function (u) { return u[0] === convEstado.to; })) convEstado.to = c.def[1];
            panel.innerHTML =
                '<div class="cvx-conv-row">' +
                '<div class="cvx-field"><label>Valor</label><input class="cvx-val" type="text" inputmode="decimal" value="' + esc(convEstado.val) + '" autocomplete="off"></div>' +
                '<div class="cvx-field"><label>De</label><select class="cvx-from">' + opts(c, convEstado.from) + '</select></div>' +
                '<button type="button" class="cvx-swap" title="Intercambiar">⇄</button>' +
                '<div class="cvx-field"><label>A</label><select class="cvx-to">' + opts(c, convEstado.to) + '</select></div>' +
                '</div>' +
                '<div class="cvx-result"><div class="cvx-res-main"><span class="cvx-res-num">—</span><span class="cvx-res-unit"></span></div>' +
                '<div class="cvx-res-eq"></div>' +
                '<div class="cvx-res-btns"><button type="button" class="cvx-pill cvx-copy">📋 Copiar</button></div></div>' +
                '<div class="cvx-presets"><span>Atajos:</span></div>' +
                '<div class="cvx-all"><h4>Equivalencias en todas las unidades</h4><div class="cvx-all-grid"></div></div>';

            var val = panel.querySelector('.cvx-val'), from = panel.querySelector('.cvx-from'), to = panel.querySelector('.cvx-to');
            var num = panel.querySelector('.cvx-res-num'), unit = panel.querySelector('.cvx-res-unit'), eq = panel.querySelector('.cvx-res-eq');
            var all = panel.querySelector('.cvx-all-grid');
            var pre = panel.querySelector('.cvx-presets');
            PRESETS.forEach(function (p) {
                var b = el('button', 'cvx-pill', esc(p[0])); b.type = 'button';
                b.onclick = function () {
                    convEstado.cat = p[1]; convEstado.from = p[2]; convEstado.to = p[3]; convEstado.val = String(p[4]);
                    pintarCats(); pintarPanel();
                };
                pre.appendChild(b);
            });

            function actualizar() {
                convEstado.val = val.value; convEstado.from = from.value; convEstado.to = to.value;
                var raw = val.value.replace(',', '.').trim();
                var v = raw === '' ? NaN : Number(raw);
                if (isNaN(v)) { try { v = evaluar(val.value); } catch (e) { v = NaN; } }
                all.innerHTML = '';
                if (isNaN(v)) { num.textContent = '—'; unit.textContent = ''; eq.textContent = 'Escribe un número (también sirven expresiones como 2.5*9.81)'; return; }
                var r = convertir(c, v, from.value, to.value);
                num.textContent = fmt(r, 10); unit.textContent = to.value;
                var uno = convertir(c, 1, from.value, to.value);
                eq.innerHTML = fmt(v) + ' ' + esc(from.value) + ' = <b>' + fmt(r, 10) + '</b> ' + esc(to.value) + ' &nbsp;·&nbsp; 1 ' + esc(from.value) + ' = ' + fmt(uno, 8) + ' ' + esc(to.value);
                num.dataset.raw = fmtPlano(r);
                c.u.forEach(function (u) {
                    var x = convertir(c, v, from.value, u[0]);
                    var d = el('button', 'cvx-all-item' + (u[0] === to.value ? ' on' : ''), '<b>' + esc(fmt(x, 8)) + '</b><span>' + esc(u[0]) + '</span>');
                    d.type = 'button';
                    d.title = 'Usar como destino';
                    d.onclick = function () { to.value = u[0]; actualizar(); };
                    all.appendChild(d);
                });
            }
            val.addEventListener('input', actualizar);
            from.addEventListener('change', actualizar);
            to.addEventListener('change', actualizar);
            panel.querySelector('.cvx-swap').onclick = function () {
                var a = from.value; from.value = to.value; to.value = a;
                // pasar el resultado como nuevo valor para poder encadenar conversiones
                if (num.dataset.raw) val.value = num.dataset.raw;
                actualizar();
            };
            panel.querySelector('.cvx-copy').onclick = function () { copiar(num.dataset.raw || '', this); };
            actualizar();
        }
        convEstado.from = convEstado.from || CATS[0].def[0];
        convEstado.to = convEstado.to || CATS[0].def[1];
        pintarCats(); pintarPanel();
    }

    function copiar(txt, btn) {
        if (!txt) return;
        var ok = function () { var o = btn.textContent; btn.textContent = '✔ Copiado'; setTimeout(function () { btn.textContent = o; }, 1200); };
        try { navigator.clipboard.writeText(txt).then(ok, function () { fallbackCopy(txt); ok(); }); }
        catch (e) { fallbackCopy(txt); ok(); }
    }
    function fallbackCopy(t) {
        var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select();
        try { document.execCommand('copy'); } catch (e) {} a.remove();
    }
    function enviarAlChat(q) {
        var input = document.getElementById('inputAsistente');
        var btn = document.getElementById('btnEnviarMensaje');
        try { if (typeof civixShowView === 'function') civixShowView('chat'); } catch (e) {}
        if (input) { input.value = q; input.focus(); }
        if (btn) setTimeout(function () { btn.click(); }, 30);
    }

    /* ───── Enlaces: cualquier botón con data-tool abre la ventana ───── */
    document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-tool="calc"],[data-tool="conv"]');
        if (!b) return;
        e.preventDefault(); e.stopImmediatePropagation();
        abrir(b.getAttribute('data-tool'));
    }, true);

    window.CivixHerramientas = { abrir: abrir, evaluar: evaluar, convertir: function (id, v, a, b) {
        var c = CATS.filter(function (x) { return x.id === id; })[0]; return convertir(c, v, a, b); } };
})();
