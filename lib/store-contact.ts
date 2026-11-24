const DEFAULT_STORE_PHONE_NUMBER = "9896330279";

export const STORE_NAME = "Mini Super Store";
export const STORE_ADDRESS = "Red Road, Ladwa (Kurukshetra)";
export const STORE_REGION = "Haryana, India";
export const STORE_MAP_URL = "https://maps.app.goo.gl/AuM44P2j4kgKPAm76";
export const STORE_OPENING_HOURS = {
  weekdays: "Monday–Saturday",
  weekdayOpen: "9:30 AM",
  weekdayClose: "8:00 PM",
  sunday: "Sunday",
  sundayOpen: "10:00 AM",
  sundayClose: "1:00 PM",
} as const;
export const STORE_HOME_DELIVERY_AREA = "Ladwa";
export const STORE_CURBSIDE_PICKUP_AVAILABLE = true;

export function getStorePhoneNumber(): string {
  const configuredNumber = (
    process.env.NEXT_PUBLIC_WHOLESALE_WHATSAPP_NUMBER ?? ""
  ).replace(/\D/g, "");

  if (/^\d{10}$/.test(configuredNumber)) return configuredNumber;
  if (/^91\d{10}$/.test(configuredNumber)) return configuredNumber.slice(2);
  return DEFAULT_STORE_PHONE_NUMBER;
}

export function getStoreWhatsAppNumber(): string {
  return `91${getStorePhoneNumber()}`;
}

export function getStorePhoneDisplay(): string {
  return getStorePhoneNumber();
}

export function getStorePhoneInternationalDisplay(): string {
  const phone = getStorePhoneNumber();
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

export function getStorePhoneLink(): string {
  return getStorePhoneNumber();
}
