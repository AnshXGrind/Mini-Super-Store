import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Super Store",
  description: "Everyday essentials and wholesale supplies.",
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
