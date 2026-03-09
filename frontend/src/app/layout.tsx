import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nepal Election LIVE - प्रतिनिधि सभा निर्वाचन २०८२",
  description:
    "Live election results dashboard for Nepal 2082 parliamentary elections. Track real-time seat counts, party-wise results, and constituency updates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
