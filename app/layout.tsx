import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Syne } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "anchor-payfi-debugger-skill — Solana AI Kit",
  description:
    "A Claude Code skill for Anchor developers. Decodes transaction errors, optimizes compute budgets, and ships PayFi patterns for escrow, streaming, and x402 agent payments.",
  openGraph: {
    title: "anchor-payfi-debugger-skill",
    description:
      "Anchor debugging and PayFi patterns in one Claude Code skill. Error catalog, CU optimization, escrow patterns, clock drift fixes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} ${syne.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
