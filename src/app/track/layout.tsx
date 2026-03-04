import { Toaster } from "sonner";
import { Warehouse } from "lucide-react";

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="h-14 border-b border-border flex items-center px-6">
        <a href="/" className="flex items-center gap-2.5">
          <Warehouse className="h-[18px] w-[18px] text-foreground" strokeWidth={1.5} />
          <span className="text-[15px] font-semibold tracking-tight">GoDown</span>
        </a>
        <span className="ml-auto text-[12px] text-muted-foreground">Order Tracking</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {children}
      </main>

      <Toaster
        toastOptions={{
          style: {
            background: "hsl(0 0% 3.9%)",
            color: "hsl(0 0% 98%)",
            border: "1px solid hsl(0 0% 14.9%)",
            borderRadius: "0",
            fontSize: "13px",
          },
        }}
        position="bottom-right"
      />
    </div>
  );
}
