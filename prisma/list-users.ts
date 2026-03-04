import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true,
      userRoles: { include: { role: { select: { name: true } } } }
    }
  });
  console.log("\n📋 Users in database:\n");
  console.log("─".repeat(80));
  users.forEach(u => {
    const roles = u.userRoles.map(ur => ur.role.name).join(", ") || "No Role";
    console.log(`  Email: ${u.email}`);
    console.log(`  Name:  ${u.name || "N/A"}`);
    console.log(`  ID:    ${u.id}`);
    console.log(`  Role:  ${roles}`);
    console.log("─".repeat(80));
  });
  await prisma.$disconnect();
}
main().catch(console.error);
