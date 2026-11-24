import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Visit Our Store | Mini Super Store",
  description: "Mini Super Store location, timings, contact number and map directions on Red Road, Ladwa, Kurukshetra, Haryana.",
};

const STORE_PHONE = "+91 87082 97764";
const STORE_WHATSAPP = "918708297764";

export default function VisitPage() {
  return (
    <main className="storefront">
      <div className="topline">
        <div className="topline-inner">
          <span>📍 Red Road, Ladwa (Kurukshetra)</span>
          <span className="topline-message">· Open 8:00 AM – 9:00 PM Daily</span>
          <Link href="/" style={{ color: "#d2f5db", fontSize: "0.68rem", fontWeight: 700, marginLeft: "auto" }}>
            ← Back to Store
          </Link>
        </div>
      </div>

      <header className="site-header">
        <Link className="brand" href="/" aria-label="Mini Super Store home">
          <div className="brand-logo-badge" aria-hidden="true">
            <span className="logo-bag">🛍️</span>
            <span className="logo-spark">✨</span>
          </div>
          <span className="brand-copy">
            <strong>
              MINI <em>SUPER</em> STORE
            </strong>
            <small>Red Road, Ladwa, Haryana</small>
          </span>
        </Link>
        <nav className="desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/order">Order Online</Link>
          <Link href="/bulk-order">Bulk Order</Link>
          <Link href="/visit" style={{ color: "#1f5139", fontWeight: 800 }}>Visit Us</Link>
        </nav>
      </header>

      <section className="section-wrap" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
          <p className="section-eyebrow">Local Kiryana & Supermarket</p>
          <h1 style={{ fontSize: "2.4rem", margin: "0.4rem 0 1rem", letterSpacing: "-0.03em" }}>
            Visit Us on Red Road, Ladwa
          </h1>
          <p style={{ color: "#54685a", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2.5rem" }}>
            We look forward to welcoming you at our store. Walk in to pick your groceries in person, or send your list over WhatsApp for convenient curbside pickup and home delivery.
          </p>
        </div>

        <div style={{ maxWidth: "860px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
          <div style={{ padding: "1.8rem", background: "#ffffff", borderRadius: "12px", border: "1px solid #e1e7de" }}>
            <span style={{ fontSize: "2rem" }}>📍</span>
            <h3 style={{ margin: "0.6rem 0 0.3rem" }}>Store Address</h3>
            <p style={{ color: "#4f6356", fontSize: "0.85rem", lineHeight: 1.6 }}>
              <strong>Mini Super Store</strong><br />
              Red Road, Ladwa<br />
              District Kurukshetra, Haryana — 136132<br />
              Landmark: Near Main Red Road Market
            </p>

            <div style={{ marginTop: "1.5rem", borderTop: "1px solid #edf2ec", paddingTop: "1rem" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#1f5139", textTransform: "uppercase" }}>
                🕒 Store Opening Hours
              </span>
              <p style={{ color: "#4f6356", fontSize: "0.8rem", margin: "0.4rem 0 0" }}>
                <strong>Monday to Sunday:</strong> 8:00 AM – 9:00 PM<br />
                Open 7 days a week including public holidays.
              </p>
            </div>
          </div>

          <div style={{ padding: "1.8rem", background: "#ffffff", borderRadius: "12px", border: "1px solid #e1e7de" }}>
            <span style={{ fontSize: "2rem" }}>📞</span>
            <h3 style={{ margin: "0.6rem 0 0.3rem" }}>Contact & Orders</h3>
            <p style={{ color: "#4f6356", fontSize: "0.85rem", lineHeight: 1.6 }}>
              <strong>WhatsApp & Phone:</strong> {STORE_PHONE}<br />
              <strong>Customer Support:</strong> 8:00 AM to 9:00 PM<br />
              <strong>Home Delivery:</strong> Available across Ladwa town.
            </p>

            <div style={{ display: "grid", gap: "0.6rem", marginTop: "1.5rem" }}>
              <a
                href={`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent("Hi Mini Super Store! I need home delivery in Ladwa.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-order-btn"
                style={{ textAlign: "center", padding: "0.75rem" }}
              >
                💬 Chat & Order on WhatsApp ↗
              </a>
              <a
                href={`tel:${STORE_PHONE}`}
                className="button button-quiet"
                style={{ textAlign: "center", borderRadius: "6px" }}
              >
                📞 Call Store Directly
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <Link className="footer-brand" href="/">MINI <em>SUPER</em> STORE</Link>
          <nav className="footer-portals">
            <Link href="/">Home</Link>
            <Link href="/order">Order Online</Link>
            <Link href="/bulk-order">Bulk Order</Link>
            <Link href="/visit">Visit Us</Link>
          </nav>
          <p>© {new Date().getFullYear()} Mini Super Store · Red Road, Ladwa.</p>
        </div>
      </footer>
    </main>
  );
}
