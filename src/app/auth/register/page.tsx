"use client";

import { useState } from "react";
import { Warehouse } from "lucide-react";

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2";
const inputCls =
  "w-full px-4 py-3 border border-white/50 bg-white/50 backdrop-blur-sm text-[13px] rounded-lg placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-white/70 focus:bg-white/70 transition-all";

export default function RegisterPage() {
  const [loading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50/80 via-white to-teal-50/40">
      <div className="w-full max-w-md p-10 bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl animate-scale-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg" style={{ boxShadow: '0 8px 20px -4px rgba(13, 148, 136, 0.3)' }}>
            <Warehouse className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">GoDown</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
              Inventory Management
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-[14px] font-semibold text-foreground mb-2">
            Registration Disabled
          </h2>
          <p className="text-[13px] text-muted-foreground mb-4">
            User accounts are managed by administrators only. No public self-registration is allowed.
          </p>
          <p className="text-[12px] text-muted-foreground mb-6">
            If you need an account, contact your system administrator.
          </p>
        </div>

        <a
          href="/auth/login"
          className="w-full py-3 bg-foreground text-background text-[13px] font-medium rounded-lg hover:bg-foreground/90 transition-all shadow-sm flex items-center justify-center gap-2 btn-press text-center"
        >
          Back to Login
        </a>

        <p className="mt-8 text-center text-[12px] text-muted-foreground">
          🔒 This system requires database-verified accounts only.
        </p>
      </div>
    </div>
  );
}
