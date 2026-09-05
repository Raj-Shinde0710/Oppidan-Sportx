import { Controller, Get, Param } from '@nestjs/common';
import { IdCardsService } from './id-cards.service';

@Controller('id-cards')
export class IdCardsController {
  constructor(private readonly idCardsService: IdCardsService) {}

  @Get('tournament/:tournamentId')
  async getTournamentIdCards(@Param('tournamentId') tournamentId: string) {
    return this.idCardsService.getTournamentPlayers(tournamentId);
  }
}
