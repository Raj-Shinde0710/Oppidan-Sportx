import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const TOURNAMENT_ID = [
    "ab1bf434-bca9-4abe-8dbe-43f3242a4799",
  ];

  for (const tournamentId of TOURNAMENT_ID) {
    for (let i = 1; i <= 20; i++) {
      const player = await prisma.player.create({
        data: {
          name: `Participant ${i}`,
          gender: i % 2 === 0 ? "MALE" : "FEMALE",
          dob: new Date(`201${i % 5}-07-10`),
          weight: 30 + i,
          belt: ["White", "Yellow", "Blue", "Brown", "Black"][i % 5],
          tournamentId,
        },
      });

      await prisma.participantProfile.create({
        data: {
          name: player.name,
          email: `participant${i}@mail.com`,
          phone: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
          branch: "Oppidan India",
          state: ["Maharashtra", "Delhi", "Karnataka", "Gujarat"][i % 4],
          city: ["Pune", "Delhi", "Bengaluru", "Ahmedabad"][i % 4],
          playerId: player.id,
        },
      });
    }
  }

  console.log("✅ Players + Participant Profiles seeded");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
