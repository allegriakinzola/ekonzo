import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
  "https://ekonzo.cd";

const siteTitle = "ekonzo — Bons du Trésor de la RDC";
const siteDescription =
  "Souscrivez aux Bons du Trésor émis par le Ministère des Finances de la République Démocratique du Congo. Plateforme officielle, sécurisée, accessible via Mobile Money.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s · ekonzo",
  },
  description: siteDescription,
  applicationName: "ekonzo",
  keywords: [
    "ekonzo",
    "Bons du Trésor",
    "Ministère des Finances",
    "RDC",
    "Congo",
    "investissement",
    "épargne",
    "Mobile Money",
    "titres d'État",
    "Kinshasa",
  ],
  authors: [{ name: "Ministère des Finances — RDC" }],
  creator: "ekonzo",
  publisher: "Ministère des Finances — République Démocratique du Congo",
  category: "finance",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_CD",
    url: siteUrl,
    siteName: "ekonzo",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ekonzo — Plateforme de souscription aux Bons du Trésor de la RDC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo.webp", type: "image/webp" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "ekonzo",
    url: siteUrl,
    description: siteDescription,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: "fr-CD",
    provider: {
      "@type": "GovernmentOrganization",
      name: "Ministère des Finances",
      address: {
        "@type": "PostalAddress",
        addressCountry: "CD",
        addressLocality: "Kinshasa",
      },
    },
    offers: {
      "@type": "Offer",
      name: "Souscription aux Bons du Trésor",
      category: "Titres publics",
    },
  };

  return (
    <html
      lang="fr"
      className={cn("h-full antialiased", geistSans.variable, geistMono.variable)}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
