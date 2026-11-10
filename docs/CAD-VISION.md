# Civix CAD Vision

Convierte una foto, croquis o plano escaneado en un plano CAD editable y lo exporta a DXF para AutoCAD.
Es una **reconstrucción geométrica**: el DXF contiene líneas, polilíneas, arcos, cotas y textos, nunca la foto.

## Cómo ponerlo en marcha (paso a paso)

**Solo la primera vez**

1. Instala Python 3.11 o superior desde <https://www.python.org/downloads/>.
   En el instalador marca la casilla **“Add python.exe to PATH”**.

**Cada vez que lo uses**

1. En la carpeta de GeoMetrics haz doble clic en **`iniciar-cad-vision.bat`**.
   La primera vez instala los componentes (necesita internet y varios minutos).
2. Espera el mensaje *“Civix CAD Vision encendido”* y **no cierres esa ventana**.
3. Abre GeoMetrics como siempre: doble clic en `iniciar.bat` y entra a <http://127.0.0.1:5500/index.html>.
4. Ve a **Civix → Planos y CAD → 🧠 CAD Vision → Abrir CAD Vision**.
   Arriba a la derecha debe verse **“Motor activo · OCR listo”** en verde.

## Cómo se usa

1. **Carga** la imagen (PNG, JPG o PDF; se usa la primera página).
2. **Prepara** si hace falta: rotación, «Recorte / perspectiva» (arrastra las 4 esquinas sobre la hoja), inclinación, iluminación, contraste y ruido.
3. Pulsa **Interpretar plano**.
4. **Revisa.** Verde = alta confianza · Ámbar = incertidumbre · Rojo = necesita tu decisión · Cian = confirmado.
   «Revisar siguiente» te lleva por los pendientes. Cada elemento se puede confirmar, rechazar, mover o editar.
   Pestaña **Comparar**: original, interpretación de la IA y plano, lado a lado.
5. **Si no hay cotas legibles**: herramienta **Calibrar**, clic en una línea e indica cuánto mide.
6. **Si una cota está mal**: selecciónala en *Cotas*, escribe la medida correcta y pulsa **Aplicar a la geometría**.
7. **Exportar**: DXF (R2013), PDF o SVG.

Atajos: rueda = zoom · arrastrar el fondo = desplazar · `Ctrl+Z` = deshacer · `Supr` = rechazar · `Esc` = cancelar · `Shift` al dibujar = sin modo ortogonal.

## Reglas que el sistema respeta

- **No inventa medidas.** Sin cotas utilizables el plano queda sin escala y no se puede exportar hasta calibrar.
- **No fuerza el cierre.** Una cota que no coincide con el dibujo (desvío mayor a 25 %) o que contradice a otras no se aplica: se avisa y queda para tu decisión.
- **Nada dudoso sale en silencio.** Lo que necesita intervención bloquea la exportación. Lo incierto exige aceptación expresa y llega en **rojo** al DXF.
- Los tramos sin cota conservan la proporción del dibujo; la cota total manda sobre ellos.

## Capas del DXF

`00_REFERENCIA` (contornos y marco, no se imprime) · `01_MUROS` · `02_DIVISIONES` · `03_PUERTAS` · `04_VENTANAS` · `05_COLUMNAS` · `06_COTAS` · `07_TEXTOS` · `08_EJES` · `09_OTROS`

Muros y divisiones son polilíneas con grosor; las cotas son entidades DIMENSION editables; los ambientes y el perímetro son polilíneas cerradas.

## Cómo está construido

```
js/civix-cad-vision.js, css/civix-cad-vision.css   Interfaz y editor (HTML/CSS/JS, sin dependencias)
iniciar-cad-vision.bat / .sh                       Lanzadores
backend/cad_vision/
  main.py         API FastAPI (solo 127.0.0.1:8765, sin claves)
  preprocess.py   PDF/foto, perspectiva, inclinación, iluminación, ruido, separar tinta de cuadrícula
  ocr.py          OCR intercambiable (RapidOCR por defecto; Tesseract opcional)
  textparse.py    Cotas, unidades (m, cm, mm, pulg, pies), escalas, nombres
  vision.py       Rectas, arcos, círculos, sólidos, doble línea, escaleras, discontinuas
  reconstruct.py  Ejes, ambientes, cota↔línea, escala por votación, solución en metros, confianza
  exporters.py    DXF con ezdxf + auditoría, SVG y PDF
  detectors.py    Punto de conexión para un modelo entrenado
  samples/        Croquis de ejemplo, DXF resultante y pruebas
```

**Modelos usados.** El texto lo lee PP-OCR (redes neuronales en ONNX, vía RapidOCR), en el propio equipo y sin nube.
La geometría y los símbolos se obtienen con visión clásica y reglas geométricas (OpenCV); ningún modelo de lenguaje calcula coordenadas.

**API:** `GET /api/cad-vision/health` · `POST /upload` · `POST /preprocess` · `POST /analyze` · `POST /export/{dxf|svg|pdf}`.
Configuración opcional por variables de entorno: `CAD_VISION_OCR=tesseract`, `CAD_VISION_DETECTOR=modulo:Clase`, `CAD_VISION_ORIGINS=https://mi-sitio`.

## Limitaciones conocidas

**Lee esto antes de confiar en un resultado.**

- **Validado con croquis sintéticos, no con fotos reales.** Las pruebas usan dibujos generados con trazo tembloroso, letra manuscrita de computador, sombra, ruido e inclinación. La escritura a mano real es más difícil: espera más cotas mal leídas o no leídas, que deberás corregir.
- **El OCR se equivoca.** En las pruebas leyó ocasionalmente «31 m» por «3 m» u «11 m» por otra cota. El sistema las detecta cuando contradicen la geometría, pero una lectura errónea y *verosímil* puede pasar: revisa siempre la pestaña Cotas.
- **No hay un modelo entrenado de símbolos arquitectónicos.** Puertas (arco de 90°), ventanas (doble línea), columnas (bloque relleno), escaleras (huellas paralelas) y vigas (línea discontinua) se reconocen por reglas, así que simbologías distintas no se detectan. En las pruebas solo se ejercitaron puertas y ventanas; columnas, escaleras y vigas no se validaron con un caso. `detectors.py` permite añadir un modelo, pero hay que entrenarlo.
- **Plantas ortogonales.** Las paredes diagonales se proponen como «Otro» para que las decidas, y los muros curvos no se reconstruyen.
- **El grosor de muro es de dibujo** (0,15 m por defecto, configurable): un croquis a una línea no permite medirlo.
- **Una escala 1:50 escrita solo sirve en PDF**, porque una foto no conserva el tamaño físico del papel.
- **Los ambientes no se recalculan al editar.** Si mueves un muro, su contorno en `00_REFERENCIA` no se actualiza.
- **Solo se procesa la primera página** de un PDF.
- **Compatibilidad con AutoCAD:** el DXF pasa la auditoría de ezdxf y se representó con el motor CAD de esa biblioteca, pero **no se abrió en AutoCAD real** durante el desarrollo.
- **GitHub Pages no ejecuta Python.** En la página publicada, CAD Vision necesita el servidor de la sección «Publicar para docentes y estudiantes».

## Publicar para docentes y estudiantes

GitHub Pages solo sirve la página. El motor debe vivir en un servidor con Docker.

1. Crea un servicio Docker en el hosting elegido y sube el contenido de `CAD-Vision-servidor.zip`, con el `Dockerfile` en la raíz.
2. Cuando termine, abre `https://TU-SERVIDOR/api/cad-vision/health`. Debe responder `"ok":true`.
3. En GitHub edita `js/civix-cad-vision.js` y pega esa dirección, sin la parte `/api/...`, en `var API_PUBLICA = '';`.
4. Espera unos minutos y recarga `wipsito.github.io/GeoMetrics` con `Ctrl+F5`.

Si la página se publica en otra dirección, añádela a `CAD_VISION_ORIGINS` (varias, separadas por comas).

**Ajustes opcionales del servidor:** `CAD_VISION_MAX_CONCURRENT` (análisis simultáneos, 2), `CAD_VISION_QUEUE_WAIT` (segundos de espera, 60), `CAD_VISION_RATE_PER_HOUR` (peticiones por IP, 240; un análisis cuenta 4), `CAD_VISION_MAX_SESSIONS` (imágenes en memoria, 40), `CAD_VISION_SESSION_TTL` (segundos, 1800).

**Privacidad:** las imágenes viajan al servidor, se conservan solo en memoria y no se escriben en disco. Se borran a los 30 minutos sin uso o al reiniciar.

**Seguridad:** la API no pide inicio de sesión. Autorizar el origen solo impide que otras páginas la llamen desde un navegador; quien conozca la dirección puede usarla con otras herramientas. Los límites frenan el abuso, pero no lo impiden.

## Pruebas

Desde la carpeta `backend`, con el Python del entorno y `pip install httpx`:

```bash
python cad_vision/samples/probar_pipeline.py 7 8 13 42
```

```bash
python cad_vision/samples/probar_variantes.py
```

La distribución interior de `samples/croquis_5x5.png` es supuesta: la especificación solo daba medidas de cada ambiente.
