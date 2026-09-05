import { Controller, Get, Param } from "@nestjs/common";
import { ScheduleService } from "./schedule.service";

@Controller("schedule")
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
  ) {}

  @Get(":tournamentId")
async generateSchedule(
  @Param("tournamentId") tournamentId: string,
) {
  console.log("Tournament ID received:", tournamentId);

  return this.scheduleService.generateSchedule(tournamentId);
}
}