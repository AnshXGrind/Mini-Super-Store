import BulkOrderWhatsAppCTA from "@/components/wholesale/BulkOrderWhatsAppCTA";

export default function HomePage() {
  return (
    <main>
      <header className="store-header">
        <p className="store-kicker">Your neighbourhood store</p>
        <h1>MINI SUPER STORE</h1>
        <p>Everyday essentials, ready for you.</p>
      </header>

      <section className="catalogue" aria-labelledby="catalogue-title">
        <p className="eyebrow">Shop with ease</p>
        <h2 id="catalogue-title">Groceries, household goods and more.</h2>
        <p>
          Browse our store or connect with us directly for larger requirements.
        </p>
      </section>

      <section className="wholesale-section" aria-labelledby="bulk-order-title">
        <BulkOrderWhatsAppCTA />
      </section>
    </main>
  );
}
