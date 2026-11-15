import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./navbar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FUNCH Car Rental — Easy Days",
  description: "Browse and rent quality vehicles with transparent pricing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-[#25314c] selection:bg-[#dfe9fc] selection:text-[#25314c]">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-[#e0e6f1] bg-white py-12 text-[#57657e]">
          <div className="mx-auto max-w-[1280px] px-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[26px] font-extrabold tracking-[-0.04em] text-[#57657e]">
                funch.
              </span>
              <span className="text-xs text-[#57657e]/70">
                · Car rental, made simple
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs text-[#57657e]">
              <Link href="/" className="hover:text-primary transition-colors">
                Find a car
              </Link>
              <Link href="/bookings" className="hover:text-primary transition-colors">
                My bookings
              </Link>
              <Link href="/account" className="hover:text-primary transition-colors">
                Account
              </Link>
              <Link href="/admin/bookings" className="hover:text-primary transition-colors">
                Admin
              </Link>
            </div>
            <p className="text-xs text-[#57657e]/60">
              © 2026 FUNCH Car Rental. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
