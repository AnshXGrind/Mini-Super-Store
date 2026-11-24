import type { Metadata } from "next";
import Link from "next/link";
import AnnouncementBar from "@/components/store/AnnouncementBar";
import StoreLogo from "@/components/store/StoreLogo";
import BulkOrderWhatsAppCTA from "@/components/wholesale/BulkOrderWhatsAppCTA";
import { getStoreWhatsAppNumber, STORE_MAP_URL } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: "Bulk Order & Wholesale Enquiry | Mini Super Store",
  description: "Wholesale Kiryana and bulk groceries for weddings, caterers, schools, and local shops in Ladwa, Kurukshetra.",
};

export default function BulkOrderPage() {
  const storeWhatsApp = getStoreWhatsAppNumber();
  const weddingWholesaleUrl = `https://wa.me/${storeWhatsApp}?text=${encodeURIComponent(
    "Hello Mini Super Store! I am looking for wedding/event wholesale grocery supplies. Please share bulk price quotes."
  )}`;

  const canteenWholesaleUrl = `https://wa.me/${storeWhatsApp}?text=${encodeURIComponent(
    "Hello Mini Super Store! I need recurring wholesale grocery supplies for our institution/canteen in Ladwa."
  )}`;

  return (
    <main className="storefront">
      <AnnouncementBar />

      <header className="site-header">
        <Link className="brand" href="/" aria-label="Mini Super Store home">
          <StoreLogo />
          <span className="brand-copy">
            <strong>
              MINI <em>SUPER</em> STORE
            </strong>
            <small>Wholesale & Bulk Supplies Division</small>
          </span>
        </Link>
        <nav className="desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/order">Order Online</Link>
          <Link href="/bulk-order" style={{ color: "#1f5139", fontWeight: 800 }}>Bulk Order</Link>
          <Link href="/visit">Visit Us</Link>
        </nav>
      </header>

      <section className="section-wrap" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
          <p className="section-eyebrow">Wholesale & Large Requirements</p>
          <h1 style={{ fontSize: "2.4rem", margin: "0.4rem 0 1rem", letterSpacing: "-0.03em" }}>
            Wholesale Grocery & Bulk Orders in Ladwa
          </h1>
          <p style={{ color: "#54685a", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" }}>
            Whether you are ordering for a wedding, family celebration, langar/bhandara, local canteen or retail restock — get direct wholesale pricing, batch packing, and reliable delivery on Red Road, Ladwa.
          </p>
        </div>

        <div style={{ maxWidth: "880px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.2rem" }}>
          <div style={{ padding: "1.5rem", background: "#ffffff", borderRadius: "10px", border: "1px solid #e1e7de", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "2rem" }}>🎉</span>
              <h3 style={{ margin: "0.8rem 0 0.4rem" }}>Weddings & Celebrations</h3>
              <p style={{ color: "#66786c", fontSize: "0.75rem", lineHeight: 1.5 }}>
                Bulk bags of Shudh Chakki Atta (50 kg), Basmati Rice, Ghee, Cooking Oils, Sugar, Dals and dry fruits at wholesale discount.
              </p>
            </div>
            <a
              href={weddingWholesaleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-order-btn"
              style={{ marginTop: "1.2rem", textAlign: "center" }}
            >
              Enquire for Weddings ↗
            </a>
          </div>

          <div style={{ padding: "1.5rem", background: "#ffffff", borderRadius: "10px", border: "1px solid #e1e7de", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "2rem" }}>🏢</span>
              <h3 style={{ margin: "0.8rem 0 0.4rem" }}>Canteens & Halwais</h3>
              <p style={{ color: "#66786c", fontSize: "0.75rem", lineHeight: 1.5 }}>
                Regular supply contracts of Fortune Mustard Oil 15 L, Dalda Vanaspati, Besan, Maida, MDH Spices, and Tea Leaves.
              </p>
            </div>
            <a
              href={canteenWholesaleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-order-btn"
              style={{ marginTop: "1.2rem", textAlign: "center" }}
            >
              Enquire for Commercial ↗
            </a>
          </div>

          <div style={{ padding: "1.5rem", background: "#ffffff", borderRadius: "10px", border: "1px solid #e1e7de", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "2rem" }}>📦</span>
              <h3 style={{ margin: "0.8rem 0 0.4rem" }}>Packaged Snack Boxes</h3>
              <p style={{ color: "#66786c", fontSize: "0.75rem", lineHeight: 1.5 }}>
                Custom gift hampers and bulk Haldiram&apos;s namkeen &amp; Britannia biscuit gift cartons for festivals and corporate distribution.
              </p>
            </div>
            <a
              href={`https://wa.me/${storeWhatsApp}?text=${encodeURIComponent("Hi Mini Super Store! I need bulk gift hampers and snack boxes.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-order-btn"
              style={{ marginTop: "1.2rem", textAlign: "center" }}
            >
              Enquire for Hampers ↗
            </a>
          </div>
        </div>

        <div style={{ maxWidth: "780px", margin: "2.5rem auto 0" }}>
          <BulkOrderWhatsAppCTA language="en" />
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
          <p>
            © {new Date().getFullYear()} Mini Super Store ·{" "}
            <a href={STORE_MAP_URL} target="_blank" rel="noopener noreferrer">
              Red Road, Ladwa (Kurukshetra)
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
