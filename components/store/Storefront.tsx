"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AnnouncementBar from "@/components/store/AnnouncementBar";
import BulkOrderWhatsAppCTA from "@/components/wholesale/BulkOrderWhatsAppCTA";
import MobileStoreNav from "@/components/store/MobileStoreNav";
import ShoppingCart from "@/components/store/ShoppingCart";
import StoreFooter from "@/components/store/StoreFooter";
import StoreLogo from "@/components/store/StoreLogo";
import {
  getStorePhoneInternationalDisplay,
  getStorePhoneLink,
  getStoreWhatsAppNumber,
  STORE_ADDRESS,
  STORE_CURBSIDE_PICKUP_AVAILABLE,
  STORE_HOME_DELIVERY_AREA,
  STORE_MAP_URL,
  STORE_OPENING_HOURS,
  STORE_REGION,
} from "@/lib/store-contact";
import type {
  PublicCategory,
  PublicOffer,
  PublicProduct,
  PublicSeasonalCollection,
} from "@/app/page";
import { parseStoreCart } from "@/lib/cart";
import {
  getProductImageArt,
  getProductImageUrl,
  isSeedCatalogueImage,
  shouldLoadProductImageDirectly,
} from "@/lib/product-image";
import {
  groupWeightedProductVariants,
  type ProductVariantGroup,
} from "@/lib/product-variants";

type Language = "en" | "hi";

type CategoryMeta = {
  icon: string;
  tone: string;
};

const categoryMetaMap: Record<string, CategoryMeta> = {
  "staples-grains": { icon: "🌾", tone: "mint" },
  "oil-ghee-spices-masala": { icon: "🌶️", tone: "yellow" },
  "snacks-biscuits-beverages": { icon: "☕", tone: "peach" },
  "dairy-bakery-breakfast": { icon: "🥛", tone: "blue" },
  "household-personal-care": { icon: "🧼", tone: "lavender" },
};

const defaultMeta: CategoryMeta = { icon: "🛒", tone: "mint" };

const INITIAL_PAGE_SIZE = 36;

export default function Storefront({
  categories,
  products,
  offers,
  seasonalCollections = [],
  mode = "home",
  initialCategory = "all",
}: {
  categories: PublicCategory[];
  products: PublicProduct[];
  offers: PublicOffer[];
  seasonalCollections?: PublicSeasonalCollection[];
  mode?: "home" | "order";
  initialCategory?: string;
}) {
  const [language, setLanguage] = useState<Language>("en");
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [activeBrand, setActiveBrand] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [displayLimit, setDisplayLimit] = useState(INITIAL_PAGE_SIZE);
  const [variantPicker, setVariantPicker] =
    useState<ProductVariantGroup<PublicProduct> | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const [cartHydrated, setCartHydrated] = useState(false);
  const [offline, setOffline] = useState(false);
  const isHindi = language === "hi";
  const isOrderPage = mode === "order";

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

  function openVariantPicker(group: ProductVariantGroup<PublicProduct>) {
    const firstAvailable =
      group.variants.find((variant) => variant.stock_status !== "out_of_stock") ??
      group.variants[0];
    setSelectedVariantId(firstAvailable.id);
    setVariantPicker(group);
  }

  function addSelectedVariant() {
    if (!selectedVariantId) return;
    addToCart(selectedVariantId);
    setVariantPicker(null);
  }

  // Derive department cards from active categories
  const departments = useMemo(() => {
    return categories.map((category) => {
      const meta = categoryMetaMap[category.slug] ?? defaultMeta;

      return {
        id: category.slug,
        categoryId: category.id,
        slug: category.slug,
        icon: meta.icon,
        title: category.name,
        hindiTitle: category.name_hi || category.name,
        description: category.description || "",
        hindiDescription: category.description_hi || category.description || "",
        tone: meta.tone,
      };
    });
  }, [categories]);

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

  const availableBrands = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.brand?.trim())
            .filter((brand): brand is string => Boolean(brand)),
        ),
      ).sort((first, second) => first.localeCompare(second)),
    [products],
  );

  const activeSeasonalCollections = useMemo(
    () =>
      seasonalCollections
        .map((collection) => ({
          ...collection,
          products: products.filter((product) =>
            collection.product_ids.includes(product.id),
          ),
        }))
        .filter((collection) => collection.products.length > 0),
    [products, seasonalCollections],
  );

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

  const visibleProductGroups = useMemo(() => {
    const visibleIds = new Set(visibleProducts.map((product) => product.id));
    return groupWeightedProductVariants(products).filter((group) =>
      group.variants.some((variant) => visibleIds.has(variant.id)),
    );
  }, [products, visibleProducts]);

  const pagedProducts = useMemo(
    () => visibleProductGroups.slice(0, displayLimit),
    [displayLimit, visibleProductGroups],
  );

  return (
    <main className="storefront">
      {offline && (
        <div className="network-banner" role="status">
          {isHindi
            ? "आप ऑफ़लाइन हैं। सहेजे गए कार्ट आइटम उपलब्ध रहेंगे।"
            : "You are offline. Saved cart items remain available in your browser."}
        </div>
      )}

      <AnnouncementBar
        language={language}
        onLanguageChange={setLanguage}
      />

      {/* Main Header with Logo & Dedicated Page Navigation */}
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Mini Super Store home">
          <StoreLogo />
          <span className="brand-copy">
            <strong>
              MINI <em>SUPER</em> STORE
            </strong>
            <small>{isHindi ? "रेड रोड, लाडवा" : "Red Road, Ladwa"}</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/">{isHindi ? "होम" : "Home"}</Link>
          <Link href="/order" style={isOrderPage ? { color: "#1f5139", fontWeight: 800 } : undefined}>
            {isHindi ? "ऑर्डर" : "Order"}
          </Link>
          <Link href="/bulk-order">{isHindi ? "थोक आर्डर" : "Bulk Order"}</Link>
          <Link href="/visit">{isHindi ? "दुकान पर आएँ" : "Visit Us"}</Link>
        </nav>

        <div className="header-actions">
          {isOrderPage && (
            <ShoppingCart
              language={language}
              products={products}
              cart={cart}
              setCart={setCart}
            />
          )}
          <Link className="header-visit" href="/visit">
            {isHindi ? "दुकान पता" : "Store Location"}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      {!isOrderPage && (
      <>
      <section className="hero" id="home">
        <div className="hero-content">
          <p className="hero-kicker">
            <span className="kicker-dot" aria-hidden="true" />
            {isHindi ? "लाडवा में आपका अपना स्टोर" : "Your neighbourhood store in Ladwa"}
          </p>
          <h1>
            {isHindi ? (
              <>रोज़मर्रा का किराना और <span>घर की ज़रूरतें।</span></>
            ) : (
              <>
                Fresh groceries &amp; household staples,
                <br />
                <span>900+ items ready for quick delivery.</span>
              </>
            )}
          </h1>
          <p className="hero-description">
            {isHindi
              ? "रेड रोड स्थित हमारे स्टोर से अपनी ज़रूरत का सामान चुनें, कार्ट में जोड़ें और WhatsApp पर ऑर्डर भेजें।"
              : "Browse pantry staples, packaged foods, personal care and household essentials from our Red Road store. Add what you need to your cart and send your order on WhatsApp."}
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/order#catalogue">
              {isHindi ? "कैटलॉग देखें" : "Browse the catalogue"}
              <span aria-hidden="true">→</span>
            </Link>
            <a
              className="button button-quiet"
              href={STORE_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {isHindi ? "दुकान का रास्ता देखें" : "Get directions"}
            </a>
          </div>
          <p className="hero-footnote">
            <span className="footnote-icon" aria-hidden="true">⌖</span>
            {isHindi
              ? `${STORE_ADDRESS} · ${STORE_HOME_DELIVERY_AREA} में होम डिलीवरी · ${STORE_CURBSIDE_PICKUP_AVAILABLE ? "कर्बसाइड पिकअप" : ""}`
              : `${STORE_ADDRESS} · Home delivery in ${STORE_HOME_DELIVERY_AREA} · ${STORE_CURBSIDE_PICKUP_AVAILABLE ? "Curbside pickup available" : ""}`}
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-art-orbit hero-art-orbit-outer" />
          <div className="hero-art-orbit hero-art-orbit-inner" />
          <div className="hero-art-card">
            <div className="hero-art-brand">
              <StoreLogo size={42} />
              <span>
                <strong>MINI SUPER STORE</strong>
                <small>{isHindi ? "रेड रोड, लाडवा" : "Red Road, Ladwa"}</small>
              </span>
            </div>
            <div className="hero-art-rule" />
            <p className="hero-art-title">
              {isHindi ? "हर दिन की ज़रूरतें" : "Essentials for every day"}
            </p>
            <div className="hero-art-categories">
              <span><i>🌾</i>{isHindi ? "किराना" : "Pantry"}</span>
              <span><i>🥫</i>{isHindi ? "पैक्ड सामान" : "Packaged foods"}</span>
              <span><i>🧼</i>{isHindi ? "घर की देखभाल" : "Home care"}</span>
            </div>
            <div className="hero-art-location">
              <span aria-hidden="true">⌖</span>
              {isHindi ? "लाडवा, हरियाणा" : "Ladwa, Haryana"}
            </div>
          </div>
        </div>
      </section>
      </>
      )}

      {isOrderPage && availableBrands.length > 1 && (
      <section className="section-wrap brand-filter-section" aria-label={isHindi ? "ब्रांड के अनुसार फ़िल्टर" : "Filter by brand"}>
        <div className="brand-pills-row">
          {["All", ...availableBrands].map((brand) => (
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
              {brand === "All" ? (isHindi ? "सभी ब्रांड" : "All brands") : brand}
            </button>
          ))}
        </div>
      </section>
      )}

      {!isOrderPage && offers.length > 0 && (
        <section className="offers-section section-wrap" aria-labelledby="offers-title">
          <div className="offers-heading">
            <h2 id="offers-title">{isHindi ? "मौजूदा ऑफ़र" : "Current offers"}</h2>
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

      {!isOrderPage && activeSeasonalCollections.length > 0 && (
        <section className="seasonal-section section-wrap" aria-labelledby="seasonal-title">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{isHindi ? "मौसमी संग्रह" : "Seasonal"}</p>
              <h2 id="seasonal-title">{isHindi ? "इस समय के संग्रह" : "Seasonal collections"}</h2>
            </div>
          </div>
          <div className="seasonal-grid">
            {activeSeasonalCollections.map((collection) => (
              <article className="seasonal-card" key={collection.id}>
                <h3>{isHindi && collection.title_hi ? collection.title_hi : collection.title}</h3>
                {(collection.description || collection.description_hi) && (
                  <p>
                    {isHindi && collection.description_hi
                      ? collection.description_hi
                      : collection.description}
                  </p>
                )}
                <ul>
                  {collection.products.slice(0, 4).map((product) => (
                    <li key={product.id}>
                      {isHindi && product.name_hi ? product.name_hi : product.name}
                      {product.pack_size ? ` · ${product.pack_size}` : ""}
                    </li>
                  ))}
                </ul>
                <Link href="/order">{isHindi ? "उत्पाद देखें" : "Browse products"} ↗</Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section
        className="departments-section section-wrap"
        id={isOrderPage ? "order" : "departments"}
      >
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              {isOrderPage
                ? isHindi ? "ऑनलाइन ऑर्डर" : "Order Online"
                : isHindi ? "श्रेणी अनुसार खरीदारी करें" : "Shop by Category"}
            </p>
            <h2>
              {isOrderPage
                ? isHindi ? "अपना सामान चुनें" : "Choose Your Items"
                  : isHindi ? "उत्पाद श्रेणियाँ" : "Product categories"}
              <span className="heading-period">.</span>
            </h2>
            <p className="section-description">
              {isOrderPage
                ? isHindi
                    ? "कैटलॉग में सामान खोजें, पैक साइज़ चुनें और WhatsApp पर पिकअप या डिलीवरी का अनुरोध भेजें।"
                    : "Search the catalogue, choose pack sizes, add items to your cart, then send your pickup or delivery request on WhatsApp."
                : isHindi
                    ? "श्रेणी चुनकर उपलब्ध उत्पाद देखें और ऑर्डर पेज पर सामान कार्ट में जोड़ें।"
                    : "Choose a category to browse products, then add items to your cart on the order page."}
            </p>
          </div>
        </div>

        {!isOrderPage && <div className="department-grid">
          {departments.map((dept) => (
            <Link
              href={`/order?category=${encodeURIComponent(dept.slug)}`}
              className={`department-card tone-${dept.tone}`}
              key={dept.id}
              style={{ cursor: "pointer", textDecoration: "none" }}
            >
              <div className="department-card-top">
                <span className="department-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
              <div className="department-art" aria-hidden="true">
                <span>{dept.icon}</span>
                <i />
              </div>
              <div className="department-copy">
                <h3>{isHindi ? dept.hindiTitle : dept.title}</h3>
                <p>{isHindi ? dept.hindiDescription : dept.description}</p>
              </div>
            </Link>
          ))}
        </div>
        }

        {/* Live Catalogue & Search Anchor */}
        {isOrderPage && (
        <div className="live-catalogue" id="catalogue">
          <div className="live-catalogue-heading">
            <div>
              <p className="section-eyebrow">{isHindi ? "उत्पाद कैटलॉग" : "Product catalogue"}</p>
              <h3>
                {isHindi ? "उत्पाद खोजें" : "Find products"}
              </h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <span>
                {isHindi
                  ? `${visibleProductGroups.length} उत्पाद मिले`
                  : `${visibleProductGroups.length} products found`}
              </span>
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
                    ? "उत्पाद, ब्रांड या पैक साइज़ खोजें"
                    : "Search by product, brand or pack size"
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
                {isHindi ? "सभी सामान" : "All Products"}
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
                  {isHindi ? dept.hindiTitle : dept.title}
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
                {pagedProducts.map((group) => {
                  const product = group.variants[0];
                  const inCart = group.variants.reduce(
                    (total, variant) => total + (cart[variant.id] ?? 0),
                    0,
                  );
                  const unavailable = group.variants.every(
                    (variant) => variant.stock_status === "out_of_stock",
                  );
                  const hasWeightChoices = group.variants.length > 1;
                  const stockStatus = unavailable
                    ? "out_of_stock"
                    : group.variants.some(
                          (variant) => variant.stock_status === "available",
                        )
                      ? "available"
                      : "limited";
                  const imageArt = getProductImageArt(group.name);

                  return (
                    <article className="product-card" key={group.id}>
                      <div className="product-card-image-wrap">
                        {product.image_url && !isSeedCatalogueImage(product.image_url) ? (
                          <Image
                            src={getProductImageUrl(product.image_url, 420)}
                            alt={isHindi && group.name_hi ? group.name_hi : group.name}
                            width={420}
                            height={252}
                            quality={75}
                            loading="lazy"
                            sizes="(max-width: 680px) 50vw, (max-width: 900px) 33vw, 280px"
                            unoptimized={shouldLoadProductImageDirectly(product.image_url)}
                          />
                        ) : (
                          <div
                            className={`product-image-placeholder product-image-art art-${imageArt.theme}`}
                            aria-hidden="true"
                          >
                            <span>{imageArt.emoji}</span>
                            <small>{group.name}</small>
                          </div>
                        )}
                        {product.brand && (
                          <span className="product-brand-badge">{product.brand}</span>
                        )}
                      </div>

                      <div className="product-card-copy">
                        <div className="product-badge-row">
                          {product.sku && !hasWeightChoices && (
                            <span className="product-sku-tag">{product.sku}</span>
                          )}
                          <span className={`stock-label stock-${stockStatus}`}>
                            {unavailable
                              ? isHindi
                                ? "उपलब्ध नहीं"
                                : "Out of stock"
                              : stockStatus === "limited"
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

                        <h4>{isHindi && group.name_hi ? group.name_hi : group.name}</h4>

                        {hasWeightChoices ? (
                          <div className="product-pack-tag">
                            ⚖ {group.variants.map((variant) => variant.pack_size).join(" · ")}
                          </div>
                        ) : product.pack_size ? (
                          <div className="product-pack-tag">
                            ⚖ {product.pack_size}
                          </div>
                        ) : null}

                        {product.description && !hasWeightChoices && (
                          <p style={{ marginTop: "0.35rem" }}>
                            {isHindi && product.description_hi
                              ? product.description_hi
                              : product.description}
                          </p>
                        )}

                        {/* Card Footer: Quantity and cart controls */}
                        <div className="product-card-footer">
                          {hasWeightChoices ? (
                            <button
                              type="button"
                              disabled={unavailable}
                              onClick={() => openVariantPicker(group)}
                              style={{ cursor: unavailable ? "not-allowed" : "pointer" }}
                            >
                              {isHindi ? "वज़न चुनें" : "Choose pack size"}
                              {inCart > 0 ? ` · ${inCart}` : ""}
                            </button>
                          ) : inCart > 0 ? (
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
              {visibleProductGroups.length > displayLimit && (
                <div className="load-more-container">
                  <p className="load-more-status">
                    {isHindi
                      ? `${visibleProductGroups.length} में से ${Math.min(displayLimit, visibleProductGroups.length)} उत्पाद दिखाए गए हैं`
                      : `Showing ${Math.min(displayLimit, visibleProductGroups.length)} of ${visibleProductGroups.length} products`}
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
                      onClick={() => setDisplayLimit(visibleProductGroups.length)}
                    >
                      {isHindi ? `सभी ${visibleProductGroups.length} सामान देखें` : `Show All (${visibleProductGroups.length})`}
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
        )}
      </section>

      {variantPicker && (
        <div
          className="variant-picker-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setVariantPicker(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setVariantPicker(null);
          }}
        >
          <section
            className="variant-picker-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="variant-picker-title"
          >
            <header className="variant-picker-heading">
              <div>
                <p>{isHindi ? "उपलब्ध पैक साइज़" : "AVAILABLE PACK SIZES"}</p>
                <h2 id="variant-picker-title">
                  {isHindi && variantPicker.name_hi
                    ? variantPicker.name_hi
                    : variantPicker.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setVariantPicker(null)}
                aria-label={isHindi ? "बंद करें" : "Close size selector"}
              >
                ×
              </button>
            </header>

            <p className="variant-picker-help">
              {isHindi
                ? "कैटलॉग में उपलब्ध पैक साइज़ चुनें। आप कार्ट में एक से अधिक साइज़ जोड़ सकते हैं।"
                : "Choose an available size. You can add more than one size of this product to your cart."}
            </p>

            <div className="variant-picker-options">
              {variantPicker.variants.map((variant) => {
                const unavailable = variant.stock_status === "out_of_stock";
                const quantity = cart[variant.id] ?? 0;
                return (
                  <button
                    type="button"
                    key={variant.id}
                    className={
                      selectedVariantId === variant.id
                        ? "variant-picker-option selected"
                        : "variant-picker-option"
                    }
                    aria-pressed={selectedVariantId === variant.id}
                    disabled={unavailable}
                    onClick={() => setSelectedVariantId(variant.id)}
                  >
                    <strong>{variant.pack_size}</strong>
                    <small>
                      {unavailable
                        ? isHindi
                          ? "उपलब्ध नहीं"
                          : "Out of stock"
                        : quantity > 0
                          ? isHindi
                            ? `कार्ट में ${quantity}`
                            : `${quantity} in cart`
                          : isHindi
                            ? "उपलब्ध"
                            : "Available"}
                    </small>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="variant-picker-add"
              disabled={
                !variantPicker.variants.some(
                  (variant) =>
                    variant.id === selectedVariantId &&
                    variant.stock_status !== "out_of_stock",
                )
              }
              onClick={addSelectedVariant}
            >
              {isHindi ? "चुना हुआ साइज़ कार्ट में जोड़ें" : "Add selected size to cart"}
            </button>
          </section>
        </div>
      )}

      {!isOrderPage && (
      <>
      <section
        className="bulk-section section-wrap"
        id="bulk-enquiry"
        aria-labelledby="bulk-order-title"
      >
        <div className="bulk-intro">
          <p className="section-eyebrow">{isHindi ? "थोक ऑर्डर" : "Bulk orders"}</p>
          <h2>{isHindi ? "बड़ी मात्रा के लिए पूछें" : "Enquire about bulk orders"}</h2>
          <p>
            {isHindi
              ? "कार्यक्रमों, संस्थानों या नियमित आपूर्ति के लिए उपलब्धता और मात्रा के बारे में संपर्क करें।"
              : "For events, institutions, or regular supply, contact the store to ask about availability and quantities."}
          </p>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/bulk-order" className="button button-primary">
              {isHindi ? "थोक ऑर्डर जानकारी" : "Bulk order information"}
            </Link>
          </div>
        </div>
        <div className="bulk-card">
          <BulkOrderWhatsAppCTA language={language} />
        </div>
      </section>

      <section className="visit-section" id="visit">
        <div className="visit-inner section-wrap">
          <div className="visit-heading">
            <p className="section-eyebrow">{isHindi ? "स्टोर जानकारी" : "Store information"}</p>
            <h2>{isHindi ? "मिनी सुपर स्टोर" : "Mini Super Store"}</h2>
          </div>
          <div className="visit-detail">
            <span className="visit-pin" aria-hidden="true">⌖</span>
            <div>
              <strong>{isHindi ? "पता" : "Address"}</strong>
              <p><a href={STORE_MAP_URL} target="_blank" rel="noopener noreferrer">{STORE_ADDRESS}</a></p>
              <small>{STORE_REGION}</small>
            </div>
          </div>
          <div className="visit-hours">
            <strong>{isHindi ? "खुलने का समय" : "Opening hours"}</strong>
            <p>{STORE_OPENING_HOURS.weekdays}: {STORE_OPENING_HOURS.weekdayOpen}–{STORE_OPENING_HOURS.weekdayClose}</p>
            <p>{STORE_OPENING_HOURS.sunday}: {STORE_OPENING_HOURS.sundayOpen}–{STORE_OPENING_HOURS.sundayClose}</p>
          </div>
          <div className="visit-contact">
            <strong>{isHindi ? "संपर्क" : "Contact"}</strong>
            <a href={`tel:${getStorePhoneLink()}`}>{getStorePhoneInternationalDisplay()}</a>
            <a href={`https://wa.me/${getStoreWhatsAppNumber()}`} target="_blank" rel="noopener noreferrer">
              {isHindi ? "WhatsApp पर संदेश भेजें ↗" : "Message on WhatsApp ↗"}
            </a>
          </div>
          <div className="visit-services">
            <strong>{isHindi ? "सेवाएँ" : "Services"}</strong>
            <p>{isHindi ? "लाडवा में होम डिलीवरी" : `Home delivery in ${STORE_HOME_DELIVERY_AREA}`}</p>
            {STORE_CURBSIDE_PICKUP_AVAILABLE && <p>{isHindi ? "कर्बसाइड पिकअप उपलब्ध" : "Curbside pickup available"}</p>}
          </div>
          <Link className="visit-map-link" href="/visit">
            {isHindi ? "दिशा-निर्देश और संपर्क" : "Directions and contact"} ↗
          </Link>
        </div>
      </section>
      </>
      )}

      <StoreFooter language={language} />

      <MobileStoreNav language={language} />
    </main>
  );
}
