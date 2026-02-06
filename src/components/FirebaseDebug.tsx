import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

export function FirebaseDebug() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [message, setMessage] = useState('Verificando conexión...');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Verificar si auth está inicializado
      if (!auth) {
        setStatus('error');
        setMessage('Auth no inicializado');
        return;
      }

      // Intentar conexión anónima para probar
      await signInAnonymously(auth);
      
      // Probar Firestore
      const testRef = collection(db, '_test_');
      await getDocs(testRef);
      
      setStatus('ok');
      setMessage('Conexión exitosa con Firebase');
    } catch (err: any) {
      console.error('Debug error:', err);
      setStatus('error');
      setMessage(`Error: ${err.code || err.message}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700 text-sm">
      <h4 className="font-bold mb-2">Firebase Debug</h4>
      <p className={status === 'ok' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-yellow-400'}>
        {message}
      </p>
      <button 
        onClick={checkConnection}
        className="mt-2 px-3 py-1 bg-blue-600 rounded text-xs"
      >
        Reintentar
      </button>
    </div>
  );
}
