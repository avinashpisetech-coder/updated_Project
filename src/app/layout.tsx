import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { PageBackground } from "@/components/PageBackground";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

import { LoadingBar } from "@/components/ui/LoadingBar";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('ui-theme');
                  if (!theme) theme = 'adios';
                  document.documentElement.setAttribute('data-theme', theme);
                  var darkThemes = ['midnight-executive', 'emerald-night', 'charcoal-gold', 'plum-enterprise', 'cyber-pulse'];
                  if (darkThemes.indexOf(theme) !== -1) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} ${inter.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <Toaster position="top-right" richColors closeButton />
        <PageBackground />
        <Suspense fallback={null}>
          <LoadingBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
