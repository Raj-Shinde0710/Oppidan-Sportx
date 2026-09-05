import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class TatamiService {
  constructor(private prisma: PrismaService) {}

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
    // ============================================================
  // ASSIGN ALL POOLS TO TATAMIS
  // ============================================================
  async assignPoolsToTatamis(
    tournamentId: string,
    mode: "BOYS" | "GIRLS" | "MIX" = "MIX",
    sequence: "SENIOR_FIRST" | "JUNIOR_FIRST" = "SENIOR_FIRST",
  ) {
    // ----------------------------------------------------------
    // 1. Get tournament
    // ----------------------------------------------------------
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new BadRequestException("Tournament not found");
    }

    // ----------------------------------------------------------
    // 2. Get all Tatamis for this tournament
    // ----------------------------------------------------------
    const tatamis = await this.prisma.tatami.findMany({
      where: { tournamentId },
      orderBy: { number: "asc" },
    });

    if (tatamis.length === 0) {
      throw new BadRequestException(
        "No Tatamis have been created for this tournament",
      );
    }

    // ----------------------------------------------------------
    // 3. Get ALL pools belonging to this tournament
    //
    // Pool -> Category -> Tournament
    // ----------------------------------------------------------
    const pools = await this.prisma.pool.findMany({
  where: {
    category: {
      tournamentId,
    },
  },
  include: {
    category: {
      include: {
        weights: true,
      },
    },
    matches: {
      include: {
        playerA: true,
        playerB: true,
      },
    },
  },
  orderBy: {
    name: "asc",
  },
});

    if (pools.length === 0) {
      throw new BadRequestException(
        "No pools have been generated for this tournament",
      );
    }

    // ----------------------------------------------------------
    // 4. Sort pools
    //
    // We use the category's age range and gender.
    // ----------------------------------------------------------
    const getGenderOrder = (gender: string) => {
      if (mode === "BOYS") {
        return gender === "MALE" ? 0 : 999;
      }

      if (mode === "GIRLS") {
        return gender === "FEMALE" ? 0 : 999;
      }

      // MIX
      return 0;
    };

    const sortedPools = [...pools].sort((a, b) => {
      const genderA = getGenderOrder(a.category.gender);
      const genderB = getGenderOrder(b.category.gender);

      if (genderA !== genderB) {
        return genderA - genderB;
      }

      // Senior first = higher age categories first
      // Junior first = lower age categories first
      if (sequence === "SENIOR_FIRST") {
        if (a.category.maxAge !== b.category.maxAge) {
          return b.category.maxAge - a.category.maxAge;
        }

        if (a.category.minAge !== b.category.minAge) {
          return b.category.minAge - a.category.minAge;
        }
      } else {
        if (a.category.minAge !== b.category.minAge) {
          return a.category.minAge - b.category.minAge;
        }

        if (a.category.maxAge !== b.category.maxAge) {
          return a.category.maxAge - b.category.maxAge;
        }
      }

      return a.name.localeCompare(b.name);
    });

    // ----------------------------------------------------------
    // 5. Assign pools sequentially
    //
    // Example:
    //
    // Pool 1 -> Tatami 1
    // Pool 2 -> Tatami 2
    // Pool 3 -> Tatami 3
    // Pool 4 -> Tatami 1
    // ...
    // ----------------------------------------------------------
    const assignments = sortedPools.map((pool, index) => {
      const tatami = tatamis[index % tatamis.length];

      const poolPlayer =
  pool.matches?.find((match) => match.playerA)?.playerA ||
  pool.matches?.find((match) => match.playerB)?.playerB;

const playerWeight = poolPlayer?.weight
  ? Number(poolPlayer.weight)
  : null;

const weightCategory = pool.category.weights?.find((weight) => {
  if (playerWeight === null || Number.isNaN(playerWeight)) {
    return false;
  }

  return (
    playerWeight >= Number(weight.minWeight) &&
    playerWeight <= Number(weight.maxWeight)
  );
});

return {
  poolId: pool.id,
  poolName: pool.name,
  categoryId: pool.categoryId,
  categoryName: pool.category.name,
  gender: pool.category.gender,

  minAge: pool.category.minAge,
  maxAge: pool.category.maxAge,

  minWeight: weightCategory
    ? Number(weightCategory.minWeight)
    : null,

  maxWeight: weightCategory
    ? Number(weightCategory.maxWeight)
    : null,

  tatamiId: tatami.id,
  tatamiNumber: tatami.number,
};
    });

    // ----------------------------------------------------------
    // 6. Save every assignment in a transaction
    // ----------------------------------------------------------
    await this.prisma.$transaction(
      assignments.map((assignment) =>
        this.prisma.pool.update({
          where: {
            id: assignment.poolId,
          },
          data: {
            tatamiId: assignment.tatamiId,
          },
        }),
      ),
    );

    // ----------------------------------------------------------
    // 7. Verify that EVERY pool was assigned
    // ----------------------------------------------------------
    const assignedPools = await this.prisma.pool.count({
      where: {
        category: {
          tournamentId,
        },
        tatamiId: {
          not: null,
        },
      },
    });

    if (assignedPools !== pools.length) {
      throw new BadRequestException(
        `Pool assignment incomplete. ${assignedPools} of ${pools.length} pools were assigned.`,
      );
    }

    // ----------------------------------------------------------
    // 8. Return assignment result
    // ----------------------------------------------------------
    return {
      message: "Pools assigned to Tatamis successfully",

      tournamentId,

      mode,

      sequence,

      totalPools: pools.length,

      totalTatamis: tatamis.length,

      assignments,
    };
  }
  
  async deleteTatami(tatamiId: string) {
  const tatami = await this.prisma.tatami.findUnique({
    where: {
      id: tatamiId,
    },
  });

  if (!tatami) {
    throw new BadRequestException(
      "Tatami not found",
    );
  }

  // Remove Tatami assignment from pools first
  await this.prisma.pool.updateMany({
    where: {
      tatamiId,
    },
    data: {
      tatamiId: null,
    },
  });

  await this.prisma.tatami.delete({
    where: {
      id: tatamiId,
    },
  });

  return {
    message: `Tatami ${tatami.number} deleted successfully`,
  };
}
}
