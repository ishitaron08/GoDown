import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "GoDown — Inventory Management",
  description: "Warehouse & inventory management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            toastOptions={{
              style: {
                background: "hsl(0 0% 3.9%)",
                color: "hsl(0 0% 98%)",
                border: "1px solid hsl(0 0% 14.9%)",
                borderRadius: "0",
                fontSize: "13px",
                fontWeight: "400",
              },
            }}
            position="bottom-right"
          />
        </Providers>
      </body>
    </html>
  );
}
