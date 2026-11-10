# Quices y evaluaciones + seguridad de GeoMetrics

Este cambio hace tres cosas:

1. **Inicio de sesión con Firebase Authentication.** Cada cuenta confirma su correo una vez y las contraseñas dejan de guardarse en la base de datos.
2. **Reglas de seguridad reales.** La base ya no es pública y los quices tienen permisos por rol y por dueño.
3. **Módulo «Quices y evaluaciones».** Los docentes crean, publican y califican, y los estudiantes responden desde «Mis quices». Además, el panel docente gana el apartado **Recursos**.

> **Por qué fue necesario tocar el inicio de sesión.** Antes, cualquiera sin iniciar sesión podía leer y modificar toda la base, incluidas las contraseñas de `users`. Unas reglas de seguridad no pueden proteger nada si la app no sabe quién es cada persona.

## Puesta en marcha (en este orden)

### 1. Activar Firebase Authentication (consola de Firebase, proyecto `geometrics-c9369`)

1. **Authentication → Comenzar → Sign-in method → Correo electrónico/contraseña → Habilitar → Guardar.**
2. **Authentication → Settings → Authorized domains → Add domain:** `wipsito.github.io`.
3. (Opcional) **Authentication → Templates:** cambia el idioma de los correos a español.

### 2. Subir el código a GitHub

Sube los archivos de la lista final. Con las reglas viejas todavía activas, la app nueva sigue funcionando.

### 3. Publicar las reglas

**Realtime Database → Reglas:** borra todo, pega el contenido de `firebase/database.rules.json` y pulsa **Publicar**.
Desde ese momento nada se puede leer sin una cuenta `@unipamplona.edu.co` verificada. La única excepción es la portada (equipo creador y avatar de Civix).

### 4. Primer ingreso del superadministrador

`andres.enriquezval@unipamplona.edu.co` entra en GeoMetrics:

1. En **Iniciar sesión** escribe su correo y una **contraseña nueva**.
2. Pulsa **«Actívala con este correo y esta contraseña»** y confirma el correo.
3. Al entrar, la app **borra todas las contraseñas antiguas** que quedaban en `users`.
4. En **Panel Administrador → 🔐 Seguridad** marca los docentes que de verdad están autorizados y pulsa **Confirmar seleccionados**.

Solo los docentes confirmados pueden crear y calificar quices. La lista vieja (`docentesExtra`) no basta, porque cualquier usuario podía editarla.

### 5. Calificador automático (Cloudflare Worker)

1. En Firebase: **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un archivo JSON. **No lo subas a GitHub.**
2. En `backend/cloudflare-worker/`, ejecuta y pega el JSON completo cuando lo pida:

   ```bash
   wrangler secret put FIREBASE_SERVICE_ACCOUNT
   ```

3. Publica el Worker:

   ```bash
   wrangler deploy
   ```

   `wrangler.toml` ya trae el ID del proyecto y la URL de la base.
4. Comprueba que `https://geometrics-civix.ae860616.workers.dev/api/quiz/status` responda `"configured":true`.

### 6. Usuarios existentes

Cada persona con cuenta anterior pulsa **«Actívala…»** en Iniciar sesión, con su mismo correo y una contraseña nueva, y confirma el correo una vez. Su perfil, materias y datos se conservan.

## Cómo funciona

### Para el docente (menú lateral → Quices y evaluaciones)

- **Mis quices.** Tarjetas con estado, fechas y entregas, y acciones para editar, ver resultados, duplicar, cerrar, reabrir o eliminar. Solo se puede eliminar si nadie lo inició.
- **Crear quiz.** Datos generales, más preguntas **abiertas**, **ABCD** y **falso/verdadero**:
  - Cada pregunta admite imagen, puntaje y explicación o criterio.
  - Se pueden duplicar, eliminar y reordenar arrastrando el asa ⋮⋮ (o con ↑ ↓).
  - Un contador muestra el puntaje acumulado y valida que coincida con el total.
  - El borrador se respalda en el equipo mientras se edita.
  - Antes de publicar aparece una **vista previa completa**.
- **Resultados.** Indicadores de inscritos, presentaron, pendientes, promedio, máxima y mínima, junto con la distribución de notas y el porcentaje de aciertos por pregunta. Abajo está la tabla de estudiantes, y su detalle permite calificar las abiertas con observación.
- **Configuración.** Valores por defecto de los quices nuevos y estado del calificador y de la cuenta.
- **Política de edición.** Cuando un estudiante inicia el quiz, las preguntas, puntajes, claves y duración quedan **bloqueados por las reglas**. Se pueden ajustar textos, ampliar el cierre, sumar intentos o cerrar el quiz. Para cambios de fondo, usa «Duplicar».

### Para el estudiante (Aula → Quices)

- Tarjetas con asignatura, tema, docente, fechas, duración, estado e intentos. Los estados posibles son Disponible, En progreso, Entregado, Calificado y Vencido. Un quiz recién publicado aparece solo, en tiempo real.
- La evaluación ocupa toda la pantalla:
  - Muestra una pregunta o todas, con navegación, progreso y temporizador.
  - Guarda las respuestas automáticamente y pide confirmación antes de entregar.
  - **El tiempo empieza con la hora del servidor.** Recargar o cerrar la página no lo detiene ni lo reinicia.
  - **Sin conexión**, las respuestas se guardan en el equipo y se sincronizan al volver, aunque se haya recargado la página.
- La nota aparece cuando está **calificada por completo**, si el docente lo permite. Las respuestas correctas solo se ven **después del cierre** y solo si el docente activó la retroalimentación.

### Calificación

- **Automática (ABCD y V/F).** La hace el Worker con privilegios de servidor: compara con las claves, que el navegador nunca recibe. Se activa al entregar y cuando el docente abre «Resultados». También cierra los intentos vencidos y califica lo que se guardó a tiempo.
- **Manual (abiertas).** La hace el docente, con puntaje y observación. Mientras falte alguna, el estado es **«Pendiente de calificación»**.
- **Nota.** Puntos / puntaje total × 5 (o × 100), con un decimal. Una pregunta sin responder vale 0.

## Estructura en Firebase

| Ruta | Contenido | Quién lee / escribe |
|---|---|---|
| `secure/admins`, `secure/docentes` | Roles de confianza | Escribe solo el superadmin o un admin |
| `quizTeach/{docente}/{curso}` | Cursos que dicta el docente | El propio docente confirmado |
| `quizEnroll/{curso}/{estudiante}` | Inscripción a cada curso | El propio estudiante; los docentes la leen |
| `quizzes/{id}/meta`, `/questions` | Datos y preguntas **sin respuestas** | Escribe el docente dueño; lee el estudiante inscrito si está publicado |
| `quizKeys/{id}` | Respuestas correctas y criterios | Solo el dueño (y el estudiante tras el cierre, si hay retroalimentación) |
| `quizIndex/{curso}/{id}`, `quizOwner/{docente}/{id}` | Índices para listar | Dueño / inscritos |
| `attempts/{id}/{estudiante}/{aN}` | Inicio (hora del servidor), respuestas, entrega | El estudiante, solo dentro del tiempo y una sola entrega |
| `grades/{id}/{estudiante}/{aN}` | Nota automática y manual | Escriben el Worker y el docente; el estudiante la lee cuando es final |
| `quizSettings/{docente}` | Preferencias | El propio docente |

El curso es `materia__grupo` (por ejemplo `mecanica-de-suelos-i__a`) o `materia__todos` para todos los grupos.

## Pruebas realizadas

Todas se hicieron contra los **emuladores oficiales de Firebase** (Auth y Realtime Database), con las reglas reales y el Worker real ejecutado localmente.

- **Reglas: 76 de 76.** Cubren acceso anónimo, sin verificar y con correo externo; roles; propiedad; borradores; claves; hora de inicio falsificada; intentos fuera de orden o agotados; respuestas inválidas o ajenas; edición con intentos; entrega duplicada; cambios tras entregar; notas; cierre por tiempo y retroalimentación.
- **Calificador: 17 de 17.** Cubren token basura o sin firma, correo externo, ruta maliciosa, cálculo de puntos, abiertas pendientes, nota final, que no se filtren las claves, intento abandonado y vencido, e idempotencia.
- **De extremo a extremo en el navegador.** Recorrí todo el flujo: registro y verificación de la estudiante, registro del docente, creación del quiz con los tres tipos de pregunta, borrador, cambio de puntaje, vista previa y publicación. Después la estudiante lo vio, lo respondió, perdió la conexión, recargó, continuó sin perder respuestas y entregó. Siguieron la calificación automática, el rechazo de la entrega duplicada y de los cambios tras entregar, la calificación manual (que rechazó un puntaje mayor al permitido), la nota final de 3,3 con estadísticas, la consulta de la estudiante y el bloqueo de las claves antes del cierre. También probé la activación de una cuenta antigua con borrado de contraseñas, el recuadro de Seguridad y la sincronización en tiempo real tras cambiar de cuenta.

Para repetir las pruebas (requiere Java 11+ y `npm i firebase-tools firebase@10` en `firebase/pruebas`), arranca primero los emuladores desde la carpeta `firebase`:

```bash
npx firebase emulators:start --only auth,database --project demo-geometrics
```

Luego, en otra terminal, desde `firebase/pruebas`, ejecuta cada uno de estos:

```bash
node rules_test.mjs
```

```bash
node worker_server.mjs ../../backend/cloudflare-worker/worker.js
```

```bash
node grader_test.mjs ../../backend/cloudflare-worker/quiz.js
```

En el navegador, en `http://127.0.0.1:5500` con `localStorage.gm_emulador = '1'`, la app usa los emuladores. El modo emulador solo existe en localhost.

## Limitaciones y decisiones

- **Nodos antiguos.** `chats`, `tareas`, `entregas`, `users` y similares ahora exigen cuenta institucional verificada, pero cualquier cuenta verificada puede leerlos y escribirlos. GeoMetrics sincroniza esas colecciones enteras desde cada navegador, y cerrarlas por dueño exige reescribir esos módulos. Los quices sí tienen permisos estrictos.
- **Materias autodeclaradas.** Las materias que dicta un docente y las que cursa un estudiante se declaran al registrarse, igual que antes. Las reglas impiden suplantar a otra persona, pero no que alguien se inscriba en una materia ajena.
- **Sin Worker no hay calificación automática.** Las objetivas quedan sin nota hasta que el Worker esté configurado; las respuestas no se pierden.
- **Imágenes de apoyo.** Se comprimen y se guardan dentro de la pregunta, con un máximo de unos 380 KB por imagen.
- **Quices viejos.** El sistema anterior ya no tenía interfaz visible y su nodo `quices` queda cerrado.
- **Notificaciones.** No existe un sistema de notificaciones que reutilizar. Los quices nuevos aparecen en tiempo real en «Mis quices».
