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
import { ThemeProvider } from "@/lib/theme-provider";

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
                  var mode = localStorage.getItem('theme-mode');
                  var color = localStorage.getItem('theme-color');
                  if (!mode) {
                    mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (!color) color = 'amber-mono';
                  
                  if (mode === 'dark') document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', color);
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} ${inter.variable} antialiased font-sans`}
      >
        <ThemeProvider>
          <Toaster position="top-right" richColors closeButton />
          <PageBackground />
          <Suspense fallback={null}>
            <LoadingBar />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
