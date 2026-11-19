import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Super Store | Everyday Essentials in Ladwa",
  description:
    "Explore groceries, household essentials, crockery, hosiery and festive picks at Mini Super Store, Ladwa.",
  applicationName: "Mini Super Store",
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
