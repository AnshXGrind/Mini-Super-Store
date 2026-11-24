"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/components/auth/LogoutButton";
import StoreLogo from "@/components/store/StoreLogo";
import { getStaffNextStatuses } from "@/lib/order-status";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

type StaffOrder = {
  id: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  fulfilment_type: "pickup" | "delivery";
  delivery_address: string | null;
  customer_note: string | null;
  staff_note: string | null;
  total_amount: number;
  created_at: string;
  order_items: Array<{
    product_name_snapshot: string;
    quantity: number;
  }>;
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function StaffDashboard() {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [filter, setFilter] = useState<"active" | "ready" | "completed" | "all">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      let hasSession = false;
      try {
        const { data: claimsData } = await supabase.auth.getClaims();
        if (claimsData?.claims) hasSession = true;
      } catch {}
      if (!hasSession) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) hasSession = true;
      }
      if (!hasSession) throw new Error("Your session has expired.");

      const { data, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, customer_name, customer_phone, fulfilment_type, delivery_address, customer_note, staff_note, total_amount, created_at, order_items(product_name_snapshot, quantity)")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      setOrders((data ?? []).map((order) => ({
        ...order,
        total_amount: Number(order.total_amount),
        order_items: order.order_items ?? [],
        staff_note: order.staff_note ?? null,
      })) as StaffOrder[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadOrders());
  }, [loadOrders]);

  function allowedNextStatuses(order: StaffOrder): OrderStatus[] {
    return getStaffNextStatuses(order.status, order.fulfilment_type);
  }

  async function updateOrder(order: StaffOrder, status: OrderStatus) {
    setBusyId(order.id);
    setError("");
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("update_store_order_status", {
        p_order_id: order.id,
        p_status: status,
        p_staff_note: notes[order.id]?.trim() || null,
      });
      if (rpcError) throw rpcError;
      await loadOrders();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The order could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (filter === "active") return ["pending", "confirmed", "preparing"].includes(order.status);
    if (filter === "ready") return ["ready_for_pickup", "out_for_delivery"].includes(order.status);
    if (filter === "completed") return ["completed", "cancelled"].includes(order.status);
    return true;
  });

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="auth-brand" href="/">
          <StoreLogo size={36} />
          <span className="auth-brand-wordmark">MINI <span>SUPER</span> STORE</span>
        </Link>
        <div><Link href="/">View store</Link><LogoutButton /></div>
      </header>
      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div><p className="auth-eyebrow">STAFF WORKSPACE</p><h1>Assigned orders</h1></div>
          <button type="button" className="dashboard-refresh" onClick={() => void loadOrders()} disabled={loading}>Refresh</button>
        </div>
        <div className="dashboard-filters" aria-label="Order filters">
          {([
            ["active", "Active"],
            ["ready", "Ready / delivery"],
            ["completed", "Completed"],
            ["all", "All orders"],
          ] as const).map(([value, label]) => (
            <button type="button" key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        {error && <p className="dashboard-error" role="alert">{error}</p>}
        {loading ? (
          <div className="dashboard-loading" role="status">Loading assigned orders…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="dashboard-empty"><span>✓</span><h2>No matching orders</h2><p>Assigned orders for this filter will appear here.</p></div>
        ) : (
          <div className="staff-order-list">
            {filteredOrders.map((order) => {
              const nextStatuses = allowedNextStatuses(order);
              return (
                <article className="staff-order-card" key={order.id}>
                  <header>
                    <div><small>{order.id.slice(0, 8).toUpperCase()}</small><strong>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(order.created_at))}</strong></div>
                    <span className={`order-status status-${order.status}`}>{statusLabels[order.status]}</span>
                  </header>
                  <div className="staff-order-body">
                    <div>
                      <h2>{order.customer_name}</h2>
                      <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
                      <p><strong>{order.fulfilment_type === "delivery" ? "Delivery" : "Store pickup"}</strong>{order.delivery_address && <> · {order.delivery_address}</>}</p>
                      {order.customer_note && <p className="staff-customer-note">Customer: {order.customer_note}</p>}
                    </div>
                    <div className="staff-order-items">
                      {order.order_items.map((item, index) => (
                        <span key={`${order.id}-${index}`}>{item.quantity} × {item.product_name_snapshot}</span>
                      ))}
                    </div>
                    <strong className="staff-order-total">₹{order.total_amount.toFixed(2)}</strong>
                  </div>
                  {nextStatuses.length > 0 && (
                    <div className="staff-order-actions">
                      <label>Staff note
                        <input
                          value={notes[order.id] ?? order.staff_note ?? ""}
                          onChange={(event) => setNotes((current) => ({ ...current, [order.id]: event.target.value }))}
                          maxLength={500}
                          placeholder="Optional note"
                        />
                      </label>
                      {nextStatuses.map((status) => (
                        <button type="button" key={status} disabled={busyId === order.id} onClick={() => void updateOrder(order, status)}>
                          {busyId === order.id ? "Updating…" : `Mark ${statusLabels[status]}`}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
