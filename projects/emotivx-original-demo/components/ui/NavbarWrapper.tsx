"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();

  // Staff pages use their own StaffNav
  if (pathname.startsWith("/staff")) return null;

  return <Navbar />;
}
