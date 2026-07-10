import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistration } from "@/components/pwa-registration";
export const metadata: Metadata = { title: "Zalish Billing", description: "Boutique billing and store management", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "Zalish" } };
export const viewport: Viewport = { themeColor: "#6d28d9" };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><PwaRegistration />{children}</body></html>; }
