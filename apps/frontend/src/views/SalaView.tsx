// views/SalaView.tsx
import { useEffect, useState } from "react";
import { getTables, getProducts, createOrder, billTable, updateTableStatus } from "../services/api";
import { useOrders } from "../hooks/useOrders";
import StatusBadge from "../components/StatusBadge";
import { InvoiceTemplate } from "../components/InvoiceTemplate";
import { mergeItems } from "../utils/mergeItems";
import type { Table, Product } from "@restaurante/types";
import type { Order } from "@restaurante/types";

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

// Pasos de navegación solo en móvil/tablet
type MobileStep = "tables" | "menu" | "cart";

export default function SalaView() {
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // NUEVO: controla el paso activo en móvil/tablet
  const [mobileStep, setMobileStep] = useState<MobileStep>("tables");
  const [billing, setBilling] = useState(false);
  const [billedOrders, setBilledOrders] = useState<Order[] | null>(null);

  const { orders, isConnected } = useOrders();

  useEffect(() => {
    getTables().then(setTables);
    getProducts({ available: true }).then(setProducts);
  }, []);

  useEffect(() => {
    setTables((prev) =>
      prev.map((t) => {
        const hasActive = orders.some(
          (o) => o.tableId === t.id && !o.invoiceNumber
        );
        return hasActive && t.status === "free"
          ? { ...t, status: "occupied" }
          : t;
      })
    );
  }, [orders]);

  const activeOrders = selectedTable
    ? orders.filter(
        (o) => o.tableId === selectedTable.id && !o.invoiceNumber
      )
    : [];

  const activeOrdersTotal = activeOrders?.reduce(
    (acc, o) =>
      acc + o.items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0),
    0
  );

  const categories = [
    ...new Map(
      products
        .filter((p) => p.category)
        .map((p) => [p.category!.id, p.category!])
    ).values(),
  ];

  function selectTable(table: Table) {
    setSelectedTable((prev) => (prev?.id === table.id ? null : table));
    setCart([]);
    setFeedback(null);
    setSelectedCategory(null);
    // NUEVO: avanza al menú automáticamente al elegir una mesa en móvil
    setMobileStep("menu");
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1, notes: "" }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity < 1) { removeFromCart(productId); return; }
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  }

  function updateNotes(productId: string, notes: string) {
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, notes } : i))
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  async function sendOrder() {
    if (!selectedTable || cart.length === 0) return;
    setSending(true);
    try {
      await createOrder({
        tableId: selectedTable.id,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          notes: i.notes || undefined,
        })),
      });
      setCart([]);
      setFeedback("Orden enviada a cocina");
      setTimeout(() => setFeedback(null), 3000);
      setMobileStep("tables"); // vuelve al inicio en móvil tras enviar
    } catch {
      setFeedback("Error al enviar la orden");
    } finally {
      setSending(false);
    }
  }

  const cartTotal = cart.reduce(
    (acc, i) => acc + Number(i.product.price) * i.quantity,
    0
  );

  async function handleBillTable() {
    if (!selectedTable) return;
    setBilling(true);
    setFeedback(null);
    try {
      const result = await billTable(selectedTable.id);
      setBilledOrders(result.orders);
    } catch {
      setFeedback("Error al facturar la mesa (verifica el CAI del usuario)");
    } finally {
      setBilling(false);
    }
  }

  // ─── Secciones reutilizables ──────────────────────────────────────────────

  const TablesSection = (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Mesas
      </p>
      <div className="grid grid-cols-2 gap-2">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => selectTable(table)}
            className={`
              bg-white rounded-xl p-3 text-left border transition-all
              ${selectedTable?.id === table.id
                ? "border-blue-400 ring-2 ring-blue-100"
                : "border-gray-200 hover:border-gray-300"
              }
              ${table.status === "occupied" ? "border-l-4 border-l-amber-400" : ""}
              ${table.status === "billed"   ? "border-l-4 border-l-red-400"   : ""}
              ${table.status === "reserved" ? "border-l-4 border-l-purple-400" : ""}
            `}
          >
            <p className="text-base font-medium text-gray-900">
              Mesa {table.number}
            </p>
            <p className="text-xs text-gray-400 mb-2">{table.label}</p>
            <StatusBadge status={table.status} />
          </button>
        ))}
      </div>
    </div>
  );

  const MenuSection = (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Menú
      </p>
      {!selectedTable ? (
        <div className="text-center text-sm text-gray-300 py-16 border border-dashed border-gray-200 rounded-xl">
          Selecciona una mesa
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pills de categorías */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedCategory === null
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedCategory === category.id
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Productos */}
          {(selectedCategory
            ? categories.filter((c) => c.id === selectedCategory)
            : categories
          ).map((category) => (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {category.name}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-1 mb-4">
                {products
                  .filter((p) => p.category.id === category.id)
                  .map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="w-full flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100 hover:border-gray-300 transition-colors text-left"
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          L. {Number(product.price).toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const CartSection = (
    <div>
      {/* Cuenta corriente */}
      {activeOrders.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Cuenta — Mesa {selectedTable?.number}
          </p>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <ul className="space-y-2 mb-3">
              {mergeItems(activeOrders.flatMap((o) => o.items)).map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-none last:pb-0"
                >
                  <div>
                    <span className="font-medium text-gray-800 mr-2">{item.quantity}x</span>
                    <span className="text-gray-700">{item.product.name}</span>
                    {item.notes && (
                      <p className="text-xs text-amber-600 mt-0.5">{item.notes}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    L. {(Number(item.product.price) * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
              <span className="text-gray-400">Total</span>
              <span className="font-semibold text-gray-800">
                L. {activeOrdersTotal.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleBillTable}
              disabled={billing}
              className={`w-full mt-3 py-2.5 rounded-lg text-sm font-medium transition-opacity ${
                billing
                  ? "opacity-50 cursor-not-allowed bg-terracota-50 text-terracota-700"
                  : "bg-terracota-50 text-terracota-700 hover:bg-terracota-100"
              }`}
            >
              {billing ? "Facturando..." : "Facturar mesa"}
            </button>
          </div>
        </div>
      )}

      {/* Nueva orden / carrito */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          {activeOrders.length > 0 ? "Agregar más productos" : "Nueva orden"}
        </p>
        {!selectedTable ? (
          <div className="text-center text-sm text-gray-300 py-16 border border-dashed border-gray-200 rounded-xl">
            Selecciona una mesa
          </div>
        ) : cart.length === 0 ? (
          <div className="text-center text-sm text-gray-300 py-16 border border-dashed border-gray-200 rounded-xl">
            Agrega productos del menú
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="space-y-3 mb-4">
              {cart.map((item) => (
                <div key={item.product.id} className="border-b border-gray-50 pb-3 last:border-none">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-gray-800">{item.product.name}</span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      quitar
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-md bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 flex items-center justify-center"
                    >−</button>
                    <span className="text-sm font-medium text-gray-800 w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 flex items-center justify-center"
                    >+</button>
                    <span className="text-xs text-gray-400 ml-auto">
                      L. {(Number(item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Notas (sin sal, bien cocido...)"
                    value={item.notes}
                    onChange={(e) => updateNotes(item.product.id, e.target.value)}
                    className="w-full text-xs text-gray-500 bg-gray-50 rounded-md px-2 py-1.5 border border-gray-100 placeholder-gray-300 focus:outline-none focus:border-gray-300"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm border-t border-gray-100 pt-3 mb-4">
              <span className="text-gray-400">Total</span>
              <span className="font-medium text-gray-800">L. {cartTotal.toFixed(2)}</span>
            </div>
            {feedback && (
              <p className={`text-xs text-center mb-3 ${
                feedback.startsWith("Error") ? "text-red-500" : "text-green-600"
              }`}>
                {feedback}
              </p>
            )}
            <button
              onClick={sendOrder}
              disabled={sending}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-opacity ${
                sending
                  ? "opacity-50 cursor-not-allowed bg-blue-50 text-blue-700"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {sending ? "Enviando..." : "Enviar a cocina"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* Cabecera */}
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* NUEVO: botón "Atrás" en móvil/tablet cuando no estamos en el primer paso */}
          {mobileStep !== "tables" && (
            <button
              onClick={() =>
                setMobileStep(mobileStep === "cart" ? "menu" : "tables")
              }
              className="lg:hidden text-gray-400 hover:text-gray-600 mr-1"
              aria-label="Volver"
            >
              ←
            </button>
          )}
          <h1 className="text-xl font-medium text-gray-900">
            {/* NUEVO: título dinámico en móvil según el paso */}
            <span className="lg:hidden">
              {mobileStep === "tables" && "Vista de sala"}
              {mobileStep === "menu"   && `Mesa ${selectedTable?.number} — Menú`}
              {mobileStep === "cart"   && `Mesa ${selectedTable?.number} — Orden`}
            </span>
            <span className="hidden lg:inline">Vista de sala</span>
          </h1>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full ${
            isConnected
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {isConnected ? "● En vivo" : "○ Desconectado"}
        </span>
      </header>

      {/* ── Layout DESKTOP (lg ≥ 1024 px): 3 columnas como antes ── */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4">
        <div>{TablesSection}</div>
        <div>{MenuSection}</div>
        <div>{CartSection}</div>
      </div>

      {/* ── Layout TABLET (md 768-1023 px): 2 columnas ── */}
      {/*   Izquierda: mesas | Derecha: menú o carrito con tabs   */}
      <div className="hidden md:grid md:grid-cols-2 lg:hidden gap-4">
        <div>{TablesSection}</div>
        <div>
          {/* Mini-tabs Menú / Orden */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
            {(["menu", "cart"] as const).map((step) => (
              <button
                key={step}
                onClick={() => setMobileStep(step)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mobileStep === step
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {step === "menu" ? "Menú" : `Orden${cart.length > 0 ? ` (${cart.length})` : ""}`}
              </button>
            ))}
          </div>
          {mobileStep !== "tables" && (mobileStep === "menu" ? MenuSection : CartSection)}
          {mobileStep === "tables" && MenuSection}
        </div>
      </div>

      {/* ── Layout MÓVIL (< 768 px): un paso a la vez ── */}
      <div className="md:hidden">
        {mobileStep === "tables" && TablesSection}
        {mobileStep === "menu"   && MenuSection}
        {mobileStep === "cart"   && CartSection}

        {/* Barra inferior fija: botón "Ver orden" cuando hay ítems en el carrito */}
        {mobileStep === "menu" && selectedTable && cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg">
            <button
              onClick={() => setMobileStep("cart")}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center justify-between px-4"
            >
              <span className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                {cart.length}
              </span>
              <span>Ver orden</span>
              <span>L. {cartTotal.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>

      {billedOrders && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 print:bg-transparent print:p-0 print:static">
          <div className="bg-white rounded-xl p-4 max-h-[90vh] overflow-y-auto print:rounded-none print:max-h-none print:overflow-visible">
          <button
            onClick={async () => {
              if (selectedTable) {
                await updateTableStatus(selectedTable.id, "free");
              }
              setBilledOrders(null);
              setSelectedTable(null);
              setMobileStep("tables");
              getTables().then(setTables);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 mb-2 print:hidden"
          >
            ← Cerrar
          </button>
            <InvoiceTemplate orders={billedOrders} />
          </div>
        </div>
      )}

    </div>
  );
}