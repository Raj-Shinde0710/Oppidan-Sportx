import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma.service";

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================
  // CREATE TOURNAMENT
  // ============================
  async create(body: any, files: any) {
    try {
      const logoFile = files?.logo?.[0];
      const brochureFile = files?.brochure?.[0];

      if (
        !body.name ||
        !body.level ||
        !body.venue ||
        !body.startDate ||
        !body.endDate ||
        !body.registrationOpen ||
        !body.registrationClose
      ) {
        throw new BadRequestException("Missing required tournament fields");
      }

      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);
      const registrationOpen = new Date(body.registrationOpen);
      const registrationClose = new Date(body.registrationClose);

      return this.prisma.tournament.create({
        data: {
          name: body.name,
          level: body.level,
          venue: body.venue,
          startDate,
          endDate,
          registrationOpen,
          registrationClose,
          logoUrl: logoFile ? logoFile.filename : null,
          brochureUrl: brochureFile ? brochureFile.filename : null,
        },
      });
    } catch (error) {
      console.error("Tournament creation error:", error);
      throw error;
    }
  }

  // ============================
  // GET ALL TOURNAMENTS
  // ============================
  async findAll() {
    return this.prisma.tournament.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  // ============================
  // GET TOURNAMENT BY ID
  // ============================
  async getTournamentById(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
  categories: {
    include: {
      weights: true,
    },
  },

  players: {
    include: {
      profile: true,
    },
    orderBy: {
      name: "asc",
    },
  },

  registrations: true,
},
    });

    if (!tournament) {
      throw new BadRequestException("Tournament not found");
    }

    return tournament;
  }
    // ============================
  // DELETE TOURNAMENT
  // ============================
  async deleteTournament(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      throw new BadRequestException("Tournament not found");
    }

    await this.prisma.tournament.delete({
      where: { id },
    });

    return {
      message: "Tournament deleted successfully",
      id,
    };
  }
}
