const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateAge(dob, onDate) {
  const birth = new Date(dob);
  const now = new Date(onDate);
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

(async () => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        players: true,
        categories: true,
      },
    });
    for (const t of tournaments) {
      console.log('TOURNAMENT', t.id, t.name, 'startDate', t.startDate);
      for (const cat of t.categories) {
        console.log(' CATEGORY', cat.id, cat.name, cat.minAge, cat.maxAge, cat.gender, cat.type);
      }
      for (const p of t.players) {
        console.log(' PLAYER', p.id, p.name, p.gender, p.dob, p.weight?.toString(), 'ageAtStart', calculateAge(p.dob, t.startDate));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
