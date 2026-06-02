import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { LocaleProvider } from "@/contexts/locale-context";
import { Toaster } from "@/components/ui/sonner";
import { locales, defaultLocale, type Locale } from "@/i18n/config";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cospa CRM",
  description: "Cospa CRM - Customer Relationship Management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale: Locale =
    localeCookie && locales.includes(localeCookie as Locale)
      ? (localeCookie as Locale)
      : defaultLocale;

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <body className="h-full" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <LocaleProvider initialLocale={locale}>
            <AuthProvider>{children}</AuthProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
