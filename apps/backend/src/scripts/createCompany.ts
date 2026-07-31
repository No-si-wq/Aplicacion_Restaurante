import bcrypt from "bcryptjs";
import { prisma } from "../db/client";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const [companyName, adminUsername, adminPassword] = process.argv.slice(2);
  if (!companyName || !adminUsername || !adminPassword) {
    console.error(
      'Uso: npx tsx src/scripts/createCompany.ts "<nombre empresa>" <usuario_admin> <password>'
    );
    process.exit(1);
  }
  if (adminPassword.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const baseSlug = slugify(companyName);
  let slug = baseSlug;
  let attempt = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${attempt}`;
    attempt++;
  }

  const hashed = await bcrypt.hash(adminPassword, 10);

  const company = await prisma.$transaction(async (tx) => {
    const newCompany = await tx.company.create({
      data: { name: companyName, slug },
    });
    await tx.user.create({
      data: {
        companyId: newCompany.id,
        username: adminUsername,
        password: hashed,
        role: "ADMIN",
      },
    });
    return newCompany;
  });

  console.log(`Empresa creada: ${company.name} (slug: ${company.slug})`);
  console.log(`Usuario admin creado: ${adminUsername}`);
}

main().finally(() => process.exit(0));