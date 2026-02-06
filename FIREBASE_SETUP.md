# 🔥 Configuración de Firebase

## Paso 1: Crear Proyecto en Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Click en "Crear proyecto"
3. Nombre: `finanzas-personales-app`
4. Desactiva Google Analytics (opcional)
5. Click "Crear proyecto"

## Paso 2: Registrar App Web

1. En la página principal del proyecto, click en el icono `</>` (Web)
2. Nickname: `Finanzas Web`
3. **NO** marques "Firebase Hosting"
4. Click "Registrar app"
5. Copia el objeto `firebaseConfig` que te muestran

## Paso 3: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## Paso 4: Habilitar Autenticación

1. En el menú lateral, ve a "Authentication"
2. Click "Comenzar"
3. Ve a la pestaña "Sign-in method"
4. Habilita "Correo electrónico/Contraseña"
5. Guarda

## Paso 5: Crear Base de Datos Firestore

1. En el menú lateral, ve a "Firestore Database"
2. Click "Crear base de datos"
3. Modo de prueba: "Iniciar en modo de prueba" (permite todo por 30 días)
4. Ubicación: Selecciona la más cercana (us-central para América)
5. Click "Habilitar"

## Paso 6: Instalar Dependencias

```bash
npm install firebase
```

## Paso 7: Ejecutar la App

```bash
npm run dev
```

## 📝 URLs Importantes

- Login: http://localhost:5173/login
- Registro: http://localhost:5173/register
- Dashboard: http://localhost:5173/dashboard (protegido)

## 🔒 Reglas de Seguridad (Para Producción)

Después de desarrollar, actualiza las reglas de Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🚀 Funcionalidades Implementadas

✅ Autenticación con email/contraseña
✅ Sincronización en tiempo real
✅ Multi-dispositivo (datos en la nube)
✅ CRUD completo para transacciones
✅ Persistencia de sesión

## 💰 Límites del Plan Gratuito

- **Firestore**: 1 GB almacenamiento, 50K lecturas/escrituras por día
- **Auth**: Usuarios ilimitados
- **Hosting**: 1 GB (opcional)
- **Functions**: 125K invocaciones/mes (opcional)

Para una app personal/familiar, ¡nunca te pasarás de los límites gratuitos!
