"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { PublicProduct } from "@/app/page";
import {
  getProductImageArt,
  getProductImageUrl,
  isSeedCatalogueImage,
  shouldLoadProductImageDirectly,
} from "@/lib/product-image";
import { buildWhatsAppOrderMessage } from "@/lib/whatsapp-order-message";
import { getStoreWhatsAppNumber } from "@/lib/store-contact";

type Language = "en" | "hi";

type FulfilmentType = "delivery" | "pickup";

type CustomerInfo = {
  name: string;
  phone: string;
  fulfilment: FulfilmentType;
  address: string;
  notes: string;
};

export default function ShoppingCart({
  language,
  products,
  cart,
  setCart,
}: {
  language: Language;
  products: PublicProduct[];
  cart: Record<string, number>;
  setCart: (cart: Record<string, number>) => void;
}) {
  const isHindi = language === "hi";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Customer order details remembered in browser storage
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    phone: "",
    fulfilment: "delivery",
    address: "",
    notes: "",
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("mini-super-store-customer-info");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          queueMicrotask(() => {
            setCustomer((prev) => ({ ...prev, ...parsed }));
          });
        }
      }
    } catch {
      // Storage unavailable fallback
    }
  }, []);

  function updateCustomer(field: keyof CustomerInfo, value: string) {
    setValidationError(null);
    setCustomer((prev) => {
      const updated = { ...prev, [field]: value };
      try {
        window.localStorage.setItem(
          "mini-super-store-customer-info",
          JSON.stringify(updated),
        );
      } catch {
        // Ignored
      }
      return updated;
    });
  }

  const lines = useMemo(
    () =>
      products
        .filter((product) => (cart[product.id] ?? 0) > 0)
        .map((product) => ({
          product,
          quantity: cart[product.id],
        })),
    [cart, products],
  );

  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);

  const storePhone = getStoreWhatsAppNumber();

  function changeQuantity(productId: string, quantity: number) {
    const next = { ...cart };
    if (quantity <= 0) {
      delete next[productId];
    } else {
      next[productId] = Math.min(100, quantity);
    }
    setCart(next);
  }

  function clearCart() {
    if (window.confirm(isHindi ? "क्या आप कार्ट खाली करना चाहते हैं?" : "Clear all items from your cart?")) {
      setCart({});
    }
  }

  // Construct structured WhatsApp order message (prices intentionally omitted)
  const whatsappMessage = useMemo(() => {
    return buildWhatsAppOrderMessage({
      language,
      customer,
      items: lines.map(({ product, quantity }) => ({
        name: product.name,
        name_hi: product.name_hi,
        brand: product.brand,
        pack_size: product.pack_size,
        quantity,
      })),
    });
  }, [customer, language, lines]);

  function validateOrder(): boolean {
    if (!customer.name.trim()) {
      setValidationError(
        isHindi
          ? "कृपया अपना नाम लिखें।"
          : "Please enter your name to proceed.",
      );
      return false;
    }
    const phoneDigits = customer.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      setValidationError(
        isHindi
          ? "कृपया 10 अंकों का मोबाइल / WhatsApp नंबर लिखें।"
          : "Please enter a valid phone number with 10 to 15 digits.",
      );
      return false;
    }
    if (customer.fulfilment === "delivery" && !customer.address.trim()) {
      setValidationError(
        isHindi
          ? "होम डिलीवरी के लिए कृपया अपना पता व लैंडमार्क लिखें।"
          : "Please provide a delivery address & landmark for Home Delivery.",
      );
      return false;
    }
    setValidationError(null);
    return true;
  }

  function handleSendWhatsApp(e: React.MouseEvent) {
    if (!validateOrder()) {
      e.preventDefault();
      return;
    }
    const url = `https://wa.me/${storePhone}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard failed
    }
  }

  return (
    <>
      <button
        type="button"
        className="cart-trigger"
        onClick={() => setOpen(true)}
        aria-label={isHindi ? "शॉपिंग कार्ट खोलें" : "Open shopping cart"}
      >
        <span aria-hidden="true">🛒</span>
        <span>{isHindi ? "कार्ट" : "Cart"}</span>
        {itemCount > 0 && <b>{itemCount}</b>}
      </button>

      {/* Floating Sticky Cart Bar for Mobile when cart has items */}
      {itemCount > 0 && !open && (
        <aside
          className="sticky-mobile-cart-bar"
          aria-label={isHindi ? "कार्ट सारांश" : "Cart summary"}
        >
          <div className="sticky-mobile-cart-info">
            <span className="cart-badge-icon">🛒 {itemCount}</span>
            <div>
              <strong>
                {itemCount} {isHindi ? "सामान कार्ट में" : "Items in Cart"}
              </strong>
              <small>{isHindi ? "WhatsApp ऑर्डर तैयार है" : "Ready for WhatsApp Order"}</small>
            </div>
          </div>
          <button
            type="button"
            className="sticky-mobile-cart-btn"
            onClick={() => setOpen(true)}
          >
            {isHindi ? "कार्ट देखें व WhatsApp भेजें →" : "View & Send to WhatsApp →"}
          </button>
        </aside>
      )}

      {open && (
        <div
          className="cart-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <aside
            className="cart-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            <div className="cart-heading">
              <div>
                <p>{isHindi ? "लाडवा किराना स्टोर" : "Ladwa Grocery Store"}</p>
                <h2 id="cart-title">
                  {isHindi ? "शॉपिंग लिस्ट / कार्ट" : "Your Shopping Cart"}{" "}
                  <span>{itemCount}</span>
                </h2>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {lines.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#913b34",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    title={isHindi ? "कार्ट खाली करें" : "Empty Cart"}
                  >
                    {isHindi ? "खाली करें" : "Clear"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={isHindi ? "कार्ट बंद करें" : "Close cart"}
                >
                  ×
                </button>
              </div>
            </div>

            {lines.length === 0 ? (
              <div className="cart-empty">
                <span aria-hidden="true" style={{ fontSize: "3rem" }}>🛒</span>
                <h3>{isHindi ? "आपकी कार्ट खाली है" : "Your cart is empty"}</h3>
                <p>
                  {isHindi
                    ? "कैटलॉग से सामान जोड़ें, फिर नाम, फ़ोन और पिकअप या डिलीवरी की जानकारी भरकर WhatsApp पर भेजें।"
                    : "Add products from the catalogue, enter your contact and pickup or delivery details, then send the request on WhatsApp."}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="button button-primary"
                  style={{ marginTop: "1.2rem", padding: "0.6rem 1.2rem", borderRadius: "6px" }}
                >
                  {isHindi ? "सामान देखें" : "Explore Products"}
                </button>
              </div>
            ) : (
              <>
                {/* Cart Lines list */}
                <div className="cart-lines">
                  {lines.map(({ product, quantity }) => (
                    <div className="cart-line" key={product.id}>
                      {product.image_url && !isSeedCatalogueImage(product.image_url) ? (
                        <Image
                          src={getProductImageUrl(product.image_url, 116)}
                          alt={
                            isHindi && product.name_hi
                              ? product.name_hi
                              : product.name
                          }
                          width={116}
                          height={116}
                          quality={75}
                          loading="lazy"
                          sizes="58px"
                          unoptimized={shouldLoadProductImageDirectly(
                            product.image_url,
                          )}
                        />
                      ) : (
                        <span
                          className="cart-line-placeholder"
                          aria-hidden="true"
                        >
                          {getProductImageArt(product.name).emoji}
                        </span>
                      )}

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                          {product.brand && (
                            <span className="product-sku-tag" style={{ fontSize: "0.55rem", padding: "0.1rem 0.35rem", background: "#e8f2e6", color: "#1b4d2e" }}>
                              {product.brand}
                            </span>
                          )}
                          {product.pack_size && (
                            <span style={{ fontSize: "0.62rem", color: "#2b6140", fontWeight: 700 }}>
                              ⚖ {product.pack_size}
                            </span>
                          )}
                        </div>

                        <strong style={{ fontSize: "0.82rem", marginTop: "0.15rem", display: "block" }}>
                          {isHindi && product.name_hi
                            ? product.name_hi
                            : product.name}
                        </strong>

                        <small style={{ color: "#3e6347", fontWeight: 700, fontSize: "0.72rem" }}>
                          {quantity} {isHindi ? "पैक चुने गए" : "pack(s) selected"}
                        </small>
                      </div>

                      <div
                        className="quantity-control"
                        aria-label={isHindi ? "मात्रा" : "Quantity"}
                      >
                        <button
                          type="button"
                          aria-label={isHindi ? "मात्रा घटाएं" : "Decrease quantity"}
                          onClick={() =>
                            changeQuantity(product.id, quantity - 1)
                          }
                        >
                          −
                        </button>

                        <span>{quantity}</span>

                        <button
                          type="button"
                          aria-label={isHindi ? "मात्रा बढ़ाएं" : "Increase quantity"}
                          onClick={() =>
                            changeQuantity(product.id, quantity + 1)
                          }
                          disabled={quantity >= 100}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Items Total Summary (No Price List) */}
                <div className="checkout-total" style={{ borderTop: "2px solid #e1e9df", background: "#f8fbf7", padding: "0.8rem 1rem", borderRadius: "8px" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 800, color: "#19422a" }}>
                      {isHindi ? "कुल चुनिंदा सामान" : "Total Selected Items"}
                    </span>
                    <small style={{ color: "#4d6b54", fontSize: "0.72rem" }}>
                      {isHindi
                        ? "ऑर्डर भेजने पर दुकान टीम द्वारा अंतिम बिल WhatsApp पर भेजा जाएगा।"
                        : "Final bill amount will be confirmed directly on WhatsApp."}
                    </small>
                  </div>
                  <strong style={{ color: "#1f5139", fontSize: "1.25rem", whiteSpace: "nowrap" }}>
                    {itemCount} {isHindi ? "पैक" : "packs"}
                  </strong>
                </div>

                {/* Customer Details & Fulfilment Form */}
                <div className="checkout-form" style={{ marginTop: "0.6rem", padding: "0.9rem", background: "#f6faf4", borderRadius: "10px", border: "1px solid #dbe6d8" }}>
                  <p style={{ margin: "0 0 0.6rem", fontSize: "0.72rem", fontWeight: 800, color: "#1b4d2e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    📋 {isHindi ? "ग्राहक व डिलीवरी विवरण" : "Customer & Delivery Details"}
                  </p>

                  {validationError && (
                    <div style={{ padding: "0.5rem 0.75rem", marginBottom: "0.6rem", background: "#fee2e2", border: "1px solid #f87171", borderRadius: "6px", color: "#991b1b", fontSize: "0.75rem", fontWeight: 700 }}>
                      ⚠️ {validationError}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#294734" }}>
                        {isHindi ? "आपका नाम *" : "Your Name *"}
                      </span>
                      <input
                        type="text"
                        required
                        value={customer.name}
                        onChange={(e) => updateCustomer("name", e.target.value)}
                        placeholder={isHindi ? "पूरा नाम लिखें" : "Full Name"}
                        style={{ padding: "0.5rem 0.65rem", borderRadius: "6px", border: "1px solid #ccd8c9", fontSize: "0.82rem" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#294734" }}>
                        {isHindi ? "मोबाइल नंबर *" : "Phone Number *"}
                      </span>
                      <input
                        type="tel"
                        required
                        value={customer.phone}
                        onChange={(e) => updateCustomer("phone", e.target.value)}
                        placeholder={isHindi ? "10 अंकों का नंबर" : "10-digit number"}
                        style={{ padding: "0.5rem 0.65rem", borderRadius: "6px", border: "1px solid #ccd8c9", fontSize: "0.82rem" }}
                      />
                    </label>
                  </div>

                  {/* Delivery / Store Pickup Choice */}
                  <div style={{ marginTop: "0.7rem" }}>
                    <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#294734", marginBottom: "0.35rem" }}>
                      {isHindi ? "डिलीवरी का प्रकार चुनें *" : "Choose Fulfilment Method *"}
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => updateCustomer("fulfilment", "delivery")}
                        style={{
                          padding: "0.6rem 0.5rem",
                          borderRadius: "8px",
                          border: customer.fulfilment === "delivery" ? "2px solid #1f5139" : "1px solid #d0dcd0",
                          background: customer.fulfilment === "delivery" ? "#e9f5e7" : "#ffffff",
                          color: customer.fulfilment === "delivery" ? "#143f26" : "#44594c",
                          fontWeight: 700,
                          fontSize: "0.74rem",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        🏠 {isHindi ? "होम डिलीवरी" : "Home Delivery"}
                      </button>

                      <button
                        type="button"
                        onClick={() => updateCustomer("fulfilment", "pickup")}
                        style={{
                          padding: "0.6rem 0.5rem",
                          borderRadius: "8px",
                          border: customer.fulfilment === "pickup" ? "2px solid #1f5139" : "1px solid #d0dcd0",
                          background: customer.fulfilment === "pickup" ? "#e9f5e7" : "#ffffff",
                          color: customer.fulfilment === "pickup" ? "#143f26" : "#44594c",
                          fontWeight: 700,
                          fontSize: "0.74rem",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        🏪 {isHindi ? "दुकान से पिकअप" : "Take from store"}
                      </button>
                    </div>
                  </div>

                  {/* Address Input for Home Delivery */}
                  {customer.fulfilment === "delivery" ? (
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.6rem" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#294734" }}>
                        {isHindi ? "डिलीवरी का पूरा पता व लैंडमार्क (लाडवा) *" : "Delivery Address & Landmark (Ladwa) *"}
                      </span>
                      <textarea
                        required
                        rows={2}
                        value={customer.address}
                        onChange={(e) => updateCustomer("address", e.target.value)}
                        placeholder={
                          isHindi
                            ? "मकान नंबर / दुकान, गली नंबर, पास का मंदिर या लैंडमार्क, लाडवा"
                            : "House/Shop no., Street/Ward, Landmark, Ladwa"
                        }
                        style={{
                          padding: "0.5rem 0.65rem",
                          borderRadius: "6px",
                          border: "1px solid #ccd8c9",
                          fontSize: "0.78rem",
                          resize: "none",
                          fontFamily: "inherit",
                        }}
                      />
                    </label>
                  ) : (
                    <div style={{ marginTop: "0.6rem", padding: "0.5rem 0.75rem", background: "#f0f7ee", borderRadius: "6px", border: "1px solid #d3e5cf", fontSize: "0.74rem", color: "#1f5139" }}>
                      📍 <strong>{isHindi ? "पिकअप स्थान:" : "Pickup Location:"}</strong> Mini Super Store, Red Road, Ladwa. {isHindi ? "सामान पैक होते ही संदेश प्राप्त होगा।" : "Your pack will be ready for instant pickup."}
                    </div>
                  )}

                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.6rem" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#294734" }}>
                      {isHindi ? "अतिरिक्त निर्देश (वैकल्पिक)" : "Order Notes / Instructions (Optional)"}
                    </span>
                    <input
                      type="text"
                      value={customer.notes}
                      onChange={(e) => updateCustomer("notes", e.target.value)}
                      placeholder={isHindi ? "उदा: शाम 5 बजे के बाद लाएं, कॉल करें" : "e.g., Deliver after 5 PM, Call upon arrival"}
                      style={{ padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid #ccd8c9", fontSize: "0.78rem" }}
                    />
                  </label>
                </div>

                {/* Primary Actions: Send to WhatsApp */}
                <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="whatsapp-order-btn"
                    style={{
                      border: "none",
                      width: "100%",
                      padding: "0.9rem",
                      fontSize: "0.86rem",
                      fontWeight: 900,
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      background: "#25D366",
                      color: "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(37, 211, 102, 0.35)",
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>💬</span>
                    <span>
                      {isHindi
                        ? "WhatsApp पर पूरा ऑर्डर भेजें (1-क्लिक)"
                        : "Send Full Order to WhatsApp (1-Click)"}
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="load-more-btn"
                      style={{ minHeight: "36px", padding: "0.4rem 0.6rem", fontSize: "0.68rem" }}
                    >
                      {copied ? (isHindi ? "✓ कॉपी हो गया!" : "✓ Copied List!") : (isHindi ? "📋 लिस्ट कॉपी करें" : "📋 Copy Order Text")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="load-more-btn"
                      style={{ minHeight: "36px", padding: "0.4rem 0.6rem", fontSize: "0.68rem", background: "#f2f5ef" }}
                    >
                      {isHindi ? "+ और सामान जोड़ें" : "+ Add More Items"}
                    </button>
                  </div>
                </div>

                <p className="wholesale-help" style={{ marginTop: "0.8rem", textAlign: "center" }}>
                  {isHindi
                    ? "बटन दबाने पर WhatsApp में आपके पूरे सामान की लिस्ट, आपका नाम, पता और डिलीवरी का प्रकार अपने आप भर जाएगा।"
                    : "Clicking opens WhatsApp with your complete items list, name, phone, address, and delivery type filled in."}
                </p>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

