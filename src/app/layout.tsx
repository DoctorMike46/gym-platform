import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/app-layout";
import { getSettings } from "@/lib/actions/settings";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ernesto Performance | Personal Trainer Management",
  description: "SaaS platform for Personal Trainers",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settingsData = await getSettings();

  const primaryColor = settingsData?.primary_color || "#003366";
  const sidebarColor = settingsData?.sidebar_color || "#003366";
  const secondaryColor = settingsData?.secondary_color || "#1e40af";

  return (
    <html lang="it">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --brand-primary: ${primaryColor};
              --brand-sidebar: ${sidebarColor};
              --brand-secondary: ${secondaryColor};
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        <AppLayout settings={settingsData}>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
