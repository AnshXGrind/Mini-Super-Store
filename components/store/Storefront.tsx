"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
    enNote: "Pantry Staples & Grains",
    hiNote: "राशन, आटा और दालें",
  },
  "oil-ghee-spices-masala": {
    icon: "🌶️",
    tone: "yellow",
    enNote: "Pure Oils, Ghee & Spices",
    hiNote: "शुद्ध तेल, देसी घी व मसाले",
  },
  "snacks-biscuits-beverages": {
    icon: "☕",
    tone: "peach",
    enNote: "Snacks, Biscuits & Drinks",
    hiNote: "चाय, बिस्कुट, नमकीन व पेय",
  },
  "dairy-bakery-breakfast": {
    icon: "🥛",
    tone: "blue",
    enNote: "Fresh Dairy, Bakery & Cereals",
    hiNote: "ताज़ा डेयरी, ब्रेड व नाश्ता",
  },
  "household-personal-care": {
    icon: "🧼",
    tone: "lavender",
    enNote: "Cleaning & Daily Personal Care",
    hiNote: "सफ़ाई और व्यक्तिगत देखभाल",
  },
};

const defaultMeta: CategoryMeta = {
  icon: "🛒",
  tone: "mint",
  enNote: "Store Essentials",
  hiNote: "दुकान की ज़रूरी चीज़ें",
};

const INITIAL_PAGE_SIZE = 36;
const STORE_WHATSAPP_NUMBER = "919876543210";

export default function Storefront({
  categories,
  products,
  offers,
  supabaseError,
}: {
  categories: PublicCategory[];
  products: PublicProduct[];
  offers: PublicOffer[];
  supabaseError?: string;
}) {
  const [language, setLanguage] = useState<Language>("en");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [displayLimit, setDisplayLimit] = useState(INITIAL_PAGE_SIZE);

  const [catalogError] = useState<string | null>(supabaseError ?? null);
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
      // Browser storage may be unavailable; begin with an empty in-memory cart.
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
      // Cart remains usable in memory when browser storage is unavailable.
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

  // Reset pagination whenever filter or search query changes
  useEffect(() => {
    setDisplayLimit(INITIAL_PAGE_SIZE);
  }, [activeCategory, activeSubcategory, search]);

  function addToCart(productId: string) {
    setCart((current) => ({
      ...current,
      [productId]: Math.min(100, (current[productId] ?? 0) + 1),
    }));
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

  // Available subcategories for current category selection
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

  // Filtered products list based on category, subcategory, and search
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
  }, [activeCategory, activeSubcategory, categories, products, search]);

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
      {catalogError && (
        <p className="supabase-error" role="alert">
          {isHindi ? `कैटलॉग सूचना: ${catalogError}` : `Catalogue notice: ${catalogError}`}
        </p>
      )}

      {offline && (
        <div className="network-banner" role="status">
          {isHindi
            ? "आप ऑफ़लाइन हैं। सहेजे गए कार्ट आइटम उपलब्ध रह सकते हैं।"
            : "You are offline. Saved cart items remain available in your browser."}
        </div>
      )}

      <div className="topline">
        <div className="topline-inner">
          <span>{isHindi ? "लाडवा · रेड रोड" : "Ladwa · Red Road"}</span>
          <span className="topline-message">
            {isHindi ? "आपके अपने मोहल्ले का सुपर स्टोर" : "Your neighbourhood super store"}
          </span>
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

      <header className="site-header">
        <a className="brand" href="#home" aria-label="Mini Super Store home">
          <span className="brand-mark" aria-hidden="true">
            <span>m</span>
          </span>
          <span className="brand-copy">
            <strong>
              MINI <em>SUPER</em> STORE
            </strong>
            <small>
              {isHindi ? "किराना व रोज़मर्रा की हर ज़रूरत" : "Everyday grocery & household needs"}
            </small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#departments">{isHindi ? "विभाग" : "Departments"}</a>
          <a href="#catalogue">{isHindi ? "उत्पाद सूची" : "All Products"}</a>
          <a href="#why-us">{isHindi ? "हमारे बारे में" : "Why shop with us"}</a>
          <a href="#bulk-enquiry">{isHindi ? "थोक पूछताछ" : "Bulk enquiry"}</a>
          <a href="#visit">{isHindi ? "दुकान पर आएँ" : "Visit us"}</a>
          <a href="/dashboard">{isHindi ? "मेरा खाता" : "My account"}</a>
        </nav>
        <div className="header-actions">
          <ShoppingCart
            language={language}
            products={products}
            cart={cart}
            setCart={setCart}
          />
          <a className="header-visit" href="#visit">
            {isHindi ? "दुकान की जानकारी" : "Store details"}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-content">
          <div className="hero-kicker">
            <span className="kicker-dot" />
            {isHindi ? "लाडवा में आपका अपना विश्वसनीय स्टोर" : "Your trusted local store in Ladwa"}
          </div>
          <h1>
            {isHindi ? (
              <>
                किराने से लेकर घर की हर ज़रूरत,
                <br />
                <span>500+ उत्पाद एक ही जगह।</span>
              </>
            ) : (
              <>
                Everyday essentials & groceries,
                <br />
                <span>500+ items all under one roof.</span>
              </>
            )}
          </h1>
          <p className="hero-description">
            {isHindi
              ? "आटा, दाल, चावल, तेल, मसाले, चाय-कॉफ़ी से लेकर सफ़ाई और पर्सनल केयर का हर सामान — सबसे वाजिब दामों पर।"
              : "From wheat flour, pulses, rice, cooking oils and whole spices to snacks, dairy, laundry and personal care — explore our complete store catalogue."}
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#catalogue">
              {isHindi ? "सभी 500+ सामान देखें" : "Browse 500+ items"}
              <span aria-hidden="true">→</span>
            </a>
            <a className="button button-quiet" href="#bulk-enquiry">
              {isHindi ? "थोक आर्डर / पूछताछ" : "Bulk order enquiry"}
            </a>
          </div>
          <div className="hero-footnote">
            <span className="footnote-icon">✳</span>
            {isHindi
              ? `${products.length} उत्पाद लाइव उपलब्ध`
              : `${products.length} products available across 5 main departments`}
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
              <span className="bag-spark">✳</span>
            </div>
          </div>
          <div className="floating-item item-produce">🌾</div>
          <div className="floating-item item-bread">🥖</div>
          <div className="floating-item item-bowl">🥣</div>
          <div className="art-note note-bottom">
            {isHindi ? "किराना · घरेलू सामान · पर्सनल केयर" : "KIRYANA · GROCERY · CARE"}
          </div>
          <div className="art-shadow" />
        </div>
      </section>

      {/* Quick Points */}
      <section className="quick-points" aria-label="Store highlights">
        <div>
          <span className="quick-icon">⌂</span>
          <span>
            <strong>{isHindi ? "लोकल स्टोर" : "Local Store"}</strong>
            <small>{isHindi ? "रेड रोड, लाडवा" : "Red Road, Ladwa"}</small>
          </span>
        </div>
        <div>
          <span className="quick-icon">♡</span>
          <span>
            <strong>{isHindi ? "500+ उत्पाद" : "500+ Products"}</strong>
            <small>{isHindi ? "किराना व घरेलू सामान" : "Kiryana & Daily Essentials"}</small>
          </span>
        </div>
        <div>
          <span className="quick-icon">☏</span>
          <span>
            <strong>{isHindi ? "सीधे संपर्क करें" : "Direct WhatsApp"}</strong>
            <small>{isHindi ? "आर्डर व थोक पूछताछ" : "Instant Orders & Queries"}</small>
          </span>
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
              {isHindi ? "अपनी पसंद का विभाग चुनें" : "Store Categories"}
            </p>
            <h2>
              {isHindi ? "हमारे प्रमुख विभाग" : "Shop by department"}
              <span className="heading-period">.</span>
            </h2>
            <p className="section-description">
              {isHindi
                ? "किराना, दालें, मसाले, बिस्कुट, नाश्ता और घरेलू सफ़ाई का सामान आसानी से चुनें।"
                : "Browse our 5 core product categories with instant stock and pack sizes."}
            </p>
          </div>
          <span className="section-side-note">
            01 / 05
            <br />
            <small>{isHindi ? "विभाग" : "DEPARTMENTS"}</small>
          </span>
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
                {isHindi ? "उत्पाद खोजें और चुनें" : "Find Any Product & Pack Size"}
              </h3>
            </div>
            <span>
              {isHindi
                ? `${visibleProducts.length} उत्पाद मिले`
                : `${visibleProducts.length} products found`}
            </span>
          </div>

          {/* Search & Category Filter Tools */}
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
                    ? "सामान का नाम, ब्रांड या SKU खोजें (उदा: Atta, Moong Dal, Oil, Soap)..."
                    : "Search by product name, pack size, subcategory or SKU (e.g. Atta, Moong Dal, Oil, Soap)..."
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

          {/* Products Grid */}
          {pagedProducts.length > 0 ? (
            <>
              <div className="product-grid">
                {pagedProducts.map((product) => {
                  const inCart = cart[product.id] ?? 0;
                  const unavailable = product.stock_status === "out_of_stock";
                  const whatsappMsg = `Hi Mini Super Store, I want to inquire about: ${product.name} (SKU: ${product.sku || product.id})`;
                  const whatsappUrl = `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMsg)}`;

                  return (
                    <article className="product-card" key={product.id}>
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
                          <p style={{ marginTop: "0.4rem" }}>
                            {isHindi && product.description_hi
                              ? product.description_hi
                              : product.description}
                          </p>
                        )}

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

                          {product.price !== null ? (
                            <button
                              type="button"
                              disabled={unavailable}
                              onClick={() => addToCart(product.id)}
                            >
                              {inCart > 0
                                ? `${isHindi ? "जोड़ें" : "Add"} (${inCart})`
                                : isHindi
                                  ? "कार्ट में जोड़ें"
                                  : "Add to cart"}
                            </button>
                          ) : (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="whatsapp-order-btn"
                              aria-label={`Order ${product.name} on WhatsApp`}
                            >
                              <span>WhatsApp</span> ↗
                            </a>
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
                  ? "कृपया वर्तनी जांचें या कोई अन्य शब्द अथवा श्रेणी चुनकर देखें।"
                  : "Try checking your spelling, clear the search, or choose another subcategory."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("all");
                  setActiveSubcategory("all");
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
                ? "हमारा मकसद लाडवा के परिवारों के लिए रोज़मर्रा की खरीदारी को सबसे आसान, तेज़ और भरोसेमंद बनाना है।"
                : "A neighbourhood store should feel simple, helpful and easy to reach. Browse all essentials online or visit our shop on Red Road, Ladwa."}
            </p>
          </div>
          <div className="why-list">
            <div className="why-item">
              <span>01</span>
              <div>
                <strong>
                  {isHindi ? "500+ उत्पाद एक ही जगह" : "500+ Essentials Under One Roof"}
                </strong>
                <p>
                  {isHindi
                    ? "किराना, दालें, तेल, मसाले, बिस्कुट, डेयरी, नाश्ता और घरेलू सफ़ाई का सामान।"
                    : "Atta, rice, dals, pure spices, cold drinks, dairy, snacks and laundry essentials."}
                </p>
              </div>
              <b>↗</b>
            </div>
            <div className="why-item">
              <span>02</span>
              <div>
                <strong>
                  {isHindi ? "सीधा व्हाट्सऐप संपर्क" : "Direct WhatsApp Ordering"}
                </strong>
                <p>
                  {isHindi
                    ? "सामान की लिस्ट सीधे व्हाट्सऐप पर भेजें या दुकान से पिकअप करें।"
                    : "Send your grocery list directly over WhatsApp for quick packing and pickup."}
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
                    ? "रेड रोड, लाडवा के ग्राहकों के लिए भरोसेमंद और परिचित दुकान।"
                    : "A convenient local shopping stop for residents in and around Ladwa."}
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
          <h2>{isHindi ? "थोक आर्डर व पूछताछ" : "Buying in bulk?"}</h2>
          <p>
            {isHindi
              ? "शादी-ब्याह, भंडारे, कैंटीन या दुकान के लिए थोक मात्रा और रियायती दरों पर बात करें।"
              : "Talk to our team about bulk quantities, wholesale packs and customized store pricing."}
          </p>
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
              <p>{isHindi ? "रेड रोड, लाडवा (कुरुक्षेत्र), हरियाणा" : "Red Road, Ladwa, Haryana"}</p>
            </div>
          </div>
          <p className="visit-note">
            {isHindi
              ? "दुकान सुबह 8:00 बजे से रात 9:00 बजे तक खुली रहती है।"
              : "Store open Monday through Sunday, 8:00 AM to 9:00 PM."}
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <a className="footer-brand" href="#home">
            MINI <em>SUPER</em> STORE
          </a>
          <nav className="footer-portals" aria-label="Portal login links">
            <a href="/dashboard">{isHindi ? "मेरा खाता" : "My account"}</a>
            <a href="/login">{isHindi ? "स्टाफ लॉगिन" : "Staff login"}</a>
            <a href="/login">{isHindi ? "एडमिन लॉगिन" : "Admin login"}</a>
          </nav>
          <p>
            © {new Date().getFullYear()} Mini Super Store.{" "}
            {isHindi ? "लाडवा का अपना किराना स्टोर।" : "Everyday kiryana & home needs, made easy."}
          </p>
          <a href="#home">{isHindi ? "ऊपर जाएँ ↑" : "Back to top ↑"}</a>
        </div>
      </footer>

      <nav className="mobile-nav" aria-label="Quick navigation">
        <a href="#home">
          <span>⌂</span>
          {isHindi ? "होम" : "Home"}
        </a>
        <a href="#catalogue">
          <span>▦</span>
          {isHindi ? "कैटलॉग" : "Products"}
        </a>
        <a href="#bulk-enquiry">
          <span>☏</span>
          {isHindi ? "पूछताछ" : "Enquire"}
        </a>
        <a href="#visit">
          <span>⌖</span>
          {isHindi ? "दुकान" : "Visit"}
        </a>
        <a href="/dashboard">
          <span>☺</span>
          {isHindi ? "खाता" : "Account"}
        </a>
      </nav>
    </main>
  );
}
