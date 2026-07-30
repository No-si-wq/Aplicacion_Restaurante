import { useEffect, useState } from "react";
import { getUsers, createUser, updateUser, deleteUser, type AppUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function UserManager() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "VENDEDOR" as "ADMIN" | "VENDEDOR" });
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setForm({ username: "", password: "", role: "VENDEDOR" });
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      if (editingId) {
        const payload: Partial<{ username: string; password: string; role: "ADMIN" | "VENDEDOR" }> = {
          username: form.username,
          role: form.role,
        };
        if (form.password) payload.password = form.password;
        await updateUser(editingId, payload);
      } else {
        await createUser(form);
      }
      resetForm();
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleEdit = (u: AppUser) => {
    setEditingId(u.id);
    setForm({ username: u.username, password: "", role: u.role });
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      await deleteUser(id);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  if (loading) return <p className="text-sm text-gray-500 p-4">Cargando usuarios...</p>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Usuarios</h2>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Usuario"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder={editingId ? "Nueva contraseña (opcional)" : "Contraseña"}
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "VENDEDOR" })}
        >
          <option value="VENDEDOR">Vendedor</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800"
        >
          {editingId ? "Guardar" : "Crear"}
        </button>
        {editingId && (
          <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
            Cancelar
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{u.username}</p>
              <p className="text-xs text-gray-500">{u.role}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(u)} className="text-xs text-gray-500 hover:text-gray-800">
                Editar
              </button>
              {u.id !== currentUser?.id && (
                <button onClick={() => handleDelete(u.id)} className="text-xs text-red-500 hover:text-red-700">
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}