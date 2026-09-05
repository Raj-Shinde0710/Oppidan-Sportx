import { Module } from '@nestjs/common';
import { IdCardsController } from './id-cards.controller';
import { IdCardsService } from './id-cards.service';
import { PrismaService } from "../database/prisma.service";

@Module({
  controllers: [IdCardsController],
  providers: [IdCardsService, PrismaService],
})
export class IdCardsModule {}
