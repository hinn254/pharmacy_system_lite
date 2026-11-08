import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pharmacyos.co.ke"),
  title: {
    default: "Pharmacy OS",
    template: "%s | Pharmacy OS",
  },
  description:
    "Run sales, dispensing, inventory, patients, insurance, finance, and pharmacy operations from one connected workspace.",
  applicationName: "Pharmacy OS",
  authors: [{ name: "Pharmacy OS", url: "https://pharmacyos.co.ke" }],
  creator: "Pharmacy OS",
  publisher: "Pharmacy OS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
