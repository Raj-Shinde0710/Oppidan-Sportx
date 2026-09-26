import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

@Injectable()
export class TatamiService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 🔑 Generate random readable password
  private generatePassword(length = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    return Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  }

 async createTatamis(tournamentId: string, count: number) {
  // ------------------------------------------------------------
  // 1. Check tournament exists
  // ------------------------------------------------------------
  const tournament = await this.prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    throw new BadRequestException("Tournament not found");
  }

  // ------------------------------------------------------------
  // 2. Validate count
  // ------------------------------------------------------------
  if (!Number.isInteger(count) || count <= 0) {
    throw new BadRequestException(
      "Tatami count must be a positive integer",
    );
  }

  // ------------------------------------------------------------
  // 3. Get existing Tatamis for this tournament
  // ------------------------------------------------------------
  const existingTatamis = await this.prisma.tatami.findMany({
    where: {
      tournamentId,
    },
    orderBy: {
      number: "asc",
    },
  });

  // ------------------------------------------------------------
  // 4. Find the highest existing Tatami number
  //
  // If there are:
  // Tatami 1
  // Tatami 2
  // Tatami 3
  // Tatami 4
  //
  // next number = 5
  // ------------------------------------------------------------
  const lastTatamiNumber =
    existingTatamis.length > 0
      ? Math.max(
          ...existingTatamis.map((tatami) => tatami.number),
        )
      : 0;

  const createdTatamis: {
    id: string;
    number: number;
    username: string;
    password: string;
    isNew: boolean;
  }[] = [];

  // ------------------------------------------------------------
  // 5. Create ONLY new Tatamis
  // ------------------------------------------------------------
  for (let i = 1; i <= count; i++) {
    const tatamiNumber = lastTatamiNumber + i;

    const username = `TATAMI_${tatamiNumber}`;

    // ----------------------------------------------------------
    // 6. Extra safety check
    // ----------------------------------------------------------
    const existingTatami = await this.prisma.tatami.findFirst({
      where: {
        tournamentId,
        number: tatamiNumber,
      },
    });

    if (existingTatami) {
      throw new BadRequestException(
        `Tatami ${tatamiNumber} already exists for this tournament`,
      );
    }

    // ----------------------------------------------------------
    // 7. Generate password
    // ----------------------------------------------------------
    const plainPassword = this.generatePassword();

    const passwordHash = await bcrypt.hash(
      plainPassword,
      10,
    );

    // ----------------------------------------------------------
    // 8. Create Tatami
    // ----------------------------------------------------------
    const tatami = await this.prisma.tatami.create({
      data: {
        number: tatamiNumber,
        username,
        passwordHash,
        tournamentId,
      },
    });

    // ----------------------------------------------------------
    // 9. Return credentials for newly created Tatami
    // ----------------------------------------------------------
    createdTatamis.push({
      id: tatami.id,
      number: tatami.number,
      username: tatami.username,
      password: plainPassword,
      isNew: true,
    });
  }

  // ------------------------------------------------------------
  // 10. Return result
  // ------------------------------------------------------------
  return {
    message: `${count} new Tatami(s) created successfully`,
    tatamis: createdTatamis,
  };
}

  async getTatamisByTournament(tournamentId: string) {
    return this.prisma.tatami.findMany({
      where: { tournamentId },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        username: true,
      },
    });
  }
 async assignPoolsToTatamis(
  tournamentId: string,
  mode: "BOYS" | "GIRLS" | "MIX" = "MIX",
  sequence: "SENIOR_FIRST" | "JUNIOR_FIRST" = "JUNIOR_FIRST",
) {
  // ============================================================
  // 1. CHECK TOURNAMENT
  // ============================================================

  const tournament = await this.prisma.tournament.findUnique({
    where: {
      id: tournamentId,
    },
  });

  if (!tournament) {
    throw new BadRequestException("Tournament not found");
  }

  // ============================================================
  // 2. GET TATAMIS
  // ============================================================

  const tatamis = await this.prisma.tatami.findMany({
    where: {
      tournamentId,
    },
    orderBy: {
      number: "asc",
    },
  });

  if (tatamis.length === 0) {
    throw new BadRequestException(
      "No Tatamis have been created for this tournament.",
    );
  }

  // ============================================================
  // 3. GET CATEGORIES
  // ============================================================

  let categories = await this.prisma.category.findMany({
    where: {
      tournamentId,
    },
    include: {
      pools: true,
    },
  });

  // ============================================================
  // 4. FILTER BY GENDER MODE
  // ============================================================

  if (mode === "BOYS") {
    categories = categories.filter(
      (category) => category.gender === "MALE",
    );
  }

  if (mode === "GIRLS") {
    categories = categories.filter(
      (category) => category.gender === "FEMALE",
    );
  }

  if (categories.length === 0) {
    throw new BadRequestException(
      "No categories found for the selected mode.",
    );
  }

  // ============================================================
  // 5. SORT CATEGORIES BY AGE
  //
  // IMPORTANT:
  // Youngest category first.
  //
  // Example:
  // 6 → 7 → 8 → 9 → 10 → 11 → 12
  // ============================================================

  categories.sort((a, b) => {
  // Youngest category first
  if (a.minAge !== b.minAge) {
    return a.minAge - b.minAge;
  }

  if (a.maxAge !== b.maxAge) {
    return a.maxAge - b.maxAge;
  }

  return a.name.localeCompare(b.name);
});

  // ============================================================
  // 6. TOTAL POOLS + TARGET
  // ============================================================

  const totalPools = categories.reduce(
    (sum, category) =>
      sum + (category.pools?.length || 0),
    0,
  );

  

  // ============================================================
// 7. ASSIGN CATEGORIES TO TATAMIS
//
// RULE:
//
// FIRST ROUND:
//   Category 1 → Tatami 1
//   Category 2 → Tatami 2
//   Category 3 → Tatami 3
//   Category 4 → Tatami 4
//
// AFTER EVERY TATAMI HAS ONE CATEGORY:
//
//   Find Tatami with the least number of pools.
//   Assign the COMPLETE next category to it.
//
// CATEGORY IS NEVER SPLIT.
// ============================================================

const loads = tatamis.map((tatami) => ({
  tatamiId: tatami.id,
  tatamiNumber: tatami.number,
  categories: [] as any[],
  poolCount: 0,
}));

for (let index = 0; index < categories.length; index++) {
  const category = categories[index];

  const categoryPoolCount =
    category.pools?.length || 0;

  let target;

  // ==========================================================
  // FIRST ROUND
  //
  // Youngest category goes to Tatami 1,
  // second youngest to Tatami 2, etc.
  // ==========================================================

  if (index < tatamis.length) {
    target = loads[index];
  } else {
    // ========================================================
    // AFTER EVERY TATAMI HAS RECEIVED A CATEGORY
    //
    // Find the Tatami with the least number of pools.
    //
    // If there is a tie, choose the lower Tatami number.
    // ========================================================

    target = [...loads].sort((a, b) => {
      if (a.poolCount !== b.poolCount) {
        return a.poolCount - b.poolCount;
      }

      return a.tatamiNumber - b.tatamiNumber;
    })[0];
  }

  // ==========================================================
  // ASSIGN COMPLETE CATEGORY
  // ==========================================================

  target.categories.push(category);

  target.poolCount += categoryPoolCount;
}

  // ============================================================
  // 9. SORT CATEGORIES INSIDE EACH TATAMI
  //
  // This guarantees:
  //
  // 6 years
  // 7 years
  // 8 years
  // 9 years
  // ...
  //
  // regardless of how the balancing algorithm assigned them.
  // ============================================================

  for (const load of loads) {
    load.categories.sort((a, b) => {
      if (a.minAge !== b.minAge) {
        return a.minAge - b.minAge;
      }

      if (a.maxAge !== b.maxAge) {
        return a.maxAge - b.maxAge;
      }

      return a.name.localeCompare(b.name);
    });
  }

  // Restore Tatami number order.
  loads.sort(
    (a, b) =>
      a.tatamiNumber -
      b.tatamiNumber,
  );

  // ============================================================
  // 10. CLEAR OLD CATEGORY ASSIGNMENTS
  // ============================================================

  await this.prisma.category.updateMany({
    where: {
      tournamentId,
    },
    data: {
      tatamiId: null,
    },
  });

  // Old pool-level assignments are no longer used.
  await this.prisma.pool.updateMany({
    where: {
      category: {
        tournamentId,
      },
    },
    data: {
      tatamiId: null,
    },
  });

  // ============================================================
  // 11. SAVE CATEGORY ASSIGNMENTS
  // ============================================================

  const assignments: any[] = [];

  for (const load of loads) {
    for (const category of load.categories) {
      await this.prisma.category.update({
        where: {
          id: category.id,
        },
        data: {
          tatamiId: load.tatamiId,
        },
      });

      assignments.push({
        categoryId: category.id,
        categoryName: category.name,

        tatamiId: load.tatamiId,
        tatamiNumber: load.tatamiNumber,

        gender: category.gender,

        minAge: category.minAge,
        maxAge: category.maxAge,

        totalPools:
          category.pools?.length || 0,

        pools: category.pools || [],
      });
    }
  }

  // ============================================================
  // 12. RETURN RESULT
  // ============================================================

  return {
    message:
      "Categories assigned to Tatamis successfully",

    tournamentId,

    mode,

    sequence: "JUNIOR_FIRST",

    totalPools,

    totalTatamis: tatamis.length,

    assignments,

    tatamiLoads: loads.map(
      (load) => ({
        tatamiId: load.tatamiId,
        tatamiNumber:
          load.tatamiNumber,
        totalPools:
          load.poolCount,
      }),
    ),
  };
}
  
  async deleteTatami(id: string) {
  const tatami = await this.prisma.tatami.findUnique({
    where: { id },
  });

  if (!tatami) {
    throw new BadRequestException("Tatami not found");
  }

  const tournamentId = tatami.tournamentId;

  await this.prisma.$transaction(async (tx) => {
    // 1. Delete the selected Tatami
    await tx.tatami.delete({
      where: { id },
    });

    // 2. Get remaining Tatamis in correct order
    const remainingTatamis = await tx.tatami.findMany({
      where: { tournamentId },
      orderBy: { number: "asc" },
    });

    // 3. Temporarily move numbers to avoid unique constraint conflicts
    for (let i = 0; i < remainingTatamis.length; i++) {
      await tx.tatami.update({
        where: { id: remainingTatamis[i].id },
        data: {
          number: -(i + 1),
          username: `TEMP_TATAMI_${i + 1}`,
        },
      });
    }

    // 4. Renumber from 1, 2, 3...
    for (let i = 0; i < remainingTatamis.length; i++) {
      const newNumber = i + 1;

      await tx.tatami.update({
        where: { id: remainingTatamis[i].id },
        data: {
          number: newNumber,
          username: `TATAMI_${newNumber}`,
        },
      });
    }
  });

  return {
    message: `Tatami ${tatami.number} deleted and remaining Tatamis renumbered successfully`,
  };
}
  // ============================================================
  // MANUAL ASSIGN SINGLE POOL TO TATAMI
  // ============================================================
  async assignCategoryManually(
  categoryId: string,
  tatamiId: string,
) {
  const category = await this.prisma.category.findUnique({
    where: {
      id: categoryId,
    },
  });

  if (!category) {
    throw new BadRequestException("Category not found");
  }

  const tatami = await this.prisma.tatami.findUnique({
    where: {
      id: tatamiId,
    },
  });

  if (!tatami) {
    throw new BadRequestException("Tatami not found");
  }

  if (category.tournamentId !== tatami.tournamentId) {
    throw new BadRequestException(
      "Category and Tatami belong to different tournaments",
    );
  }

  // Remove category from its previous Tatami
  await this.prisma.category.update({
    where: {
      id: categoryId,
    },
    data: {
      tatamiId,
    },
  });

  // Clear old pool-level assignment for this category
  await this.prisma.pool.updateMany({
    where: {
      categoryId,
    },
    data: {
      tatamiId: null,
    },
  });

  return {
    message: `${category.name} assigned to Tatami ${tatami.number} successfully`,
    categoryId: category.id,
    categoryName: category.name,
    tatamiId: tatami.id,
    tatamiNumber: tatami.number,
  };
}

  // ============================================================
  // TATAMI AUTHENTICATION / LOGIN
  // ============================================================
  async login(loginDto: {
    username: string;
    password: string;
    tournamentId?: string;
  }) {
    const { username, password, tournamentId } = loginDto;

    if (!username || !password) {
      throw new UnauthorizedException("Username and password are required");
    }

    const cleanUsername = username.trim();
    const normalizedWithUnderscore = cleanUsername.replace(/[\s-]+/g, "_");

    const tatamis = await this.prisma.tatami.findMany({
      where: {
        OR: [
          {
            username: {
              equals: cleanUsername,
              mode: "insensitive",
            },
          },
          {
            username: {
              equals: normalizedWithUnderscore,
              mode: "insensitive",
            },
          },
        ],
        ...(tournamentId ? { tournamentId } : {}),
      },
      include: {
        tournament: true,
      },
    });

    if (tatamis.length === 0) {
      throw new UnauthorizedException("Invalid username or password");
    }

    let matchedTatami: any = null;
    for (const t of tatamis) {
      if (!t.passwordHash) continue;
      const isMatch = await bcrypt.compare(password, t.passwordHash);
      if (isMatch) {
        matchedTatami = t;
        break;
      }
    }

    if (!matchedTatami) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const payload = {
      tatamiId: matchedTatami.id,
      tournamentId: matchedTatami.tournamentId,
      role: "TATAMI",
      tatamiNumber: matchedTatami.number,
      username: matchedTatami.username,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      tatami: {
        id: matchedTatami.id,
        number: matchedTatami.number,
        username: matchedTatami.username,
        tournamentId: matchedTatami.tournamentId,
      },
    };
  }

  // ============================================================
  // RESET / REGENERATE TATAMI PASSWORD
  // ============================================================
  async resetPassword(tatamiId: string, newPassword?: string) {
    if (!tatamiId) {
      throw new BadRequestException("Tatami ID is required");
    }

    const tatami = await this.prisma.tatami.findUnique({
      where: { id: tatamiId },
    });

    if (!tatami) {
      throw new NotFoundException("Tatami not found");
    }

    const plainPassword =
      newPassword && newPassword.trim().length >= 4
        ? newPassword.trim()
        : this.generatePassword();

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await this.prisma.tatami.update({
      where: { id: tatamiId },
      data: {
        passwordHash,
      },
    });

    return {
      message: `Password for Tatami ${tatami.number} (${tatami.username}) reset successfully`,
      id: tatami.id,
      number: tatami.number,
      username: tatami.username,
      password: plainPassword,
    };
  }

  // ============================================================
  // GET AUTHENTICATED TATAMI DASHBOARD DATA
  // ============================================================
  async getDashboardData(tatamiId: string) {
    if (!tatamiId) {
      throw new UnauthorizedException("Tatami authentication required");
    }

    const tatami = await this.prisma.tatami.findUnique({
      where: { id: tatamiId },
      select: {
        id: true,
        number: true,
        username: true,
        tournamentId: true,
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
        categories: {
          orderBy: [
            { minAge: "asc" },
            { maxAge: "asc" },
            { name: "asc" },
          ],
          select: {
            id: true,
            name: true,
            level: true,
            minAge: true,
            maxAge: true,
            gender: true,
            type: true,
            tatamiId: true,
            pools: {
              orderBy: { name: "asc" },
              select: {
                id: true,
                name: true,
                categoryId: true,
                aiGroupKey: true,
                matches: {
                  orderBy: [
                    { round: "asc" },
                    { id: "asc" },
                  ],
                  select: {
                    id: true,
                    round: true,
                    tatami: true,
                    status: true,
                    winnerId: true,
                    startedAt: true,
                    completedAt: true,
                    durationSeconds: true,
                    nextMatchId: true,
                    scoreCard: {
                      select: {
                        id: true,
                        scoreA: true,
                        scoreB: true,
                        method: true,
                        winnerId: true,
                      },
                    },
                    playerA: {
                      select: {
                        id: true,
                        name: true,
                        gender: true,
                        dob: true,
                        weight: true,
                        belt: true,
                        profile: {
                          select: {
                            club: true,
                            city: true,
                            state: true,
                          },
                        },
                      },
                    },
                    playerB: {
                      select: {
                        id: true,
                        name: true,
                        gender: true,
                        dob: true,
                        weight: true,
                        belt: true,
                        profile: {
                          select: {
                            club: true,
                            city: true,
                            state: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tatami) {
      throw new NotFoundException("Tatami not found");
    }

    const formatPlayer = (player: any) => {
      if (!player) return null;
      return {
        id: player.id,
        name: player.name,
        gender: player.gender,
        dob: player.dob,
        weight: player.weight ? Number(player.weight) : null,
        belt: player.belt,
        club: player.profile?.club || null,
        city: player.profile?.city || null,
        state: player.profile?.state || null,
      };
    };

    const formattedCategories = (tatami.categories || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      level: cat.level,
      minAge: cat.minAge,
      maxAge: cat.maxAge,
      gender: cat.gender,
      type: cat.type,
      tatamiId: cat.tatamiId,
      pools: (cat.pools || []).map((pool) => ({
        id: pool.id,
        name: pool.name,
        categoryId: pool.categoryId,
        aiGroupKey: pool.aiGroupKey,
        matches: (pool.matches || []).map((m) => ({
          id: m.id,
          round: m.round,
          tatami: m.tatami,
          status: m.status,
          winnerId: m.winnerId,
          startedAt: m.startedAt,
          completedAt: m.completedAt,
          durationSeconds: m.durationSeconds,
          nextMatchId: m.nextMatchId,
          scoreCard: m.scoreCard || null,
          playerA: formatPlayer(m.playerA),
          playerB: formatPlayer(m.playerB),
        })),
      })),
    }));

    return {
      tatami: {
        id: tatami.id,
        number: tatami.number,
        username: tatami.username,
        tournamentId: tatami.tournamentId,
        tournamentName: tatami.tournament?.name || null,
      },
      categories: formattedCategories,
    };
  }

  // ============================================================
  // MATCH CONTROL HELPERS
  // ============================================================
  private formatPlayer(player: any) {
    if (!player) return null;
    return {
      id: player.id,
      name: player.name,
      gender: player.gender,
      dob: player.dob,
      weight: player.weight ? Number(player.weight) : null,
      belt: player.belt,
      club: player.profile?.club || null,
      city: player.profile?.city || null,
      state: player.profile?.state || null,
    };
  }

  private formatMatchControlResponse(match: any) {
    if (!match) return null;
    const playerA = this.formatPlayer(match.playerA);
    const playerB = this.formatPlayer(match.playerB);
    const category = match.pool?.category;

    return {
      id: match.id,
      poolId: match.poolId,
      round: match.round,
      tatami: match.tatami,
      status: match.status,
      winnerId: match.winnerId,
      startedAt: match.startedAt,
      completedAt: match.completedAt,
      durationSeconds: match.durationSeconds,
      nextMatchId: match.nextMatchId,
      scoreA: match.scoreA ?? 0,
      scoreB: match.scoreB ?? 0,
      scoreCard: match.scoreCard || null,

      playerA,
      playerB,

      categoryType: category?.type || null,
      categoryName: category?.name || null,
      poolName: match.pool?.name || null,

      match: {
        id: match.id,
        round: match.round,
        tatami: match.tatami,
        status: match.status,
        winnerId: match.winnerId,
        startedAt: match.startedAt,
        completedAt: match.completedAt,
        durationSeconds: match.durationSeconds,
        scoreA: match.scoreA ?? 0,
        scoreB: match.scoreB ?? 0,
        nextMatchId: match.nextMatchId,
      },
      category: category
        ? {
            id: category.id,
            name: category.name,
            type: category.type,
          }
        : null,
      pool: match.pool
        ? {
            id: match.pool.id,
            name: match.pool.name,
          }
        : null,
    };
  }

  // ============================================================
  // 1. GET MATCH DETAILS FOR MATCH CONTROL
  // ============================================================
  async getMatchDetails(matchId: string, tatamiId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        pool: {
          include: {
            category: true,
          },
        },
        playerA: {
          include: { profile: true },
        },
        playerB: {
          include: { profile: true },
        },
        scoreCard: true,
      },
    });

    if (!match) {
      throw new NotFoundException("Match not found");
    }

    if (match.pool.category.tatamiId !== tatamiId) {
      throw new ForbiddenException("You do not have access to this match");
    }

    // Auto-resolve Kumite BYE matches to COMPLETED
    const isKumiteBye =
      match.pool.category.type === "KUMITE" &&
      match.playerAId === match.playerBId;

    if (isKumiteBye && match.status !== "COMPLETED") {
      const updatedBye = await this.prisma.match.update({
        where: { id: match.id },
        data: {
          status: "COMPLETED",
          winnerId: match.playerAId,
          completedAt: new Date(),
        },
        include: {
          pool: { include: { category: true } },
          playerA: { include: { profile: true } },
          playerB: { include: { profile: true } },
          scoreCard: true,
        },
      });

      return this.formatMatchControlResponse(updatedBye);
    }

    return this.formatMatchControlResponse(match);
  }

  // ============================================================
  // 2. START MATCH
  // ============================================================
  async startMatch(
    matchId: string,
    tatamiId: string,
    durationSeconds: number,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        pool: {
          include: {
            category: true,
          },
        },
        playerA: {
          include: { profile: true },
        },
        playerB: {
          include: { profile: true },
        },
      },
    });

    if (!match) {
      throw new NotFoundException("Match not found");
    }

    if (match.pool.category.tatamiId !== tatamiId) {
      throw new ForbiddenException("You do not have access to this match");
    }

    if (match.pool.category.type !== "KUMITE") {
      throw new BadRequestException(
        "Only KUMITE matches can be started via match control",
      );
    }

    if (match.playerAId === match.playerBId) {
      throw new BadRequestException("BYE matches cannot be started");
    }

    if (match.status === "LIVE") {
      throw new BadRequestException("Match is already live");
    }

    if (match.status === "COMPLETED") {
      throw new BadRequestException("Match is already completed");
    }

    if (!durationSeconds || durationSeconds <= 0 || durationSeconds > 600) {
      throw new BadRequestException(
        "durationSeconds must be an integer between 1 and 600",
      );
    }

    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: "LIVE",
        startedAt: new Date(),
        durationSeconds,
        winnerId: null,
        completedAt: null,
      },
      include: {
        pool: { include: { category: true } },
        playerA: { include: { profile: true } },
        playerB: { include: { profile: true } },
        scoreCard: true,
      },
    });

    return this.formatMatchControlResponse(updatedMatch);
  }

  // ============================================================
  // 3. UPDATE LIVE MATCH SCORE
  // ============================================================
  async updateScore(
    matchId: string,
    tatamiId: string,
    dto: {
      player?: "A" | "B";
      score?: number;
      scoreA?: number;
      scoreB?: number;
    },
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        pool: {
          include: {
            category: true,
          },
        },
        playerA: {
          include: { profile: true },
        },
        playerB: {
          include: { profile: true },
        },
        scoreCard: true,
      },
    });

    if (!match) {
      throw new NotFoundException("Match not found");
    }

    if (match.pool.category.tatamiId !== tatamiId) {
      throw new ForbiddenException("You do not have access to this match");
    }

    if (match.pool.category.type !== "KUMITE") {
      throw new BadRequestException(
        "Only KUMITE match scores can be updated",
      );
    }

    if (match.status !== "LIVE") {
      throw new BadRequestException(
        "Scores can only be updated for LIVE matches",
      );
    }

    let nextScoreA = match.scoreA ?? 0;
    let nextScoreB = match.scoreB ?? 0;

    if (dto.scoreA !== undefined) {
      if (dto.scoreA < 0) {
        throw new BadRequestException("Score cannot be negative");
      }
      nextScoreA = dto.scoreA;
    }

    if (dto.scoreB !== undefined) {
      if (dto.scoreB < 0) {
        throw new BadRequestException("Score cannot be negative");
      }
      nextScoreB = dto.scoreB;
    }

    if (dto.player !== undefined && dto.score !== undefined) {
      if (dto.score < 0) {
        throw new BadRequestException("Score cannot be negative");
      }
      if (dto.player === "A") nextScoreA = dto.score;
      if (dto.player === "B") nextScoreB = dto.score;
    }

    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        scoreA: nextScoreA,
        scoreB: nextScoreB,
      },
      include: {
        pool: { include: { category: true } },
        playerA: { include: { profile: true } },
        playerB: { include: { profile: true } },
        scoreCard: true,
      },
    });

    return this.formatMatchControlResponse(updatedMatch);
  }

  // ============================================================
  // 4. COMPLETE MATCH & SUBMIT WINNER (DYNAMIC ADVANCEMENT)
  // ============================================================
  async submitMatchResult(
    matchId: string,
    tatamiId: string,
    winnerId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          pool: {
            include: {
              category: true,
            },
          },
          playerA: {
            include: { profile: true },
          },
          playerB: {
            include: { profile: true },
          },
        },
      });

      if (!match) {
        throw new NotFoundException("Match not found");
      }

      if (match.pool.category.tatamiId !== tatamiId) {
        throw new ForbiddenException("You do not have access to this match");
      }

      if (match.pool.category.type !== "KUMITE") {
        throw new BadRequestException(
          "Only KUMITE matches use this result submission",
        );
      }

      if (match.status === "COMPLETED" || match.winnerId) {
        throw new BadRequestException(
          "Winner has already been selected for this match",
        );
      }

      if (match.status !== "LIVE") {
        throw new BadRequestException(
          "Only LIVE matches can have results submitted",
        );
      }

      if (
        winnerId !== match.playerAId &&
        winnerId !== match.playerBId
      ) {
        throw new BadRequestException(
          "winnerId must match either playerA or playerB",
        );
      }

      const completedAt = new Date();

      // 1. Complete the current match
      const updatedMatch = await tx.match.update({
        where: { id: match.id },
        data: {
          status: "COMPLETED",
          winnerId,
          completedAt,
        },
        include: {
          playerA: { include: { profile: true } },
          playerB: { include: { profile: true } },
          pool: { include: { category: true } },
        },
      });

      // 2. Sync ScoreCard
      await tx.scoreCard.upsert({
        where: { matchId: match.id },
        create: {
          matchId: match.id,
          scoreA: updatedMatch.scoreA ?? 0,
          scoreB: updatedMatch.scoreB ?? 0,
          method: "REGULATION",
          winnerId,
        },
        update: {
          scoreA: updatedMatch.scoreA ?? 0,
          scoreB: updatedMatch.scoreB ?? 0,
          winnerId,
        },
      });

      // 3. Find all matches in this pool and round (ordered deterministically)
      const roundMatches = await tx.match.findMany({
        where: {
          poolId: match.poolId,
          round: match.round,
        },
        orderBy: { id: "asc" },
      });

      // If there is only 1 match in this round, this is the final match of the pool!
      if (roundMatches.length <= 1) {
        return {
          match: this.formatMatchControlResponse(updatedMatch),
          winner: this.formatPlayer(
            winnerId === match.playerAId ? match.playerA : match.playerB,
          ),
          nextMatch: null,
          waitingForOtherMatch: false,
          poolComplete: true,
        };
      }

      // 4. Locate companion match in the round
      const matchIndex = roundMatches.findIndex((m) => m.id === match.id);
      const companionIndex =
        matchIndex % 2 === 0 ? matchIndex + 1 : matchIndex - 1;

      // If odd match without companion:
      if (companionIndex < 0 || companionIndex >= roundMatches.length) {
        return {
          match: this.formatMatchControlResponse(updatedMatch),
          winner: this.formatPlayer(
            winnerId === match.playerAId ? match.playerA : match.playerB,
          ),
          nextMatch: null,
          waitingForOtherMatch: false,
          poolComplete: true,
        };
      }

      let companionMatch = roundMatches[companionIndex];

      // Auto-complete companion if it is a BYE
      if (
        companionMatch.playerAId === companionMatch.playerBId &&
        companionMatch.status !== "COMPLETED"
      ) {
        companionMatch = await tx.match.update({
          where: { id: companionMatch.id },
          data: {
            status: "COMPLETED",
            winnerId: companionMatch.playerAId,
            completedAt: new Date(),
          },
        });
      }

      // 5. Verify if companion has completed and has a winner
      if (!companionMatch.winnerId || companionMatch.status !== "COMPLETED") {
        return {
          match: this.formatMatchControlResponse(updatedMatch),
          winner: this.formatPlayer(
            winnerId === match.playerAId ? match.playerA : match.playerB,
          ),
          nextMatch: null,
          waitingForOtherMatch: true,
          poolComplete: false,
        };
      }

      // 6. Both matches have winners! Advance to next round
      const firstWinnerId = (
        matchIndex % 2 === 0 ? updatedMatch.winnerId : companionMatch.winnerId
      ) as string;
      const secondWinnerId = (
        matchIndex % 2 === 0 ? companionMatch.winnerId : updatedMatch.winnerId
      ) as string;

      // Check for existing next match (idempotency / duplicate protection)
      let nextMatch: any = null;
      const existingNextMatchId =
        updatedMatch.nextMatchId || companionMatch.nextMatchId;

      if (existingNextMatchId) {
        nextMatch = await tx.match.findUnique({
          where: { id: existingNextMatchId },
          include: {
            playerA: { include: { profile: true } },
            playerB: { include: { profile: true } },
            pool: { include: { category: true } },
          },
        });
      }

      if (!nextMatch) {
        const existingCandidate = await tx.match.findFirst({
          where: {
            poolId: match.poolId,
            round: match.round + 1,
            OR: [
              { playerAId: firstWinnerId, playerBId: secondWinnerId },
              { playerAId: secondWinnerId, playerBId: firstWinnerId },
            ],
          },
          include: {
            playerA: { include: { profile: true } },
            playerB: { include: { profile: true } },
            pool: { include: { category: true } },
          },
        });

        if (existingCandidate) {
          nextMatch = existingCandidate;
        } else {
          nextMatch = await tx.match.create({
            data: {
              poolId: match.poolId,
              round: match.round + 1,
              tatami: match.tatami,
              status: "PENDING",
              playerAId: firstWinnerId,
              playerBId: secondWinnerId,
              scoreA: 0,
              scoreB: 0,
            },
            include: {
              playerA: { include: { profile: true } },
              playerB: { include: { profile: true } },
              pool: { include: { category: true } },
            },
          });
        }
      }

      // Set nextMatchId on BOTH previous matches
      await tx.match.update({
        where: { id: updatedMatch.id },
        data: { nextMatchId: nextMatch.id },
      });

      await tx.match.update({
        where: { id: companionMatch.id },
        data: { nextMatchId: nextMatch.id },
      });

      const refreshedMatch = await tx.match.findUnique({
        where: { id: match.id },
        include: {
          playerA: { include: { profile: true } },
          playerB: { include: { profile: true } },
          pool: { include: { category: true } },
        },
      });

      return {
        match: this.formatMatchControlResponse(refreshedMatch),
        winner: this.formatPlayer(
          winnerId === match.playerAId ? match.playerA : match.playerB,
        ),
        nextMatch: this.formatMatchControlResponse(nextMatch),
        waitingForOtherMatch: false,
        poolComplete: false,
      };
    });
  }

  // ============================================================
  // 5. REMATCH COMPLETED KUMITE MATCH
  // ============================================================
  async rematch(matchId: string, tatamiId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        pool: {
          include: {
            category: true,
          },
        },
        playerA: {
          include: { profile: true },
        },
        playerB: {
          include: { profile: true },
        },
        scoreCard: true,
      },
    });

    if (!match) {
      throw new NotFoundException("Match not found");
    }

    if (match.pool.category.tatamiId !== tatamiId) {
      throw new ForbiddenException("You do not have access to this match");
    }

    if (match.pool.category.type !== "KUMITE") {
      throw new BadRequestException("Only KUMITE matches support rematch");
    }

    // Safely remove the completed scoreCard if exists
    if (match.scoreCard) {
      await this.prisma.scoreCard.delete({
        where: { matchId: match.id },
      }).catch(() => {});
    }

    // Reset match back to fresh PENDING match
    // Keeps the same two players, same pool, same round, and does NOT affect nextMatchId or pool structure
    const updatedMatch = await this.prisma.match.update({
      where: { id: match.id },
      data: {
        status: "PENDING",
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        startedAt: null,
        completedAt: null,
      },
      include: {
        pool: { include: { category: true } },
        playerA: { include: { profile: true } },
        playerB: { include: { profile: true } },
        scoreCard: true,
      },
    });

    return this.formatMatchControlResponse(updatedMatch);
  }
}

