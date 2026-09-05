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
    const players = await prisma.player.findMany({
      where: { name: { contains: 'Kabir' } },
      include: { tournament: true },
    });
    console.log('Kabir players', players.length);
    players.forEach((p) => {
      console.log(p.name, p.dob, p.gender, p.tournament.name, p.tournament.startDate, calculateAge(p.dob, p.tournament.startDate));
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
