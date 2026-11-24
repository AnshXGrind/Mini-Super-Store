import type { Metadata } from "next";
import Link from "next/link";
import CancelOrderButton from "@/components/account/CancelOrderButton";
import LogoutButton from "@/components/auth/LogoutButton";
import StoreLogo from "@/components/store/StoreLogo";
import { requireStoreRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import NotificationSettings from "@/components/account/NotificationSettings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account | Mini Super Store",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await requireStoreRole(["customer"]);
  const supabase = await createClient();
  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, preferred_language")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id, status, fulfilment_type, total_amount, customer_name, customer_phone, delivery_address, created_at, order_items(product_name_snapshot, quantity, unit_price, line_total)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready_for_pickup: "Ready for pickup",
    out_for_delivery: "Out for delivery",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <main className="account-page">
      <header className="account-header">
        <Link className="auth-brand" href="/">
          <StoreLogo size={36} />
          <span className="auth-brand-wordmark">MINI <span>SUPER</span> STORE</span>
        </Link>
        <div>
          <Link href="/">Back to store</Link>
          <LogoutButton />
        </div>
      </header>

      <section className="account-content">
        <aside className="account-profile">
          <p className="auth-eyebrow">CUSTOMER ACCOUNT</p>
          <h1>{profile?.full_name || "Your account"}</h1>
          <dl>
            <div><dt>Email</dt><dd>{user.email ?? "Not available"}</dd></div>
            <div><dt>Phone</dt><dd>{profile?.phone || "Not added"}</dd></div>
            <div><dt>Language</dt><dd>{profile?.preferred_language === "hi" ? "Hindi" : "English"}</dd></div>
          </dl>
          <NotificationSettings />
        </aside>

        <section className="account-orders" aria-labelledby="orders-title">
          <div className="account-orders-heading">
            <div>
              <p className="auth-eyebrow">PURCHASES</p>
              <h2 id="orders-title">Order history</h2>
            </div>
            <Link href="/">Continue shopping</Link>
          </div>

          {!orders || orders.length === 0 ? (
            <div className="account-empty">
              <span aria-hidden="true">🛍️</span>
              <h3>No orders yet</h3>
              <p>Your pickup and delivery orders will appear here.</p>
              <Link href="/">Browse the store</Link>
            </div>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <header>
                    <div>
                      <small>Order {order.id.slice(0, 8).toUpperCase()}</small>
                      <strong>{new Intl.DateTimeFormat("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Kolkata",
                      }).format(new Date(order.created_at))}</strong>
                    </div>
                    <span className={`order-status status-${order.status}`}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </header>
                  <div className="order-card-body">
                    <div className="order-items">
                      {order.order_items.map((item, index) => (
                        <div key={`${order.id}-${index}`}>
                          <span>{item.product_name_snapshot}</span>
                          <small>Qty {item.quantity} × ₹{Number(item.unit_price).toFixed(2)}</small>
                        </div>
                      ))}
                    </div>
                    <aside>
                      <small>{order.fulfilment_type === "delivery" ? "Delivery" : "Store pickup"}</small>
                      <strong>₹{Number(order.total_amount).toFixed(2)}</strong>
                      {order.delivery_address && <p>{order.delivery_address}</p>}
                      {(order.status === "pending" || order.status === "confirmed") && (
                        <CancelOrderButton orderId={order.id} />
                      )}
                    </aside>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}