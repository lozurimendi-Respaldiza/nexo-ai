import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXO AI | Gestión inteligente de oportunidades",
  description: "Organiza oportunidades comerciales y decide cuál es la siguiente mejor acción."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
