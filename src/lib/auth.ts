import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Role } from "@/models/Role";

/**
 * Fallback permissions for each built-in role slug.
 * Used when the Role collection hasn't been seeded yet.
 */
const FALLBACK_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "dashboard:view",
    "products:view", "products:create", "products:edit", "products:delete",
    "inventory:view", "inventory:create", "inventory:edit",
    "orders:view", "orders:create", "orders:edit", "orders:delete",
    "suppliers:view", "suppliers:create", "suppliers:edit", "suppliers:delete",
    "categories:view", "categories:create", "categories:edit", "categories:delete",
    "warehouses:view", "warehouses:create", "warehouses:edit", "warehouses:delete", "warehouses:stock",
    "reports:view", "reports:export",
    "ai:view", "ai:use",
    "users:view", "users:create", "users:edit", "users:delete",
    "roles:view", "roles:create", "roles:edit", "roles:delete",
    "settings:view", "settings:edit",
    "upload:create",
  ],
  manager: [
    "dashboard:view",
    "products:view", "products:create", "products:edit", "products:delete",
    "inventory:view", "inventory:create", "inventory:edit",
    "orders:view", "orders:create", "orders:edit", "orders:delete",
    "suppliers:view", "suppliers:create", "suppliers:edit", "suppliers:delete",
    "categories:view", "categories:create", "categories:edit", "categories:delete",
    "warehouses:view", "warehouses:create", "warehouses:edit", "warehouses:delete", "warehouses:stock",
    "reports:view", "reports:export",
    "ai:view", "ai:use",
    "upload:create",
    "users:view", "users:edit", "settings:view",
  ],
  staff: [
    "dashboard:view",
    "products:view", "products:create",
    "inventory:view", "inventory:create",
    "orders:view", "orders:create",
    "suppliers:view",
    "categories:view",
    "warehouses:view", "warehouses:stock",
    "reports:view",
    "ai:view",
    "upload:create",
  ],
  // External customers — browse catalog and place/track orders only
  customer: [
    "products:view",
    "orders:view",
    "orders:create",
    "categories:view",
  ],
  "delivery-partner": [
    "dashboard:view",
    "orders:view",
    "orders:edit",
    "suppliers:view",
    "warehouses:view",
  ],
};

async function getPermissionsForRole(roleSlug: string): Promise<string[]> {
  const fallback = FALLBACK_PERMISSIONS[roleSlug] ?? FALLBACK_PERMISSIONS["staff"];
  try {
    await connectDB();
    const role = await Role.findOne({ slug: roleSlug }).lean() as { permissions?: string[] } | null;
    if (role?.permissions && role.permissions.length > 0) {
      // Merge DB permissions with fallback so newly added permissions
      // are always available even if the role wasn't re-seeded in DB.
      const merged = Array.from(new Set([...role.permissions, ...fallback]));
      return merged;
    }
  } catch {
    // DB lookup failed — use fallback
  }
  return fallback;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();

        const user = await User.findOne({
          email: credentials.email.toLowerCase(),
          isActive: true,
        }).select("+password");

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        // Look up the role's permissions (with fallback if roles not seeded yet)
        const permissions = await getPermissionsForRole(user.role);

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          permissions,
          avatar: user.avatar ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
        token.avatar = user.avatar;
      }

      // Refresh permissions when session is updated
      if (trigger === "update") {
        await connectDB();
        const dbUser = await User.findById(token.id).lean() as { role?: string } | null;
        if (dbUser) {
          const slug = dbUser.role ?? "staff";
          token.role = slug;
          token.permissions = await getPermissionsForRole(slug);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.avatar = token.avatar as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
};
