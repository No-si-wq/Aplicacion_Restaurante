import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Role = "ADMIN" | "VENDEDOR";
interface AuthUser { id: string; username: string; role: Role; companyId: string; }
interface AuthCompany { id: string; name: string; slug: string; }

interface AuthContextValue {
  user: AuthUser | null;
  company: AuthCompany | null;
  token: string | null;
  login: (companySlug: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedCompany = localStorage.getItem("company");
    try {
      if (storedUser && storedUser !== "undefined") setUser(JSON.parse(storedUser));
      if (storedCompany && storedCompany !== "undefined") setCompany(JSON.parse(storedCompany));
    } catch (e) {
      console.error("Error parsing stored auth data", e);
      localStorage.removeItem("user");
      localStorage.removeItem("company");
    }
    setLoading(false);
  }, []);

  async function login(companySlug: string, username: string, password: string) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companySlug, username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Error al iniciar sesión");
    }
    const data = await res.json();
    if (!data.user || !data.company || !data.token) {
      throw new Error("Respuesta de login incompleta");
    }
    setToken(data.token);
    setUser(data.user);
    setCompany(data.company);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("company", JSON.stringify(data.company));
  }

  function logout() {
    setToken(null);
    setUser(null);
    setCompany(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("company");
  }

  return (
    <AuthContext.Provider value={{ user, company, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}