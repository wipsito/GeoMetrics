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
    provider: 'groq',
    backendUrl: 'https://geometrics-civix.ae860616.workers.dev/api/chat',
    model: 'llama-3.3-70b-versatile',
    // Modelos multi-proveedor (keys solo en el Worker)
    models: [
        { id: 'llama-3.3-70b-versatile', label: 'Groq · Llama 3.3 70B', provider: 'groq' },
        { id: 'openai/gpt-oss-20b', label: 'Groq · GPT-OSS 20B', provider: 'groq' },
        { id: 'openai/gpt-oss-120b', label: 'Groq · GPT-OSS 120B', provider: 'groq' },
        { id: 'llama-3.1-8b-instant', label: 'Groq · Llama 3.1 8B', provider: 'groq' },
        { id: 'qwen/qwen3-32b', label: 'Groq · Qwen3 32B', provider: 'groq' },
        { id: 'gemma2-9b-it', label: 'Groq · Gemma2 9B', provider: 'groq' },
        { id: 'gpt-4o-mini', label: 'OpenAI · GPT-4o mini', provider: 'openai' },
        { id: 'gpt-4o', label: 'OpenAI · GPT-4o', provider: 'openai' },
        { id: 'claude-sonnet-4-5', label: 'Claude · Sonnet 4.5', provider: 'anthropic' },
        { id: 'claude-haiku-4-5-20251001', label: 'Claude · Haiku 4.5', provider: 'anthropic' },
        { id: 'gemini-2.0-flash', label: 'Gemini · 2.0 Flash', provider: 'gemini' },
        { id: 'gemini-2.5-flash', label: 'Gemini · 2.5 Flash', provider: 'gemini' },
        { id: 'deepseek-chat', label: 'DeepSeek · Chat', provider: 'deepseek' },
        { id: 'grok-2-latest', label: 'xAI · Grok 2', provider: 'xai' }
    ],
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
        // Agrega aquí los correos docentes autorizados, ej:
        // 'nombre.apellido@unipamplona.edu.co'
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
    apiKey: 'AIzaSyAATF3qZlUPjvKcxuhu0E9dwFxYq5ASN-8',
    authDomain: 'geometrics-c9369.firebaseapp.com',
    databaseURL: 'https://geometrics-c9369-default-rtdb.firebaseio.com',
    projectId: 'geometrics-c9369',
    storageBucket: 'geometrics-c9369.firebasestorage.app',
    messagingSenderId: '166965082939',
    appId: '1:166965082939:web:3b3febdc07d0c59861551e',
    measurementId: 'G-Q5BZXJJ7Q1'
};
