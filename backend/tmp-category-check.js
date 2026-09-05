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
    const category = await prisma.category.findUnique({
      where: { id: 'e98fddd2-f1f6-4f4f-9cc0-12ce3e6eed4e' },
      include: {
        tournament: true,
        pools: {
          include: {
            matches: { include: { playerA: true, playerB: true } },
          },
        },
      },
    });
    if (!category) {
      console.log('Category not found');
      return;
    }
    console.log('Category', category.name, category.minAge, category.maxAge, category.gender, category.type, category.tournament.name, category.tournament.startDate);
    const players = await prisma.player.findMany({
      where: { tournamentId: category.tournamentId, gender: category.gender },
    });
    const filtered = players.filter((player) => {
      const age = calculateAge(player.dob, category.tournament.startDate);
      if (category.minAge === category.maxAge) {
        return age === category.minAge;
      }
      return age >= category.minAge && age <= category.maxAge;
    });
    console.log('Filtered players in category', filtered.length);
    filtered.forEach((p) => {
      console.log('  ', p.name, 'ageAtStart', calculateAge(p.dob, category.tournament.startDate), 'weight', p.weight?.toString());
    });
    category.pools.forEach((pool) => {
      console.log('Pool', pool.name, pool.aiGroupKey);
      pool.matches.forEach((match) => {
        console.log('  Match', match.round, match.tatami, match.playerA?.name, match.playerB?.name, match.status);
      });
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
