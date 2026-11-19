"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { PublicProduct } from "@/app/page";

type Language = "en" | "hi";

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
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">("pickup");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successOrderId, setSuccessOrderId] = useState("");

  const lines = useMemo(
    () => products
      .filter((product) => (cart[product.id] ?? 0) > 0)
      .map((product) => ({ product, quantity: cart[product.id] })),
    [cart, products],
  );
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const total = lines.reduce((sum, line) => (
    sum + (line.product.price ?? 0) * line.quantity
  ), 0);
  const hasUnknownPrice = lines.some((line) => line.product.price === null);

  useEffect(() => {
    if (!open) return;
    try {
      const supabase = createClient();
      supabase.auth.getClaims().then(({ data, error: claimsError }) => {
        setAuthenticated(!claimsError && Boolean(data?.claims));
      });
    } catch {
      queueMicrotask(() => setAuthenticated(false));
    }
  }, [open]);

  function changeQuantity(productId: string, quantity: number) {
    const next = { ...cart };
    if (quantity <= 0) delete next[productId];
    else next[productId] = Math.min(100, quantity);
    setCart(next);
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    setSuccessOrderId("");

    if (fulfilment === "delivery" && !deliveryAddress.trim()) {
      setError(isHindi ? "डिलीवरी पता आवश्यक है।" : "A delivery address is required.");
      setBusy(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("place_customer_order", {
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone.trim(),
        p_items: lines.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
        })),
        p_fulfilment_type: fulfilment,
        p_delivery_address: fulfilment === "delivery" ? deliveryAddress.trim() : null,
        p_customer_note: customerNote.trim() || null,
      });
      if (rpcError) throw rpcError;
      setSuccessOrderId(String(data));
      setCart({});
      window.localStorage.removeItem("mini-super-store-cart");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (isHindi
        ? "ऑर्डर पूरा नहीं हो सका।"
        : "The order could not be placed."));
    } finally {
      setBusy(false);
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

      {open && (
        <div className="cart-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <aside className="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <div className="cart-heading">
              <div>
                <p>{isHindi ? "आपकी खरीदारी" : "Your basket"}</p>
                <h2 id="cart-title">{isHindi ? "शॉपिंग कार्ट" : "Shopping cart"} <span>{itemCount}</span></h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={isHindi ? "कार्ट बंद करें" : "Close cart"}>×</button>
            </div>

            {successOrderId ? (
              <div className="cart-success" role="status">
                <span>✓</span>
                <h3>{isHindi ? "ऑर्डर प्राप्त हुआ" : "Order received"}</h3>
                <p>{isHindi ? "ऑर्डर नंबर:" : "Order number:"} <strong>{successOrderId.slice(0, 8).toUpperCase()}</strong></p>
                <button type="button" onClick={() => setOpen(false)}>{isHindi ? "खरीदारी जारी रखें" : "Continue shopping"}</button>
              </div>
            ) : lines.length === 0 ? (
              <div className="cart-empty">
                <span aria-hidden="true">🛍️</span>
                <h3>{isHindi ? "आपकी कार्ट खाली है" : "Your cart is empty"}</h3>
                <p>{isHindi ? "कैटलॉग से उत्पाद जोड़ें।" : "Add products from the catalogue."}</p>
              </div>
            ) : (
              <>
                <div className="cart-lines">
                  {lines.map(({ product, quantity }) => (
                    <div className="cart-line" key={product.id}>
                      {product.image_url ? (
                        <Image src={product.image_url} alt="" width={116} height={116} sizes="58px" />
                      ) : <span className="cart-line-placeholder" aria-hidden="true">M</span>}
                      <div>
                        <strong>{isHindi && product.name_hi ? product.name_hi : product.name}</strong>
                        <small>{product.price === null ? (isHindi ? "कीमत पूछें" : "Ask for price") : `₹${product.price.toFixed(2)}`}</small>
                      </div>
                      <div className="quantity-control" aria-label={isHindi ? "मात्रा" : "Quantity"}>
                        <button type="button" onClick={() => changeQuantity(product.id, quantity - 1)}>−</button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => changeQuantity(product.id, quantity + 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {authenticated === false ? (
                  <div className="checkout-auth">
                    <p>{isHindi ? "ऑर्डर देने के लिए साइन इन करें।" : "Sign in to place your order."}</p>
                    <Link href="/login?next=/">{isHindi ? "साइन इन करें" : "Sign in"}</Link>
                  </div>
                ) : authenticated === true ? (
                  <form className="checkout-form" onSubmit={placeOrder}>
                    <div className="checkout-total">
                      <span>{isHindi ? "कुल" : "Total"}</span>
                      <strong>{hasUnknownPrice ? (isHindi ? "कीमत की पुष्टि होगी" : "Price to confirm") : `₹${total.toFixed(2)}`}</strong>
                    </div>
                    <fieldset>
                      <legend>{isHindi ? "कैसे प्राप्त करें?" : "How will you receive it?"}</legend>
                      <label><input type="radio" name="fulfilment" checked={fulfilment === "pickup"} onChange={() => setFulfilment("pickup")} /> {isHindi ? "दुकान से लें" : "Store pickup"}</label>
                      <label><input type="radio" name="fulfilment" checked={fulfilment === "delivery"} onChange={() => setFulfilment("delivery")} /> {isHindi ? "डिलीवरी" : "Delivery"}</label>
                    </fieldset>
                    <label>{isHindi ? "पूरा नाम" : "Full name"}<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={100} /></label>
                    <label>{isHindi ? "फोन नंबर" : "Phone number"}<input type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} required maxLength={20} /></label>
                    {fulfilment === "delivery" && (
                      <label>{isHindi ? "डिलीवरी पता" : "Delivery address"}<textarea value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} required maxLength={500} /></label>
                    )}
                    <label>{isHindi ? "ऑर्डर नोट (वैकल्पिक)" : "Order note (optional)"}<textarea value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} maxLength={500} /></label>
                    {error && <p className="cart-error" role="alert">{error}</p>}
                    <button className="place-order" type="submit" disabled={busy}>
                      {busy ? (isHindi ? "ऑर्डर भेजा जा रहा है…" : "Placing order…") : (isHindi ? "ऑर्डर दें" : "Place order")}
                    </button>
                  </form>
                ) : (
                  <p className="cart-loading">{isHindi ? "साइन-इन स्थिति जाँच रहे हैं…" : "Checking sign-in…"} </p>
                )}
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
