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
    const player = await prisma.player.findFirst({
      where: { name: 'Kabir More' },
      include: { tournament: true },
    });
    console.log('Player', player?.id, player?.name, player?.gender, player?.dob, player?.weight?.toString(), player?.tournament?.id, player?.tournament?.name, player?.tournament?.startDate);
    if (player) {
      console.log('AgeAtStart', calculateAge(player.dob, player.tournament.startDate));
    }

    const categories = await prisma.category.findMany({
      where: { minAge: 6, maxAge: 6, gender: 'MALE', type: 'KUMITE' },
      include: {
        pools: {
          include: {
            matches: { include: { playerA: true, playerB: true } },
          },
        },
      },
    });
    for (const category of categories) {
      console.log('Category', category.id, category.name, category.minAge, category.maxAge, category.gender, category.type, category.playersPerPool);
      for (const pool of category.pools) {
        console.log('Pool', pool.id, pool.name, pool.aiGroupKey);
        for (const match of pool.matches) {
          console.log(' Match', match.round, match.tatami, match.playerA?.name, match.playerB?.name);
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
