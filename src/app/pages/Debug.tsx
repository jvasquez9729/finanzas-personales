import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export function Debug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [email, setEmail] = useState('test@test.com');
  const [password, setPassword] = useState('123456');

  useEffect(() => {
    addLog('=== INFO DEL SISTEMA ===');
    addLog(`URL: ${window.location.href}`);
    addLog(`Hostname: ${window.location.hostname}`);
    addLog(`Origin: ${window.location.origin}`);
    addLog(`Protocol: ${window.location.protocol}`);
    addLog(`Auth inicializado: ${!!auth}`);
    addLog(`Auth domain: ${auth?.app?.options?.authDomain || 'No disponible'}`);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const testAuth = async () => {
    addLog('=== INICIANDO TEST DE AUTH ===');
    try {
      addLog(`Intentando login con: ${email}`);
      const result = await signInWithEmailAndPassword(auth, email, password);
      addLog(`✅ ÉXITO! Usuario: ${result.user.uid}`);
    } catch (err: any) {
      addLog(`❌ ERROR: ${err.code}`);
      addLog(`Mensaje: ${err.message}`);
      
      if (err.code === 'auth/network-request-failed') {
        addLog('💡 Posible causa: Dominio no autorizado o Firebase no configurado');
      }
      if (err.code === 'auth/operation-not-allowed') {
        addLog('💡 Posible causa: Email/Password no habilitado en Firebase Console');
      }
    }
  };

  const testFetch = async () => {
    addLog('=== TEST DE CONEXIÓN ===');
    try {
      const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCy208hpz3OX8NTdZxxK3YCzxXa3xWWYd8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: '123456',
          returnSecureToken: true
        })
      });
      
      const data = await response.json();
      addLog(`Status: ${response.status}`);
      addLog(`Response: ${JSON.stringify(data).substring(0, 200)}`);
    } catch (err: any) {
      addLog(`❌ FETCH ERROR: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-zinc-100">
      <h1 className="text-2xl font-bold mb-4">Debug de Firebase</h1>
      
      <div className="mb-6 space-y-2">
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full max-w-md p-2 bg-zinc-800 rounded"
          placeholder="Email"
        />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full max-w-md p-2 bg-zinc-800 rounded"
          placeholder="Password"
        />
      </div>

      <div className="space-x-2 mb-6">
        <button 
          onClick={testAuth}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Test Auth de Firebase
        </button>
        <button 
          onClick={testFetch}
          className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
        >
          Test Fetch Directo
        </button>
      </div>

      <div className="bg-zinc-900 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="mb-1">{log}</div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded">
        <h3 className="font-bold text-yellow-400 mb-2">Verifica en Firebase Console:</h3>
        <ol className="list-decimal list-inside space-y-1 text-yellow-200">
          <li>Ve a Authentication → Sign-in method</li>
          <li>Verifica que "Correo electrónico/Contraseña" esté HABILITADO</li>
          <li>Ve a Authentication → Settings → Authorized domains</li>
          <li>Verifica que esté: <code className="bg-zinc-800 px-2 py-1 rounded">{window.location.hostname}</code></li>
        </ol>
      </div>
    </div>
  );
}
