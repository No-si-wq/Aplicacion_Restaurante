// apps/frontend/src/components/CaiManager.tsx
import { useEffect, useState } from "react";
import { getCais, createCai, updateCai, deleteCai } from "../services/api";
import type { CaiAdmin } from "@restaurante/types";

interface UserOption {
  id: string;
  username: string;
}

export function CaiManager({ users }: { users: UserOption[] }) {
  const [cais, setCais] = useState<CaiAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: "",
    establishment: "",
    pointOfSale: "",
    documentType: "01",
    rangeStart: "",
    rangeEnd: "",
    limitDate: "",
    userId: "",
  });

  const load = async () => {
    setLoading(true);
    const data = await getCais();
    setCais(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async () => {
    if (!form.code || !form.establishment || !form.pointOfSale || !form.rangeStart || !form.rangeEnd || !form.limitDate || !form.userId) {
      alert("Completa todos los campos");
      return;
    }
    await createCai({
      ...form,
      rangeStart: Number(form.rangeStart),
      rangeEnd: Number(form.rangeEnd),
    });
    setForm({ code: "", establishment: "", pointOfSale: "", documentType: "01", rangeStart: "", rangeEnd: "", limitDate: "", userId: "" });
    load();
  };

  const toggleActive = async (cai: CaiAdmin) => {
    await updateCai(cai.id, { isActive: !cai.isActive });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este CAI?")) return;
    await deleteCai(id);
    load();
  };

  if (loading) return <p className="p-4 text-sm text-gray-500">Cargando CAI...</p>;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold">Gestión de CAI por usuario</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-lg shadow">
        <select
          value={form.userId}
          onChange={(e) => setForm({ ...form, userId: e.target.value })}
          className="border rounded px-3 py-2 text-sm sm:col-span-2"
        >
          <option value="">Selecciona usuario</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>
        <input
          placeholder="Código CAI"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          className="border rounded px-3 py-2 text-sm sm:col-span-2"
        />
        <input
          placeholder="Establecimiento (001)"
          value={form.establishment}
          onChange={(e) => setForm({ ...form, establishment: e.target.value })}
          className="border rounded px-3 py-2 text-sm"
        />
        <input
          placeholder="Punto de venta (001)"
          value={form.pointOfSale}
          onChange={(e) => setForm({ ...form, pointOfSale: e.target.value })}
          className="border rounded px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Rango inicial"
          value={form.rangeStart}
          onChange={(e) => setForm({ ...form, rangeStart: e.target.value })}
          className="border rounded px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Rango final"
          value={form.rangeEnd}
          onChange={(e) => setForm({ ...form, rangeEnd: e.target.value })}
          className="border rounded px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={form.limitDate}
          onChange={(e) => setForm({ ...form, limitDate: e.target.value })}
          className="border rounded px-3 py-2 text-sm sm:col-span-2"
        />
        <button
          onClick={handleSubmit}
          className="sm:col-span-2 bg-orange-600 text-white rounded px-4 py-2 text-sm font-medium"
        >
          Asignar CAI
        </button>
      </div>

      <div className="space-y-2">
        {cais.map((cai) => (
          <div key={cai.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-lg p-3 bg-white shadow-sm gap-2">
            <div className="text-sm">
              <p className="font-medium">{cai.user.username}</p>
              <p className="text-gray-500">{cai.code}</p>
              <p className="text-gray-500">
                Rango {cai.rangeStart}–{cai.rangeEnd} · actual {cai.currentNumber} · vence {cai.limitDate.slice(0, 10)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleActive(cai)}
                className={`text-xs px-3 py-1 rounded ${cai.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}
              >
                {cai.isActive ? "Activo" : "Inactivo"}
              </button>
              <button
                onClick={() => handleDelete(cai.id)}
                className="text-xs px-3 py-1 rounded bg-red-100 text-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}