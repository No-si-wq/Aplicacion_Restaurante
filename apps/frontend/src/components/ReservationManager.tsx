// components/ReservationManager.tsx
import { useState, useEffect } from "react";
import {
  getTableReservations,
  createReservation,
  updateReservationStatus,
  updateTableStatus
} from "../services/api";
import type { Table, Reservation, ReservationStatus } from "@restaurante/types";

interface ReservationManagerProps {
  tables: Table[];
}

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

const STATUS_STYLE: Record<ReservationStatus, string> = {
  pending: "bg-yellow-50 text-yellow-600",
  confirmed: "bg-green-50 text-green-600",
  cancelled: "bg-gray-100 text-gray-400",
};

export default function ReservationManager({ tables }: ReservationManagerProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!selectedTableId) return;
    fetchReservations();
  }, [selectedTableId]);

  async function fetchReservations() {
    setLoadingList(true);
    setError(null);
    try {
      const data = await getTableReservations(selectedTableId);
      setReservations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingList(false);
    }
  }

  async function handleCreate() {
    if (!selectedTableId || !name.trim() || !date || !time || !partySize) {
      setError("Completa todos los campos obligatorios");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createReservation(selectedTableId, {
        name: name.trim(),
        date: `${date}T${time}:00.000Z`,
        partySize: Number(partySize),
        notes: notes.trim() || undefined,
      });
      setName(""); setDate(""); setTime(""); setPartySize(""); setNotes("");
      await fetchReservations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(id: string, status: ReservationStatus) {
    try {
      const reservation = await updateReservationStatus(id, status);

      // Sincronizar estado de la mesa
      if (status === "confirmed") {
        await updateTableStatus(reservation.tableId, "reserved");
      } else if (status === "cancelled") {
        // Solo liberar si no hay otra reserva confirmada
        const remaining = reservations.filter(
          (r) => r.id !== id && r.status === "confirmed"
        );
        if (remaining.length === 0) {
          await updateTableStatus(reservation.tableId, "free");
        }
      }

      await fetchReservations();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">

      {/* Selector de mesa */}
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Mesa
      </p>
      <select
        value={selectedTableId}
        onChange={(e) => setSelectedTableId(e.target.value)}
        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 mb-4"
      >
        <option value="">Selecciona una mesa...</option>
        {tables.map((t) => (
          <option key={t.id} value={t.id}>
            Mesa {t.number} — {t.label}
          </option>
        ))}
      </select>

      {selectedTableId && (
        <>
          {/* Formulario nueva reserva */}
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Nueva reserva
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="text"
              placeholder="Nombre del cliente *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-2 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 placeholder-gray-300"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400"
            />
            <input
              type="number"
              placeholder="Personas *"
              min={1}
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 placeholder-gray-300"
            />
            <input
              type="text"
              placeholder="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 placeholder-gray-300"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-opacity bg-blue-50 text-blue-700 hover:bg-blue-100 ${
              creating ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {creating ? "Guardando..." : "Agregar reserva"}
          </button>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

          {/* Lista de reservas */}
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-5 mb-3">
            Reservas
          </p>
          {loadingList ? (
            <p className="text-sm text-gray-300 text-center py-6">Cargando...</p>
          ) : reservations.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-6">
              No hay reservas para esta mesa
            </p>
          ) : (
            <div className="space-y-2">
              {reservations.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between py-2 border-b border-gray-50 last:border-none"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.date).toLocaleString("es-HN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {r.partySize} personas
                    </p>
                    {r.notes && (
                      <p className="text-xs text-gray-400 italic">{r.notes}</p>
                    )}
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>

                  {r.status !== "cancelled" && (
                    <div className="flex flex-col gap-1 ml-3 shrink-0">
                      {r.status === "pending" && (
                        <button
                          onClick={() => handleStatusChange(r.id, "confirmed")}
                          className="text-xs px-2.5 py-1 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                        >
                          Confirmar
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusChange(r.id, "cancelled")}
                        className="text-xs px-2.5 py-1 rounded-md text-red-400 hover:bg-red-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}