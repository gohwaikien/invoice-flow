import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  
  console.log("\n=== Users in Database ===\n");
  users.forEach((user, i) => {
    console.log(`${i + 1}. ${user.email}`);
    console.log(`   Name: ${user.name || "N/A"}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);
    console.log();
  });
  console.log(`Total: ${users.length} users`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

