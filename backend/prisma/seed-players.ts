import { PrismaClient, GenderType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const TOURNAMENT_IDS = [
    "ab1bf434-bca9-4abe-8dbe-43f3242a4799",
  ];

  const players = [
    {
      name: "Aarav Patil",
      gender: "BOYS",
      dob: "2014-06-15",
      weight: 32,
      belt: "Yellow",
      profile: {
        name:"Aarav Patil",
        email: "aarav@gmail.com",
        phone: "9876543210",
        branch: "Oppidan Pune",
        state: "Maharashtra",
        city: "Pune",
      },
    },
    {
      name: "Rohan Kulkarni",
      gender: "BOYS",
      dob: "2013-09-10",
      weight: 35,
      belt: "Orange",
      profile: {
        name:"Rohan Kulkarni",
        email: "rohan@gmail.com",
        phone: "9876501234",
        branch: "Oppidan Mumbai",
        state: "Maharashtra",
        city: "Mumbai",
      },
    },
    {
      name: "Ishita Deshmukh",
      gender: "GIRLS",
      dob: "2015-02-20",
      weight: 30,
      belt: "Yellow",
      profile: {
        name:"Ishita Deshmukh",
        email: "ishita@gmail.com",
        phone: "9898989898",
        branch: "Oppidan Pune",
        state: "Maharashtra",
        city: "Pune",
      },
    },
    {
      name: "Siddharth Rao",
      gender: "BOYS",
      dob: "2012-10-30",
      weight: 44,
      belt: "Green",
      profile: {
        name:"Siddharth Rao",
        email: "sid@gmail.com",
        phone: "9123456789",
        branch: "Oppidan Bengaluru",
        state: "Karnataka",
        city: "Bengaluru",
      },
    },
  ];

  for (const tournamentId of TOURNAMENT_IDS) {
    for (const p of players) {
      await prisma.player.create({
        data: {
          name: p.name,
          gender: p.gender === "BOYS" ? GenderType.MALE : GenderType.FEMALE, // ✅ SAME LOGIC
          dob: new Date(p.dob),
          weight: p.weight,
          belt: p.belt,
          tournamentId,

          profile: {
            create:{
                ...p.profile, // ✅ THIS FILLS EMPTY UI COLUMNS
          },
          },
        },
      });
    }
  }

  console.log("✅ Players + profiles seeded successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
