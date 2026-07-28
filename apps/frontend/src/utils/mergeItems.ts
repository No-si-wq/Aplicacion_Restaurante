import type { OrderItem } from "@restaurante/types";

export function mergeItems(items: OrderItem[]): OrderItem[] {
  const map = new Map<string, OrderItem>();

  for (const item of items) {
    const existing = map.get(item.productId);
    if (existing) {
      map.set(item.productId, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        notes: [existing.notes, item.notes].filter(Boolean).join(", ") || undefined,
      });
    } else {
      map.set(item.productId, { ...item });
    }
  }

  return Array.from(map.values());
}