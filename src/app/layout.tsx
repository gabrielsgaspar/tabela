import type { Metadata } from "next";
import { Newsreader, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Variable fonts — opsz axis loaded so font-optical-sizing: auto works correctly.
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-dm-sans",
  display: "swap",
});

// JetBrains Mono does not expose opsz — use static weights.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tabela — The morning paper for European football",
  description:
    "A daily editorial briefing on the Premier League, La Liga, Bundesliga, Serie A, and Ligue 1.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-paper text-ink font-sans">{children}</body>
    </html>
  );
}
