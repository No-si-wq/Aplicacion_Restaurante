import { useEffect, useState } from "react";
import type { Shift } from "@restaurante/types";
import { getCurrentShift, closeShift } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function ShiftBanner() {
  const { user } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);

  const load = () => getCurrentShift().then(setShift);
  useEffect(() => { load(); }, []);

  const handleClose = async () => {
    if (!shift) return;
    await closeShift(shift.id);
    load();
  };

  if (user?.role === "ADMIN") return null;

  if (!shift) {
    return (
      <div className="flex items-center gap-2 bg-gray-500 text-white p-2 text-sm">
        <span>Aún no tienes un turno abierto. Espera a que un administrador te asigne uno.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-green-700 text-white p-2">
      <span>{shift.name} — abierto por {shift.openedBy?.username}</span>
      <button onClick={handleClose}>Cerrar turno</button>
    </div>
  );
}