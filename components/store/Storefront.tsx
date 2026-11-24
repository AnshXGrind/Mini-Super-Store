"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BulkOrderWhatsAppCTA from "@/components/wholesale/BulkOrderWhatsAppCTA";
import ShoppingCart from "@/components/store/ShoppingCart";
import type { PublicCategory, PublicOffer, PublicProduct } from "@/app/page";
import { parseStoreCart } from "@/lib/cart";
import { shouldLoadProductImageDirectly } from "@/lib/product-image";

type Language = "en" | "hi";

type CategoryMeta = {
  icon: string;
  tone: string;
  enNote: string;
  hiNote: string;
};

const categoryMetaMap: Record<string, CategoryMeta> = {
  "staples-grains": {
    icon: "🌾",
    tone: "mint",
    enNote: "Atta, Dal, Rice & Dry Fruits",
    hiNote: "आटा, दाल, चावल व मेवे",
  },
  "oil-ghee-spices-masala": {
    icon: "🌶️",
    tone: "yellow",
    enNote: "Mustard Oils, Desi Ghee & Spices",
    hiNote: "सरसों तेल, देसी घी व मसाले",
  },
  "snacks-biscuits-beverages": {
    icon: "☕",
    tone: "peach",
    enNote: "Haldiram's, Britannia & Cold Drinks",
    hiNote: "हल्दीराम नमकीन, बिस्कुट व पेय",
  },
  "dairy-bakery-breakfast": {
    icon: "🥛",
    tone: "blue",
    enNote: "Amul Milk, Bread & Maggi",
    hiNote: "अमूल दूध, ब्रेड व नाश्ता",
  },
  "household-personal-care": {
    icon: "🧼",
    tone: "lavender",
    enNote: "Surf Excel, Cleaners & Care",
    hiNote: "सफ़ाई और व्यक्तिगत देखभाल",
  },
};

const defaultMeta: CategoryMeta = {
  icon: "🛒",
  tone: "mint",
  enNote: "Store Essentials",
  hiNote: "दुकान की ज़रूरी चीज़ें",
};

const POPULAR_BRANDS = [
  "All",
  "Haldiram's",
  "Britannia",
  "Parle",
  "Bonn",
  "MDH",
  "Catch",
  "Ramdev",
  "Fortune",
  "Dhara",
  "Amul",
  "Tata",
  "Aashirvaad",
  "Maggi",
];

const INITIAL_PAGE_SIZE = 36;
const STORE_WHATSAPP_NUMBER = "919896330279";

export default function Storefront({
  categories,
  products,
  offers,
}: {
  categories: PublicCategory[];
  products: PublicProduct[];
  offers: PublicOffer[];
}) {
  const [language, setLanguage] = useState<Language>("en");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [activeBrand, setActiveBrand] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [displayLimit, setDisplayLimit] = useState(INITIAL_PAGE_SIZE);

  const [cartHydrated, setCartHydrated] = useState(false);
  const [offline, setOffline] = useState(false);
  const isHindi = language === "hi";

  useEffect(() => {
    function updateNetworkStatus() {
      setOffline(!navigator.onLine);
    }
    updateNetworkStatus();
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
  }, []);

  useEffect(() => {
    let restored: Record<string, number> = {};
    try {
      restored = parseStoreCart(window.localStorage.getItem("mini-super-store-cart"));
    } catch {
      // Memory fallback
    }
    queueMicrotask(() => {
      setCart(restored);
      setCartHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    const key = "mini-super-store-cart";
    const serialized = JSON.stringify(cart);
    try {
      if (window.localStorage.getItem(key) !== serialized) {
        window.localStorage.setItem(key, serialized);
      }
    } catch {
      // Ignored
    }
  }, [cart, cartHydrated]);

  useEffect(() => {
    function syncFromStorage(event: StorageEvent) {
      if (event.key !== "mini-super-store-cart") return;
      setCart(parseStoreCart(event.newValue));
    }
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setDisplayLimit(INITIAL_PAGE_SIZE);
    });
  }, [activeCategory, activeSubcategory, activeBrand, search]);

  function addToCart(productId: string) {
    setCart((current) => ({
      ...current,
      [productId]: Math.min(100, (current[productId] ?? 0) + 1),
    }));
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = Math.min(100, quantity);
      }
      return next;
    });
  }

  // Derive department cards from active categories
  const departments = useMemo(() => {
    return categories.map((category) => {
      const meta = categoryMetaMap[category.slug] ?? defaultMeta;
      const count = products.filter(
        (p) =>
          p.category_slug === category.slug ||
          p.category_id === category.id ||
          p.category_name?.toLowerCase() === category.name.toLowerCase(),
      ).length;

      return {
        id: category.slug,
        categoryId: category.id,
        slug: category.slug,
        icon: meta.icon,
        title: category.name,
        hindiTitle: category.name_hi || category.name,
        description: category.description || "",
        hindiDescription: category.description_hi || category.description || "",
        note: `${count} items · ${meta.enNote}`,
        hindiNote: `${count} सामान · ${meta.hiNote}`,
        tone: meta.tone,
        count,
      };
    });
  }, [categories, products]);

  // Subcategories available for current category selection
  const availableSubcategories = useMemo(() => {
    const relevantProducts =
      activeCategory === "all"
        ? products
        : products.filter(
            (p) =>
              p.category_slug === activeCategory ||
              p.category_id === activeCategory ||
              categories.find((c) => c.slug === activeCategory)?.id === p.category_id,
          );

    const subcats = new Set<string>();
    for (const p of relevantProducts) {
      if (p.subcategory && p.subcategory.trim()) {
        subcats.add(p.subcategory.trim());
      }
    }
    return Array.from(subcats).sort();
  }, [activeCategory, categories, products]);

  // Filtered products list based on category, subcategory, brand, and search
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();

    return products.filter((product) => {
      // Category filter
      if (activeCategory !== "all") {
        const matchesSlug = product.category_slug === activeCategory;
        const matchesId = product.category_id === activeCategory;
        const currentCategory = categories.find((c) => c.slug === activeCategory);
        const matchesCatObj = currentCategory && product.category_id === currentCategory.id;
        const matchesCatName =
          currentCategory &&
          product.category_name?.toLowerCase() === currentCategory.name.toLowerCase();

        if (!matchesSlug && !matchesId && !matchesCatObj && !matchesCatName) {
          return false;
        }
      }

      // Subcategory filter
      if (activeSubcategory !== "all") {
        if (product.subcategory?.trim().toLowerCase() !== activeSubcategory.toLowerCase()) {
          return false;
        }
      }

      // Brand filter
      if (activeBrand !== "All") {
        if (
          !product.brand ||
          product.brand.toLowerCase() !== activeBrand.toLowerCase()
        ) {
          return false;
        }
      }

      // Search term
      if (!term) return true;

      const searchableText = [
        product.name,
        product.name_hi,
        product.sku,
        product.brand,
        product.subcategory,
        product.pack_size,
        product.category_name,
        product.description,
        product.description_hi,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchableText.includes(term);
    });
  }, [activeBrand, activeCategory, activeSubcategory, categories, products, search]);

  const pagedProducts = useMemo(() => {
    return visibleProducts.slice(0, displayLimit);
  }, [visibleProducts, displayLimit]);

  function handleSelectCategory(catSlug: string) {
    setActiveCategory(catSlug);
    setActiveSubcategory("all");
    const target = document.getElementById("catalogue");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <main className="storefront">
      {offline && (
        <div className="network-banner" role="status">
          {isHindi
            ? "आप ऑफ़लाइन हैं। सहेजे गए कार्ट आइटम उपलब्ध रहेंगे।"
            : "You are offline. Saved cart items remain available in your browser."}
        </div>
      )}

      {/* Clean Topline for Customers */}
      <div className="topline">
        <div className="topline-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📍 {isHindi ? "रेड रोड, लाडवा (कुरुक्षेत्र)" : "Red Road, Ladwa (Kurukshetra)"}</span>
            <span className="topline-message">
              · {isHindi ? "दुकान समय: सुबह 8 से रात 9 बजे" : "Open 8:00 AM – 9:00 PM"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginLeft: "auto" }}>
            <a
              href={`https://wa.me/${STORE_WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#d2f5db", fontSize: "0.68rem", fontWeight: 700, textDecoration: "none" }}
            >
              💬 WhatsApp: +91 98963 30279
            </a>
            <div className="language-switch" aria-label="Choose language">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                aria-pressed={!isHindi}
              >
                EN
              </button>
              <span aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                aria-pressed={isHindi}
              >
                हिंदी
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header with Logo & Dedicated Page Navigation */}
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
            <small>
              {isHindi ? "लाडवा का अपना किराना सुपर स्टोर" : "Everyday Grocery & Household Superstore"}
            </small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/">{isHindi ? "होम" : "Home"}</Link>
          <Link href="/departments">{isHindi ? "विभाग" : "Departments"}</Link>
          <Link href="/products">{isHindi ? "सभी सामान" : "All Products"}</Link>
          <Link href="/bulk-order">{isHindi ? "थोक आर्डर" : "Bulk Order"}</Link>
          <Link href="/visit">{isHindi ? "दुकान पर आएँ" : "Visit Us"}</Link>
        </nav>

        <div className="header-actions">
          <ShoppingCart
            language={language}
            products={products}
            cart={cart}
            setCart={setCart}
          />
          <Link className="header-visit" href="/visit">
            {isHindi ? "दुकान पता" : "Store Location"}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-content">
          <div className="hero-kicker">
            <span className="kicker-dot" />
            {isHindi ? "लाडवा में आपका भरोसेमंद किराना स्टोर" : "Your Trusted Grocery Store in Ladwa"}
          </div>
          <h1>
            {isHindi ? (
              <>
                किराने से लेकर घर की हर ज़रूरत,
                <br />
                <span>580+ उत्पाद एक ही जगह।</span>
              </>
            ) : (
              <>
                Fresh groceries & household staples,
                <br />
                <span>580+ items ready for quick delivery.</span>
              </>
            )}
          </h1>
          <p className="hero-description">
            {isHindi
              ? "हल्दीराम नमकीन, ब्रिटानिया व पारले बिस्कुट, एमडीएच व रामदेव मसाले, फॉर्च्यून व धारा सरसों तेल, शुद्ध देसी घी और राशन का हर सामान।"
              : "Shop top brands: Haldiram's namkeen & chips, Britannia & Parle biscuits, MDH & Catch masalas, Fortune & Dhara pure mustard oils, Amul dairy, and complete kitchen staples."}
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/products">
              {isHindi ? "पूरा कैटलॉग देखें (580+ सामान)" : "Browse Full Catalogue (580+ items)"}
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button-quiet" href="/bulk-order">
              {isHindi ? "थोक खरीदारी / शादी-ब्याह पूछताछ" : "Wholesale & Bulk Enquiries"}
            </Link>
          </div>
          <div className="hero-footnote">
            <span className="footnote-icon">✳</span>
            {isHindi
              ? `${products.length} उत्पाद लाइव उपलब्ध · 1-क्लिक WhatsApp ऑर्डर`
              : `${products.length} grocery items live in stock · 1-Click WhatsApp Ordering`}
          </div>
        </div>

        <div
          className="hero-art"
          aria-label="Illustration of everyday shopping essentials"
          role="img"
        >
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-sun" />
          <div className="art-note note-top">
            <span>✳</span>
            {isHindi ? "लाडवा स्टोर" : "LADWA STORE"}
          </div>
          <div className="shopping-bag">
            <div className="bag-handle" />
            <div className="bag-front">
              <span className="bag-brand">
                MINI
                <br />
                <b>STORE</b>
              </span>
              <span className="bag-spark">✨</span>
            </div>
          </div>
          <div className="floating-item item-produce">🌾</div>
          <div className="floating-item item-bread">🥖</div>
          <div className="floating-item item-bowl">🥣</div>
          <div className="art-note note-bottom">
            {isHindi ? "किराना · नमकीन · तेल · मसाले" : "KIRYANA · OILS · SPICES · CARE"}
          </div>
          <div className="art-shadow" />
        </div>
      </section>

      {/* Quick Highlights */}
      <section className="quick-points" aria-label="Store highlights">
        <div>
          <span className="quick-icon">⌂</span>
          <span>
            <strong>{isHindi ? "रेड रोड, लाडवा" : "Red Road, Ladwa"}</strong>
            <small>{isHindi ? "आपका अपना लोकल स्टोर" : "Your Local Kiryana Store"}</small>
          </span>
        </div>
        <div>
          <span className="quick-icon">♡</span>
          <span>
            <strong>{isHindi ? "580+ शीर्ष ब्रांड्स" : "Top Indian Brands"}</strong>
            <small>{isHindi ? "हल्दीराम, ब्रिटानिया, एमडीएच, फॉर्च्यून" : "Haldiram, Britannia, MDH, Fortune"}</small>
          </span>
        </div>
        <div>
          <span className="quick-icon">💬</span>
          <span>
            <strong>{isHindi ? "सीधा WhatsApp आर्डर" : "1-Click WhatsApp Order"}</strong>
            <small>{isHindi ? "लिस्ट भेजें, तुरंत पैकिंग" : "Send list, get quick delivery"}</small>
          </span>
        </div>
      </section>

      {/* Popular Brand Strip */}
      <section className="section-wrap" style={{ paddingTop: "1.5rem", paddingBottom: "0.5rem" }}>
        <p className="section-eyebrow" style={{ textAlign: "center", marginBottom: "0.4rem" }}>
          {isHindi ? "दुकान के लोकप्रिय ब्रांड्स" : "Featured Grocery Brands"}
        </p>
        <div className="brand-pills-row" aria-label="Filter by brand">
          {POPULAR_BRANDS.map((brand) => (
            <button
              type="button"
              key={brand}
              className={activeBrand === brand ? "brand-pill active" : "brand-pill"}
              onClick={() => {
                setActiveBrand(brand);
                const el = document.getElementById("catalogue");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {brand === "All" ? (isHindi ? "सभी ब्रांड्स" : "All Brands") : brand}
            </button>
          ))}
        </div>
      </section>

      {/* Offers Section */}
      {offers.length > 0 && (
        <section className="offers-section section-wrap" aria-labelledby="offers-title">
          <div className="offers-heading">
            <div>
              <p className="section-eyebrow">
                {isHindi ? "दुकान के खास ऑफ़र" : "From our store"}
              </p>
              <h2 id="offers-title">
                {isHindi ? "मौजूदा ऑफ़र" : "Current offers"}
              </h2>
            </div>
            <span>{isHindi ? "सीमित समय के लिए" : "Selected store offers"}</span>
          </div>
          <div className="offers-grid">
            {offers.map((offer) => (
              <article className="offer-card" key={offer.id}>
                <span aria-hidden="true">✳</span>
                <div>
                  <h3>{isHindi && offer.title_hi ? offer.title_hi : offer.title}</h3>
                  {(offer.description || offer.description_hi) && (
                    <p>
                      {isHindi && offer.description_hi
                        ? offer.description_hi
                        : offer.description}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Department Cards Section */}
      <section className="departments-section section-wrap" id="departments">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              {isHindi ? "श्रेणी अनुसार खरीदारी करें" : "Shop by Category"}
            </p>
            <h2>
              {isHindi ? "हमारे प्रमुख विभाग" : "Explore Departments"}
              <span className="heading-period">.</span>
            </h2>
            <p className="section-description">
              {isHindi
                ? "किराना, दालें, सरसों तेल, मसाले, बिस्कुट, नाश्ता और घरेलू सामान तुरंत चुनें।"
                : "Browse our 5 core grocery departments with live stock, pack sizes and prices."}
            </p>
          </div>
          <Link href="/departments" className="section-side-note" style={{ textDecoration: "none" }}>
            01 / 05
            <br />
            <small>{isHindi ? "सभी विभाग देखें ↗" : "VIEW ALL ↗"}</small>
          </Link>
        </div>

        <div className="department-grid">
          {departments.map((dept, index) => (
            <article
              className={`department-card tone-${dept.tone}`}
              key={dept.id}
              onClick={() => handleSelectCategory(dept.slug)}
              style={{ cursor: "pointer" }}
            >
              <div className="department-card-top">
                <span className="department-index">0{index + 1}</span>
                <span className="department-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
              <div className="department-art" aria-hidden="true">
                <span>{dept.icon}</span>
                <i />
              </div>
              <div className="department-copy">
                <p className="department-note">{isHindi ? dept.hindiNote : dept.note}</p>
                <h3>{isHindi ? dept.hindiTitle : dept.title}</h3>
                <p>{isHindi ? dept.hindiDescription : dept.description}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Live Catalogue & Search Anchor */}
        <div className="live-catalogue" id="catalogue">
          <div className="live-catalogue-heading">
            <div>
              <p className="section-eyebrow">
                {isHindi ? "दुकान का पूरा कैटलॉग" : "Full Product Catalogue"}
              </p>
              <h3>
                {isHindi ? "उत्पाद खोजें और मात्रा चुनें" : "Browse Products & Set Quantities"}
              </h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <span>
                {isHindi
                  ? `${visibleProducts.length} उत्पाद मिले`
                  : `${visibleProducts.length} products found`}
              </span>
              <Link
                href="/products"
                style={{
                  color: "#1f5139",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  textDecoration: "underline",
                }}
              >
                {isHindi ? "अलग पेज पर देखें ↗" : "Open in Full Page ↗"}
              </Link>
            </div>
          </div>

          {/* Search, Category, Subcategory & Brand Tools */}
          <div className="catalogue-tools" style={{ marginTop: "1rem" }}>
            <label className="search-box">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  isHindi
                    ? "सामान या ब्रांड खोजें (उदा: Haldiram, Britannia, Atta, Mustard Oil, MDH)..."
                    : "Search by brand, product or pack (e.g. Haldiram, Britannia, Mustard Oil, MDH, Parle)..."
                }
                aria-label={isHindi ? "उत्पाद खोजें" : "Search products"}
              />
            </label>

            {/* Category Filter Chips */}
            <div
              className="filter-list"
              aria-label={isHindi ? "विभाग फ़िल्टर" : "Category filters"}
            >
              <button
                type="button"
                className={activeCategory === "all" ? "filter-chip active" : "filter-chip"}
                aria-pressed={activeCategory === "all"}
                onClick={() => {
                  setActiveCategory("all");
                  setActiveSubcategory("all");
                }}
              >
                {isHindi ? "सभी सामान" : "All Products"} ({products.length})
              </button>
              {departments.map((dept) => (
                <button
                  type="button"
                  key={dept.id}
                  className={activeCategory === dept.slug ? "filter-chip active" : "filter-chip"}
                  aria-pressed={activeCategory === dept.slug}
                  onClick={() => {
                    setActiveCategory(dept.slug);
                    setActiveSubcategory("all");
                  }}
                >
                  {isHindi ? dept.hindiTitle : dept.title} ({dept.count})
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory Pills Row */}
          {availableSubcategories.length > 0 && (
            <div className="subcategory-filter-row" aria-label="Subcategory filters">
              <button
                type="button"
                className={activeSubcategory === "all" ? "subcategory-chip active" : "subcategory-chip"}
                onClick={() => setActiveSubcategory("all")}
              >
                {isHindi ? "सभी उप-श्रेणियाँ" : "All Subcategories"}
              </button>
              {availableSubcategories.map((subcat) => (
                <button
                  type="button"
                  key={subcat}
                  className={activeSubcategory === subcat ? "subcategory-chip active" : "subcategory-chip"}
                  onClick={() => setActiveSubcategory(subcat)}
                >
                  {subcat}
                </button>
              ))}
            </div>
          )}

          {/* Products Grid with High-Res Image & Quantity Steppers */}
          {pagedProducts.length > 0 ? (
            <>
              <div className="product-grid">
                {pagedProducts.map((product) => {
                  const inCart = cart[product.id] ?? 0;
                  const unavailable = product.stock_status === "out_of_stock";

                  return (
                    <article className="product-card" key={product.id}>
                      <div className="product-card-image-wrap">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={isHindi && product.name_hi ? product.name_hi : product.name}
                            width={600}
                            height={360}
                            sizes="(max-width: 680px) 50vw, (max-width: 900px) 33vw, 300px"
                            unoptimized={shouldLoadProductImageDirectly(product.image_url)}
                          />
                        ) : (
                          <div className="product-image-placeholder" aria-hidden="true">
                            <span>{product.sku || "MINI STORE"}</span>
                          </div>
                        )}
                        {product.brand && (
                          <span className="product-brand-badge">{product.brand}</span>
                        )}
                      </div>

                      <div className="product-card-copy">
                        <div className="product-badge-row">
                          {product.sku && (
                            <span className="product-sku-tag">{product.sku}</span>
                          )}
                          <span className={`stock-label stock-${product.stock_status}`}>
                            {unavailable
                              ? isHindi
                                ? "उपलब्ध नहीं"
                                : "Out of stock"
                              : product.stock_status === "limited"
                                ? isHindi
                                  ? "सीमित"
                                  : "Limited"
                                : isHindi
                                  ? "उपलब्ध"
                                  : "Available"}
                          </span>
                        </div>

                        {product.subcategory && (
                          <p className="product-subcat-label">{product.subcategory}</p>
                        )}

                        <h4>{isHindi && product.name_hi ? product.name_hi : product.name}</h4>

                        {product.pack_size && (
                          <div className="product-pack-tag">
                            ⚖ {product.pack_size}
                          </div>
                        )}

                        {product.description && (
                          <p style={{ marginTop: "0.35rem" }}>
                            {isHindi && product.description_hi
                              ? product.description_hi
                              : product.description}
                          </p>
                        )}

                        {/* Card Footer: Price & Quantity Stepper */}
                        <div className="product-card-footer">
                          <div>
                            <strong>
                              {product.price === null ? (
                                isHindi ? "MRP पर उपलब्ध" : "MRP on pack"
                              ) : (
                                <>
                                  ₹{product.price.toFixed(2)}
                                  {product.mrp && product.mrp > product.price && (
                                    <span className="product-mrp-strike">
                                      ₹{product.mrp.toFixed(2)}
                                    </span>
                                  )}
                                </>
                              )}
                            </strong>
                          </div>

                          {inCart > 0 ? (
                            <div className="product-card-stepper" aria-label="Cart quantity control">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, inCart - 1)}
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span>{inCart}</span>
                              <button
                                type="button"
                                disabled={inCart >= 100}
                                onClick={() => updateQuantity(product.id, inCart + 1)}
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={unavailable}
                              onClick={() => addToCart(product.id)}
                              style={{ cursor: unavailable ? "not-allowed" : "pointer" }}
                            >
                              {isHindi ? "+ कार्ट में जोड़ें" : "+ Add to Cart"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {visibleProducts.length > displayLimit && (
                <div className="load-more-container">
                  <p className="load-more-status">
                    {isHindi
                      ? `${visibleProducts.length} में से ${Math.min(displayLimit, visibleProducts.length)} उत्पाद दिखाए गए हैं`
                      : `Showing ${Math.min(displayLimit, visibleProducts.length)} of ${visibleProducts.length} products`}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="load-more-btn"
                      onClick={() => setDisplayLimit((prev) => prev + INITIAL_PAGE_SIZE)}
                    >
                      {isHindi ? "और 36 उत्पाद लोड करें ↓" : "Load 36 More Products ↓"}
                    </button>
                    <button
                      type="button"
                      className="load-more-btn"
                      style={{ background: "#f5f8f3" }}
                      onClick={() => setDisplayLimit(visibleProducts.length)}
                    >
                      {isHindi ? `सभी ${visibleProducts.length} सामान देखें` : `Show All (${visibleProducts.length})`}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-search" style={{ marginTop: "2rem" }}>
              <span>⌕</span>
              <strong>
                {isHindi ? "कोई उत्पाद नहीं मिला" : "No matching products found"}
              </strong>
              <p>
                {isHindi
                  ? "कृपया कोई अन्य शब्द, ब्रांड या श्रेणी चुनकर देखें।"
                  : "Try checking your spelling, clear the search, or choose another brand/subcategory."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("all");
                  setActiveSubcategory("all");
                  setActiveBrand("All");
                }}
              >
                {isHindi ? "सभी फ़िल्टर हटाएँ" : "Reset All Filters"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Why Us Section */}
      <section className="why-section" id="why-us">
        <div className="why-inner section-wrap">
          <div className="why-intro">
            <p className="section-eyebrow">
              {isHindi ? "आपकी दुकान, आपका मोहल्ला" : "A store close to home"}
            </p>
            <h2>
              {isHindi ? (
                <>
                  रोज़मर्रा की खरीदारी,
                  <br />
                  <em>थोड़ी और आसान।</em>
                </>
              ) : (
                <>
                  A familiar place
                  <br />
                  <em>for everyday needs.</em>
                </>
              )}
            </h2>
            <p>
              {isHindi
                ? "लाडवा के परिवारों के लिए रोज़मर्रा की खरीदारी को सबसे आसान, तेज़ और किफ़ायती बनाना ही हमारा उद्देश्य है।"
                : "A neighbourhood store should feel simple, helpful and easy to reach. Browse all essentials online or visit our shop on Red Road, Ladwa."}
            </p>
          </div>
          <div className="why-list">
            <div className="why-item">
              <span>01</span>
              <div>
                <strong>
                  {isHindi ? "580+ उत्पाद एक ही जगह" : "580+ Essentials Under One Roof"}
                </strong>
                <p>
                  {isHindi
                    ? "किराना, दालें, सरसों तेल, मसाले, हल्दीराम नमकीन, बिस्कुट और घरेलू सफ़ाई का सामान।"
                    : "Atta, rice, dals, pure mustard oils, Haldiram's, Britannia, spices and home essentials."}
                </p>
              </div>
              <b>↗</b>
            </div>
            <div className="why-item">
              <span>02</span>
              <div>
                <strong>
                  {isHindi ? "सीधा WhatsApp आर्डर व डिलीवरी" : "Direct WhatsApp Ordering"}
                </strong>
                <p>
                  {isHindi
                    ? "सामान कार्ट में जोड़ें और 1-क्लिक में WhatsApp पर भेजें। तुरंत पैकिंग व होम डिलीवरी।"
                    : "Add items to your cart, set quantities and send with 1 click directly to store WhatsApp."}
                </p>
              </div>
              <b>↗</b>
            </div>
            <div className="why-item">
              <span>03</span>
              <div>
                <strong>
                  {isHindi ? "लाडवा का अपना लोकल स्टोर" : "Rooted in Ladwa"}
                </strong>
                <p>
                  {isHindi
                    ? "रेड रोड, लाडवा के ग्राहकों के लिए विश्वसनीय और परिचित दुकान।"
                    : "A convenient local shopping stop for residents in and around Ladwa, Haryana."}
                </p>
              </div>
              <b>↗</b>
            </div>
          </div>
        </div>
      </section>

      {/* Bulk Section */}
      <section
        className="bulk-section section-wrap"
        id="bulk-enquiry"
        aria-labelledby="bulk-order-title"
      >
        <div className="bulk-intro">
          <p className="section-eyebrow">
            {isHindi ? "बड़ी मात्रा में खरीदारी?" : "Need more of something?"}
          </p>
          <h2>{isHindi ? "थोक आर्डर व पूछताछ" : "Wholesale & Bulk Orders"}</h2>
          <p>
            {isHindi
              ? "शादी-ब्याह, भंडारे, कैंटीन या दुकान के लिए थोक मात्रा और रियायती दरों पर बात करें।"
              : "Talk to our team about bulk quantities, wedding supplies, wholesale packs and customized store pricing."}
          </p>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/bulk-order" className="button button-primary">
              {isHindi ? "थोक आर्डर पेज खोलें ↗" : "Open Bulk Order Page ↗"}
            </Link>
          </div>
        </div>
        <div className="bulk-card">
          <BulkOrderWhatsAppCTA language={language} />
        </div>
      </section>

      {/* Visit Section */}
      <section className="visit-section" id="visit">
        <div className="visit-inner section-wrap">
          <div>
            <p className="section-eyebrow">
              {isHindi ? "दुकान पर पधारें" : "Come say hello"}
            </p>
            <h2>{isHindi ? "मिलते हैं दुकान पर।" : "See you at the store."}</h2>
          </div>
          <div className="visit-detail">
            <span className="visit-pin">⌖</span>
            <div>
              <strong>Mini Super Store</strong>
              <p>{isHindi ? "रेड रोड, लाडवा (कुरुक्षेत्र), हरियाणा" : "Red Road, Ladwa (Kurukshetra), Haryana"}</p>
            </div>
          </div>
          <p className="visit-note">
            {isHindi
              ? "दुकान प्रतिदिन सुबह 8:00 बजे से रात 9:00 बजे तक खुली रहती है।"
              : "Store open Monday through Sunday, 8:00 AM to 9:00 PM."}
          </p>
          <Link href="/visit" style={{ color: "#1f5139", fontWeight: 800, fontSize: "0.75rem", textDecoration: "underline" }}>
            {isHindi ? "दुकान का पूरा पता व संपर्क देखें ↗" : "View Full Store Location & Contact ↗"}
          </Link>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <Link className="footer-brand" href="/">
            MINI <em>SUPER</em> STORE
          </Link>
          <nav className="footer-portals" aria-label="Portal login links">
            <Link href="/departments">{isHindi ? "विभाग" : "Departments"}</Link>
            <Link href="/products">{isHindi ? "कैटलॉग" : "Products"}</Link>
            <Link href="/bulk-order">{isHindi ? "थोक आर्डर" : "Bulk Order"}</Link>
            <Link href="/visit">{isHindi ? "दुकान संपर्क" : "Visit Us"}</Link>
            <Link href="/dashboard" style={{ opacity: 0.6 }}>{isHindi ? "स्टाफ / एडमिन" : "Staff Portal"}</Link>
          </nav>
          <p>
            © {new Date().getFullYear()} Mini Super Store.{" "}
            {isHindi ? "रेड रोड, लाडवा का अपना किराना स्टोर।" : "Red Road, Ladwa, Haryana."}
          </p>
          <a href="#home">{isHindi ? "ऊपर जाएँ ↑" : "Back to top ↑"}</a>
        </div>
      </footer>

      {/* Mobile Sticky Navigation */}
      <nav className="mobile-nav" aria-label="Quick navigation">
        <Link href="/">
          <span>⌂</span>
          {isHindi ? "होम" : "Home"}
        </Link>
        <Link href="/departments">
          <span>▦</span>
          {isHindi ? "विभाग" : "Categories"}
        </Link>
        <Link href="/products">
          <span>🏷️</span>
          {isHindi ? "सामान" : "Products"}
        </Link>
        <Link href="/bulk-order">
          <span>📦</span>
          {isHindi ? "थोक" : "Bulk"}
        </Link>
        <Link href="/visit">
          <span>⌖</span>
          {isHindi ? "दुकान" : "Visit"}
        </Link>
      </nav>
    </main>
  );
}
