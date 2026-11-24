"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { PublicProduct } from "@/app/page";
import { shouldLoadProductImageDirectly } from "@/lib/product-image";

type Language = "en" | "hi";

type CustomerInfo = {
  name: string;
  phone: string;
  fulfilment: "delivery" | "pickup";
  address: string;
  notes: string;
};

const DEFAULT_STORE_PHONE = "919896330279"; // Red Road, Ladwa Store WhatsApp

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
          setCustomer((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // Storage unavailable fallback
    }
  }, []);

  function updateCustomer(field: keyof CustomerInfo, value: string) {
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

  const total = lines.reduce(
    (sum, line) => sum + (line.product.price ?? 0) * line.quantity,
    0,
  );

  const hasUnknownPrice = lines.some((line) => line.product.price === null);

  const configuredPhone = (
    process.env.NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER ?? ""
  ).replace(/\D/g, "");

  const storePhone = /^\d{10,15}$/.test(configuredPhone)
    ? configuredPhone
    : DEFAULT_STORE_PHONE;

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

  // Construct structured WhatsApp order message
  const whatsappMessage = useMemo(() => {
    const greeting = isHindi
      ? "🛒 *नया किराना ऑर्डर — Mini Super Store (लाडवा)*"
      : "🛒 *NEW GROCERY ORDER — MINI SUPER STORE*";

    const customerDetails = [
      `📍 *Store*: Red Road, Ladwa`,
      `----------------------------------------`,
      `👤 *Customer*: ${customer.name.trim() || (isHindi ? "ग्राहक" : "Customer")}`,
      customer.phone.trim() ? `📱 *Phone*: ${customer.phone.trim()}` : null,
      `🚚 *Fulfilment*: ${
        customer.fulfilment === "delivery"
          ? isHindi
            ? "होम डिलीवरी"
            : "Home Delivery"
          : isHindi
            ? "दुकान से पिकअप (Store Pickup)"
            : "Store Pickup"
      }`,
      customer.fulfilment === "delivery" && customer.address.trim()
        ? `🏠 *Address*: ${customer.address.trim()}`
        : null,
      `----------------------------------------`,
      `📋 *ITEMS ORDERED (${lines.length} items, ${itemCount} units)*:\n`,
    ]
      .filter(Boolean)
      .join("\n");

    const itemsText = lines
      .map(({ product, quantity }, index) => {
        const name = isHindi && product.name_hi ? product.name_hi : product.name;
        const skuText = product.sku ? ` (${product.sku})` : "";
        const packText = product.pack_size ? `\n   ▫ Pack: ${product.pack_size}` : "";
        const priceText =
          product.price === null
            ? isHindi
              ? "MRP पर (दुकान से पुष्टि होगी)"
              : "MRP on pack (to confirm)"
            : `₹${product.price.toFixed(2)} each (₹${(product.price * quantity).toFixed(2)})`;

        return `${index + 1}. *${name}*${skuText}${packText}\n   ▫ Qty: *${quantity}*\n   ▫ Price: ${priceText}`;
      })
      .join("\n\n");

    const totalText = [
      `\n----------------------------------------`,
      `💰 *Estimated Total*: ₹${total.toFixed(2)}${
        hasUnknownPrice
          ? isHindi
            ? " (+ बिना कीमत वाले उत्पाद)"
            : " (+ items with price on request)"
          : ""
      }`,
      customer.notes.trim() ? `📝 *Note*: ${customer.notes.trim()}` : null,
      `----------------------------------------`,
      isHindi
        ? "🙏 कृपया ऑर्डर पैकिंग, अंतिम बिल और डिलीवरी समय की पुष्टि करें। धन्यवाद!"
        : "🙏 Please confirm order packing, final bill amount and delivery time. Thank you!",
    ]
      .filter(Boolean)
      .join("\n");

    return `${greeting}\n${customerDetails}\n${itemsText}${totalText}`;
  }, [customer, hasUnknownPrice, isHindi, itemCount, lines, total]);

  const whatsappUrl =
    lines.length > 0
      ? `https://wa.me/${storePhone}?text=${encodeURIComponent(whatsappMessage)}`
      : null;

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
                {hasUnknownPrice
                  ? `₹${total.toFixed(2)}+`
                  : `₹${total.toFixed(2)}`}
              </strong>
              <small>{isHindi ? "ऑर्डर तैयार है" : "Ready to order"}</small>
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
                    ? "कैटलॉग से अपनी पसंद का सामान जोड़ें और एक क्लिक में WhatsApp पर भेजें।"
                    : "Browse our 500+ items, tap 'Add to Cart', and send your entire order to WhatsApp with one click."}
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
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={
                            isHindi && product.name_hi
                              ? product.name_hi
                              : product.name
                          }
                          width={116}
                          height={116}
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
                          {product.sku ? product.sku.slice(-3) : "M"}
                        </span>
                      )}

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                          {product.sku && (
                            <span className="product-sku-tag" style={{ fontSize: "0.52rem", padding: "0.1rem 0.3rem" }}>
                              {product.sku}
                            </span>
                          )}
                          {product.pack_size && (
                            <span style={{ fontSize: "0.6rem", color: "#2b6140", fontWeight: 700 }}>
                              ⚖ {product.pack_size}
                            </span>
                          )}
                        </div>

                        <strong style={{ fontSize: "0.78rem", marginTop: "0.15rem" }}>
                          {isHindi && product.name_hi
                            ? product.name_hi
                            : product.name}
                        </strong>

                        <small style={{ color: "#46584b", fontWeight: 600 }}>
                          {product.price === null ? (
                            isHindi ? "MRP पर उपलब्ध" : "MRP on pack"
                          ) : (
                            <>
                              ₹{product.price.toFixed(2)} × {quantity} ={" "}
                              <strong style={{ display: "inline", color: "#1f5139" }}>
                                ₹{(product.price * quantity).toFixed(2)}
                              </strong>
                            </>
                          )}
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

                {/* Subtotal & Summary */}
                <div className="checkout-total">
                  <div>
                    <span style={{ display: "block" }}>
                      {isHindi ? "कुल सामान" : "Total items"}: <strong>{itemCount} units</strong> ({lines.length} {isHindi ? "प्रकार" : "products"})
                    </span>
                    {hasUnknownPrice && (
                      <small style={{ color: "#8a6629", fontSize: "0.62rem" }}>
                        {isHindi
                          ? "* कुछ उत्पादों की अंतिम कीमत MRP पर तय होगी"
                          : "* Some items have price confirmed on pack MRP"}
                      </small>
                    )}
                  </div>
                  <strong style={{ color: "#1f5139", fontSize: "1.2rem" }}>
                    ₹{total.toFixed(2)}
                  </strong>
                </div>

                {/* Customer Details Form (stored locally for quick reorders) */}
                <div className="checkout-form" style={{ marginTop: "0.4rem", padding: "0.8rem", background: "#f8faf6", borderRadius: "8px", border: "1px solid #e5ede3" }}>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.68rem", fontWeight: 800, color: "#284432", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {isHindi ? "डिलीवरी व ग्राहक जानकारी" : "Customer & Delivery Info"}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <label>
                      <span>{isHindi ? "आपका नाम" : "Your Name"}</span>
                      <input
                        type="text"
                        value={customer.name}
                        onChange={(e) => updateCustomer("name", e.target.value)}
                        placeholder={isHindi ? "नाम लिखें" : "Full Name"}
                      />
                    </label>

                    <label>
                      <span>{isHindi ? "मोबाइल नंबर" : "Phone Number"}</span>
                      <input
                        type="tel"
                        value={customer.phone}
                        onChange={(e) => updateCustomer("phone", e.target.value)}
                        placeholder={isHindi ? "98xxxxxxxx" : "Phone / Mobile"}
                      />
                    </label>
                  </div>

                  <fieldset style={{ marginTop: "0.4rem", padding: "0.45rem 0.6rem" }}>
                    <legend>{isHindi ? "डिलीवरी का प्रकार" : "Fulfilment Option"}</legend>
                    <label style={{ display: "inline-flex", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="fulfilment"
                        checked={customer.fulfilment === "delivery"}
                        onChange={() => updateCustomer("fulfilment", "delivery")}
                      />
                      <span>{isHindi ? "🚚 होम डिलीवरी" : "🚚 Home Delivery"}</span>
                    </label>
                    <label style={{ display: "inline-flex", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="fulfilment"
                        checked={customer.fulfilment === "pickup"}
                        onChange={() => updateCustomer("fulfilment", "pickup")}
                      />
                      <span>{isHindi ? "🏪 दुकान से पिकअप" : "🏪 Store Pickup"}</span>
                    </label>
                  </fieldset>

                  {customer.fulfilment === "delivery" && (
                    <label style={{ marginTop: "0.3rem" }}>
                      <span>{isHindi ? "डिलीवरी का पता (लाडवा)" : "Delivery Address (Ladwa)"}</span>
                      <input
                        type="text"
                        value={customer.address}
                        onChange={(e) => updateCustomer("address", e.target.value)}
                        placeholder={isHindi ? "मकान नं, गली, लैंडमार्क, लाडवा" : "House #, Ward/Street, Landmark, Ladwa"}
                      />
                    </label>
                  )}

                  <label style={{ marginTop: "0.3rem" }}>
                    <span>{isHindi ? "अतिरिक्त नोट (वैकल्पिक)" : "Order Note (Optional)"}</span>
                    <input
                      type="text"
                      value={customer.notes}
                      onChange={(e) => updateCustomer("notes", e.target.value)}
                      placeholder={isHindi ? "उदा: शाम 5 बजे के बाद भेजें" : "e.g., Deliver after 5 PM / Pack in 2 bags"}
                    />
                  </label>
                </div>

                {/* Primary Actions: Send to WhatsApp */}
                <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
                  {whatsappUrl && (
                    <a
                      className="whatsapp-order-btn"
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "0.85rem",
                        fontSize: "0.82rem",
                        fontWeight: 900,
                        borderRadius: "8px",
                        textAlign: "center",
                        background: "#25D366",
                        color: "#ffffff",
                        boxShadow: "0 4px 14px rgba(37, 211, 102, 0.35)",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>🟢</span>
                      <span>
                        {isHindi
                          ? "WhatsApp पर पूरा ऑर्डर भेजें (1-क्लिक)"
                          : "Send Full Order to WhatsApp (1-Click)"}
                      </span>
                      <span>↗</span>
                    </a>
                  )}

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
                    ? "बटन दबाने पर WhatsApp में आपके पूरे सामान की लिस्ट खुल जाएगी। दुकान से आपको पैकिंग और डिलीवरी की तुरंत पुष्टि मिलेगी।"
                    : "Tapping the button opens WhatsApp with your full itemized list and details ready to send. The store team in Ladwa will confirm and prepare your order."}
                </p>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
