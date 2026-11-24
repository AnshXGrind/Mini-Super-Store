import type { Metadata } from "next";
import AppInstallPrompt from "@/components/pwa/AppInstallPrompt";
import "./globals.css";

function getMetadataBase(): URL | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) return undefined;
  try {
    return new URL(configured);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  title: "Mini Super Store | Everyday Essentials in Ladwa",
  description:
    "Explore groceries, household essentials, crockery, hosiery and festive picks at Mini Super Store, Ladwa.",
  applicationName: "Mini Super Store",
  metadataBase: getMetadataBase(),
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
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
      <body>{children}<AppInstallPrompt /></body>
    </html>
  );
}
