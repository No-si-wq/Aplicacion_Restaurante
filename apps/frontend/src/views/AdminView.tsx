// views/AdminView.tsx
import { useEffect, useState } from "react";
import { getTables, getProducts, getCategories, getUsers } from "../services/api";
import TableManager from "../components/TableManager";
import ProductManager from "../components/ProductManager";
import ReservationManager from "../components/ReservationManager";
import { CaiManager } from "../components/CaiManager";
import type { Table, Product, Category } from "@restaurante/types";

type Tab = "mesas" | "productos" | "reservas" | "cai";

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<Tab>("mesas");
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);

  useEffect(() => {
    reloadTables();
    reloadProducts();
    getUsers().then(setUsers);
  }, []);

  async function loadCategories() {
    getCategories().then(setCategories);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function reloadTables() {
    getTables().then(setTables);
  }

  function reloadProducts() {
    getProducts().then(setProducts);
  }

  const stats = [
     { label: "Mesas totales",     value: tables.length },
     { label: "Mesas libres",      value: tables.filter((t) => t.status === "free").length },
     { label: "Productos activos", value: products.filter((p) => p.available).length },
     { label: "Productos agotados",value: products.filter((p) => !p.available).length },
   ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* Cabecera */}
      <header className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Panel de administración</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestión de mesas y menú</p>
      </header>

      {/* Tarjetas de resumen
          CAMBIO: grid-cols-4 → grid-cols-2 en móvil, 4 columnas desde sm (≥640 px) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-medium text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs
          CAMBIO: overflow-x-auto para que las pestañas no se corten en pantallas pequeñas */}
      <div className="overflow-x-auto pb-1 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit min-w-full sm:min-w-0">
          {(["mesas", "productos", "reservas", "cai"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-5 py-1.5 rounded-md text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "cai" ? "CAI" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido del tab activo */}
      {activeTab === "mesas" && (
        <TableManager tables={tables} onTablesChange={reloadTables} />
      )}
      {activeTab === "productos" && (
        <ProductManager
          products={products}
          categories={categories}
          onProductsChange={reloadProducts}
          onCategoriesChange={loadCategories}
        />
      )}
      {activeTab === "reservas" && (
        <ReservationManager tables={tables} />
      )}
      {activeTab === "cai" && (
        <CaiManager users={users} />
      )}

    </div>
  );
}