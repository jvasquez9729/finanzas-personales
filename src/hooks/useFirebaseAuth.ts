import { useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
  type AuthError,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  createdAt: Date;
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar cambios de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Obtener perfil adicional de Firestore
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (profileDoc.exists()) {
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: profileDoc.data().name || firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            createdAt: profileDoc.data().createdAt?.toDate(),
          });
        } else {
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            createdAt: new Date(),
          });
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Registro con email/contraseña
  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      setError(null);
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Actualizar perfil
      await updateProfile(newUser, { displayName: name });
      
      // Crear documento de usuario en Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { success: true, user: newUser };
    } catch (err) {
      const authError = err as AuthError;
      setError(getErrorMessage(authError.code));
      return { success: false, error: authError.message };
    }
  }, []);

  // Inicio de sesión
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      const { user: loggedUser } = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: loggedUser };
    } catch (err) {
      const authError = err as AuthError;
      setError(getErrorMessage(authError.code));
      return { success: false, error: authError.message };
    }
  }, []);

  // Cerrar sesión
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (err) {
      const authError = err as AuthError;
      setError(getErrorMessage(authError.code));
      return { success: false, error: authError.message };
    }
  }, []);

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    userProfile,
    loading,
    error,
    signUp,
    signIn,
    logout,
    clearError,
    isAuthenticated: !!user,
  };
}

// Traducir códigos de error de Firebase
function getErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'Este correo ya está registrado',
    'auth/invalid-email': 'Correo electrónico inválido',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/user-not-found': 'No existe una cuenta con este correo',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
  };
  
  return errorMessages[code] || 'Ha ocurrido un error. Intenta de nuevo';
}
