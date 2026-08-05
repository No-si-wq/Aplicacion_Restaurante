import { useEffect, useState } from "react";
import type { Shift } from "@restaurante/types";
import { getOpenShifts, openShift, closeShift, getUsers, getNextShiftName, type AppUser } from "../services/api";

export default function ShiftManager() {
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [nextName, setNextName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    getOpenShifts().then(setOpenShifts);
    getUsers().then((all) => {
      setUsers(all.filter((u) => u.role === "VENDEDOR"));
    });
    getNextShiftName().then((r) => setNextName(r.name));
  };

  useEffect(() => { load(); }, []);

  const usersWithoutOpenShift = users.filter(
    (u) => !openShifts.some((s) => s.openedBy?.username === u.username)
  );

  const handleOpen = async () => {
    if (!selectedUserId) return;
    setError(null);
    setLoading(true);
    try {
      await openShift(selectedUserId);
      setSelectedUserId("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al abrir el turno");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: string) => {
    await closeShift(id);
    load();
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Gestión de turnos</h2>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Abrir turno para un usuario</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1"
          >
            <option value="">Selecciona un usuario</option>
            {usersWithoutOpenShift.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
          <span className="flex items-center px-3 py-2 text-sm text-gray-500 bg-gray-50 rounded-md border border-gray-200">
            Se abrirá: <strong className="ml-1 text-gray-800">{nextName}</strong>
          </span>
          <button
            onClick={handleOpen}
            disabled={!selectedUserId || loading}
            className="bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
          >
            Abrir turno
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Turnos abiertos</h3>
        {openShifts.length === 0 ? (
          <p className="text-sm text-gray-500">No hay turnos abiertos actualmente.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {openShifts.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.openedBy?.username}</p>
                </div>
                <button
                  onClick={() => handleClose(s.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300"
                >
                  Cerrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}