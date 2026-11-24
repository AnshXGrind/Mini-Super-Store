export type OrderLanguage = "en" | "hi";
export type OrderFulfilment = "delivery" | "pickup";

export type OrderMessageCustomer = {
  name: string;
  phone: string;
  fulfilment: OrderFulfilment;
  address: string;
  notes: string;
};

export type OrderMessageItem = {
  name: string;
  name_hi?: string | null;
  brand?: string | null;
  pack_size?: string | null;
  quantity: number;
};

export function buildWhatsAppOrderMessage({
  language,
  customer,
  items,
}: {
  language: OrderLanguage;
  customer: OrderMessageCustomer;
  items: OrderMessageItem[];
}): string {
  const isHindi = language === "hi";
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const greeting = isHindi
    ? "🛒 *नया ऑर्डर अनुरोध — MINI SUPER STORE*"
    : "🛒 *NEW ORDER REQUEST — MINI SUPER STORE*";

  const customerDetails = [
    `👤 *${isHindi ? "ग्राहक" : "Customer"}*: ${customer.name.trim() || (isHindi ? "ग्राहक" : "Customer")}`,
    customer.phone.trim()
      ? `📱 *${isHindi ? "फ़ोन" : "Phone"}*: ${customer.phone.trim()}`
      : null,
    `🚚 *${isHindi ? "ऑर्डर प्रकार" : "Order type"}*: ${
      customer.fulfilment === "delivery"
        ? isHindi
          ? "🏠 होम डिलीवरी (Home Delivery)"
          : "🏠 Home Delivery"
        : isHindi
          ? "🏪 दुकान से पिकअप (Store Pickup)"
          : "🏪 Store pickup"
    }`,
    customer.fulfilment === "delivery" && customer.address.trim()
      ? `🏠 *${isHindi ? "डिलीवरी पता" : "Delivery address"}*: ${customer.address.trim()}`
      : customer.fulfilment === "pickup"
        ? `🏪 *${isHindi ? "पिकअप स्थान" : "Pickup location"}*: Mini Super Store, Red Road, Ladwa`
        : null,
    customer.notes.trim()
      ? `📝 *${isHindi ? "निर्देश" : "Notes"}*: ${customer.notes.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const itemsText = items
    .map((item, index) => {
      const name = isHindi && item.name_hi ? item.name_hi : item.name;
      const baseName =
        name.replace(/\s*\d+(?:\.\d+)?\s*(?:kg|g|ml|l)\s*$/i, "").trim() ||
        name;
      const brandText = item.brand ? ` [${item.brand}]` : "";
      const packSize = item.pack_size || (isHindi ? "मानक पैक" : "Standard pack");

      return [
        `${index + 1}. *${baseName}*${brandText}`,
        `   ${isHindi ? "पैक साइज़" : "Pack size"}: ${packSize}`,
        `   ${isHindi ? "मात्रा" : "Quantity"}: ${item.quantity}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    greeting,
    "",
    `📍 *${isHindi ? "दुकान" : "Store"}*: Mini Super Store, Red Road, Ladwa`,
    "",
    `*${isHindi ? "ग्राहक और डिलीवरी विवरण" : "CUSTOMER & FULFILMENT"}*`,
    customerDetails,
    "",
    `*${isHindi ? `सामान (${items.length} प्रकार)` : `ORDER ITEMS (${items.length} product types)`}*`,
    itemsText,
    "",
    `📦 *${isHindi ? "कुल" : "Summary"}*: ${items.length} ${isHindi ? "प्रकार" : "products"}, ${itemCount} ${isHindi ? "पैक" : "packs"}`,
    isHindi
      ? "कृपया उपलब्धता, अंतिम बिल और डिलीवरी / पिकअप का अनुमानित समय बताएं। धन्यवाद!"
      : "Please confirm item availability, the final bill amount, and the estimated delivery or pickup time. Thank you!",
  ]
    .filter(Boolean)
    .join("\n");
}
