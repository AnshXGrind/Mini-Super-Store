import type { Metadata } from "next";
import Link from "next/link";
import AnnouncementBar from "@/components/store/AnnouncementBar";
import MobileStoreNav from "@/components/store/MobileStoreNav";
import StoreFooter from "@/components/store/StoreFooter";
import StoreLogo from "@/components/store/StoreLogo";
import BulkOrderWhatsAppCTA from "@/components/wholesale/BulkOrderWhatsAppCTA";

export const metadata: Metadata = {
  title: "Bulk Order Enquiries | Mini Super Store",
  description:
    "Contact Mini Super Store in Ladwa about product availability and bulk quantities.",
};

const bulkUseCases = [
  "Weddings and family events",
  "Canteens and institutions",
  "Local shops and regular supply",
];

export default function BulkOrderPage() {
  return (
    <main className="storefront">
      <AnnouncementBar />

      <header className="site-header">
        <Link className="brand" href="/" aria-label="Mini Super Store home">
          <StoreLogo />
          <span className="brand-copy">
            <strong>MINI <em>SUPER</em> STORE</strong>
            <small>Red Road, Ladwa</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/order">Order Online</Link>
          <Link href="/bulk-order" aria-current="page">Bulk Order</Link>
          <Link href="/visit">Visit Us</Link>
        </nav>
      </header>

      <section className="section-wrap customer-page-content">
        <p className="section-eyebrow">Bulk order</p>
        <h1>Bulk order enquiries</h1>
        <p className="customer-page-description">
          Tell us what you need and the approximate quantities. The store team can confirm availability and order details with you directly.
        </p>

        <div className="bulk-page-layout">
          <BulkOrderWhatsAppCTA language="en" />
          <aside className="bulk-use-cases">
            <h2>Common enquiries</h2>
            <ul>
              {bulkUseCases.map((useCase) => <li key={useCase}>{useCase}</li>)}
            </ul>
          </aside>
        </div>
      </section>

      <StoreFooter />
      <MobileStoreNav />
    </main>
  );
}
