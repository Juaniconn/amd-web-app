import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { Toaster } from "@/components/ui/sonner";
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
  title: "AMD Operations",
  description: "Plataforma operativa interna de AMD México.",
};

/**
 * Viewport móvil. SIN esto el navegador del celular renderiza a 980px y
 * escala la página, ignorando por completo los breakpoints de Tailwind:
 * es la causa raíz de que el ERP no se viera responsive.
 *
 * `maximumScale` queda libre (no lo fijamos en 1) para no bloquear el zoom
 * de accesibilidad: los operadores en planta a veces necesitan acercar.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0d12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
