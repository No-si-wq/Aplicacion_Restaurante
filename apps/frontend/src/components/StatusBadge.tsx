// components/StatusBadge.tsx
import type { Order, Table } from "@restaurante/types";

type Status = Order["status"] | Table["status"];

interface StatusBadgeProps {
  status: Status;
}

const config: Record<Status, { label: string; className: string }> = {
  // Estados de orden
  pending:     { label: "Pendiente",       className: "bg-amber-50 text-amber-700" },
  in_progress: { label: "En preparación",  className: "bg-blue-50 text-blue-700"   },
  ready:       { label: "Listo",           className: "bg-green-50 text-green-700" },
  delivered:   { label: "Entregado",       className: "bg-gray-100 text-gray-500"  },
  // Estados de mesa
  free:        { label: "Libre",           className: "bg-green-50 text-green-700" },
  occupied:    { label: "Ocupada",         className: "bg-amber-50 text-amber-700" },
  billed:      { label: "Cuenta",          className: "bg-red-50 text-red-600"     },
  reserved:    { label: "Reservada", className: "bg-purple-50 text-purple-600" }
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-500",
  };

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${className}`}>
      {label}
    </span>
  );
}