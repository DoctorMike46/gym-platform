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

  return (
    <html lang="it">
      <body className={inter.className}>
        <AppLayout settings={settingsData}>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
