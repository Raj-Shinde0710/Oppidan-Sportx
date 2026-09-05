import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async generateSchedule(tournamentId: string) {
    // Tournament
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        tatamis: {
          orderBy: {
            number: "asc",
          },
        },

        categories: {
          include: {
            pools: {
              include: {
                matches: {
                  include: {
                    playerA: true,
                    playerB: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new Error("Tournament not found");
    }

    //--------------------------------------------------------
    // Start Time
    //--------------------------------------------------------

    let currentMinutes = 9 * 60 + 45;

    const schedule: any[] = [];

    schedule.push({
      start: "09:00 AM",
      end: "09:45 AM",
      event: "INAUGURATION",
      tatami: "-",
    });

    //--------------------------------------------------------
    // Every Karate Policy
    //--------------------------------------------------------

    for (const category of tournament.categories) {

      const pools = category.pools;

      if (!pools.length) continue;

      //--------------------------------------------------------
      // Determine number of matches
      //--------------------------------------------------------

      let totalMatches = 0;

      if (category.type === "KATA") {

        for (const pool of pools) {
          totalMatches += pool.matches.length;
        }

      } else {

        totalMatches = pools.length * 3;

      }

      //--------------------------------------------------------
      // Duration
      //--------------------------------------------------------

      const duration = totalMatches;

      const start = this.minutesToTime(currentMinutes);

      const end = this.minutesToTime(currentMinutes + duration);

      //--------------------------------------------------------
      // Tatami Allocation
      //--------------------------------------------------------

      const tatamiNames =
        tournament.tatamis.length === 0
          ? ["Tatami 1"]
          : tournament.tatamis.map(
              (t) => `Tatami ${t.number}`
            );

      schedule.push({
        start,
        end,
        event: category.name,
        tatami: tatamiNames.join(", "),
        duration,
        pools: pools.length,
        matches: totalMatches,
      });

      //--------------------------------------------------------
      // 15 Minute Break
      //--------------------------------------------------------

      currentMinutes += duration;

      schedule.push({
        start: this.minutesToTime(currentMinutes),
        end: this.minutesToTime(currentMinutes + 15),
        event: "BREAK",
        tatami: "-",
      });

      currentMinutes += 15;
    }

    return schedule;
  }

  //--------------------------------------------------------
  // Helper
  //--------------------------------------------------------

  private minutesToTime(totalMinutes: number) {

    let hour = Math.floor(totalMinutes / 60);

    let minute = totalMinutes % 60;

    let ampm = hour >= 12 ? "PM" : "AM";

    if (hour > 12) hour -= 12;

    if (hour === 0) hour = 12;

    return `${hour}:${minute
      .toString()
      .padStart(2, "0")} ${ampm}`;
  }
}