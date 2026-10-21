(function() {
    'use strict';
    
    function crearPantallaCarga() {
        if (document.getElementById('pantallaCarga')) {
            return;
        }
        
        const cargaHTML = `
            <div id="pantallaCarga" class="pantalla-carga">
                <div class="carga-fondo">
                    <div class="carga-suelo"></div>
                    <div class="carga-escena">
                        <svg class="retroexcavadora" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="retroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:#2DD4BF;stop-opacity:1" />
                                </linearGradient>
                            </defs>
                            <!-- Brazo y cuchara -->
                            <path class="retro-brazo" d="M 60 80 Q 30 40 15 25" />
                            <path class="retro-cuchara" d="M 10 20 L 20 15 L 25 25 L 15 30 Z" />
                            <!-- Carrocería -->
                            <rect class="retro-body" x="50" y="70" width="120" height="60" rx="8" />
                            <!-- Cabina -->
                            <rect class="retro-cabina" x="70" y="55" width="70" height="35" rx="6" />
                            <rect x="75" y="60" width="60" height="25" rx="4" fill="rgba(59, 130, 246, 0.3)" />
                            <!-- Tanque -->
                            <rect class="retro-body" x="45" y="75" width="15" height="30" rx="4" />
                            <!-- Ruedas -->
                            <circle class="retro-rueda" cx="70" cy="135" r="18" />
                            <circle class="retro-rueda" cx="110" cy="135" r="18" />
                            <circle class="retro-rueda" cx="150" cy="135" r="18" />
                            <circle cx="70" cy="135" r="6" fill="#2DD4BF" opacity="0.6" />
                            <circle cx="110" cy="135" r="6" fill="#2DD4BF" opacity="0.6" />
                            <circle cx="150" cy="135" r="6" fill="#2DD4BF" opacity="0.6" />
                        </svg>
                        <div class="ingeniero">
                            <div class="ingeniero-casco"></div>
                            <div class="ingeniero-cabeza"></div>
                            <div class="ingeniero-cuerpo"></div>
                            <div class="ingeniero-brazos"></div>
                            <div class="ingeniero-piernas"></div>
                        </div>
                    </div>
                    <div class="carga-texto">
                        CARGANDO<span class="puntos"></span>
                    </div>
                    <div class="carga-barra">
                        <div class="carga-barra-progreso"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', cargaHTML);
        
        setTimeout(function() {
            const ingeniero = document.querySelector('.ingeniero');
            if (ingeniero) {
                ingeniero.classList.add('cabina');
            }
            const ruedas = document.querySelectorAll('.retro-rueda');
            setTimeout(function() {
                ruedas.forEach(function(r) {
                    r.classList.add('parada');
                });
            }, 5800);
        }, 50);
    }
    
    function ocultarPantallaCarga() {
        const carga = document.getElementById('pantallaCarga');
        if (carga) {
            carga.classList.add('oculto');
            setTimeout(function() {
                if (carga.parentNode) {
                    carga.parentNode.removeChild(carga);
                }
            }, 800);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', crearPantallaCarga);
    } else {
        crearPantallaCarga();
    }
    
    window.addEventListener('load', function() {
        setTimeout(ocultarPantallaCarga, 4500);
    });
    
    // También ocultar al finalizar restauración
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                if (document.documentElement.classList.contains('gm-restoring') === false && 
                    document.body.classList.contains('gm-booting') === false) {
                    setTimeout(ocultarPantallaCarga, 500);
                    observer.disconnect();
                }
            }
        });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    observer.observe(document.body, { attributes: true });
    
    setTimeout(ocultarPantallaCarga, 6500);
})();
