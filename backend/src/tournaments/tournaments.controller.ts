import {
  Controller,
  Post,
  Param,
  Get,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Body,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { TournamentsService } from "./tournaments.service";

@Controller("tournaments")
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  // ============================
  // TOURNAMENT CREATION
  // ============================
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "logo", maxCount: 1 },
      { name: "brochure", maxCount: 1 },
    ])
  )
  async create(
    @Body() body: any,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      brochure?: Express.Multer.File[];
    }
  ) {
    return this.tournamentsService.create(body, files);
  }

  // ============================
  // GET ALL TOURNAMENTS
  // ============================
  @Get()
  async getAllTournaments() {
    return this.tournamentsService.findAll();
  }

  // ============================
  // GET TOURNAMENT BY ID
  // ============================
    @Get(":id")
  async getTournamentById(@Param("id") id: string) {
    return this.tournamentsService.getTournamentById(id);
  }

  // ============================
  // DELETE TOURNAMENT
  // ============================
  @Delete(":id")
  async deleteTournament(@Param("id") id: string) {
    return this.tournamentsService.deleteTournament(id);
  }

}