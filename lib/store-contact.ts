const DEFAULT_STORE_WHATSAPP_NUMBER = "919896330279";

export const STORE_MAP_URL = "https://maps.app.goo.gl/AuM44P2j4kgKPAm76";

export function getStoreWhatsAppNumber(): string {
  const configuredNumber = (
    process.env.NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER ?? ""
  ).replace(/\D/g, "");

  return /^\d{10,15}$/.test(configuredNumber)
    ? configuredNumber
    : DEFAULT_STORE_WHATSAPP_NUMBER;
}

export function getStorePhoneDisplay(): string {
  const number = getStoreWhatsAppNumber();
  return number.startsWith("91") && number.length === 12
    ? `+91 ${number.slice(2, 7)} ${number.slice(7)}`
    : `+${number}`;
}

export function getStorePhoneLink(): string {
  return `+${getStoreWhatsAppNumber()}`;
}
