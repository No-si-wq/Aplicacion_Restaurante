// components/TableManager.tsx
import { useState } from "react";
import { createTable, deleteTable } from "../services/api";
import StatusBadge from "./StatusBadge";
import type { Table } from "@restaurante/types";

interface TableManagerProps {
  tables: Table[];
  onTablesChange: () => void;
}

export default function TableManager({
  tables,
  onTablesChange,
}: TableManagerProps) {
  const [number, setNumber] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!number.trim() || !label.trim()) {
      setError("Completa el número y la etiqueta de la mesa");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createTable({ number: number.trim(), label: label.trim() });
      setNumber("");
      setLabel("");
      onTablesChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteTable(id);
      onTablesChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">

      {/* Formulario de nueva mesa */}
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Nueva mesa
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <input
          type="text"
          placeholder="Número (01, 02...)"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 placeholder-gray-300"
        />
        <input
          type="text"
          placeholder="Etiqueta (Terraza, VIP...)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 placeholder-gray-300"
        />
        <button
          onClick={handleCreate}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-opacity bg-blue-50 text-blue-700 hover:bg-blue-100 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Guardando..." : "Agregar"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      {/* Lista de mesas existentes */}
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-4 mb-3">
        Mesas existentes
      </p>
      <div className="space-y-2">
        {tables.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-6">
            No hay mesas registradas
          </p>
        ) : (
          tables.map((table) => (
            <div
              key={table.id}
              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-none"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-800">
                  Mesa {table.number}
                </span>
                <span className="text-xs text-gray-400">{table.label}</span>
                <StatusBadge status={table.status} />
              </div>
              <button
                onClick={() => handleDelete(table.id)}
                disabled={deletingId === table.id || table.status !== "free"}
                title={
                  table.status !== "free"
                    ? "Solo se pueden eliminar mesas libres"
                    : "Eliminar mesa"
                }
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  table.status !== "free"
                    ? "text-gray-200 cursor-not-allowed"
                    : deletingId === table.id
                    ? "text-red-300 cursor-not-allowed"
                    : "text-red-400 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                {deletingId === table.id ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}