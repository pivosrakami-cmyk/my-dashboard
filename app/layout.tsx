import type { Metadata } from "next";
import { Playfair_Display, PT_Sans } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";
import { getProjects } from "@/lib/vault";

// Lato в Google Fonts не поддерживает кириллицу — берём PT Sans, похожий гуманистический sans с кириллицей
const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  variable: "--font-heading",
});
const ptSans = PT_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Мой дашборд",
  description: "Дашборд личных и клиентских проектов",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const projects = await getProjects();
  const navProjects = projects.map((p) => ({ slug: p.slug, name: p.name }));

  return (
    <html lang="ru" className={`${playfair.variable} ${ptSans.variable}`}>
      <body>
        <Shell projects={navProjects}>{children}</Shell>
      </body>
    </html>
  );
}
