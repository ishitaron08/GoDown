"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Warehouse, Copy, Check } from "lucide-react";

const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof LoginSchema>;

const labelCls =
  "block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5";
const inputCls =
  "w-full px-4 py-2.5 border border-border bg-white text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/20 transition-colors";

// Demo credentials for testing
const DEMO_CREDENTIALS = [
  { name: "Admin Demo", email: "admin@godown.com", role: "👑 Admin" },
  { name: "Manager Demo", email: "manager@godown.com", role: "📊 Manager" },
  { name: "Staff Member", email: "staff@godown.com", role: "👥 Staff" },
  { name: "Customer Demo", email: "customer@godown.com", role: "🛍️ Customer" },
  { name: "Delivery Partner", email: "delivery@godown.com", role: "🚚 Delivery" },
];
const DEMO_PASSWORD = "demo@2026";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      toast.error("Invalid email or password");
      return;
    }

    toast.success("Welcome back");

    // Use a full page navigation (window.location) so the browser sends the
    // fresh session cookie on the next request — router.push does not guarantee
    // the cookie is flushed before the navigation on Vercel / production HTTPS.
    // We go to /dashboard; the middleware will redirect customers to /catalog.
    window.location.href = "/dashboard";
  };

  // Copy email to clipboard
  const copyCredential = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopyStates({ ...copyStates, [email]: true });
      toast.success(`✅ Copied: ${email}`);
      setTimeout(() => {
        setCopyStates({ ...copyStates, [email]: false });
      }, 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="flex gap-6 w-full max-w-4xl">
        {/* Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-10 bg-white border border-black/[0.06] animate-scale-in">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
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

          <h2 className="text-[14px] font-semibold text-center mb-6">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className={labelCls}>Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className={inputCls}
              />
              {errors.email && (
                <p className="mt-1 text-[11px] text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className={inputCls}
              />
              {errors.password && (
                <p className="mt-1 text-[11px] text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 btn-press"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200">
            <p className="text-[10px] font-medium text-blue-900 mb-1">
              🔒 Database Validation Only
            </p>
            <p className="text-[10px] text-blue-800">
              Only accounts created by administrators can login. Public registration is disabled.
            </p>
          </div>
        </div>

        {/* Demo Credentials Panel */}
        <div className="hidden md:flex w-1/2 flex-col gap-4">
          <div className="p-6 bg-white border border-black/[0.06] animate-scale-in" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 flex items-center justify-center bg-neon text-white font-bold text-[12px]">
                📖
              </div>
              <h3 className="text-[13px] font-semibold">Demo Credentials</h3>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4">
              Click to copy email, then paste and test different roles:
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => copyCredential(cred.email)}
                  className="w-full p-3 border border-border hover:border-foreground/40 hover:bg-secondary/50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-foreground">
                        {cred.role}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {cred.email}
                      </p>
                    </div>
                    {copyStates[cred.email] ? (
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 animate-scale-in" style={{ animationDelay: "150ms" }}>
            <p className="text-[11px] font-medium text-amber-900 mb-2">
              🔑 Password for all accounts:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2 py-1.5 bg-white border border-amber-200 text-[11px] font-mono text-amber-900">
                {DEMO_PASSWORD}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(DEMO_PASSWORD)}
                className="p-1.5 hover:bg-amber-100 transition-colors"
              >
                <Copy className="h-4 w-4 text-amber-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Demo Credentials */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 p-4 bg-white border border-black/[0.06] border-t-2 border-t-neon max-h-48 overflow-y-auto">
        <p className="text-[11px] font-medium text-muted-foreground mb-3">
          📖 Demo Credentials (scroll for more)
        </p>
        <div className="space-y-2">
          {DEMO_CREDENTIALS.map((cred) => (
            <button
              key={cred.email}
              type="button"
              onClick={() => copyCredential(cred.email)}
              className="w-full p-2 border border-border hover:bg-secondary/50 transition-all text-left text-[10px]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{cred.role}</p>
                  <p className="text-muted-foreground font-mono">{cred.email}</p>
                </div>
                {copyStates[cred.email] ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border">
          Password: <code className="font-mono font-medium">{DEMO_PASSWORD}</code>
        </p>
      </div>
    </div>
  );
}
