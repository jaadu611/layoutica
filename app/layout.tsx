import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";

const appFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UI/Ux Designer AI",
  description:
    "AI powered UI/UX designer tool to create stunning designs effortlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={appFont.className}>{children}</body>
    </html>
  );
}
