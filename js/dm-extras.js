/* =========================================================
   GeoMetrics — Diseño de Mezclas · módulos de cálculo
   Dos calculadoras que complementan los simuladores:
     · rendimiento y ajuste de agua por humedad de agregados
     · madurez y resistencia estimada del concreto
   Se montan dentro de la pestaña Simuladores (js/mezclas-sim.js).
   ========================================================= */
(function (root) {
    'use strict';

    var D = root.DMCalc = root.DMCalc || {};
    var HOST = null;
    var state = { id: null };
    var MODS = {};

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
    function field(id, label, value, o) {
        o = o || {};
        return '<label class="dm-field' + (o.wide ? ' dm-wide' : '') + '" for="' + id + '"><span class="dm-lab">' + label +
            (o.unit ? ' <em>(' + o.unit + ')</em>' : '') + '</span>' +
            '<input type="number" inputmode="decimal" id="' + id + '" value="' + (value == null ? '' : value) + '" step="' + (o.step || 'any') + '"' +
            (o.min != null ? ' min="' + o.min + '"' : '') + (o.max != null ? ' max="' + o.max + '"' : '') + '>' +
            (o.hint ? '<small class="dm-hint">' + o.hint + '</small>' : '') + '</label>';
    }
    function tiles(items) {
        return '<div class="dm-tiles">' + items.map(function (it) {
            return '<div class="dm-tile' + (it.tone ? ' is-' + it.tone : '') + (it.big ? ' is-big' : '') + '"><span>' + it.l +
                '</span><strong>' + it.v + '</strong>' + (it.s ? '<small>' + it.s + '</small>' : '') + '</div>';
        }).join('') + '</div>';
    }
    function notes(list) {
        if (!list || !list.length) return '';
        return '<ul class="dm-alerts">' + list.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    }

    /* =========================================================
       01 · RENDIMIENTO Y AJUSTE DE AGUA
       Hipótesis: los pesos de agregados son secos y el agua de
       diseño es agua libre. La humedad de campo aporta agua libre
       que se descuenta del agua por añadir.
       ========================================================= */
    MODS.rendimiento = {
        id: 'rendimiento',
        icon: '🧪',
        title: 'Rendimiento y ajuste de agua',
        desc: 'Corrige la dosificación por humedad y absorción de los agregados, calcula el agua por añadir, el rendimiento por saco y los materiales para un volumen de mezcla.',
        tag: 'Campo · Dosificación',
        form: function () {
            return '<div class="dm-formrow dm-3">' +
                field('dmxCe', 'Cemento', 350, { unit: 'kg/m³', step: '1', min: 0 }) +
                field('dmxAgua', 'Agua de diseño', 175, { unit: 'kg/m³', step: '1', min: 0 }) +
                field('dmxAire', 'Aire', 2, { unit: '%', step: '0.5', min: 0, max: 15 }) + '</div>' +
                '<div class="dm-formrow dm-3">' +
                field('dmxArena', 'Arena seca', 750, { unit: 'kg/m³', step: '1', min: 0 }) +
                field('dmxGrava', 'Grava seca', 1050, { unit: 'kg/m³', step: '1', min: 0 }) +
                field('dmxVol', 'Volumen a preparar', 1, { unit: 'm³', step: '0.01', min: 0.001 }) + '</div>' +
                '<div class="dm-formrow dm-3">' +
                field('dmxSaco', 'Masa del saco de cemento', 50, { unit: 'kg', step: '1', min: 1 }) +
                field('dmxHa', 'Humedad de la arena', 4, { unit: '%', step: '0.1', min: 0 }) +
                field('dmxAa', 'Absorción de la arena', 1.5, { unit: '%', step: '0.1', min: 0 }) + '</div>' +
                '<div class="dm-formrow dm-3">' +
                field('dmxHg', 'Humedad de la grava', 1, { unit: '%', step: '0.1', min: 0 }) +
                field('dmxAg', 'Absorción de la grava', 0.8, { unit: '%', step: '0.1', min: 0 }) + '</div>';
        },
        read: function () {
            var p = {
                ce: num('dmxCe'), wa: num('dmxAgua'), air: num('dmxAire'),
                ar: num('dmxArena'), gr: num('dmxGrava'), V: num('dmxVol'), bag: num('dmxSaco'),
                ha: num('dmxHa'), aa: num('dmxAa'), hg: num('dmxHg'), ag: num('dmxAg')
            };
            if (!(p.ce > 0)) throw new Error('El contenido de cemento debe ser mayor que cero.');
            if (!(p.V > 0)) throw new Error('El volumen a preparar debe ser mayor que cero.');
            if (!(p.bag > 0)) throw new Error('La masa del saco debe ser mayor que cero.');
            if (!(p.wa >= 0) || !(p.ar >= 0) || !(p.gr >= 0)) throw new Error('El agua y los agregados no pueden ser negativos.');
            ['ha', 'aa', 'hg', 'ag', 'air'].forEach(function (k) { if (!isFinite(p[k]) || p[k] < 0) p[k] = 0; });
            return p;
        },
        calc: function (p) {
            var freeA = p.ar * (p.ha - p.aa) / 100;
            var freeG = p.gr * (p.hg - p.ag) / 100;
            var free = freeA + freeG;
            var waterAdd = p.wa - free;
            var wetA = p.ar * (1 + p.ha / 100);
            var wetG = p.gr * (1 + p.hg / 100);
            var density = p.ce + waterAdd + wetA + wetG;
            var wc = p.wa / p.ce;
            var yieldBag = p.bag / p.ce;
            var bagsM3 = p.ce / p.bag;
            var batch = {
                ce: p.ce * p.V, water: waterAdd * p.V, ar: wetA * p.V, gr: wetG * p.V
            };
            return {
                freeA: freeA, freeG: freeG, free: free, waterAdd: waterAdd,
                wetA: wetA, wetG: wetG, density: density, wc: wc,
                yieldBag: yieldBag, bagsM3: bagsM3, batch: batch,
                total: density * p.V, V: p.V, bag: p.bag
            };
        },
        tiles: function (r, p) {
            return [
                { l: 'Agua por añadir', v: fmt(r.waterAdd, 1) + ' kg/m³', big: true, tone: r.waterAdd < 0 ? 'bad' : 'ok', s: 'agua libre de los agregados = ' + fmt(r.free, 1) + ' kg/m³' },
                { l: 'Relación a/c de diseño', v: fmt(r.wc, 3), tone: r.wc > 0.55 ? 'warn' : 'ok', s: 'agua de diseño / cemento' },
                { l: 'Densidad de la tanda', v: fmt(r.density, 0) + ' kg/m³', s: 'con humedad de campo' },
                { l: 'Rendimiento por saco', v: fmt(r.yieldBag, 3) + ' m³', s: 'saco de ' + fmt(r.bag, 0) + ' kg' },
                { l: 'Bolsas por m³', v: fmt(r.bagsM3, 2), s: 'cemento = ' + fmt(p.ce, 0) + ' kg/m³' },
                { l: 'Masa para ' + fmt(r.V, 2) + ' m³', v: fmt(r.total, 0) + ' kg', s: 'materiales húmedos + agua corregida' }
            ];
        },
        table: function (r, p) {
            var filas = [
                ['Cemento', p.ce, r.batch.ce],
                ['Agua por añadir', r.waterAdd, r.batch.water],
                ['Arena húmeda', r.wetA, r.batch.ar],
                ['Grava húmeda', r.wetG, r.batch.gr]
            ];
            return '<div class="dm-panel est-panel dmx-tablepanel"><h4>Materiales para la tanda</h4><div class="dm-tablewrap"><table class="dm-table">' +
                '<thead><tr><th>Material</th><th>kg/m³</th><th>para ' + fmt(p.V, 2) + ' m³</th></tr></thead><tbody>' +
                filas.map(function (f) {
                    return '<tr><td>' + f[0] + '</td><td>' + fmt(f[1], 1) + '</td><td><b>' + fmt(f[2], 2) + '</b></td></tr>';
                }).join('') +
                '<tr><td><b>Total</b></td><td><b>' + fmt(r.density, 1) + '</b></td><td><b>' + fmt(r.total, 2) + '</b></td></tr>' +
                '</tbody></table></div><p class="dm-hint">La arena aporta ' + fmt(r.freeA, 1) + ' kg/m³ de agua libre y la grava ' + fmt(r.freeG, 1) + ' kg/m³. Si el agua por añadir resulta negativa, los agregados están muy húmedos: reduce el agua o ajusta la dosificación antes de mezclar.</p></div>';
        },
        notas: function (r) {
            var a = [];
            if (r.waterAdd < 0) a.push('El agua libre de los agregados supera el agua de diseño. Corrige la humedad o reduce el agua de mezclado: no agregues agua adicional.');
            if (r.wc > 0.55) a.push('La relación a/c supera 0.55: revisa la resistencia requerida y la durabilidad (NSR-10 C.3 / ACI 211.1).');
            if (r.free > 0.15 * r.density) a.push('La corrección por humedad es alta (>15 % de la masa). Verifica el muestreo y la humedad de los agregados.');
            return a;
        }
    };

    /* =========================================================
       02 · MADUREZ Y RESISTENCIA ESTIMADA
       Nurse-Saul: M = Σ (T − T0) · Δt. Edad equivalente a 20 °C.
       Resistencia estimada con la forma hiperbólica de ACI 209.
       ========================================================= */
    MODS.madurez = {
        id: 'madurez',
        icon: '🌡️',
        title: 'Madurez y resistencia estimada',
        desc: 'Calcula la madurez Nurse-Saul, la edad equivalente a 20 °C y la resistencia estimada con la curva de ACI 209 para decidir el momento de descimbre o de carga.',
        tag: 'Curado · Control',
        form: function () {
            return '<div class="dm-formrow dm-3">' +
                field('dmxT', 'Temperatura de curado', 20, { unit: '°C', step: '1' }) +
                field('dmxDias', 'Edad del concreto', 7, { unit: 'días', step: '0.5', min: 0.01 }) +
                field('dmxT0', 'Temperatura de referencia T₀', -10, { unit: '°C', step: '1' }) + '</div>' +
                '<div class="dm-formrow dm-3">' +
                field('dmxF28', 'Resistencia de referencia a 28 d', 28, { unit: 'MPa', step: '1', min: 1 }) +
                '<label class="dm-field" for="dmxCurado"><span class="dm-lab">Tipo de curado</span><select id="dmxCurado">' +
                '<option value="humedo" selected>Húmedo (ACI 209, a = 4.0; b = 0.85)</option>' +
                '<option value="vapor">Vapor (ACI 209, a = 1.0; b = 0.95)</option></select></label></div>' +
                '<p class="dm-hint">Para una historia de temperatura variable, divide el curado en intervalos y suma (T − T₀)·Δt. Este módulo usa temperatura constante equivalente.</p>';
        },
        read: function () {
            var p = {
                T: num('dmxT'), dias: num('dmxDias'), T0: num('dmxT0'), f28: num('dmxF28'),
                curado: (document.getElementById('dmxCurado') || {}).value || 'humedo'
            };
            if (!(p.dias > 0)) throw new Error('La edad debe ser mayor que cero.');
            if (!(p.f28 > 0)) throw new Error('La resistencia de referencia debe ser mayor que cero.');
            if (!isFinite(p.T) || !isFinite(p.T0)) throw new Error('Indica la temperatura de curado y la de referencia.');
            return p;
        },
        calc: function (p) {
            var ab = p.curado === 'vapor' ? { a: 1.0, b: 0.95 } : { a: 4.0, b: 0.85 };
            var delta = p.T - p.T0;
            var M = Math.max(0, delta) * p.dias * 24;                 // °C·h
            var teqH = (20 - p.T0) > 0 ? M / (20 - p.T0) : 0;         // horas equivalentes
            var teqD = teqH / 24;                                      // días equivalentes
            function strengthAt(daysEq) {
                if (!(daysEq > 0)) return 0;
                return p.f28 * daysEq / (ab.a + ab.b * daysEq);
            }
            var f = strengthAt(teqD);
            var pct = f / p.f28 * 100;
            var curve = [1, 3, 7, 14, 28].map(function (d) {
                return { d: d, f: strengthAt(d), pct: strengthAt(d) / p.f28 * 100 };
            });
            return {
                M: M, delta: delta, teqD: teqD, teqH: teqH, f: f, pct: pct,
                a: ab.a, b: ab.b, curve: curve, T: p.T, T0: p.T0, dias: p.dias, f28: p.f28
            };
        },
        tiles: function (r, p) {
            return [
                { l: 'Madurez Nurse-Saul', v: fmt(r.M, 0) + ' °C·h', big: true, s: 'M = (T − T₀) · t' },
                { l: 'Edad equivalente a 20 °C', v: fmt(r.teqD, 2) + ' días', tone: r.teqD < 1 ? 'warn' : 'ok', s: fmt(r.teqH, 0) + ' horas equivalentes' },
                { l: 'Resistencia estimada', v: fmt(r.f, 2) + ' MPa', big: true, tone: r.pct >= 70 ? 'ok' : 'warn', s: fmt(r.pct, 0) + ' % de f′c de referencia' },
                { l: 'Criterio de descimbre', v: r.pct >= 70 ? 'Cumple 70 %' : 'Esperar', tone: r.pct >= 70 ? 'ok' : 'warn', s: 'verifica el criterio del proyecto' },
                { l: 'Temperatura efectiva', v: fmt(r.T, 1) + ' °C', s: 'T₀ = ' + fmt(r.T0, 1) + ' °C · ΔT = ' + fmt(r.delta, 1) + ' °C' },
                { l: 'Edad real', v: fmt(r.dias, 1) + ' días', s: r.delta <= 0 ? 'sin ganancia de madurez' : 'curado isotérmico' }
            ];
        },
        table: function (r, p) {
            return '<div class="dm-panel est-panel dmx-tablepanel"><h4>Curva estimada de resistencia</h4><div class="dm-tablewrap"><table class="dm-table">' +
                '<thead><tr><th>Edad equivalente (días)</th><th>Resistencia estimada (MPa)</th><th>% de f′c referencia</th></tr></thead><tbody>' +
                r.curve.map(function (x) {
                    return '<tr><td>' + x.d + '</td><td><b>' + fmt(x.f, 2) + '</b></td><td>' + fmt(x.pct, 0) + ' %</td></tr>';
                }).join('') + '</tbody></table></div>' +
                '<p class="dm-hint">Modelo hiperbólico de ACI 209 con a = ' + fmt(r.a, 1) + ' y b = ' + fmt(r.b, 2) + '. La resistencia real depende de la mezcla, el cemento, la temperatura y el curado; calibra con probetas de tu obra antes de usarla para descimbrar.</p></div>';
        },
        notas: function (r) {
            var a = [];
            if (r.delta <= 0) a.push('La temperatura de curado no supera la de referencia: la madurez es nula. Revisa el dato o mantén el concreto por encima de T₀.');
            if (r.pct < 70) a.push('La resistencia estimada no alcanza el 70 % de f′c. No descimbre sin verificar con testigos o probetas curadas en obra.');
            if (r.T > 40) a.push('Temperaturas superiores a 40 °C aceleran la hidratación pero pueden reducir la resistencia final y aumentar la fisuración térmica.');
            return a;
        }
    };

    /* =========================================================
       RENDER
       ========================================================= */
    function home() {
        return '<div class="simhub-grid simhub-grid-mod dmx-cards">' +
            Object.keys(MODS).map(function (id) {
                var m = MODS[id];
                return '<div class="simhub-mod dmx-card"><div class="simhub-mod-ico" aria-hidden="true">' + m.icon + '</div>' +
                    '<div><h5>' + m.title + '</h5><p>' + m.desc + '</p><small class="dmx-tag">' + m.tag + '</small></div>' +
                    '<button type="button" class="btn-calcular btn-abrir-sim" data-dmx-open="' + id + '">ABRIR MÓDULO</button></div>';
            }).join('') + '</div>';
    }

    function detail(m) {
        return '<div class="dmx-shell"><div class="dmx-head"><button type="button" class="btn-limpiar ms2-back" id="dmxBack">← Módulos de cálculo</button>' +
            '<div><h4>' + m.icon + ' ' + m.title + '</h4><span>' + m.tag + '</span></div></div>' +
            '<div class="dm-cols dmx-cols"><div class="dm-col"><section class="dm-panel est-panel"><h4>Datos de entrada</h4><div id="dmxForm">' + m.form() + '</div>' +
            '<div class="dm-actions"><button type="button" class="btn-calcular" id="dmxCalc">CALCULAR</button><button type="button" class="btn-limpiar" id="dmxReset">Restablecer</button></div></section>' +
            '<details class="dm-panel est-panel est-proc dm-proc" open><summary>Supuestos del cálculo</summary>' + learn(m.id) + '</details></div>' +
            '<div class="dm-col"><section class="dm-panel est-panel dmx-respanel"><h4>Resultados</h4><div id="dmxRes" class="dm-res"><p class="dm-empty">Completa los datos y pulsa CALCULAR.</p></div></section>' +
            '<div id="dmxTable"></div></div></div></div>';
    }

    function learn(id) {
        if (id === 'rendimiento') {
            return '<p>Los agregados se expresan <b>secos</b> y el agua de diseño es <b>agua libre</b>. La humedad de campo aporta agua que se descuenta del agua por añadir; la absorción es la referencia para saber cuánta de esa humedad queda retenida en el agregado.</p>' +
                '<p>El rendimiento por saco se obtiene con la regla de tres del cemento: si 1 m³ contiene <em>c</em> kg y el saco tiene <em>m</em> kg, un saco rinde <em>m/c</em> m³. No reemplaza la corrección por rendimiento medida en obra.</p>';
        }
        return '<p><b>Nurse-Saul:</b> M = Σ (T − T₀) · Δt, con T₀ ≈ −10 °C para cemento Portland. La edad equivalente lleva esa madurez a una temperatura de referencia de 20 °C.</p>' +
            '<p><b>ACI 209:</b> f(t) = f₂₈ · t / (a + b·t) para curado húmedo o vapor. La estimación es orientativa y debe calibrarse con la mezcla real.</p>';
    }

    function scrollModulo() {
        try {
            var el = document.querySelector('.dmx-shell') || document.getElementById('dmCalcMount');
            if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {}
    }

    function render() {
        if (!HOST) return;
        if (!state.id) {
            HOST.innerHTML = home();
            HOST.querySelectorAll('[data-dmx-open]').forEach(function (b) {
                b.addEventListener('click', function () {
                    state.id = b.getAttribute('data-dmx-open');
                    render();
                    scrollModulo();
                });
            });
            return;
        }
        var m = MODS[state.id];
        HOST.innerHTML = detail(m);
        $('dmxBack').addEventListener('click', function () { state.id = null; render(); scrollModulo(); });
        $('dmxCalc').addEventListener('click', function () { run(true); });
        $('dmxReset').addEventListener('click', function () { state.id = m.id; render(); run(true); });
        run(false);
    }

    function run(showErrors) {
        var m = MODS[state.id]; if (!m) return;
        var res = $('dmxRes'), table = $('dmxTable');
        try {
            var p = m.read();
            var r = m.calc(p);
            res.innerHTML = tiles(m.tiles(r, p)) + notes(m.notas ? m.notas(r, p) : []);
            table.innerHTML = m.table(r, p);
        } catch (e) {
            if (res) res.innerHTML = '<div class="dm-error" role="alert">⚠ ' + esc(e.message || 'Revisa los datos ingresados.') + '</div>';
            if (table) table.innerHTML = '';
        }
    }

    D.mount = function (host) {
        HOST = host;
        if (!host) return;
        state.id = null;
        render();
    };
    D.open = function (id) { if (MODS[id]) { state.id = id; render(); scrollModulo(); } };
    D.mods = MODS;
})(typeof window !== 'undefined' ? window : globalThis);
