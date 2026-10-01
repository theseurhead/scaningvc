import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voucher SN QR Gen",
  description: "Aplikasi internal untuk generate QR Code Serial Number Voucher",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Voucher SN QR Gen",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#d6001c",
};

import { ZoomPreventer } from "./ZoomPreventer";
import { Header } from "./Header";
import { StorageCleaner } from "./StorageCleaner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StorageCleaner />
        <ZoomPreventer />
        <Header />
        {children}
      </body>
    </html>
  );
}
