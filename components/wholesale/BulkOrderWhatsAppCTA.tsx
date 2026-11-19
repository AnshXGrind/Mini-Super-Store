const WHATSAPP_MESSAGE =
  "Hello Mini Super Store! I am interested in bulk order purchases. Please share your product catalogue, available products, bulk pricing and order details. Thank you.";

export default function BulkOrderWhatsAppCTA() {
  const phone = (process.env.NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER ?? "").replace(
    /\D/g,
    "",
  );
  const configured = /^\d{10,15}$/.test(phone);
  const whatsappUrl = configured
    ? `https://wa.me/${phone}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    : null;

  return (
    <div className="wholesale-card">
      <div className="wholesale-copy">
        <p className="eyebrow">Bulk order enquiries</p>
        <h2 id="bulk-order-title">Buying in bulk?</h2>
        <p>Get special bulk order prices. Connect with us directly.</p>
      </div>

      {whatsappUrl ? (
        <a
          className="wholesale-cta"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Enquire on WhatsApp <span aria-hidden="true">â†—</span>
        </a>
      ) : (
        <p className="wholesale-help">
          Bulk order contact is not available yet. Please configure the WhatsApp number.
        </p>
      )}
      <p className="wholesale-help">
        Tap to open WhatsApp with a prepared bulk order enquiry.
      </p>
    </div>
  );
}