"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import BulkOrderWhatsAppCTA from "@/components/wholesale/BulkOrderWhatsAppCTA";
import ShoppingCart from "@/components/store/ShoppingCart";
import type { PublicCategory, PublicOffer, PublicProduct } from "@/app/page";
import { parseStoreCart } from "@/lib/cart";

type Language = "en" | "hi";
type Group = "daily" | "home" | "style";

type Department = {
  id: string;
  group: Group;
  icon: string;
  title: string;
  hindiTitle: string;
  description: string;
  hindiDescription: string;
  keywords: string;
  tone: string;
  note: string;
  hindiNote: string;
};

const departments: Department[] = [
  {
    id: "groceries",
    group: "daily",
    icon: "🥬",
    title: "Groceries",
    hindiTitle: "किराना",
    description: "Everyday pantry staples and kitchen essentials.",
    hindiDescription: "रोज़मर्रा का राशन और रसोई की ज़रूरी चीज़ें।",
    keywords: "rice atta flour dal pulses oil spices sugar tea snacks grocery",
    tone: "mint",
    note: "For everyday cooking",
    hindiNote: "रोज़ के खाने के लिए",
  },
  {
    id: "household",
    group: "home",
    icon: "🧺",
    title: "Household",
    hindiTitle: "घरेलू सामान",
    description: "Useful picks to keep your home running smoothly.",
    hindiDescription: "घर की रोज़मर्रा की ज़रूरतों का सामान।",
    keywords: "cleaning storage laundry home utility household",
    tone: "peach",
    note: "For a cared-for home",
    hindiNote: "घर की देखभाल के लिए",
  },
  {
    id: "crockery",
    group: "home",
    icon: "🍽️",
    title: "Crockery",
    hindiTitle: "क्रॉकरी",
    description: "Dining and serving essentials for every occasion.",
    hindiDescription: "खाने और परोसने के लिए ज़रूरी सामान।",
    keywords: "plates bowls cups mugs glasses kitchen serveware crockery",
    tone: "blue",
    note: "For your table",
    hindiNote: "आपकी मेज़ के लिए",
  },
  {
    id: "hosiery",
    group: "style",
    icon: "🧦",
    title: "Hosiery",
    hindiTitle: "होज़री",
    description: "Comfortable everyday clothing essentials.",
    hindiDescription: "आरामदायक रोज़मर्रा के कपड़े और ज़रूरी सामान।",
    keywords: "socks innerwear garments hosiery clothing",
    tone: "lavender",
    note: "Made for everyday comfort",
    hindiNote: "हर दिन के आराम के लिए",
  },
  {
    id: "festive",
    group: "style",
    icon: "🎉",
    title: "Festive picks",
    hindiTitle: "त्योहारों का सामान",
    description: "Little details for celebrations and special days.",
    hindiDescription: "खास दिनों और त्योहारों की छोटी-बड़ी खुशियाँ।",
    keywords: "festival festive decoration celebration gift seasonal",
    tone: "yellow",
    note: "For moments worth celebrating",
    hindiNote: "खुशियों के खास पलों के लिए",
  },
];

const filters = [
  { id: "all", en: "All departments", hi: "सभी विभाग" },
  { id: "daily", en: "Daily needs", hi: "रोज़मर्रा की चीज़ें" },
  { id: "home", en: "Home & kitchen", hi: "घर और रसोई" },
  { id: "style", en: "Style & festive", hi: "होज़री और त्योहार" },
] as const;

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
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
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
      // A storage event already wrote this value in another tab; avoid echoing it back.
      if (window.localStorage.getItem(key) !== serialized) {
        window.localStorage.setItem(key, serialized);
      }
    } catch {
      // The cart remains usable in memory when browser storage is unavailable.
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

  function addToCart(productId: string) {
    setCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
  }

  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);

  const visibleDepartments = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return departments.filter((department) => {
      const matchesGroup = activeFilter === "all" || department.group === activeFilter;
      const searchable = [
        department.title,
        department.hindiTitle,
        department.description,
        department.hindiDescription,
        department.keywords,
      ].join(" ").toLocaleLowerCase();
      return matchesGroup && (!term || searchable.includes(term));
    });
  }, [activeFilter, search]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const allowedCategorySlugs =
      activeFilter === "all"
        ? null
        : activeFilter === "daily"
          ? new Set(["groceries"])
          : activeFilter === "home"
            ? new Set(["household", "crockery"])
            : new Set(["hosiery", "festive"]);
    const categoryIds = allowedCategorySlugs
      ? new Set(categories.filter((category) => allowedCategorySlugs.has(category.slug)).map((category) => category.id))
      : null;

    return products.filter((product) => {
      if (categoryIds && !categoryIds.has(product.category_id ?? "")) return false;
      if (!term) return true;
      return [
        product.name,
        product.name_hi,
        product.description,
        product.description_hi,
      ].join(" ").toLocaleLowerCase().includes(term);
    });
  }, [activeFilter, categories, products, search]);

  return (
    <main className="storefront">
      {offline && (
        <div className="network-banner" role="status">
          {isHindi ? "आप ऑफ़लाइन हैं। पुरानी जानकारी दिखाई दे सकती है।" : "You are offline. Saved cart items may remain available."}
        </div>
      )}
      <div className="topline">
        <div className="topline-inner">
          <span>{isHindi ? "लाडवा · रेड रोड" : "Ladwa · Red Road"}</span>
          <span className="topline-message">{isHindi ? "आपके अपने मोहल्ले की दुकान" : "Your neighbourhood store"}</span>
          <div className="language-switch" aria-label="Choose language">
            <button type="button" onClick={() => setLanguage("en")} aria-pressed={!isHindi}>EN</button>
            <span aria-hidden="true">/</span>
            <button type="button" onClick={() => setLanguage("hi")} aria-pressed={isHindi}>हिंदी</button>
          </div>
        </div>
      </div>

      <header className="site-header">
        <a className="brand" href="#home" aria-label="Mini Super Store home">
          <span className="brand-mark" aria-hidden="true"><span>m</span></span>
          <span className="brand-copy">
            <strong>MINI <em>SUPER</em> STORE</strong>
            <small>{isHindi ? "रोज़मर्रा की हर ज़रूरत" : "Everyday needs, made easy"}</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#departments">{isHindi ? "विभाग" : "Departments"}</a>
          <a href="#why-us">{isHindi ? "हमारे बारे में" : "Why shop with us"}</a>
          <a href="#bulk-enquiry">{isHindi ? "थोक पूछताछ" : "Bulk enquiry"}</a>
          <a href="#visit">{isHindi ? "दुकान पर आएँ" : "Visit us"}</a>
        </nav>
        <div className="header-actions">
          <ShoppingCart
            language={language}
            products={products}
            cart={cart}
            setCart={setCart}
          />
          <a className="header-visit" href="#visit">
            {isHindi ? "दुकान की जानकारी" : "Store details"}<span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-content">
          <div className="hero-kicker"><span className="kicker-dot" />{isHindi ? "लाडवा में आपका अपना स्टोर" : "Your local store in Ladwa"}</div>
          <h1>
            {isHindi ? <>हर दिन की ज़रूरतें,<br /><span>एक ही जगह।</span></> : <>Everyday essentials,<br /><span>all in one place.</span></>}
          </h1>
          <p className="hero-description">
            {isHindi
              ? "किराने से लेकर घर और रसोई के सामान तक — अपनी रोज़मर्रा की खरीदारी आसान बनाएँ।"
              : "From grocery staples to home and kitchen finds, explore the things that make everyday living easier."}
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#departments">{isHindi ? "विभाग देखें" : "Explore departments"}<span aria-hidden="true">→</span></a>
            <a className="button button-quiet" href="#bulk-enquiry">{isHindi ? "थोक पूछताछ" : "Bulk order enquiry"}</a>
          </div>
          <div className="hero-footnote"><span className="footnote-icon">✳</span>{isHindi ? "आपकी रोज़मर्रा की खरीदारी का भरोसेमंद ठिकाना" : "A familiar stop for your everyday shopping"}</div>
        </div>
        <div className="hero-art" aria-label="Illustration of everyday shopping essentials" role="img">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-sun" />
          <div className="art-note note-top"><span>✳</span>{isHindi ? "हर दिन" : "EVERYDAY"}</div>
          <div className="shopping-bag">
            <div className="bag-handle" />
            <div className="bag-front">
              <span className="bag-brand">MINI<br /><b>STORE</b></span>
              <span className="bag-spark">✳</span>
            </div>
          </div>
          <div className="floating-item item-produce">🥑</div>
          <div className="floating-item item-bread">🥖</div>
          <div className="floating-item item-bowl">🥣</div>
          <div className="art-note note-bottom">{isHindi ? "छोटी दुकान, बड़ी ज़रूरतें" : "LITTLE STORE, LOTS TO LOVE"}</div>
          <div className="art-shadow" />
        </div>
      </section>

      <section className="quick-points" aria-label="Store highlights">
        <div><span className="quick-icon">⌂</span><span><strong>{isHindi ? "लोकल स्टोर" : "Local store"}</strong><small>{isHindi ? "लाडवा में" : "Based in Ladwa"}</small></span></div>
        <div><span className="quick-icon">♡</span><span><strong>{isHindi ? "रोज़मर्रा की ज़रूरतें" : "Everyday essentials"}</strong><small>{isHindi ? "एक ही जगह" : "Under one roof"}</small></span></div>
        <div><span className="quick-icon">☏</span><span><strong>{isHindi ? "सीधे संपर्क करें" : "Talk to our team"}</strong><small>{isHindi ? "थोक पूछताछ उपलब्ध" : "Bulk enquiries welcome"}</small></span></div>
      </section>

      {offers.length > 0 && (
        <section className="offers-section section-wrap" aria-labelledby="offers-title">
          <div className="offers-heading">
            <div>
              <p className="section-eyebrow">{isHindi ? "à¤¦à¥à¤•à¤¾à¤¨ à¤•à¥‡ à¤–à¤¾à¤¸ à¤‘à¤«à¤¼à¤°" : "From our store"}</p>
              <h2 id="offers-title">{isHindi ? "à¤®à¥Œà¤œà¥‚à¤¦à¤¾ à¤‘à¤«à¤¼à¤°" : "Current offers"}</h2>
            </div>
            <span>{isHindi ? "à¤¸à¥€à¤®à¤¿à¤¤ à¤¸à¤®à¤¯ à¤•à¥‡ à¤²à¤¿à¤" : "Selected store offers"}</span>
          </div>
          <div className="offers-grid">
            {offers.map((offer) => (
              <article className="offer-card" key={offer.id}>
                <span aria-hidden="true">âœ³</span>
                <div>
                  <h3>{isHindi && offer.title_hi ? offer.title_hi : offer.title}</h3>
                  {(offer.description || offer.description_hi) && (
                    <p>{isHindi && offer.description_hi ? offer.description_hi : offer.description}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="departments-section section-wrap" id="departments">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">{isHindi ? "अपनी पसंद का विभाग चुनें" : "A little bit of everything"}</p>
            <h2>{isHindi ? "हमारे विभाग" : "Explore our departments"}<span className="heading-period">.</span></h2>
            <p className="section-description">{isHindi ? "अपनी ज़रूरत के हिसाब से सामान की श्रेणी देखें।" : "Find the everyday categories you need, all in one familiar place."}</p>
          </div>
          <span className="section-side-note">01 / 05<br /><small>{isHindi ? "विभाग" : "DEPARTMENTS"}</small></span>
        </div>

        <div className="catalogue-tools">
          <label className="search-box">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isHindi ? "विभाग खोजें..." : "Search departments..."}
              aria-label={isHindi ? "विभाग खोजें" : "Search departments"}
            />
          </label>
          <div className="filter-list" aria-label={isHindi ? "विभाग फ़िल्टर" : "Department filters"}>
            {filters.map((filter) => (
              <button
                type="button"
                key={filter.id}
                className={activeFilter === filter.id ? "filter-chip active" : "filter-chip"}
                aria-pressed={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
              >
                {isHindi ? filter.hi : filter.en}
              </button>
            ))}
          </div>
        </div>

        {visibleDepartments.length > 0 ? (
          <div className="department-grid">
            {visibleDepartments.map((department, index) => (
              <article className={`department-card tone-${department.tone}`} key={department.id}>
                <div className="department-card-top">
                  <span className="department-index">0{index + 1}</span>
                  <span className="department-arrow" aria-hidden="true">↗</span>
                </div>
                <div className="department-art" aria-hidden="true"><span>{department.icon}</span><i /></div>
                <div className="department-copy">
                  <p className="department-note">{isHindi ? department.hindiNote : department.note}</p>
                  <h3>{isHindi ? department.hindiTitle : department.title}</h3>
                  <p>{isHindi ? department.hindiDescription : department.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-search">
            <span>⌕</span>
            <strong>{isHindi ? "कोई विभाग नहीं मिला" : "No departments found"}</strong>
            <p>{isHindi ? "दूसरा शब्द लिखकर देखें।" : "Try another search term or choose a different filter."}</p>
            <button type="button" onClick={() => { setSearch(""); setActiveFilter("all"); }}>{isHindi ? "फ़िल्टर हटाएँ" : "Clear filters"}</button>
          </div>
        )}
        <div className="live-catalogue">
          <div className="live-catalogue-heading">
            <div>
              <p className="section-eyebrow">{isHindi ? "अभी उपलब्ध" : "Available now"}</p>
              <h3>{isHindi ? "लाइव कैटलॉग" : "Live product catalogue"}</h3>
            </div>
            <span>{visibleProducts.length} {isHindi ? "उत्पाद" : "products"}</span>
          </div>
          {visibleProducts.length > 0 ? (
            <div className="product-grid">
              {visibleProducts.map((product) => {
                const inCart = cart[product.id] ?? 0;
                const unavailable = product.stock_status === "out_of_stock";
                return (
                  <article className="product-card" key={product.id}>
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={isHindi && product.name_hi ? product.name_hi : product.name}
                        width={600}
                        height={360}
                        sizes="(max-width: 680px) 50vw, (max-width: 900px) 33vw, 300px"
                      />
                    ) : (
                      <div className="product-image-placeholder" aria-hidden="true">MINI STORE</div>
                    )}
                    <div className="product-card-copy">
                      <span className={`stock-label stock-${product.stock_status}`}>
                        {unavailable
                          ? isHindi ? "उपलब्ध नहीं" : "Out of stock"
                          : product.stock_status === "limited"
                            ? isHindi ? "सीमित उपलब्ध" : "Limited"
                            : isHindi ? "उपलब्ध" : "Available"}
                      </span>
                      <h4>{isHindi && product.name_hi ? product.name_hi : product.name}</h4>
                      {product.description && <p>{isHindi && product.description_hi ? product.description_hi : product.description}</p>}
                      <div className="product-card-footer">
                        <strong>{product.price === null ? (isHindi ? "कीमत पूछें" : "Ask for price") : `₹${product.price.toFixed(2)}`}</strong>
                        <button
                          type="button"
                          disabled={unavailable || product.price === null}
                          onClick={() => addToCart(product.id)}
                        >
                          {inCart > 0
                            ? `${isHindi ? "जोड़ें" : "Add"} (${inCart})`
                            : isHindi ? "कार्ट में जोड़ें" : "Add to cart"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-catalogue">
              <strong>{isHindi ? "अभी कोई उत्पाद उपलब्ध नहीं है।" : "No products available yet."}</strong>
              <p>{isHindi ? "हम उत्पाद और कीमतें जल्द अपडेट करेंगे।" : "Products and prices will appear when the store publishes them."}</p>
            </div>
          )}
        </div>
      </section>

      <section className="why-section" id="why-us">
        <div className="why-inner section-wrap">
          <div className="why-intro">
            <p className="section-eyebrow">{isHindi ? "आपकी दुकान, आपका मोहल्ला" : "A store close to home"}</p>
            <h2>{isHindi ? <>रोज़मर्रा की खरीदारी,<br /><em>थोड़ी और आसान।</em></> : <>A familiar place<br /><em>for everyday needs.</em></>}</h2>
            <p>{isHindi ? "हमारा मकसद आपकी रोज़मर्रा की खरीदारी को आसान और सुविधाजनक बनाना है।" : "A neighbourhood store should feel simple, helpful and easy to reach. That is the experience we want to bring online."}</p>
          </div>
          <div className="why-list">
            <div className="why-item"><span>01</span><div><strong>{isHindi ? "ज़रूरत की चीज़ें एक जगह" : "Everyday categories together"}</strong><p>{isHindi ? "किराना, घरेलू सामान, क्रॉकरी, होज़री और त्योहारों का सामान।" : "Groceries, household goods, crockery, hosiery and festive essentials."}</p></div><b>↗</b></div>
            <div className="why-item"><span>02</span><div><strong>{isHindi ? "सीधा संपर्क" : "A direct line to the store"}</strong><p>{isHindi ? "किसी खास सामान या थोक ऑर्डर के लिए हमसे पूछें।" : "Have a question or a larger requirement? Reach out to the store."}</p></div><b>↗</b></div>
            <div className="why-item"><span>03</span><div><strong>{isHindi ? "लोकल और सुविधाजनक" : "Rooted in the neighbourhood"}</strong><p>{isHindi ? "लाडवा के ग्राहकों के लिए एक आसान ऑनलाइन अनुभव।" : "A simple online starting point for customers in Ladwa."}</p></div><b>↗</b></div>
          </div>
        </div>
      </section>

      <section className="bulk-section section-wrap" id="bulk-enquiry" aria-labelledby="bulk-order-title">
        <div className="bulk-intro">
          <p className="section-eyebrow">{isHindi ? "बड़ी ज़रूरत?" : "Need more of something?"}</p>
          <h2>{isHindi ? "थोक खरीदारी के लिए" : "Buying in bulk?"}</h2>
          <p>{isHindi ? "थोक ऑर्डर और बड़ी मात्रा की पूछताछ के लिए सीधे संपर्क करें।" : "Talk to our team about bulk quantities, product details and pricing."}</p>
        </div>
        <div className="bulk-card"><BulkOrderWhatsAppCTA language={language} /></div>
      </section>

      <section className="visit-section" id="visit">
        <div className="visit-inner section-wrap">
          <div>
            <p className="section-eyebrow">{isHindi ? "हमसे मिलें" : "Come say hello"}</p>
            <h2>{isHindi ? "मिलते हैं दुकान पर।" : "See you at the store."}</h2>
          </div>
          <div className="visit-detail"><span className="visit-pin">⌖</span><div><strong>Mini Super Store</strong><p>{isHindi ? "लाडवा · रेड रोड" : "Ladwa · Red Road"}</p></div></div>
          <p className="visit-note">{isHindi ? "दुकान के पते और समय की अधिक जानकारी जल्द जोड़ी जाएगी।" : "Store timings and additional contact details will be published here."}</p>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <a className="footer-brand" href="#home">MINI <em>SUPER</em> STORE</a>
          <nav className="footer-portals" aria-label="Portal login links">
            <a href="/login">Customer login</a>
            <a href="/login">Staff login</a>
            <a href="/login">Admin login</a>
          </nav>
          <p>© {new Date().getFullYear()} Mini Super Store. {isHindi ? "सर्वाधिकार सुरक्षित।" : "Everyday, made easier."}</p>
          <a href="#home">{isHindi ? "ऊपर जाएँ ↑" : "Back to top ↑"}</a>
        </div>
      </footer>

      <nav className="mobile-nav" aria-label="Quick navigation">
        <a href="#home"><span>⌂</span>{isHindi ? "होम" : "Home"}</a>
        <a href="#departments"><span>▦</span>{isHindi ? "विभाग" : "Shop"}</a>
        <a href="#bulk-enquiry"><span>☏</span>{isHindi ? "पूछताछ" : "Enquire"}</a>
        <a href="#visit"><span>⌖</span>{isHindi ? "दुकान" : "Visit"}</a>
      </nav>
    </main>
  );
}
