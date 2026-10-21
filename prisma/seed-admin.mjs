import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);
  const admin = await prisma.agent.upsert({
    where: { loginHandle: "admin" },
    update: {},
    create: {
      firstName: "Admin",
      lastName: "Arcadius",
      loginHandle: "admin",
      role: "SUPER_ADMIN",
      passwordHash,
      mustChangePassword: true,
      canAccessAccounting: true,
    },
  });
  console.log("Compte admin créé :", admin.loginHandle, "/ mot de passe : changeme123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
