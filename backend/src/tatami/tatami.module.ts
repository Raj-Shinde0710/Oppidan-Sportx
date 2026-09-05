import { Module } from "@nestjs/common";
import { TatamiController } from "./tatami.controller";
import { TatamiService } from "./tatami.service";
import { PrismaService } from "../database/prisma.service";

@Module({
  controllers: [TatamiController],
  providers: [TatamiService, PrismaService],
})
export class TatamiModule {}
