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
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2";
const inputCls =
  "w-full px-4 py-3 border border-white/50 bg-white/50 backdrop-blur-sm text-[13px] rounded-lg placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-white/70 focus:bg-white/70 transition-all";

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

        <h2 className="text-[15px] font-semibold text-center mb-8">
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
                type="button"
              >
                <Copy className="h-4 w-4 text-amber-700" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-foreground text-background text-[13px] font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2 btn-press"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center text-[12px] text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a
            href="/auth/register"
            className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
          >
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
