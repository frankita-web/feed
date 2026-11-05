import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Helvetica primero (Mac/iPhone); Geist como respaldo en otros sistemas.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "contenido · franca mandiola estudio",
  description: "Calendario de contenido y feed de cada proyecto",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
