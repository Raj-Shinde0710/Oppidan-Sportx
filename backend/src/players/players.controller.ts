import { Controller, Get, Post, Body } from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post()
  createPlayer(@Body() dto: CreatePlayerDto) {
    return this.playersService.create(dto);
  }

  @Post('import')
importPlayers(@Body() players: any[]) {
  return this.playersService.importPlayers(players);
}

  @Get()
  getAllPlayers() {
    return this.playersService.findAll();
  }
}



