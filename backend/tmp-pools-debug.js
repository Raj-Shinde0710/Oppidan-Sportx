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
    const tournament = await prisma.tournament.findFirst({
      where: { name: 'CIS demo' },
      include: {
        categories: {
          include: {
            pools: {
              include: {
                matches: {
                  include: { playerA: true, playerB: true },
                },
              },
            },
          },
        },
        players: true,
      },
    });

    console.log('Tournament', tournament.id, tournament.name, tournament.startDate);
    for (const category of tournament.categories) {
      if (category.minAge === 6 && category.maxAge === 6 && category.gender === 'MALE') {
        console.log('Category', category.name, category.minAge, category.maxAge, category.type, category.playersPerPool);
        const categoryPlayers = tournament.players.filter((player) => {
          if (player.gender !== category.gender) return false;
          const age = calculateAge(player.dob, tournament.startDate);
          if (category.minAge === category.maxAge) {
            if (age !== category.minAge) return false;
          } else if (age < category.minAge || age > category.maxAge) {
            return false;
          }
          return true;
        });
        console.log('Filtered category players', categoryPlayers.length);
        categoryPlayers.forEach((p) => {
          console.log('  player', p.name, p.dob, calculateAge(p.dob, tournament.startDate), p.weight?.toString(), p.belt, p.gender);
        });
        for (const pool of category.pools) {
          console.log('Pool', pool.name, pool.aiGroupKey);
          for (const match of pool.matches) {
            console.log('  match', match.round, match.tatami, match.status, match.playerA?.name, match.playerB?.name);
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
