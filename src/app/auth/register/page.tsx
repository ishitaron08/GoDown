"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Warehouse } from "lucide-react";
import axios from "axios";

const RegisterSchema = z.object({
  name: z.string().min(2, "Name too short"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});

type RegisterForm = z.infer<typeof RegisterSchema>;

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2";
const inputCls =
  "w-full px-4 py-3 border border-border bg-white text-[13px] rounded-lg placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 transition-all";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await axios.post("/api/auth/register", data);
      toast.success("Account created! Please log in.");
      router.push("/auth/login");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Registration failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="w-full max-w-md p-10 bg-white border border-border rounded-2xl shadow-xl animate-scale-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
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
          Create an account
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {[
            {
              label: "Full Name",
              name: "name" as const,
              type: "text",
              placeholder: "John Doe",
            },
            {
              label: "Email",
              name: "email" as const,
              type: "email",
              placeholder: "you@example.com",
            },
            {
              label: "Password",
              name: "password" as const,
              type: "password",
              placeholder: "••••••••",
            },
          ].map(({ label, name, type, placeholder }) => (
            <div key={name}>
              <label className={labelCls}>{label}</label>
              <input
                {...register(name)}
                type={type}
                placeholder={placeholder}
                className={inputCls}
              />
              {errors[name] && (
                <p className="mt-1 text-[11px] text-destructive">
                  {errors[name]?.message}
                </p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-foreground text-background text-[13px] font-medium rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2 btn-press"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-[12px] text-muted-foreground">
          Already have an account?{" "}
          <a
            href="/auth/login"
            className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
