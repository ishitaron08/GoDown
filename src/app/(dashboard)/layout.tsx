import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { RoleTheme } from "@/components/role-theme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleTheme>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto bg-background">
            <div className="px-8 py-8 max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </RoleTheme>
  );
}
