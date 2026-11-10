import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const baseUrl = "https://notes.puanj.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),

  // ─── Title Template ──────────────────────────────────────────────
  title: {
    default: "NJ Notes | จดบันทึก จัดระเบียบความคิด",
    template: "%s | NJ Notes",
  },

  // ─── Description ────────────────────────────────────────────────
  description:
    "NJ Notes แอปจดบันทึกส่วนตัวที่เรียบง่ายและทรงพลัง จัดระเบียบความคิด บันทึกงาน โปรเจกต์ และตารางเรียน — ติดตั้งเป็น PWA ได้ทันที",

  // ─── Keywords ───────────────────────────────────────────────────
  keywords: [
    "จดบันทึก",
    "note app",
    "note taking",
    "NJ",
    "NJ Notes",
    "บันทึกออนไลน์",
    "จัดการงาน",
    "todo",
    "project management",
    "PWA",
    "บันทึกการเรียน",
  ],

  // ─── Author & Publisher ─────────────────────────────────────────
  authors: [{ name: "PUANJ", url: baseUrl }],
  creator: "PUANJ",
  publisher: "NJ Notes",

  // ─── Canonical ──────────────────────────────────────────────────
  alternates: {
    canonical: baseUrl,
    languages: { "th-TH": baseUrl },
  },

  // ─── Open Graph ─────────────────────────────────────────────────
  openGraph: {
    type: "website",
    url: baseUrl,
    siteName: "NJ Notes",
    locale: "th_TH",
    title: "NJ Notes | จดบันทึก จัดระเบียบความคิด",
    description:
      "แอปจดบันทึกส่วนตัวที่เรียบง่ายและทรงพลัง จัดระเบียบความคิด บันทึกงาน โปรเจกต์ และตารางเรียน",
    images: [
      {
        url: "/all.webp",
        width: 1200,
        height: 630,
        alt: "NJ Notes — จดบันทึก จัดระเบียบความคิด",
        type: "image/webp",
      },
    ],
  },

  // ─── Twitter / X Card ───────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "NJ Notes | จดบันทึก จัดระเบียบความคิด",
    description:
      "แอปจดบันทึกส่วนตัวที่เรียบง่ายและทรงพลัง จัดระเบียบความคิด บันทึกงาน โปรเจกต์",
    images: ["/all.webp"],
    site: "@puanj",
    creator: "@puanj",
  },

  // ─── Icons ──────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/all.png", type: "image/png" },
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/all.png",
    apple: [{ url: "/all.png", sizes: "180x180", type: "image/png" }],
  },

  // ─── PWA Manifest ───────────────────────────────────────────────
  manifest: "/manifest.json",

  // ─── Robots ─────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  // ─── Verification ───────────────────────────────────────────────
  verification: {
    google: "8a7dc28b52112f8e",
  },

  // ─── App / Theme ────────────────────────────────────────────────
  applicationName: "NJ Notes",
  category: "productivity",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "NJ Notes",
    "msapplication-TileColor": "#ffffff",
    "theme-color": "#ffffff",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

// ─── JSON-LD: WebSite + SearchAction ──────────────────────────────
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: "NJ Notes",
      description: "แอปจดบันทึกส่วนตัวที่เรียบง่ายและทรงพลัง",
      inLanguage: "th-TH",
      publisher: {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "NJ Notes",
        url: baseUrl,
        logo: {
          "@type": "ImageObject",
          url: `${baseUrl}/logo-512.png`,
          width: 512,
          height: 512,
        },
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${baseUrl}/system/notes?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${baseUrl}/#webapp`,
      name: "NJ Notes",
      url: baseUrl,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      description:
        "แอปจดบันทึกส่วนตัว PWA รองรับการใช้งานออฟไลน์ จัดระเบียบโน้ต โปรเจกต์ และตารางเรียน",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "THB",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
