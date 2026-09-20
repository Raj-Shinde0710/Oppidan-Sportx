import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Delete,
  Param,
} from "@nestjs/common";import { TatamiService } from "./tatami.service";

@Controller("tatami") // 🔴 THIS MUST MATCH FRONTEND URL
export class TatamiController {
  constructor(private readonly tatamiService: TatamiService) {}

  @Post()
  createTatamis(
    @Body("tournamentId") tournamentId: string,
    @Body("count") count: number,
  ) {
    return this.tatamiService.createTatamis(tournamentId, count);
  }

  @Get()
  getTatamis(@Query("tournamentId") tournamentId: string) {
    return this.tatamiService.getTatamisByTournament(tournamentId);
  }

    // ============================================================
  // ASSIGN POOLS TO TATAMIS
  // ============================================================
  @Post("assign-pools")
  assignPoolsToTatamis(
    @Body("tournamentId") tournamentId: string,
    @Body("mode") mode: "BOYS" | "GIRLS" | "MIX",
    @Body("sequence")
    sequence: "SENIOR_FIRST" | "JUNIOR_FIRST",
  ) {
    return this.tatamiService.assignPoolsToTatamis(
      tournamentId,
      mode || "MIX",
      sequence || "SENIOR_FIRST",
    );
  }

// ============================================================
// MANUAL ASSIGN CATEGORY TO TATAMI
// ============================================================
@Post("assign-category")
assignCategoryManually(
  @Body("categoryId") categoryId: string,
  @Body("tatamiId") tatamiId: string,
) {
  return this.tatamiService.assignCategoryManually(
    categoryId,
    tatamiId,
  );
}

  @Delete(":id")
deleteTatami(@Param("id") id: string) {
  return this.tatamiService.deleteTatami(id);
}
}
