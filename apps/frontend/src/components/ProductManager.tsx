// components/ProductManager.tsx
import { useState, useRef } from "react";
import {
  createProduct,
  updateProduct,
  updateProductAvailability,
  deleteProduct,
  createCategory,
  deleteCategory,
} from "../services/api";
import { useImageUpload } from "../hooks/useImageUpload";
import type { Product, Category } from "@restaurante/types";

interface ProductManagerProps {
  products: Product[];
  categories: Category[];
  onProductsChange: () => void;
  onCategoriesChange: () => void;
}

interface FormState {
  name:     string;
  categoryId: string;
  price:    string;
  imageUrl: string;
  requiresKitchen: boolean,
}

const emptyForm: FormState = { name: "", categoryId: "", price: "", imageUrl: "", requiresKitchen: true, };

export default function ProductManager({
  products,
  categories,
  onProductsChange,
  onCategoriesChange,
}: ProductManagerProps) {
  const [form, setForm]           = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<FormState>(emptyForm);
  const [loading, setLoading]     = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [togglingId, setTogglingId]   = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("todas");
  const [newCatName, setNewCatName]       = useState("");
  const [creatingCat, setCreatingCat]     = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  const { uploading, upload } = useImageUpload();

  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef   = useRef<HTMLInputElement>(null);

  function updateForm(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateEditForm(field: keyof FormState, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleImageSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    target: "create" | "edit"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no debe superar 2MB");
      return;
    }
    setError(null);
    try {
      const url = await upload(file);
      if (target === "create") updateForm("imageUrl", url);
      else                     updateEditForm("imageUrl", url);
    } catch {
      setError("Error al subir la imagen");
    }
  }

  function validate(f: FormState): string | null {
    if (!f.name.trim())     return "El nombre es requerido";
    if (!(f.categoryId ?? "").trim()) return "La categoría es requerida";
    if (!f.price.trim() || isNaN(Number(f.price)) || Number(f.price) < 0)
      return "El precio debe ser un número positivo";
    return null;
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      await createCategory(newCatName.trim());
      setNewCatName("");
      onCategoriesChange();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreatingCat(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    setDeletingCatId(id);
    try {
      await deleteCategory(id);
      onCategoriesChange();
    } catch {
      setError("No se puede eliminar una categoría con productos asignados");
    } finally {
      setDeletingCatId(null);
    }
  }

  async function handleCreate() {
    const err = validate(form);
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    try {
      await createProduct({
        name:      form.name.trim(),
        categoryId:  form.categoryId,
        price:     Number(form.price),
        available: true,
        imageUrl:  form.imageUrl || undefined,
      });
      setForm(emptyForm);
      onProductsChange();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditForm({
      name:       product.name,
      categoryId: product.categoryId ?? "",   // <- era category: product.category
      price:      String(product.price),
      imageUrl:   product.imageUrl ?? "",
      requiresKitchen: product.requiresKitchen,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
    setError(null);
  }

  async function handleEdit(id: string) {
    const err = validate(editForm);
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    try {
      await updateProduct(id, {
        name:       editForm.name.trim(),
        categoryId: editForm.categoryId,   // <- era category: editForm.category.trim()
        price:      Number(editForm.price),
        imageUrl:   editForm.imageUrl || undefined,
        requiresKitchen: editForm.requiresKitchen,
      });
      cancelEdit();
      onProductsChange();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(product: Product) {
    setTogglingId(product.id);
    try {
      await updateProductAvailability(product.id, !product.available);
      onProductsChange();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await deleteProduct(id);
      onProductsChange();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = products.filter(
    (p) => filterCategory === "todas" || p.categoryId === filterCategory
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">

    {/* Gestión de categorías */}
    <div className="mb-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Categorías
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1"
          >
            <span className="text-xs text-gray-600">{cat.name}</span>
            <button
              onClick={() => handleDeleteCategory(cat.id)}
              disabled={deletingCatId === cat.id}
              className="text-gray-300 hover:text-red-400 transition-colors text-xs leading-none"
            >
              {deletingCatId === cat.id ? "..." : "×"}
            </button>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-xs text-gray-300">Sin categorías aún</p>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nueva categoría"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
          className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-400 placeholder-gray-300 flex-1"
        />
        <button
          onClick={handleCreateCategory}
          disabled={creatingCat || !newCatName.trim()}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium disabled:opacity-40"
        >
          {creatingCat ? "..." : "Agregar"}
        </button>
      </div>
    </div>

      {/* Formulario nuevo producto */}
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Nuevo producto
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
        <input
          type="text"
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => updateForm("name", e.target.value)}
          className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 placeholder-gray-300"
        />
        <select
          value={form.categoryId}
          onChange={(e) => updateForm("categoryId", e.target.value)}
          className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 text-gray-600"
        >
          <option value="">-</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Precio"
          value={form.price}
          min="0"
          step="0.01"
          onChange={(e) => updateForm("price", e.target.value)}
          className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 placeholder-gray-300"
        />
      </div>

      {/* Dentro del formulario de producto */}
        <label htmlFor="requiresKitchen" className="flex items-center gap-3 cursor-pointer w-fit">
          <span className="text-sm text-gray-700">Requiere preparación en cocina</span>
          <div className="relative">
            <input
              id="requiresKitchen"
              type="checkbox"
              className="sr-only peer"
              checked={form.requiresKitchen}
              onChange={(e) => setForm((f) => ({ ...f, requiresKitchen: e.target.checked }))}
            />
            <div className="w-10 h-6 rounded-full transition-colors peer-checked:bg-amber-500 bg-gray-200" />
            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
        </label>

      {/* Selector de imagen para nuevo producto */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          ref={createFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageSelect(e, "create")}
        />
        <button
          onClick={() => createFileRef.current?.click()}
          disabled={uploading}
          className={`text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {uploading ? "Subiendo..." : "Subir foto"}
        </button>
        {form.imageUrl && (
          <div className="flex items-center gap-2">
            <img
              src={form.imageUrl}
              alt="Vista previa"
              className="w-10 h-10 rounded-lg object-cover border border-gray-200"
            />
            <button
              onClick={() => updateForm("imageUrl", "")}
              className="text-xs text-red-400 hover:text-red-600"
            >
              quitar
            </button>
          </div>
        )}
        <button
          onClick={handleCreate}
          disabled={loading || uploading}
          className={`ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-opacity ${
            loading || uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Guardando..." : "Agregar"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {/* Filtro por categoría */}
      <div className="flex gap-2 mt-4 mb-3 flex-wrap">
        <button
          onClick={() => setFilterCategory("todas")}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            filterCategory === "todas"
              ? "bg-gray-800 text-white border-gray-800"
              : "border-gray-200 text-gray-500 hover:border-gray-400"
          }`}
        >
          Todas
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filterCategory === cat.id
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-200 text-gray-500 hover:border-gray-400"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Lista de productos */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-8">
            No hay productos en esta categoría
          </p>
        ) : (
          filtered.map((product) => (
            <div key={product.id}>
              {editingId === product.id ? (

                /* Fila de edición */
                <div className="border border-gray-100 rounded-xl p-3 mb-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => updateEditForm("name", e.target.value)}
                      className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-400"
                    />
                    <select
                      value={editForm.categoryId}
                      onChange={(e) => updateEditForm("categoryId", e.target.value)}
                      className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-400 text-gray-600"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={editForm.price}
                      min="0"
                      step="0.01"
                      onChange={(e) => updateEditForm("price", e.target.value)}
                      className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-400"
                    />
                  </div>

                {/* Switch requiere cocina */}
                <label htmlFor="requiresKitchen-edit" className="flex items-center gap-3 cursor-pointer w-fit mb-2">
                  <span className="text-sm text-gray-700">Requiere preparación en cocina</span>
                  <div className="relative">
                    <input
                      id="requiresKitchen-edit"
                      type="checkbox"
                      className="sr-only peer"
                      checked={editForm.requiresKitchen}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, requiresKitchen: e.target.checked }))
                      }
                    />
                    <div className="w-10 h-6 rounded-full transition-colors peer-checked:bg-amber-500 bg-gray-200" />
                    <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                </label>

                  {/* Selector de imagen en edición */}
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <input
                      ref={editFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageSelect(e, "edit")}
                    />
                    <button
                      onClick={() => editFileRef.current?.click()}
                      disabled={uploading}
                      className={`text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 ${
                        uploading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {uploading ? "Subiendo..." : editForm.imageUrl ? "Cambiar foto" : "Subir foto"}
                    </button>
                    {editForm.imageUrl && (
                      <div className="flex items-center gap-2">
                        <img
                          src={editForm.imageUrl}
                          alt="Vista previa"
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                        />
                        <button
                          onClick={() => updateEditForm("imageUrl", "")}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          quitar
                        </button>
                      </div>
                    )}
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => handleEdit(product.id)}
                        disabled={loading || uploading}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>

              ) : (

                /* Fila normal con miniatura */
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-none gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        <span className="text-gray-300 text-lg">?</span>
                      </div>
                    )}
                    <span className={`text-sm font-medium truncate ${
                      product.available ? "text-gray-800" : "text-gray-300 line-through"
                    }`}>
                      {product.name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
                      {product.category.name ?? "Sin categoría"}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      L. {Number(product.price).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => handleToggle(product)}
                      disabled={togglingId === product.id}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                        product.available
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      } ${togglingId === product.id ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {product.available ? "Disponible" : "Agotado"}
                    </button>
                    <button
                      onClick={() => startEdit(product)}
                      className="text-xs text-blue-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className={`text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors ${
                        deletingId === product.id ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {deletingId === product.id ? "..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
