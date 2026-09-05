import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlayerDto) {
    const name = String(dto.name ?? '').trim();

    if (!name) {
      throw new BadRequestException('Participant name is required');
    }

    const parsedWeight =
      dto.weight === undefined || dto.weight === null || Number.isNaN(Number(dto.weight))
        ? null
        : Number(dto.weight);

    const existingPlayer = await this.prisma.player.findFirst({
      where: {
        name,
        tournamentId: dto.tournamentId,
      },
      include: {
        profile: true,
      },
    });

    const profileData = {
      name,
      email: dto.email ?? '',
      phone: dto.phone ?? '',
      club: dto.club?.trim() ? dto.club.trim() : null,
      branch: dto.branch ?? '',
      state: dto.state ?? '',
      city: dto.city ?? '',
    };

    const playerData = {
      name,
      gender: dto.gender,
      dob: new Date(dto.dob),
      weight: parsedWeight,
      belt: dto.belt ?? '',
      tournamentId: dto.tournamentId,
      coachId: dto.coachId ?? null,
    };

    if (existingPlayer) {
      return this.prisma.player.update({
        where: { id: existingPlayer.id },
        data: {
          ...playerData,
          profile: {
            upsert: {
              create: profileData,
              update: profileData,
            },
          },
        },
        include: {
          profile: true,
          tournament: true,
        },
      });
    }

    return this.prisma.player.create({
      data: {
        ...playerData,
        profile: {
          create: profileData,
        },
      },
      include: {
        profile: true,
        tournament: true,
      },
    });
  }

async importPlayers(players: any[]) {
  let importedCount = 0;

  for (const p of players) {
    const name = String(p?.name ?? '').trim();
    if (!name) continue;

    try {
      const existingPlayer = await this.prisma.player.findFirst({
        where: {
          name,
          tournamentId: p.tournamentId,
        },
        include: {
          profile: true,
        },
      });

      const parsedWeight = p.weight === '' || p.weight == null || Number.isNaN(Number(p.weight))
        ? null
        : Number(p.weight);

      if (existingPlayer) {
        await this.prisma.player.update({
          where: { id: existingPlayer.id },
          data: {
            gender: p.gender ?? 'MALE',
            dob: p.dob ? new Date(p.dob) : new Date('2000-01-01'),
            weight: parsedWeight,
            belt: p.belt ?? '',
            profile: {
              upsert: {
                create: {
                  name,
                  email: p.email ?? '',
                  phone: p.phone ?? '',
                  club: p.club ?? null,
                  branch: p.branch ?? '',
                  state: p.state ?? '',
                  city: p.city ?? '',
                },
                update: {
                  name,
                  email: p.email ?? '',
                  phone: p.phone ?? '',
                  club: p.club ?? null,
                  branch: p.branch ?? '',
                  state: p.state ?? '',
                  city: p.city ?? '',
                },
              },
            },
          },
        });
      } else {
        await this.prisma.player.create({
          data: {
            name,
            gender: p.gender ?? 'MALE',
            dob: p.dob ? new Date(p.dob) : new Date('2000-01-01'),
            weight: parsedWeight,
            belt: p.belt ?? '',
            tournamentId: p.tournamentId,
            profile: {
              create: {
                name,
                email: p.email ?? '',
                phone: p.phone ?? '',
                club: p.club ?? null,
                branch: p.branch ?? '',
                state: p.state ?? '',
                city: p.city ?? '',
              },
            },
          },
        });
      }

      importedCount += 1;
    } catch (error) {
      console.error(`Failed to import participant ${name}:`, error);
    }
  }

  return {
    success: true,
    imported: importedCount,
  };
}

  findAll() {
  return this.prisma.player.findMany({
    include: {
      profile: true,
      tournament: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

}
