# Sincronizar GeoMetrics entre varios PCs (Firebase)

Sin esto, cada navegador guarda sus propios usuarios y chats (localStorage).

## Pasos (≈ 10 minutos, gratis)

1. Entra a https://console.firebase.google.com con tu Gmail.
2. **Add project** → nombre `geometrics-piloto` → continuar (puedes desactivar Analytics).
3. Menú **Build** → **Realtime Database** → **Create Database**.
   - Ubicación: la que prefieras (ej. `us-central1`).
   - **Start in test mode** (piloto).
4. Arriba en **Project settings** (engranaje) → **Your apps** → icono **Web** `</>`.
   - Apodo: GeoMetrics → Register app.
   - Copia el objeto `firebaseConfig`.
5. Abre `js/config.js` y rellena:

```js
var FIREBASE_CONFIG = {
    enabled: true,
    apiKey: 'AIza...',
    authDomain: 'geometrics-piloto.firebaseapp.com',
    databaseURL: 'https://geometrics-piloto-default-rtdb.firebaseio.com',
    projectId: 'geometrics-piloto',
    storageBucket: 'geometrics-piloto.appspot.com',
    messagingSenderId: '...',
    appId: '1:...'
};
```

6. En Firebase → Realtime Database → **Rules**:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

(Solo para piloto; luego se restringe.)

7. Sube de nuevo a GitHub los archivos actualizados (`config.js`, `cloud.js`, `aula.js`, `index.html`).

8. En **cada PC**: Ctrl+F5. A partir de ahí:
   - El admin autoriza un docente → se ve en todos los PCs.
   - El docente se registra en otro PC.
   - El chat se sincroniza en tiempo casi real.

## Mientras Firebase esté `enabled: false`

- `pilotoDocenteAbierto: true` permite que cualquier correo @unipamplona.edu.co se registre como docente en cualquier PC (sin depender del admin local).
- El chat **no** se comparte entre PCs hasta activar Firebase.
