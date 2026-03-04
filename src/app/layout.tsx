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
                background: "rgba(15, 23, 42, 0.85)",
                color: "hsl(210 40% 98%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                fontSize: "13px",
                fontWeight: "400",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              },
            }}
            position="bottom-right"
          />
        </Providers>
      </body>
    </html>
  );
}
