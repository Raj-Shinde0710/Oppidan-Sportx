import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Delete,
  Param,
  UseGuards,
} from "@nestjs/common";
import { TatamiService } from "./tatami.service";
import { TatamiLoginDto } from "./dto/tatami-login.dto";
import { StartMatchDto } from "./dto/start-match.dto";
import { UpdateScoreDto } from "./dto/update-score.dto";
import { MatchResultDto } from "./dto/match-result.dto";
import { TatamiAuthGuard } from "./guards/tatami-auth.guard";
import type { TatamiJwtPayload } from "./guards/tatami-auth.guard";
import { CurrentTatami } from "./decorators/current-tatami.decorator";

@Controller("tatami") // 🔴 THIS MUST MATCH FRONTEND URL
export class TatamiController {
  constructor(private readonly tatamiService: TatamiService) {}

  // ============================================================
  // TATAMI LOGIN
  // ============================================================
  @Post("login")
  login(@Body() loginDto: TatamiLoginDto) {
    return this.tatamiService.login(loginDto);
  }

  // ============================================================
  // GET AUTHENTICATED TATAMI PROFILE (PROTECTED)
  // ============================================================
  @Get("me")
  @UseGuards(TatamiAuthGuard)
  getProfile(@CurrentTatami() user: TatamiJwtPayload) {
    return {
      tatami: user,
    };
  }

  // ============================================================
  // GET AUTHENTICATED TATAMI DASHBOARD (PROTECTED)
  // ============================================================
  @Get("dashboard")
  @UseGuards(TatamiAuthGuard)
  getDashboard(@CurrentTatami("tatamiId") tatamiId: string) {
    return this.tatamiService.getDashboardData(tatamiId);
  }

  // ============================================================
  // MATCH CONTROL: GET MATCH DETAILS (PROTECTED)
  // ============================================================
  @Get("matches/:matchId")
  @UseGuards(TatamiAuthGuard)
  getMatchDetails(
    @Param("matchId") matchId: string,
    @CurrentTatami("tatamiId") tatamiId: string,
  ) {
    return this.tatamiService.getMatchDetails(matchId, tatamiId);
  }

  // ============================================================
  // MATCH CONTROL: START MATCH (PROTECTED)
  // ============================================================
  @Post("matches/:matchId/start")
  @UseGuards(TatamiAuthGuard)
  startMatch(
    @Param("matchId") matchId: string,
    @Body() dto: StartMatchDto,
    @CurrentTatami("tatamiId") tatamiId: string,
  ) {
    return this.tatamiService.startMatch(matchId, tatamiId, dto.durationSeconds);
  }

  // ============================================================
  // MATCH CONTROL: UPDATE SCORE (PROTECTED)
  // ============================================================
  @Post("matches/:matchId/score")
  @UseGuards(TatamiAuthGuard)
  updateScore(
    @Param("matchId") matchId: string,
    @Body() dto: UpdateScoreDto,
    @CurrentTatami("tatamiId") tatamiId: string,
  ) {
    return this.tatamiService.updateScore(matchId, tatamiId, dto);
  }

  // ============================================================
  // MATCH CONTROL: SUBMIT MATCH RESULT & ADVANCE (PROTECTED)
  // ============================================================
  @Post("matches/:matchId/result")
  @UseGuards(TatamiAuthGuard)
  submitMatchResult(
    @Param("matchId") matchId: string,
    @Body() dto: MatchResultDto,
    @CurrentTatami("tatamiId") tatamiId: string,
  ) {
    return this.tatamiService.submitMatchResult(matchId, tatamiId, dto.winnerId);
  }

  // ============================================================
  // MATCH CONTROL: REMATCH (PROTECTED)
  // ============================================================
  @Post("matches/:matchId/rematch")
  @UseGuards(TatamiAuthGuard)
  rematch(
    @Param("matchId") matchId: string,
    @CurrentTatami("tatamiId") tatamiId: string,
  ) {
    return this.tatamiService.rematch(matchId, tatamiId);
  }

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

  // ============================================================
  // RESET / REGENERATE TATAMI PASSWORD
  // ============================================================
  @Post(":id/reset-password")
  resetPassword(
    @Param("id") id: string,
    @Body("newPassword") newPassword?: string,
  ) {
    return this.tatamiService.resetPassword(id, newPassword);
  }

  @Delete(":id")
  deleteTatami(@Param("id") id: string) {
    return this.tatamiService.deleteTatami(id);
  }
}


