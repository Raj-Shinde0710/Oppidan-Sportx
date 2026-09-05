import { Module } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { PrismaModule } from '../database/prisma.module';
import { AiModule } from '../ai/ai.module'; // 👈 ADD THIS

@Module({
  imports: [
    PrismaModule,
    AiModule, // 👈 IMPORT HERE
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService],
})
export class TournamentsModule {}
