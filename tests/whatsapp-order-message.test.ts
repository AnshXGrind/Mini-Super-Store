import { describe, expect, it } from "vitest";
import { buildWhatsAppOrderMessage } from "../lib/whatsapp-order-message";

describe("WhatsApp order message", () => {
  it("includes the pack size, quantity, customer, and delivery details without prices", () => {
    const message = buildWhatsAppOrderMessage({
      language: "en",
      customer: {
        name: "Asha",
        phone: "8708297764",
        fulfilment: "delivery",
        address: "12 Main Road, Ladwa",
        notes: "",
      },
      items: [
        {
          name: "Sugar 1 kg",
          pack_size: "1 kg",
          quantity: 2,
        },
      ],
    });

    expect(message).toContain("Asha");
    expect(message).toContain("8708297764");
    expect(message).toContain("Home Delivery");
    expect(message).toContain("12 Main Road, Ladwa");
    expect(message).toContain("Pack size: 1 kg");
    expect(message).toContain("Quantity: 2");
    expect(message).not.toContain("₹");
  });

  it("uses the store pickup address when pickup is selected", () => {
    const message = buildWhatsAppOrderMessage({
      language: "hi",
      customer: {
        name: "अनिता",
        phone: "8708297764",
        fulfilment: "pickup",
        address: "",
        notes: "",
      },
      items: [],
    });

    expect(message).toContain("पिकअप स्थान");
    expect(message).toContain("Red Road, Ladwa");
  });
});
