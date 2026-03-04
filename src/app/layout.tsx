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
                background: "hsl(222 47% 11%)",
                color: "hsl(210 40% 98%)",
                border: "1px solid hsl(222 30% 18%)",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: "400",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
              },
            }}
            position="bottom-right"
          />
        </Providers>
      </body>
    </html>
  );
}
