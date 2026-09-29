import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { KeyRound } from 'lucide-react';

export function LoginView() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleKeyPress = (digit: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/fulfillment/auth/login-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        login(data.token, data.user);
        navigate('/hub');
      } else {
        setError(data.message || 'PIN incorrecto');
        setPin('');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-panel rounded-2xl shadow-xl p-8 border border-border-color">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-blue/10 text-accent-blue mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-text-main">Synco POS</h1>
          <p className="text-text-muted mt-2">Ingresa tu PIN para continuar</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-center gap-4">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full transition-colors ${
                  i < pin.length ? 'bg-accent-blue' : 'bg-border-color'
                }`}
              />
            ))}
          </div>
          {error && (
            <p className="text-red-500 text-center mt-4 text-sm font-medium animate-pulse">
              {error}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              disabled={isLoading}
              className="h-16 rounded-xl bg-bg-main border border-border-color text-xl font-semibold text-text-main hover:bg-accent-blue/10 hover:border-accent-blue transition-colors active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            disabled={isLoading}
            className="h-16 rounded-xl bg-bg-main border border-border-color text-xl font-semibold text-text-muted hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors active:scale-95"
          >
            ⌫
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            disabled={isLoading}
            className="h-16 rounded-xl bg-bg-main border border-border-color text-xl font-semibold text-text-main hover:bg-accent-blue/10 hover:border-accent-blue transition-colors active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || pin.length < 4}
            className="h-16 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
