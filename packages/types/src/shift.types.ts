export interface Shift {
  id: string;
  name: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
  openedById: string;
  openedBy?: { username: string };
  closedBy?: { username: string } | null;
  _count?: { orders: number };
}