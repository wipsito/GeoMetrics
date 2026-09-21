// GeoMetrics — configuración
/**
 * Civix — la API key de Groq NO va aquí.
 * Se guarda como secreto en Cloudflare Worker (backend).
 *
 * 1) Despliega: backend/cloudflare-worker (ver README.md)
 * 2) Pega abajo la URL que te dé wrangler deploy
 * 3) Ejemplo: https://geometrics-civix.TU_USUARIO.workers.dev/api/chat
 */
var AI_CONFIG = {
    provider: 'backend',
    // ← Cambia esto por la URL de tu Worker después de wrangler deploy
    backendUrl: 'https://geometrics-civix.ae860616.workers.dev/api/chat',
    model: 'openai/gpt-oss-20b',
    // systemPrompt queda en el servidor (no se expone ni se puede alterar desde el cliente)
    systemPrompt: ''
};
var API_URLS = {
    // Solo se usan si backendUrl está vacío (no recomendado)
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions'
};

// Dominio institucional y docentes autorizados
var AULA_CONFIG = {
    dominio: 'unipamplona.edu.co',
    docentes: [
        'docente.demo@unipamplona.edu.co'
    ],
    pilotoDocenteAbierto: true
};

/**
 * Recuperación de contraseña por correo (EmailJS — plan gratuito)
 * 1) Crea cuenta en https://www.emailjs.com
 * 2) Add New Service → elige Gmail/Outlook y conéctalo
 * 3) Email Templates → Create New Template con variables:
 *    {{to_email}}, {{user_name}}, {{code}}
 *    Asunto: Código GeoMetrics
 *    Cuerpo ejemplo: Hola {{user_name}}, tu código es {{code}}. Válido 15 minutos.
 * 4) Account → General → Public Key
 * 5) Pega los IDs abajo
 *
 * Si dejas enabled: false, el código se muestra en pantalla (solo para pruebas).
 */
var EMAILJS_CONFIG = {
    enabled: true,
    publicKey: 'zVPqsNFWjwA0w9_V8',
    serviceId: 'service_7dx51bj',
    templateId: 'template_dvs5gol'
};


/**
 * Base de datos compartida (varios PCs) — Firebase Realtime Database
 * 1) https://console.firebase.google.com → Create project → "geometrics-piloto"
 * 2) Build → Realtime Database → Create Database → Start in TEST mode
 * 3) Project settings → Your apps → Web → copy config
 * 4) Pega abajo apiKey, databaseURL, etc.
 * 5) Rules (piloto): { "rules": { ".read": true, ".write": true } }
 *
 * Si enabled: false, todo queda solo en este navegador (no se sincroniza).
 */
var FIREBASE_CONFIG = {
    enabled: true,
    apiKey: 'AIzaSyD4AYzzltlL46-fseJ-mMzTZpnqo3umnCw',
    authDomain: 'geometrics-92c13.firebaseapp.com',
    databaseURL: 'https://geometrics-92c13-default-rtdb.firebaseio.com',
    projectId: 'geometrics-92c13',
    storageBucket: 'geometrics-92c13.firebasestorage.app',
    messagingSenderId: '81262129610',
    appId: '1:81262129610:web:e52b174ea7906159ebdf33'
};
