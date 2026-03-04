import { Package, BarChart3, Users, ShieldCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between bg-primary text-primary-foreground p-10 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute top-20 -left-10 w-72 h-72 rounded-full border-[40px] border-current" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full border-[40px] border-current" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-[30px] border-current" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/10 backdrop-blur-sm">
              <Package className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">Godown ERP</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
              Manage your inventory<br />
              with confidence.
            </h1>
            <p className="mt-4 text-primary-foreground/70 text-base leading-relaxed max-w-sm">
              A complete ERP solution for vendors, products, orders, and analytics — 
              all in one place with role-based access control.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BarChart3, label: "Real-time Analytics", desc: "AI-powered insights" },
              { icon: Users, label: "Multi-tenant", desc: "Team collaboration" },
              { icon: ShieldCheck, label: "Role-based Access", desc: "Granular permissions" },
              { icon: Package, label: "Inventory Track", desc: "Full lifecycle" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-lg bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 p-3.5">
                <Icon className="h-5 w-5 mb-2 text-primary-foreground/80" />
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-primary-foreground/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-primary-foreground/40">
            &copy; {new Date().getFullYear()} Godown ERP. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-[440px]">
          {children}
        </div>
      </div>
    </div>
  );
}
