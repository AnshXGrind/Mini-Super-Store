import Link from "next/link";
import StoreLogo from "@/components/store/StoreLogo";
import {
  getStorePhoneInternationalDisplay,
  getStorePhoneLink,
  STORE_ADDRESS,
  STORE_MAP_URL,
  STORE_OPENING_HOURS,
} from "@/lib/store-contact";

type Language = "en" | "hi";

export default function StoreFooter({ language = "en" }: { language?: Language }) {
  const isHindi = language === "hi";

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="footer-brand" href="/" aria-label="Mini Super Store home">
          <StoreLogo />
          <span>MINI <em>SUPER</em> STORE</span>
        </Link>
        <nav className="footer-portals" aria-label={isHindi ? "मुख्य नेविगेशन" : "Main navigation"}>
          <Link href="/">{isHindi ? "होम" : "Home"}</Link>
          <Link href="/order">{isHindi ? "ऑर्डर" : "Order Online"}</Link>
          <Link href="/bulk-order">{isHindi ? "थोक ऑर्डर" : "Bulk Order"}</Link>
          <Link href="/visit">{isHindi ? "दुकान" : "Visit Us"}</Link>
        </nav>
        <div className="footer-store-details">
          <a href={STORE_MAP_URL} target="_blank" rel="noopener noreferrer">
            {STORE_ADDRESS}
          </a>
          <a href={`tel:${getStorePhoneLink()}`}>{getStorePhoneInternationalDisplay()}</a>
          <span>
            {STORE_OPENING_HOURS.weekdays}: {STORE_OPENING_HOURS.weekdayOpen}–{STORE_OPENING_HOURS.weekdayClose}
            {" · "}
            {STORE_OPENING_HOURS.sunday}: {STORE_OPENING_HOURS.sundayOpen}–{STORE_OPENING_HOURS.sundayClose}
          </span>
        </div>
        <small className="footer-copyright">
          © {new Date().getFullYear()} Mini Super Store
        </small>
      </div>
    </footer>
  );
}
