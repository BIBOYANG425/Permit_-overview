import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LA County Permit Navigator | AI-Powered Environmental Permit Analysis",
  description:
    "Multi-agent AI system powered by NVIDIA Nemotron that determines which environmental permits you need across 6+ LA County agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${ibmPlexMono.variable} antialiased bg-[#080A0F] text-slate-200 font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
