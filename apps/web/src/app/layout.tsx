import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Policy Brain",
  description: "Enterprise AI Policy Compiler & Knowledge Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
