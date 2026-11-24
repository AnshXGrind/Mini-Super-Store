import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_CATEGORIES } from "@/lib/catalogue-data";

export const metadata: Metadata = {
  title: "Store Departments | Mini Super Store",
  description: "Explore all 5 core grocery departments at Mini Super Store, Red Road, Ladwa.",
};

const categoryDetails = [
  {
    slug: "staples-grains",
    icon: "🌾",
    name: "Staples & Grains",
    name_hi: "अनाज, आटा और दालें",
    items: "104+ Products",
    subcategories: ["Atta & Flour", "Rice & Poha", "Dals & Pulses", "Sugar & Salt", "Dry Fruits & Seeds"],
    highlights: "Aashirvaad Chakki Atta, India Gate Basmati, Tata Sampann Dals, Premium Almonds & Cashews",
    bg: "#f3f8f2",
  },
  {
    slug: "oil-ghee-spices-masala",
    icon: "🌶️",
    name: "Oil, Ghee, Spices & Masala",
    name_hi: "तेल, घी और मसाले",
    items: "142+ Products",
    subcategories: ["Cooking Oil & Mustard Oil", "Pure Desi Ghee", "Whole Spices", "Ground Spices", "MDH Masala Mixes", "Pickles & Sauces"],
    highlights: "Fortune Kachi Ghani Mustard Oil, Dhara, Amul Desi Ghee, MDH Deggi Mirch, Catch & Ramdev Spices",
    bg: "#fffbe8",
  },
  {
    slug: "snacks-biscuits-beverages",
    icon: "☕",
    name: "Snacks, Biscuits & Beverages",
    name_hi: "स्नैक्स, बिस्कुट और पेय",
    items: "120+ Products",
    subcategories: ["Haldiram's Namkeen", "Potato Chips", "Britannia & Parle Biscuits", "Tea & Coffee", "Cold Drinks & Juices"],
    highlights: "Haldiram's Aloo Bhujia, Britannia Good Day, Parle-G, Bonn Rusk, Tata Tea Gold, Coca-Cola",
    bg: "#fff3eb",
  },
  {
    slug: "dairy-bakery-breakfast",
    icon: "🥛",
    name: "Dairy, Bakery & Breakfast",
    name_hi: "डेयरी, बेकरी और नाश्ता",
    items: "86+ Products",
    subcategories: ["Fresh Milk & Dairy", "Bonn Breads & Bakery", "Breakfast Cereals", "Maggi Instant Noodles", "Jams & Honey"],
    highlights: "Amul Taaza Milk, Amul Butter, Bonn Bread, Maggi 2-Minute Noodles, Kellogg's Cornflakes",
    bg: "#edf5fa",
  },
  {
    slug: "household-personal-care",
    icon: "🧼",
    name: "Household & Personal Care",
    name_hi: "घरेलू और व्यक्तिगत देखभाल",
    items: "116+ Products",
    subcategories: ["Laundry & Detergents", "Dishwash & Floor Cleaners", "Bathing Soaps & Shampoos", "Oral Dental Care", "Paper & Tissues"],
    highlights: "Surf Excel, Vim Liquid, Harpic, Dettol Soaps, Colgate Strong Teeth, Pooja Wicks",
    bg: "#f8f3fc",
  },
];

export default function DepartmentsPage() {
  return (
    <main className="storefront">
      <div className="topline">
        <div className="topline-inner">
          <span>📍 Red Road, Ladwa (Kurukshetra)</span>
          <span className="topline-message">· 5 Core Store Departments</span>
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
            <small>Departments & Category Guide</small>
          </span>
        </Link>
        <nav className="desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/departments" style={{ color: "#1f5139", fontWeight: 800 }}>Departments</Link>
          <Link href="/products">All 580+ Products</Link>
          <Link href="/bulk-order">Bulk Order</Link>
          <Link href="/visit">Visit Us</Link>
        </nav>
      </header>

      <section className="section-wrap" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
          <p className="section-eyebrow">Everything Under One Roof</p>
          <h1 style={{ fontSize: "2.4rem", margin: "0.4rem 0 1rem", letterSpacing: "-0.03em" }}>
            Store Departments & Aisles
          </h1>
          <p style={{ color: "#54685a", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2.5rem" }}>
            Find every everyday kitchen staple, branded snacks, pure oils, fresh dairy and household hygiene picks neatly categorized for effortless shopping in Ladwa.
          </p>
        </div>

        <div style={{ display: "grid", gap: "1.2rem", maxWidth: "980px", margin: "0 auto" }}>
          {categoryDetails.map((cat, idx) => (
            <article
              key={cat.slug}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.2rem",
                padding: "1.5rem",
                borderRadius: "12px",
                border: "1px solid #e1e7de",
                background: cat.bg,
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: "2.5rem" }}>{cat.icon}</span>
                <span style={{ display: "block", fontSize: "0.65rem", fontWeight: 800, color: "#1f5139", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.4rem" }}>
                  Department 0{idx + 1} · {cat.items}
                </span>
                <h2 style={{ fontSize: "1.4rem", margin: "0.2rem 0" }}>{cat.name}</h2>
                <p style={{ color: "#556b5d", fontSize: "0.85rem", margin: "0 0 0.8rem", fontWeight: 600 }}>{cat.name_hi}</p>
                <p style={{ color: "#4f6356", fontSize: "0.78rem", lineHeight: 1.5 }}>
                  <strong>Key brands & items:</strong> {cat.highlights}
                </p>
              </div>

              <div>
                <strong style={{ fontSize: "0.72rem", color: "#34483a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Aisle Categories:
                </strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                  {cat.subcategories.map((sub) => (
                    <span
                      key={sub}
                      style={{
                        padding: "0.3rem 0.65rem",
                        borderRadius: "999px",
                        background: "#ffffff",
                        border: "1px solid #d4e0d2",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: "#284433",
                      }}
                    >
                      {sub}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: "1.2rem" }}>
                  <Link
                    href={`/products?category=${cat.slug}`}
                    className="button button-primary"
                    style={{ display: "inline-flex", padding: "0.55rem 1.1rem", fontSize: "0.75rem", borderRadius: "6px" }}
                  >
                    Browse {cat.name} Items →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <Link className="footer-brand" href="/">MINI <em>SUPER</em> STORE</Link>
          <nav className="footer-portals">
            <Link href="/">Home</Link>
            <Link href="/products">All Products</Link>
            <Link href="/bulk-order">Bulk Order</Link>
            <Link href="/visit">Visit Us</Link>
          </nav>
          <p>© {new Date().getFullYear()} Mini Super Store · Red Road, Ladwa.</p>
        </div>
      </footer>
    </main>
  );
}
