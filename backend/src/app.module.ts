import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { PlayersModule } from './players/players.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { AiModule } from './ai/ai.module';
import { CategoriesModule } from './categories/categories.module';
import { TatamiModule } from './tatami/tatami.module';
import { PoolsModule } from './pools/pools.module';
import { IdCardsModule } from './id-cards/id-cards.module';
import { VerifyModule } from './verify/verify.module';
import { ScheduleModule } from "./schedule/schedule.module";
import { RefereesModule } from "./referees/referees.module";


@Module({
  imports: [
    PrismaModule,
    ScheduleModule,
    TatamiModule,
    PlayersModule,
    PoolsModule,
    CategoriesModule,
    TournamentsModule,
    IdCardsModule,
    VerifyModule,
    AiModule,
    RefereesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
