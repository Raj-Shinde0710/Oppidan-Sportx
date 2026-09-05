import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Simple city → state map (extend anytime)
const CITY_STATE_MAP: Record<string, string> = {
  Pune: "Maharashtra",
  Mumbai: "Maharashtra",
  Bengaluru: "Karnataka",
  Delhi: "Delhi",
  Ahmedabad: "Gujarat",
};

function slugEmail(name: string) {
  return name.toLowerCase().replace(/\s+/g, ".") + "@oppidan.com";
}

function randomPhone() {
  return "9" + Math.floor(100000000 + Math.random() * 899999999);
}

async function main() {
  const players = await prisma.player.findMany({
    where: { profile: null },
    include: {
      coach: true,
      tournament: true,
    },
  });

  console.log(`🧩 Backfilling ${players.length} players`);

  for (const p of players) {
    const city =
      p.coach?.city ||
      (p.tournament.venue.includes("Pune") ? "Pune" :
       p.tournament.venue.includes("Mumbai") ? "Mumbai" :
       "Pune");

    const state = CITY_STATE_MAP[city] || "Maharashtra";

    await prisma.participantProfile.create({
      data: {
        name: p.name,
        email: slugEmail(p.name),
        phone: randomPhone(),
        branch:
          p.coach?.branch ||
          `${p.tournament.name} Branch`,
        city,
        state,
        playerId: p.id,
      },
    });
  }

  console.log("✅ Profiles filled intelligently");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
