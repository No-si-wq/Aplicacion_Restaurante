export type OrderStatus = "pending" | "in_progress" | "ready" | "delivered";
export type TableStatus = "free" | "occupied" | "billed" | "reserved";
export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export interface Cai {
  id: string;
  code: string;
  establishment: string;
  pointOfSale: string;
  documentType: string;
  rangeStart: number;
  rangeEnd: number;
  limitDate: string;
}

export interface Reservation {
  id: string;
  tableId: string;
  name: string;
  date: string;
  partySize: number;
  notes?: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface Table {
  id: string;
  number: string;
  label: string;
  status: TableStatus;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;    
  category: Category; 
  price: number;
  available: boolean;
  imageUrl?: string;
  requiresKitchen: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  notes?: string;
  product: Product;
}

export interface Order {
  id: string;
  tableId: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  table: Table;
  items: OrderItem[];
  invoiceNumber?: number;
  cai?: Cai;
}

// apps/frontend/src/types/cai.admin.ts
export interface CaiAdmin {
  id: string;
  code: string;
  establishment: string;
  pointOfSale: string;
  documentType: string;
  rangeStart: number;
  rangeEnd: number;
  currentNumber: number;
  limitDate: string;
  isActive: boolean;
  userId: string;
  user: { id: string; username: string };
  createdAt: string;
}