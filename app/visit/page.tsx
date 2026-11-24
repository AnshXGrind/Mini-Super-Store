import type { Metadata } from "next";
import Link from "next/link";
import AnnouncementBar from "@/components/store/AnnouncementBar";
import MobileStoreNav from "@/components/store/MobileStoreNav";
import StoreFooter from "@/components/store/StoreFooter";
import StoreLogo from "@/components/store/StoreLogo";
import {
  getStorePhoneInternationalDisplay,
  getStorePhoneLink,
  getStoreWhatsAppNumber,
  STORE_ADDRESS,
  STORE_CURBSIDE_PICKUP_AVAILABLE,
  STORE_HOME_DELIVERY_AREA,
  STORE_MAP_URL,
  STORE_NAME,
  STORE_OPENING_HOURS,
  STORE_REGION,
} from "@/lib/store-contact";

export const metadata: Metadata = {
  title: "Visit Mini Super Store | Ladwa",
  description:
    "Find Mini Super Store on Red Road, Ladwa. View store hours, contact details, and directions.",
};

export default function VisitPage() {
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
          <Link href="/bulk-order">Bulk Order</Link>
          <Link href="/visit" aria-current="page">Visit Us</Link>
        </nav>
      </header>

      <section className="section-wrap customer-page-content">
        <p className="section-eyebrow">Store location</p>
        <h1>Visit {STORE_NAME}</h1>

        <div className="visit-page-grid">
          <section className="visit-page-card" aria-labelledby="visit-address-title">
            <h2 id="visit-address-title">Address and directions</h2>
            <p><strong>{STORE_NAME}</strong></p>
            <p>{STORE_ADDRESS}<br />{STORE_REGION}</p>
            <a href={STORE_MAP_URL} target="_blank" rel="noopener noreferrer" className="button button-primary">
              Open Google Maps ↗
            </a>
          </section>

          <section className="visit-page-card" aria-labelledby="visit-hours-title">
            <h2 id="visit-hours-title">Opening hours</h2>
            <dl className="visit-hours-list">
              <div>
                <dt>{STORE_OPENING_HOURS.weekdays}</dt>
                <dd>{STORE_OPENING_HOURS.weekdayOpen}–{STORE_OPENING_HOURS.weekdayClose}</dd>
              </div>
              <div>
                <dt>{STORE_OPENING_HOURS.sunday}</dt>
                <dd>{STORE_OPENING_HOURS.sundayOpen}–{STORE_OPENING_HOURS.sundayClose}</dd>
              </div>
            </dl>
          </section>

          <section className="visit-page-card" aria-labelledby="visit-contact-title">
            <h2 id="visit-contact-title">Contact and orders</h2>
            <a className="visit-phone-link" href={`tel:${getStorePhoneLink()}`}>
              {getStorePhoneInternationalDisplay()}
            </a>
            <a
              href={`https://wa.me/${getStoreWhatsAppNumber()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-primary"
            >
              Message on WhatsApp ↗
            </a>
          </section>

          <section className="visit-page-card" aria-labelledby="visit-services-title">
            <h2 id="visit-services-title">Services</h2>
            <ul>
              <li>Home delivery in {STORE_HOME_DELIVERY_AREA}</li>
              {STORE_CURBSIDE_PICKUP_AVAILABLE && <li>Curbside pickup available</li>}
            </ul>
          </section>
        </div>
      </section>

      <StoreFooter />
      <MobileStoreNav />
    </main>
  );
}
