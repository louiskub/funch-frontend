import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Calrentar Car Rental — Easy Days",
  description: "Browse and rent quality vehicles with transparent pricing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-secondary selection:text-foreground">
        <Providers>
          <Navbar />
          <div className="flex-1">{children}</div>
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
