import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class IdCardsService {
  constructor(private prisma: PrismaService) {}

  async getTournamentPlayers(tournamentId: string) {
    const players = await this.prisma.player.findMany({
      where: {
        tournamentId: tournamentId,
      },
      include: {
        profile: true,
        tournament: true,
        coach: true,
        matchesA: { select: { tatami: true } },
        matchesB: { select: { tatami: true } },
      },
    });

    return players.map((player) => {
      // Collect tatamis from both sides of matches
      const tatamis = [
        ...player.matchesA.map((m) => m.tatami),
        ...player.matchesB.map((m) => m.tatami),
      ];

      return {
        fullName: player.name,
        playerId: player.id.slice(0, 8).toUpperCase(),
        dob: player.dob,
        gender: player.gender,
        belt: player.belt,
        weight: player.weight,
        branch: player.profile?.branch || '',
        state: player.profile?.state || '',
        tournamentName: player.tournament.name,
        coachName: player.coach?.clubName || 'Independent',
        tatamis, // 👈 sent to frontend for access squares
        photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          player.name,
        )}&background=4f46e5&color=fff&size=256`,
      };
    });
  }
}
