import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

// Configuración de Firebase - app-finperson
const firebaseConfig = {
  apiKey: "AIzaSyCy208hpz3OX8NTdZxxK3YCzxXa3xWWYd8",
  authDomain: "app-finperson.firebaseapp.com",
  projectId: "app-finperson",
  storageBucket: "app-finperson.firebasestorage.app",
  messagingSenderId: "632129976580",
  appId: "1:632129976580:web:1dfef07966e5a4ffda3851",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const db = getFirestore(app);
export const auth = getAuth(app);

// Configurar persistencia para que no cierre sesión al recargar
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Habilitar persistencia offline para Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistencia offline no disponible');
  }
});

console.log('Firebase inicializado:', app.name);

export default app;
