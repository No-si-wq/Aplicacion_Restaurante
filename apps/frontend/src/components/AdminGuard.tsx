// components/AdminGuard.tsx
import { useState } from "react";

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN ?? "1234";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [unlocked, setUnlocked] = useState(
    sessionStorage.getItem("admin_unlocked") === "true"
  );

  function handleUnlock() {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem("admin_unlocked", "true");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-1">
          Acceso restringido
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Ingresa el PIN de administración para continuar
        </p>

        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
          className={`w-full text-center text-2xl tracking-widest bg-gray-50 border rounded-lg px-4 py-3 mb-3 focus:outline-none ${
            error
              ? "border-red-300 focus:border-red-400"
              : "border-gray-200 focus:border-gray-400"
          }`}
          maxLength={6}
        />

        {error && (
          <p className="text-xs text-red-500 text-center mb-3">
            PIN incorrecto
          </p>
        )}

        <button
          onClick={handleUnlock}
          className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}