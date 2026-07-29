// components/AdminGuard.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Role = "ADMIN" | "VENDEDOR";

interface AdminGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export default function AdminGuard({ children, allowedRoles = ["ADMIN"] }: AdminGuardProps) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">No tienes permisos para ver esta sección.</p>
      </div>
    );
  }

  return <>{children}</>;
}