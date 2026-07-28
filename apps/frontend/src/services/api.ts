import type { Order, Table, Product, Reservation, ReservationStatus, Category } from "@restaurante/types";

const BASE_URL = import.meta.env.VITE_API_URL + "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Mesas ───────────────────────────────────────────────

export function getTables(): Promise<Table[]> {
  return request("/tables");
}

export function updateTableStatus(
  id: string,
  status: Table["status"]
): Promise<Table> {
  return request(`/tables/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ─── Órdenes ─────────────────────────────────────────────

export function getOrders(
  filters?: { status?: string }
): Promise<Order[]> {
  const params = new URLSearchParams(filters as Record<string, string>);
  const query = params.size > 0 ? `?${params}` : "";
  return request(`/orders${query}`);
}

export function getOrder(id: string): Promise<Order> {
  return request(`/orders/${id}`);
}

export function createOrder(data: {
  tableId: string;
  items: { productId: string; quantity: number; notes?: string }[];
}): Promise<Order> {
  return request("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrderStatus(
  id: string,
  status: Order["status"]
): Promise<Order> {
  return request(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteOrder(id: string): Promise<void> {
  return request(`/orders/${id}`, { method: "DELETE" });
}

// ─── Categorías ───────────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE_URL}/categories`);
  if (!res.ok) throw new Error("Error al obtener categorías");
  return res.json();
}

export async function createCategory(name: string): Promise<Category> {
  const res = await fetch(`${BASE_URL}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/categories/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar categoría");
}

// ─── Productos ───────────────────────────────────────────

export function getProducts(
  filters?: { available?: boolean }
): Promise<Product[]> {
  const params = new URLSearchParams(
    Object.entries(filters ?? {}).map(([k, v]) => [k, String(v)])
  );
  const query = params.size > 0 ? `?${params}` : "";
  return request(`/products${query}`);
}

export function createProduct(
  data: {
    name: string;
    categoryId: string;
    price: number;
    available: boolean;
    imageUrl?: string;
    requiresKitchen?: boolean;
  }
): Promise<Product> {
  return request("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    categoryId: string;
    price: number;
    available: boolean;
    imageUrl?: string;
    requiresKitchen?: boolean;
  }>
): Promise<Product> {
  return request(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function updateProductAvailability(
  id: string,
  available: boolean
): Promise<Product> {
  return request(`/products/${id}/availability`, {
    method: "PATCH",
    body: JSON.stringify({ available }),
  });
}

export function deleteProduct(id: string): Promise<void> {
  return request(`/products/${id}`, { method: "DELETE" });
}

// services/api.ts — agregar estas funciones

export function createTable(data: {
  number: string;
  label: string;
}): Promise<Table> {
  return request("/tables", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteTable(id: string): Promise<void> {
  return request(`/tables/${id}`, { method: "DELETE" });
}

// ─── Reservas ────────────────────────────────────────────

export function getTableReservations(tableId: string): Promise<Reservation[]> {
  return request(`/tables/${tableId}/reservations`);
}

export function createReservation(
  tableId: string,
  data: { name: string; date: string; partySize: number; notes?: string }
): Promise<Reservation> {
  return request(`/tables/${tableId}/reservations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus
): Promise<Reservation> {
  return request(`/tables/reservations/${reservationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export interface TopProduct { name: string; quantity: number; revenue: number }
export interface SalesReport {
  from: string; to: string;
  totalOrders: number; totalRevenue: number;
  topProducts: TopProduct[];
}

export function getSalesReport(from: string, to: string): Promise<SalesReport> {
  return request(`/reports/sales?from=${from}&to=${to}`);
}