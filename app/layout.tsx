import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Promo Calendar Dashboard — ANOMALY & DYNAPHOS",
  description: "Real-time dashboard за промо календара",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bg">
      <body>{children}</body>
    </html>
  );
}
