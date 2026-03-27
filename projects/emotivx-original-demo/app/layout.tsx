import "./globals.css";
import { Barlow_Condensed, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import NavbarWrapper from "@/components/ui/NavbarWrapper";
import Footer from "@/components/ui/Footer";
import RoleSwitcher from "@/components/ui/RoleSwitcher";
import AuthProvider from "@/components/auth/AuthProvider";
import { CartProvider } from "@/components/cart/CartProvider";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  style: ["normal", "italic"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "EmotivX — Premium Sports Merchandise",
  description:
    "Shop personalized gear featuring the biggest plays in sports history.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${barlowCondensed.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#0A0A0A] font-body text-white antialiased">
        <AuthProvider>
          <CartProvider>
            <NavbarWrapper />
            <main>{children}</main>
            <Footer />
            <RoleSwitcher />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
