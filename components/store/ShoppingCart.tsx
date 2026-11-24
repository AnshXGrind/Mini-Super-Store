"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { PublicProduct } from "@/app/page";
import { shouldLoadProductImageDirectly } from "@/lib/product-image";

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

  const itemCount = lines.reduce(
    (total, line) => total + line.quantity,
    0,
  );

  const total = lines.reduce(
    (sum, line) =>
      sum + (line.product.price ?? 0) * line.quantity,
    0,
  );

  const hasUnknownPrice = lines.some(
    (line) => line.product.price === null,
  );

  const phone = (
    process.env.NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER ?? ""
  ).replace(/\D/g, "");

  const configured = /^\d{10,15}$/.test(phone);

  function changeQuantity(productId: string, quantity: number) {
    const next = { ...cart };

    if (quantity <= 0) {
      delete next[productId];
    } else {
      next[productId] = Math.min(100, quantity);
    }

    setCart(next);
  }

  const message = [
    isHindi
      ? "नमस्ते Mini Super Store! मैं ये सामान ऑर्डर करना चाहता/चाहती हूँ:"
      : "Hello Mini Super Store! I would like to enquire about these products:",
    "",
    ...lines.map(({ product, quantity }, index) => {
      const name =
        isHindi && product.name_hi
          ? product.name_hi
          : product.name;

      const price =
        product.price === null
          ? isHindi
            ? "कीमत पूछें"
            : "Price to confirm"
          : `₹${product.price.toFixed(2)} each`;

      return `${index + 1}. ${name} x ${quantity} — ${price}`;
    }),
    "",
    `${isHindi ? "कुल अनुमानित राशि" : "Estimated total"}: ${
      hasUnknownPrice
        ? isHindi
          ? "कीमत की पुष्टि आवश्यक"
          : "Price confirmation required"
        : `₹${total.toFixed(2)}`
    }`,
    "",
    isHindi
      ? "कृपया सामान की उपलब्धता और अंतिम कीमत की पुष्टि करें। धन्यवाद!"
      : "Please confirm product availability and the final price. Thank you!",
  ].join("\n");

  const whatsappUrl =
    configured && lines.length > 0
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : null;

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
                <p>{isHindi ? "आपकी खरीदारी" : "Your basket"}</p>
                <h2 id="cart-title">
                  {isHindi ? "शॉपिंग कार्ट" : "Shopping cart"}{" "}
                  <span>{itemCount}</span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={isHindi ? "कार्ट बंद करें" : "Close cart"}
              >
                ×
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="cart-empty">
                <span aria-hidden="true">🛒</span>
                <h3>
                  {isHindi ? "आपकी कार्ट खाली है" : "Your cart is empty"}
                </h3>
                <p>
                  {isHindi
                    ? "कैटलॉग से सामान जोड़ें।"
                    : "Add products from the catalogue."}
                </p>
              </div>
            ) : (
              <>
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
                          M
                        </span>
                      )}

                      <div>
                        <strong>
                          {isHindi && product.name_hi
                            ? product.name_hi
                            : product.name}
                        </strong>
                        <small>
                          {product.price === null
                            ? isHindi
                              ? "कीमत पूछें"
                              : "Ask for price"
                            : `₹${product.price.toFixed(2)}`}
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

                <div className="checkout-total">
                  <span>{isHindi ? "अनुमानित कुल" : "Estimated total"}</span>
                  <strong>
                    {hasUnknownPrice
                      ? isHindi
                        ? "कीमत की पुष्टि होगी"
                        : "Price to confirm"
                      : `₹${total.toFixed(2)}`}
                  </strong>
                </div>

                {whatsappUrl ? (
                  <a
                    className="place-order"
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {isHindi
                      ? "WhatsApp पर ऑर्डर भेजें"
                      : "Send list on WhatsApp"}{" "}
                    ↗
                  </a>
                ) : (
                  <p className="cart-error" role="alert">
                    {configured
                      ? isHindi
                        ? "WhatsApp संदेश तैयार नहीं हो सका।"
                        : "Your cart is empty."
                      : isHindi
                        ? "स्टोर का WhatsApp नंबर अभी सेट नहीं है।"
                        : "Store WhatsApp number is not configured yet."}
                  </p>
                )}

                <p className="wholesale-help">
                  {isHindi
                    ? "WhatsApp में संदेश खुलेगा। कृपया उसे देखकर खुद भेजें। स्टोर आपसे उपलब्धता और अंतिम कीमत की पुष्टि करेगा।"
                    : "WhatsApp will open with your product list. Review and send the message. The store will confirm availability and final pricing."}
                </p>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}