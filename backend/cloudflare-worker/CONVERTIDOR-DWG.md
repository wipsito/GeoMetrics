# Convertidor DWG ⇄ DXF de GeoMetrics (Civix → Planos y CAD → Convertidor)

| Conversión | Dónde se hace | Qué necesita |
|---|---|---|
| DXF → DXF limpio (R12), SVG, PNG, PDF | Navegador | Nada |
| DWG → DXF (solo geometría: líneas, polilíneas, arcos, círculos, elipses, splines, texto, puntos, sólidos) | Navegador, con LibreDWG (WebAssembly) | Archivos del motor en `js/vendor/libredwg/` (ver abajo) o acceso a jsDelivr |
| DWG → DXF completo (bloques, cotas, hatch) | Servidor (Worker + CloudConvert) | `CLOUDCONVERT_API_KEY` |
| DXF → DWG | Servidor (Worker + CloudConvert) | `CLOUDCONVERT_API_KEY` |

El formato DWG es propietario: **escribir DWG no es posible en el navegador**. Por eso DXF → DWG pasa por el servidor.
Sin servidor, el estudiante abre el DXF en AutoCAD / LibreCAD / DraftSight y usa «Guardar como… DWG».

## 1. Activar el servidor (DXF → DWG y respaldo DWG → DXF)
1. Crea una cuenta en https://cloudconvert.com y genera una API key (scope `task.read` y `task.write`). El plan gratuito da conversiones diarias limitadas.
2. En `backend/cloudflare-worker/`:
   ```
   wrangler secret put CLOUDCONVERT_API_KEY
   wrangler deploy
   ```
3. Comprueba: `GET https://TU-WORKER.workers.dev/api/convert/status` → `{"enabled":true,...}`.
   (El Worker usa el mismo `backendUrl` de `js/config.js`; límite de 10 MB por archivo.)
   Los archivos se envían a CloudConvert **solo** cuando el usuario pulsa «Convertir con servidor».

## 2. Motor DWG → DXF dentro del navegador (opcional, recomendado: copia local)
Con internet (en tu PC): `node tools/instalar-libredwg.js` descarga `@mlightcad/libredwg-web` (npm) y copia los archivos a `js/vendor/libredwg/`.
Si prefieres otra ubicación: antes de los scripts define
`window.CIVIX_LIBREDWG = { module: 'https://…/libredwg-web.js', wasmDir: 'https://…/' }`.
Si no hay copia local, el convertidor intenta jsDelivr. Cada intento y error queda en «Diagnóstico del convertidor».

## Limitaciones honestas
- El motor local es de **solo lectura** y no conserva bloques, cotas ni sombreados en la vista/DXF generado aquí (se avisa en pantalla); para fidelidad total usa el servidor.
- DWG muy recientes pueden no abrir con LibreDWG; el servidor es el respaldo.
- Esta integración se probó con simulacros (sin red en el entorno de desarrollo); valida con un DWG real tras desplegar.
