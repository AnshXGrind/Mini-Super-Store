import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Super Store | Everyday Essentials in Ladwa",
  description:
    "Explore groceries, household essentials, crockery, hosiery and festive picks at Mini Super Store, Ladwa.",
  applicationName: "Mini Super Store",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://minisuperstore.example"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Mini Super Store",
    title: "Mini Super Store | Everyday Essentials in Ladwa",
    description: "Groceries, household goods, crockery, hosiery and festive essentials in Ladwa.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
