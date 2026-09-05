import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('verify')
export class VerifyController {
  constructor(private prisma: PrismaService) {}

  @Get(':playerId')
  async verifyPlayer(@Param('playerId') playerId: string) {
    const player = await this.prisma.player.findFirst({
      where: {
        id: {
          startsWith: playerId.toLowerCase(), // since we sliced ID
        },
      },
      include: {
        tournament: true,
        profile: true,
      },
    });

    if (!player) throw new NotFoundException('Invalid ID Card');

    return {
      valid: true,
      name: player.name,
      tournament: player.tournament.name,
      belt: player.belt,
      state: player.profile?.state || '',
    };
  }
}
