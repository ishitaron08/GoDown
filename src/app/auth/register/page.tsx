"use client";

import { Warehouse, Lock } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary">
      <div className="w-full max-w-md p-10 bg-white border border-black/[0.06] animate-scale-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <Warehouse
            className="h-5 w-5 text-neon"
            strokeWidth={1.5}
          />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">GoDown</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
              Inventory Management
            </p>
          </div>
        </div>

        {/* Access Denied Message */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 flex items-center justify-center bg-red-50">
            <Lock className="h-6 w-6 text-red-600" strokeWidth={1.5} />
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

          {/* Demo Info Box */}
          <div className="w-full p-4 bg-amber-50 border border-amber-200 text-left">
            <p className="text-[11px] font-medium text-amber-900 mb-2">
              📝 Demo Credentials Available
            </p>
            <p className="text-[10px] text-amber-800">
              Click "Back to Login" to view available demo accounts and credentials.
            </p>
          </div>

          {/* Back to Login Button */}
          <a
            href="/auth/login"
            className="w-full py-2.5 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 btn-press"
          >
            Back to Login
          </a>
        </div>

        <p className="mt-8 text-center text-[12px] text-muted-foreground">
          🔒 This system requires database-verified accounts only.
        </p>
      </div>
    </div>
  );
}
