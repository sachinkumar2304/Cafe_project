import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext"; // Cart provider
import { WishlistProvider } from "@/context/WishlistContext"; // Wishlist provider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Snackify - Fresh South Indian Food Delivered",
  description: "Authentic South Indian Flavors, Delivered Fresh. Dosas, Idlis, Sweets & Snacks from neighbourhood kitchens.",
  icons: {
    icon: '/snackify-logo.jpg',
    apple: '/snackify-logo.jpg',
    shortcut: '/snackify-logo.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <CartProvider>
          <WishlistProvider>
            {children}
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}