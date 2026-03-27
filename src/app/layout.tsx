// Restricted UI Restoration - Verified Baseline 2026-03-18
import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
});

import Script from 'next/script';

export const metadata: Metadata = {
    title: "EnviroJim Platform",
    description: "Industrial Machine Diagnostics & Parts Management",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "EnviroJim",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${outfit.variable} font-sans min-h-screen bg-background text-foreground antialiased`}>
                {children}
                <Toaster richColors position="bottom-right" />
                <Script id="sw-register" strategy="afterInteractive">
                    {`
                        if ('serviceWorker' in navigator) {
                            window.addEventListener('load', function() {
                                navigator.serviceWorker.register('/sw.js').then(
                                    function(registration) {
                                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                                    },
                                    function(err) {
                                        console.log('ServiceWorker registration failed: ', err);
                                    }
                                );
                            });
                        }
                    `}
                </Script>
            </body>
        </html>
    );
}
