import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/app-layout";
import { getSettings } from "@/lib/actions/settings";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ernesto Performance | Personal Trainer Management",
  description: "SaaS platform for Personal Trainers",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ernesto Performance",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#003366",
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
