import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

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

// Configurar persistencia
auth.useDeviceLanguage();

export default app;
