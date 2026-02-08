import { useState } from 'react';

export function SimpleDebug() {
  const [result, setResult] = useState('');

  const testFirebase = async () => {
    setResult('Probando...');
    
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
      
      if (response.ok) {
        setResult('✅ Firebase responde correctamente!');
      } else {
        setResult(`❌ Error: ${data.error?.message || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setResult(`❌ Error de red: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">Test de Firebase</h1>
      <button 
        onClick={testFirebase}
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
      >
        Testear Firebase API
      </button>
      <div className="mt-4 p-4 bg-zinc-900 rounded">
        {result || 'Haz clic en el botón para probar'}
      </div>
      <div className="mt-4 text-sm text-zinc-500">
        <p>URL actual: {window.location.hostname}</p>
      </div>
    </div>
  );
}
