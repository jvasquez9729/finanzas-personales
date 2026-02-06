import { useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      setError(null);
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(newUser, { displayName: name });
      
      await setDoc(doc(db, 'users', newUser.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
      });

      return { success: true, user: newUser };
    } catch (err: any) {
      setError(getErrorMessage(err.code));
      return { success: false, error: err.message };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err: any) {
      setError(getErrorMessage(err.code));
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    logout,
    clearError,
    isAuthenticated: !!user,
  };
}

function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Este correo ya está registrado',
    'auth/invalid-email': 'Correo electrónico inválido',
    'auth/operation-not-allowed': 'Autenticación no habilitada en Firebase Console',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/user-disabled': 'Cuenta deshabilitada',
    'auth/user-not-found': 'No existe cuenta con este correo',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet o si Firebase está configurado correctamente',
    'auth/invalid-credential': 'Credenciales inválidas',
  };
  
  return messages[code] || 'Error al iniciar sesión. Intenta de nuevo.';
}
