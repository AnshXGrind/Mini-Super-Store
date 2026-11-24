import Link from "next/link";

type Language = "en" | "hi";

export default function MobileStoreNav({ language = "en" }: { language?: Language }) {
  const isHindi = language === "hi";

  return (
    <nav className="mobile-nav" aria-label={isHindi ? "त्वरित नेविगेशन" : "Quick navigation"}>
      <Link href="/">
        <span aria-hidden="true">⌂</span>
        {isHindi ? "होम" : "Home"}
      </Link>
      <Link href="/order">
        <span aria-hidden="true">▦</span>
        {isHindi ? "ऑर्डर" : "Order"}
      </Link>
      <Link href="/bulk-order">
        <span aria-hidden="true">📦</span>
        {isHindi ? "थोक" : "Bulk"}
      </Link>
      <Link href="/visit">
        <span aria-hidden="true">⌖</span>
        {isHindi ? "दुकान" : "Visit"}
      </Link>
    </nav>
  );
}
