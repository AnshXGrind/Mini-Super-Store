type Language = "en" | "hi";

const WHATSAPP_MESSAGES: Record<Language, string> = {
  en: "Hello Mini Super Store! I am interested in bulk order purchases. Please share your product catalogue, available products, bulk pricing and order details. Thank you.",
  hi: "नमस्ते Mini Super Store! मुझे थोक में सामान खरीदने में रुचि है। कृपया उपलब्ध उत्पादों, कैटलॉग, थोक कीमतों और ऑर्डर की जानकारी साझा करें। धन्यवाद।",
};

export default function BulkOrderWhatsAppCTA({ language }: { language: Language }) {
  const isHindi = language === "hi";
  const phone = (process.env.NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const configured = /^\d{10,15}$/.test(phone);
  const whatsappUrl = configured
    ? `https://wa.me/${phone}?text=${encodeURIComponent(WHATSAPP_MESSAGES[language])}`
    : null;

  return (
    <div className="wholesale-card">
      <div className="wholesale-copy">
        <p className="eyebrow">{isHindi ? "सीधे पूछताछ करें" : "Direct enquiries"}</p>
        <h2 id="bulk-order-title">{isHindi ? "हमारी टीम से बात करें" : "Talk to our store team"}</h2>
        <p>{isHindi ? "बड़ी मात्रा, उत्पादों की उपलब्धता और थोक कीमतों के बारे में पूछें।" : "Ask us about larger quantities, product availability and bulk pricing."}</p>
      </div>
      {whatsappUrl ? (
        <a className="wholesale-cta" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          {isHindi ? "WhatsApp खोलें" : "Open WhatsApp"} <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <p className="wholesale-help">{isHindi ? "थोक संपर्क उपलब्ध नहीं है। कृपया NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER सेट करें।" : "Bulk order contact is not available yet. Please configure NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER."}</p>
      )}
      <p className="wholesale-help">{isHindi ? "WhatsApp में संदेश खुलेगा। आप उसे देखकर खुद भेज सकते हैं।" : "WhatsApp opens with a prepared message. You can review and send it yourself."}</p>
    </div>
  );
}
