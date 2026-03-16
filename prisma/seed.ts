import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: "admin@example.com" },
  });

  if (!existing) {
    const hashed = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.create({
      data: {
        email: "admin@example.com",
        name: "Admin",
        password: hashed,
        role: "ADMIN",
      },
    });
    console.log("Admin créé :", admin.email);
    console.log("Webhook token :", admin.webhookToken);
    console.log("\nConnectez-vous avec :");
    console.log("  Email    : admin@example.com");
    console.log("  Password : admin123");
    console.log("\n⚠️  Changez ce mot de passe après la première connexion !");
  } else {
    console.log("Admin déjà existant.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
