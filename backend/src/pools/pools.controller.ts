import { Controller, Post, Get, Param, BadRequestException } from '@nestjs/common';
import { PoolsService } from './pools.service';


@Controller('tournaments')
export class PoolsController {
constructor(private readonly poolsService: PoolsService) {}


// 🔥 SCENE 5 ENTRY POINT
@Post(':tournamentId/pools/generate')
async generatePools(@Param('tournamentId') tournamentId: string) {
return this.poolsService.generatePools(tournamentId);
}


// 📖 READ-ONLY POOL VIEW
@Get(':tournamentId/pools')
async getPools(@Param('tournamentId') tournamentId: string) {
return this.poolsService.getPools(tournamentId);
}
}