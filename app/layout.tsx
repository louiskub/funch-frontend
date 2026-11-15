import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FUNCH Car Rental",
  description: "Browse rental cars by country and branch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-300 px-6 py-4">
          <nav
            className="mx-auto flex w-full max-w-5xl flex-wrap justify-between gap-3"
            aria-label="Main navigation"
          >
            <Link href="/" className="font-semibold">
              FUNCH Car Rental
            </Link>
            <div className="flex flex-wrap gap-4">
              <Link href="/account" className="underline">
                Account
              </Link>
              <Link href="/bookings" className="underline">
                My bookings
              </Link>
              <Link href="/admin/bookings" className="underline">
                Bookings admin
              </Link>
              <Link href="/admin/members" className="underline">
                Members
              </Link>
              <Link href="/admin/reports" className="underline">
                Reports
              </Link>
              <Link href="/admin/fleet" className="underline">
                Admin fleet
              </Link>
              <Link href="/admin/options" className="underline">
                Admin options
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
