import type { 
  Order, Table, Product, Reservation, ReservationStatus, 
  Category, CaiAdmin, TicketTemplateLayout, Shift,
} from "@restaurante/types";

const BASE_URL = import.meta.env.VITE_API_URL + "/api";
export const getCais = () => request<CaiAdmin[]>("/cai");

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Autenticación ───────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  role: "ADMIN" | "VENDEDOR";
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// ─── Usuarios ────────────────────────────────────────────

export interface AppUser {
  id: string;
  username: string;
  role: "ADMIN" | "VENDEDOR";
  createdAt: string;
}

export function getUsers(): Promise<AppUser[]> {
  return request("/users");
}

export function createUser(data: {
  username: string;
  password: string;
  role: "ADMIN" | "VENDEDOR";
}): Promise<AppUser> {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUser(
  id: string,
  data: Partial<{ username: string; password: string; role: "ADMIN" | "VENDEDOR" }>
): Promise<AppUser> {
  return request(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteUser(id: string): Promise<void> {
  return request(`/users/${id}`, { method: "DELETE" });
}

// ─── Mesas ───────────────────────────────────────────────

export function getTables(): Promise<Table[]> {
  return request("/tables");
}

export const billTable = (tableId: string) =>
  request<{ table: Table; orders: Order[] }>(`/tables/${tableId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "billed" }),
  });

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

export interface Invoice {
  caiId: string;
  invoiceNumber: number;
  formattedNumber: string;
  table: Table;
  billedAt: string;
  orders: Order[];
  total: number;
}

export function getInvoices(filters?: {
  from?: string;
  to?: string;
  search?: string;
}): Promise<Invoice[]> {
  const params = new URLSearchParams(
    Object.entries(filters ?? {}).filter(([, v]) => v !== undefined) as [string, string][]
  );
  const query = params.size > 0 ? `?${params}` : "";
  return request(`/orders/invoices${query}`);
}

// ─── Categorías ───────────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  return request("/categories");
}

export async function createCategory(name: string): Promise<Category> {
  return request("/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  return request(`/categories/${id}`, { method: "DELETE" });
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

export interface DayOrder {
  invoiceNumber: number;
  tableLabel: string;
  importe: number;
  isv: number;
  total: number;
}
export interface DaySales {
  date: string;
  orders: DayOrder[];
  subtotal: { importe: number; isv: number; total: number };
}

export interface SalesReport {
  from: string | null;
  to: string | null;
  shift: { name: string; openedAt: string; closedAt: string | null } | null; // NUEVO
  salesByDay: DaySales[];
  grandTotal: { importe: number; isv: number; total: number };
}

export function getSalesReport(from: string, to: string): Promise<SalesReport> {
  return request(`/reports/sales?from=${from}&to=${to}`);
}

export function getSalesReportByShift(shiftId: string): Promise<SalesReport> {
  return request(`/reports/sales?shiftId=${shiftId}`);
}

export interface ProductReportItem {
  productId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  importe: number;
  isv: number;
  total: number;
}

export interface ProductsSalesReport {
  from: string | null;
  to: string | null;
  shift: { name: string; openedAt: string; closedAt: string | null } | null; // NUEVO
  products: ProductReportItem[];
  grandTotal: { quantity: number; importe: number; isv: number; total: number };
}

export function getProductsReport(from: string, to: string): Promise<ProductsSalesReport> {
  return request(`/reports/products?from=${from}&to=${to}`);
}

export function getProductsReportByShift(shiftId: string): Promise<ProductsSalesReport> {
  return request(`/reports/products?shiftId=${shiftId}`);
}

export const createCai = (data: {
  code: string;
  establishment: string;
  pointOfSale: string;
  documentType?: string;
  rangeStart: number;
  rangeEnd: number;
  limitDate: string;
  userId: string;
}) => request<CaiAdmin>("/cai", { method: "POST", body: JSON.stringify(data) });

export const updateCai = (id: string, data: Partial<Pick<CaiAdmin, "isActive" | "limitDate" | "rangeEnd">>) =>
  request<CaiAdmin>(`/cai/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteCai = (id: string) => request<void>(`/cai/${id}`, { method: "DELETE" });

// Tipos de la plantilla de ticket (coincide con el modelo Prisma)
export interface TicketTemplate {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  layout: TicketTemplateLayout;
  createdAt: string;
  updatedAt: string;
}

export const getTicketTemplates = () =>
  request<TicketTemplate[]>("/ticket-templates");

export const getActiveTicketTemplate = () =>
  request<TicketTemplate>("/ticket-templates/active");

export const createTicketTemplate = (name: string, layout: TicketTemplateLayout) =>
  request<TicketTemplate>("/ticket-templates", {
    method: "POST",
    body: JSON.stringify({ name, layout }),
  });

export const updateTicketTemplate = (
  id: string,
  data: { name?: string; layout?: TicketTemplateLayout }
) =>
  request<TicketTemplate>(`/ticket-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const activateTicketTemplate = (id: string) =>
  request<TicketTemplate>(`/ticket-templates/${id}/activate`, {
    method: "PATCH",
  });

// ─── Turnos ──────────────────────────────────────────────

export const getCurrentShift = () => request<Shift | null>("/shifts/current");

export const openShift = (userId: string) =>
  request<Shift>("/shifts/open", { method: "POST", body: JSON.stringify({ userId }) });

export const getNextShiftName = () => request<{ name: string }>("/shifts/next-name");

export const getOpenShifts = () => request<Shift[]>("/shifts/open");

export const closeShift = (id: string) =>
  request<Shift>(`/shifts/${id}/close`, { method: "PATCH" });

export const getShifts = () => request<Shift[]>("/shifts");