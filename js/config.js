// GeoMetrics — configuración
var AI_CONFIG = {
    provider: 'groq',
    apiKey: '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',
    model: 'openai/gpt-oss-20b',
    systemPrompt: 'Eres Civix, mascota de GeoMetrics (Universidad de Pamplona). Responde en espanol, claro y didactico. REGLA DE ECUACIONES (importante): NO uses LaTeX ni simbolos con barra invertida. Escribe las formulas en texto unicode legible, por ejemplo: w = Ww / Ws × 100%  y  σ = P / A. Centra la formula en su propia linea. En listas usa: w = masa de agua / masa seca.'
};
var API_URLS = {
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
