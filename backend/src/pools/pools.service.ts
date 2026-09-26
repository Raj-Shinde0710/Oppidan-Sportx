import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import axios from "axios";

console.log("******** POOLS SERVICE FILE LOADED ********");

@Injectable()
export class PoolsService {
  constructor(private prisma: PrismaService) {}

  async generatePools(tournamentId: string) {
    console.log("========== GENERATE POOLS START ==========");
    // ============================================================
    // 🔥 STEP 0 — CLEAN PREVIOUS GENERATION
    // ============================================================
    await this.prisma.match.deleteMany({
      where: { pool: { category: { tournamentId } } },
    });

    await this.prisma.pool.deleteMany({
      where: { category: { tournamentId } },
    });

   // ============================================================
// 🔹 FETCH TOURNAMENT + PLAYERS
// ============================================================
const tournament = await this.prisma.tournament.findUnique({
  where: { id: tournamentId },
  include: {
    players: {
      include: {
        profile: true,
      },
    },
  },
});

if (!tournament || tournament.players.length === 0) {
  throw new BadRequestException("No players found");
}
    // ============================================================
    // 🔹 FETCH CATEGORIES + WEIGHTS
    // ============================================================
    const categories = await this.prisma.category.findMany({
      where: { tournamentId },
      include: { weights: true },
    });
    console.log("=================================");
console.log("Tournament ID:", tournamentId);
console.log("Categories Found:", categories.length);

categories.forEach((c) => {
  console.log({
    id: c.id,
    name: c.name,
    type: c.type,
    gender: c.gender,
    minAge: c.minAge,
    maxAge: c.maxAge,
  });
});

console.log("=================================");
    const tatamiCount = await this.prisma.tatami.count({
      where: { tournamentId },
    });
    const effectiveTatamiCount = Math.max(tatamiCount, 1);

    // ============================================================
    // 🔁 CATEGORY-WISE POOL GENERATION
    // ============================================================
    for (const category of categories) {
      const tournamentDate = tournament.startDate ?? new Date();

      const categoryPlayers = tournament.players.filter((p) => {
        if (!p.gender || !p.dob) return false;
        return this.isPlayerInCategory(p, category, tournamentDate);
      });

      console.log("CATEGORY:", category.name);
      console.log("TYPE:", category.type);
      console.log("PLAYERS FOUND:", categoryPlayers.length);

      if (categoryPlayers.length === 0) continue;

      const categoryPlayerLookup = new Map(
        categoryPlayers.map((player) => [
          player.name.trim().toUpperCase(),
          {
            player,
            age: this.calculateAge(player.dob, tournamentDate),
          },
        ]),
      );

      if (categoryPlayers.length === 1) {
        const soloPlayer = categoryPlayers[0];
        const pool = await this.prisma.pool.create({
          data: {
            name: "POOL_1",
            categoryId: category.id,
            aiGroupKey: `${category.name} | BYE`,
          },
        });

        await this.prisma.match.create({
          data: {
            poolId: pool.id,
            round: 1,
            tatami: 1,
            playerAId: soloPlayer.id,
            playerBId: soloPlayer.id,
          },
        });

        continue;
      }

      // 🆕 Build policy weight categories for Kumite
      let weightCategories: number[][] = [];

if (category.type !== "KATA") {
  weightCategories = category.weights.map(w => [
    Number(w.minWeight),
    Number(w.maxWeight),
  ]);
}

console.log("====================================");
console.log("Category:", category.name);
console.log("Type:", category.type);
console.log("Age:", category.minAge, "-", category.maxAge);

      console.log("Weights:", weightCategories);
      console.log("Players found:", categoryPlayers.length);

      categoryPlayers.forEach((p) => {
        console.log({
          name: p.name,
          age: this.calculateAge(p.dob, tournamentDate),
    weight: p.weight,
    belt: p.belt,
    gender: p.gender,
  });
});

console.log("====================================");

// ============================================================
// 🤖 CALL AI ENGINE
// ============================================================
let data;
console.log(
  JSON.stringify(
    {
      players: categoryPlayers.map((p) => ({
        name: p.name,
        age: this.calculateAge(p.dob, tournamentDate),
        weight: Number(p.weight),
        gender: p.gender,
      })),
      minAge: category.minAge,
      maxAge: category.maxAge,
      weightCategories,
    },
    null,
    2
  )
);

try {
  const response = await axios.post(
    "http://localhost:8000/generate-pools",
    {
      players: categoryPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        age: this.calculateAge(p.dob, tournamentDate),
        gender: p.gender.trim().toUpperCase(),
        weight: Number(p.weight),
        belt: p.belt,

        // ⭐ REAL PARTICIPANT DETAILS
        club: p.profile?.club || "",
        city: p.profile?.city || "",
        state: p.profile?.state || "",
      })),
      playersPerPool:
        category.playersPerPool && category.playersPerPool > 0
          ? category.playersPerPool
          : 4,
      tatamiCount: effectiveTatamiCount,
      weightCategories:
        category.type === "KATA" ? [] : weightCategories,
      minAge: category.minAge,
      maxAge: category.maxAge,
      eventType: category.type,

      // ⭐ Pool Generation Mode
      sortByBelt: category.sortByBelt,

      // ⭐ Tournament Level (DISTRICT / STATE / NATIONAL / INTERNATIONAL)
      tournamentLevel: tournament.level,
    }
  );

  data = response.data;
} catch (error) {
  console.log("========== AI ENGINE ERROR ==========");

  console.log("Message:", error.message);

  console.log("Response:", error.response?.data);

  console.log("Status:", error.response?.status);

  console.log("Falling back to local pool generation");

  data = this.generatePoolsLocally({
    players: categoryPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      age: this.calculateAge(p.dob, tournamentDate),
      gender: p.gender.trim().toUpperCase(),
      weight: Number(p.weight),
      belt: p.belt,
      club: p.coachId || "NA",
    })),
    playersPerPool: category.playersPerPool,
    tatamiCount: effectiveTatamiCount,
    weightCategories: category.type === "KATA" ? [] : weightCategories,
    minAge: category.minAge,
    maxAge: category.maxAge,
    eventType: category.type,
    sortByBelt: category.sortByBelt,
  });
}

      console.log("🧠 FULL AI RESPONSE ↓↓↓");
console.log(JSON.stringify(data, null, 2));


      const sortedGroupEntries = this.sortGroupEntries(
        Object.entries<any>(data.groups),
        category.type,
      );

      let poolIndex = 1;

      for (const [groupKey, group] of sortedGroupEntries) {
        if (!group.pools) continue;

        const normalizedGroupKey = groupKey.replace(/\s+/g, " ").trim();

        const sortedPoolEntries = Object.entries<any>(group.pools).sort(
          ([a], [b]) => {
            const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
            return numA - numB;
          },
        );

        for (const [, poolData] of sortedPoolEntries) {
          const poolName = `POOL_${poolIndex++}`;
          // =====================================================
          // 🥋 KATA HANDLING (POOLING ONLY — NO SCORES)
          // =====================================================
                    if (category.type === "KATA") {
            if (!poolData.rounds || poolData.rounds.length === 0) {
              console.log("❌ EMPTY KATA POOL FROM AI:", poolName);
              continue;
            }

            const matches = poolData.rounds[0].matches || [];
            const validMatches = matches.filter((match) => {
              const playerName = match.players?.[0];
              if (!playerName) return false;

              const candidate = categoryPlayerLookup.get(
                playerName.trim().toUpperCase(),
              );
              if (!candidate) return false;

              const age = candidate.age;
              if (category.minAge === category.maxAge) {
                return age === category.minAge;
              }

              return age >= category.minAge && age <= category.maxAge;
            });

            if (validMatches.length === 0) {
              console.log("❌ EMPTY KATA MATCH LIST:", poolName);
              continue;
            }

            console.log(
              "✅ KATA POOL:",
              poolName,
              validMatches.map((m) => m.players[0]),
            );

            const pool = await this.prisma.pool.create({
              data: {
                name: poolName,
                categoryId: category.id,
                aiGroupKey: normalizedGroupKey,
              },
            });

            let order = 1;

            for (const match of validMatches) {
              const playerName = match.players[0];

              const playerEntry = categoryPlayerLookup.get(
                playerName.trim().toUpperCase(),
              );

              if (!playerEntry) continue;

              await this.prisma.match.create({
                data: {
                  poolId: pool.id,
                  round: order++,
                  tatami: match.tatami,
                  playerAId: playerEntry.player.id,
                  playerBId: playerEntry.player.id,
                },
              });
            }

            continue;
          }

          // =====================================================
          // 🥊 KUMITE LOGIC (ABSOLUTELY UNCHANGED)
          // =====================================================
          const validRounds = [] as Array<{
            round: number;
            matches: Array<{
              tatami: number;
              players: string[];
              status: string;
              referees: string[];
            }>;
          }>;

          for (const round of poolData.rounds) {
            const validMatches = [] as Array<{
              tatami: number;
              players: string[];
              status: string;
              referees: string[];
            }>;

            for (const match of round.matches) {
              if (!match.players || match.players.length === 0) continue;

              const cleanedPlayers = match.players
                .map((name) => name?.trim())
                .filter((name) => {
                  if (!name) return false;
                  const key = name.toUpperCase();
                  const candidate = categoryPlayerLookup.get(key);
                  return (
                    candidate !== undefined &&
                    candidate.age >= category.minAge &&
                    candidate.age <= category.maxAge
                  );
                }) as string[];

              if (cleanedPlayers.length === 0) continue;

              if (cleanedPlayers.length === 1) {
                validMatches.push({
                  tatami: match.tatami,
                  players: [cleanedPlayers[0]],
                  status: "BYE",
                  referees: [],
                });
                continue;
              }

              validMatches.push({
                tatami: match.tatami,
                players: [cleanedPlayers[0], cleanedPlayers[1]],
                status: "PENDING",
                referees: [],
              });
            }

            if (validMatches.length > 0) {
              validRounds.push({
                round: round.round,
                matches: validMatches,
              });
            }
          }

          if (validRounds.length === 0) {
            continue;
          }

          const pool = await this.prisma.pool.create({
            data: {
              name: poolName,
              categoryId: category.id,
              aiGroupKey: normalizedGroupKey,
            },
          });

          for (const round of validRounds) {
            for (const match of round.matches) {
              const playerAName = match.players[0].trim();
              const playerAEntry = categoryPlayerLookup.get(playerAName.toUpperCase());

              if (!playerAEntry) continue;
              const playerA = playerAEntry.player;

              if (match.players.length === 1) {
                await this.prisma.match.create({
                  data: {
                    poolId: pool.id,
                    round: round.round,
                    tatami: match.tatami,
                    playerAId: playerA.id,
                    playerBId: playerA.id,
                  },
                });
                continue;
              }

              const playerBName = match.players[1].trim();
              const playerBEntry = categoryPlayerLookup.get(playerBName.toUpperCase());

              if (!playerBEntry) continue;
              const playerB = playerBEntry.player;

              await this.prisma.match.create({
                data: {
                  poolId: pool.id,
                  round: round.round,
                  tatami: match.tatami,
                  playerAId: playerA.id,
                  playerBId: playerB.id,
                },
              });
            }
          }
        }
      }
    }

    return { message: "Pools generated successfully" };
  }

  async getPools(tournamentId: string) {
    return this.prisma.tournament.findUnique({
      where: { id: tournamentId },
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
      },
    });
  }

  private calculateAge(dob: Date, onDate: Date = new Date()) {
    let age = onDate.getFullYear() - dob.getFullYear();
    const m = onDate.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && onDate.getDate() < dob.getDate())) age--;
    return age;
  }

  private isPlayerInCategory(player: any, category: any, tournamentDate: Date) {
    const playerGender = player.gender.trim().toUpperCase();
    const categoryGender = category.gender.trim().toUpperCase();

    if (categoryGender !== "BOTH" && playerGender !== categoryGender) {
      return false;
    }

    const age = this.calculateAge(player.dob, tournamentDate);
    if (category.minAge === category.maxAge) {
      if (age !== category.minAge) return false;
    } else if (age < category.minAge || age > category.maxAge) {
      return false;
    }

    if (category.type === "KATA") {
      return true;
    }

    const weight = Number(player.weight);
    if (Number.isNaN(weight)) return false;

    return category.weights.some(
      (w) => weight >= w.minWeight && weight <= w.maxWeight,
    );
  }

  private generatePoolsLocally(payload: {
  players: Array<{
    id: string;
    name: string;
    age: number;
    gender: string;
    weight: number;
    belt: string;
    club: string;
  }>;
  playersPerPool: number;
  tatamiCount: number;
  weightCategories: number[][];
  minAge: number;
  maxAge: number;
  eventType: string;
  sortByBelt: boolean;
}) {
  const groups: Record<string, any[]> = {};
  const ageGroup = `${payload.minAge}-${payload.maxAge}`;
  const playersPerPool = Math.max(payload.playersPerPool, 1);
  let tatami = 1;

  const validPlayers = payload.players.filter((player) => {
    return (
      player.age >= payload.minAge &&
      player.age <= payload.maxAge
    );
  });

  // ===================================================
  // GROUP PLAYERS
  // ===================================================

  for (const player of validPlayers) {
    let groupKey = "";

    if (payload.eventType === "KATA") {
      if (payload.sortByBelt) {
        // STRICT BELTWISE
        groupKey = `${player.gender} | ${ageGroup} | ${player.belt
          .trim()
          .toUpperCase()} | KATA`;
      } else {
        // RANDOM (NO BELT)
        groupKey = `${player.gender} | ${ageGroup} | KATA`;
      }
    } else {
      if (payload.sortByBelt) {
        // STRICT BELTWISE
        groupKey = `${player.gender} | ${this.getBeltLevel(
          player.belt,
        )} | ${ageGroup} | ${this.getWeightGroup(
          player.weight,
          payload.weightCategories,
        )}`;
      } else {
        // RANDOM (NO BELT)
        groupKey = `${player.gender} | ${ageGroup} | ${this.getWeightGroup(
          player.weight,
          payload.weightCategories,
        )}`;
      }
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push(player);
  }

  // ===================================================
  // CREATE POOLS
  // ===================================================

  const output = { groups: {} as any };

  const sortedGroupEntries = this.sortGroupEntries(
    Object.entries(groups),
    payload.eventType,
  );

  let poolIndex = 1;

  for (const [groupKey, players] of sortedGroupEntries) {
    output.groups[groupKey] = {
      pools: {},
    };

    for (let i = 0; i < players.length; i += playersPerPool) {
      const poolPlayers = players.slice(i, i + playersPerPool);

      const poolName = `POOL_${poolIndex++}`;

      // ==========================================
      // KATA
      // ==========================================

      if (payload.eventType === "KATA") {
        const matches = poolPlayers.map((player) => {
          const match = {
            tatami,
            players: [player.name],
            status: "PENDING",
            referees: [],
          };

          tatami = (tatami % payload.tatamiCount) + 1;

          return match;
        });

        output.groups[groupKey].pools[poolName] = {
          rounds: [
            {
              round: 1,
              matches,
            },
          ],
        };

        continue;
      }

      // ==========================================
      // KUMITE
      // ==========================================

      const matches: Array<{
        tatami: number;
        players: string[];
        status: string;
        referees: string[];
      }> = [];

      const remainingPlayers = [...poolPlayers];

      if (remainingPlayers.length % 2 === 1) {
        const byePlayer = remainingPlayers.pop();

        matches.push({
          tatami,
          players: [byePlayer!.name],
          status: "BYE",
          referees: [],
        });

        tatami = (tatami % payload.tatamiCount) + 1;
      }

      for (let j = 0; j < remainingPlayers.length; j += 2) {
        matches.push({
          tatami,
          players: [
            remainingPlayers[j].name,
            remainingPlayers[j + 1].name,
          ],
          status: "PENDING",
          referees: [],
        });

        tatami = (tatami % payload.tatamiCount) + 1;
      }

      if (matches.length === 0) {
        continue;
      }

      output.groups[groupKey].pools[poolName] = {
        rounds: [
          {
            round: 1,
            matches,
          },
        ],
      };
    }
  }

  return output;
}

  private getWeightGroup(weight: number, weightCategories: number[][]) {
    for (const [minWeight, maxWeight] of weightCategories) {
      if (weight >= minWeight && weight <= maxWeight) {
        return `${minWeight}-${maxWeight}`;
      }
    }

    return "UNASSIGNED";
  }

  private getBeltLevel(belt: string) {
    const normalizedBelt = belt?.trim().toLowerCase();

    if (["orange", "green", "blue"].includes(normalizedBelt)) {
      return "INTERMEDIATE";
    }

    if (["brown", "black"].includes(normalizedBelt)) {
      return "ADVANCED";
    }

    return "BEGINNER";
  }

  private extractLowerWeight(weightStr: string): number {
    if (!weightStr || typeof weightStr !== "string") {
      return Number.POSITIVE_INFINITY;
    }
    const clean = weightStr.trim().replace(/[–—]/g, "-");

    // Match "21-25", "21 - 25", "21.5-25.5", "21-25 kg", etc.
    const rangeMatch = clean.match(
      /^([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)/,
    );
    if (rangeMatch) {
      const val = parseFloat(rangeMatch[1]);
      return isNaN(val) ? Number.POSITIVE_INFINITY : val;
    }

    // Match "+80", ">80", "80+"
    const plusMatch = clean.match(
      /(?:\+|>=?|>)\s*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*\+/,
    );
    if (plusMatch) {
      const val = parseFloat(plusMatch[1] || plusMatch[2]);
      return isNaN(val) ? Number.POSITIVE_INFINITY : val;
    }

    // Match "-60", "<60", "<=60" (meaning under 60 kg)
    const underMatch = clean.match(/^(?:-|<|<=)\s*([0-9]+(?:\.[0-9]+)?)/);
    if (underMatch) {
      return 0;
    }

    // Match any standalone number
    const numMatch = clean.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (numMatch) {
      const val = parseFloat(numMatch[1]);
      return isNaN(val) ? Number.POSITIVE_INFINITY : val;
    }

    return Number.POSITIVE_INFINITY;
  }

  private extractUpperWeight(weightStr: string): number {
    if (!weightStr || typeof weightStr !== "string") {
      return Number.POSITIVE_INFINITY;
    }
    const clean = weightStr.trim().replace(/[–—]/g, "-");

    const rangeMatch = clean.match(
      /^([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)/,
    );
    if (rangeMatch) {
      const val = parseFloat(rangeMatch[2]);
      return isNaN(val) ? Number.POSITIVE_INFINITY : val;
    }

    const underMatch = clean.match(/^(?:-|<|<=)\s*([0-9]+(?:\.[0-9]+)?)/);
    if (underMatch) {
      const val = parseFloat(underMatch[1]);
      return isNaN(val) ? Number.POSITIVE_INFINITY : val;
    }

    return this.extractLowerWeight(weightStr);
  }

  private sortGroupEntries<T>(
    entries: [string, T][],
    eventType: string,
  ): [string, T][] {
    if (eventType === "KATA") {
      return entries;
    }

    const prefixFirstSeen = new Map<string, number>();
    entries.forEach(([key], index) => {
      const parts = key.split("|").map((s) => s.trim());
      const prefix = parts.length > 1 ? parts.slice(0, -1).join(" | ") : key;
      if (!prefixFirstSeen.has(prefix)) {
        prefixFirstSeen.set(prefix, index);
      }
    });

    return [...entries].sort(([keyA], [keyB]) => {
      const partsA = keyA.split("|").map((s) => s.trim());
      const partsB = keyB.split("|").map((s) => s.trim());

      if (partsA.length <= 1 || partsB.length <= 1) {
        return 0;
      }

      const prefixA = partsA.slice(0, -1).join(" | ");
      const prefixB = partsB.slice(0, -1).join(" | ");

      // Preserve non-weight grouping order (gender, belt, age)
      if (prefixA !== prefixB) {
        return (
          (prefixFirstSeen.get(prefixA) ?? 0) -
          (prefixFirstSeen.get(prefixB) ?? 0)
        );
      }

      const weightA = partsA[partsA.length - 1];
      const weightB = partsB[partsB.length - 1];

      const lowerA = this.extractLowerWeight(weightA);
      const lowerB = this.extractLowerWeight(weightB);

      if (lowerA !== lowerB) {
        return lowerA - lowerB;
      }

      const upperA = this.extractUpperWeight(weightA);
      const upperB = this.extractUpperWeight(weightB);

      if (upperA !== upperB) {
        return upperA - upperB;
      }

      return weightA.localeCompare(weightB);
    });
  }
}
