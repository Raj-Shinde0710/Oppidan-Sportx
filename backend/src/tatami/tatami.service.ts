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
}
