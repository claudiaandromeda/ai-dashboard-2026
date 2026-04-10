import "./globals.css";
import NavbarWrapper from "@/components/ui/NavbarWrapper";
import Footer from "@/components/ui/Footer";
import RoleSwitcher from "@/components/ui/RoleSwitcher";
import AuthProvider from "@/components/auth/AuthProvider";
import { CartProvider } from "@/components/cart/CartProvider";

export const metadata = {
  title: "EmotivX — Immortalising Every Emotive Moment in Sport",
  description:
    "EmotivX transforms live sport into instant, collectible media inventory.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#080810] font-body text-white antialiased">
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
