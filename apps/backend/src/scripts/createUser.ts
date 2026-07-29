import bcrypt from "bcryptjs";
import { prisma } from "../db/client";

async function main() {
  const [username, password, role = "VENDEDOR"] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Uso: npx tsx src/scripts/createUser.ts <usuario> <password> <ADMIN|VENDEDOR>");
    process.exit(1);
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashed, role: role.toUpperCase() as "ADMIN" | "VENDEDOR" },
  });
  console.log(`Usuario creado: ${user.username} (${user.role})`);
}

main().finally(() => process.exit(0));