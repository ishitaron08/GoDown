import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    // Customers go to catalog, everyone else goes to dashboard
    const role = (session.user as { role?: string })?.role;
    if (role === "customer") {
      redirect("/catalog");
    }
    redirect("/dashboard");
  } else {
    redirect("/auth/login");
  }
}
