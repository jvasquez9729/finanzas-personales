# Solución Definitiva: Error de Login

## Problema
La aplicación intenta conectarse a `localhost:3001` que no existe en producción.

## Solución Aplicada
✅ Migrado Landing.tsx a usar Firebase (igual que Login.tsx)
✅ Eliminadas todas las referencias a localhost:3001
✅ Código verificado en GitHub

## Pasos para Deploy Final

### 1. Commit y Push
```powershell
cd "C:\Users\vasqu\OneDrive\Desktop\finanzas_personales\Aplicación web de finanzas"

git add src/app/pages/Landing.tsx SOLUCION_LOGIN.md
git commit -m "Force rebuild: Invalidate Vercel cache"
git push origin main --force
```

### 2. Verificar Deploy en Vercel
1. Ve a: https://vercel.com
2. Entra a tu proyecto "finanzas-personales1"
3. Espera a que el deployment diga "Ready" (2-3 minutos)
4. Click en el deployment más reciente
5. Verifica que el "Source" sea el commit "Force rebuild"

### 3. Limpiar TODO en el Navegador
```
1. Cierra TODAS las pestañas de tu aplicación
2. Presiona Ctrl + Shift + Delete
3. Marca:
   - Cookies y otros datos de sitios
   - Imágenes y archivos en caché
4. Rango: "Todo"
5. Click "Borrar datos"
6. Cierra el navegador completamente
7. Abre de nuevo
```

### 4. Probar
1. Abre: https://finanzas-personales1.vercel.app/
2. Abre DevTools (F12)
3. Ve a la pestaña "Console"
4. Limpia la consola (click derecho → Clear console)
5. Intenta iniciar sesión
6. Verifica que NO aparezca el error de localhost:3001

## Si AÚN Falla

### Opción A: Probar en modo incógnito
```
Ctrl + Shift + N → https://finanzas-personales1.vercel.app/
```

### Opción B: Probar la ruta /login directamente
```
https://finanzas-personales1.vercel.app/login
```
Esta ruta usa Login.tsx que definitivamente funciona con Firebase.

### Opción C: Verificar variables de entorno en Vercel
1. Ve a: https://vercel.com/tu-usuario/finanzas-personales1/settings/environment-variables
2. Verifica que estas variables estén configuradas:
   - VITE_FIREBASE_API_KEY
   - VITE_FIREBASE_AUTH_DOMAIN
   - VITE_FIREBASE_PROJECT_ID
   - VITE_FIREBASE_STORAGE_BUCKET
   - VITE_FIREBASE_MESSAGING_SENDER_ID
   - VITE_FIREBASE_APP_ID

### Opción D: Autorizar dominio en Firebase
1. Ve a: https://console.firebase.google.com/project/app-finperson/authentication/settings
2. En "Authorized domains", verifica que esté:
   - finanzas-personales1.vercel.app

## Cambios Realizados

### Archivo: src/app/pages/Landing.tsx
**Antes:**
```typescript
const API_URL = import.meta.env.VITE_LEDGER_API_URL || 'http://localhost:3001';

const handleSubmit = async (e: React.FormEvent) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  // ...
};
```

**Después:**
```typescript
const { signIn, signUp, loading, error: authError, clearError } = useFirebaseAuth();

const handleSubmit = async (e: React.FormEvent) => {
  let result;
  if (isLogin) {
    result = await signIn(formData.email, formData.password);
  } else {
    result = await signUp(formData.email, formData.password, formData.name);
  }
  // ...
};
```

## Contacto
Si después de seguir TODOS estos pasos el error persiste, comparte:
1. Screenshot de la consola del navegador (F12)
2. Screenshot del último deployment en Vercel
3. Confirma que probaste en modo incógnito
