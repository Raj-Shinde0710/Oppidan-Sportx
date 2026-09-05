import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const tatamis = await prisma.tatami.findMany({
    include: { tournament: true },
  });

  for (const t of tatamis) {
    const date = new Date(t.tournament.createdAt);
    const plainPassword = date.toISOString().slice(0, 10).replace(/-/g, "");
    const hash = await bcrypt.hash(plainPassword, 10);

    await prisma.tatami.update({
      where: { id: t.id },
      data: {
        username: `TATAMI_${t.number}`,
        passwordHash: hash,
      },
    });

    console.log(`Updated Tatami ${t.number} for Tournament ${t.tournamentId}`);
  }

  console.log("✅ All tatamis updated successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
