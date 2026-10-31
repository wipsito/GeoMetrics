// Uso (con internet): node tools/instalar-libredwg.js
// Descarga @mlightcad/libredwg-web desde npm y copia dist/ y wasm/ a js/vendor/libredwg/
const { execSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const dest = path.join(__dirname, '..', 'js', 'vendor', 'libredwg'); fs.mkdirSync(dest, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ldwg-'));
execSync('npm pack @mlightcad/libredwg-web --silent', { cwd: tmp, stdio: 'inherit' });
const tgz = fs.readdirSync(tmp).find(f => f.endsWith('.tgz')); execSync('tar -xzf ' + tgz, { cwd: tmp });
let n = 0; (function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) return walk(p); if (/\.(js|mjs|wasm)$/.test(e.name) && /package[\\/](dist|wasm|lib)/.test(p)) { fs.copyFileSync(p, path.join(dest, e.name)); n++; } }); })(path.join(tmp, 'package'));
console.log('Copiados ' + n + ' archivos a ' + dest + '. Verifica que exista libredwg-web.js y el .wasm; si el nombre difiere, define window.CIVIX_LIBREDWG.');
