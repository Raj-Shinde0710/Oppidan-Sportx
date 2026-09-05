import { Module } from "@nestjs/common";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { PrismaService } from "../database/prisma.service";

@Module({
  controllers: [ScheduleController],
  providers: [
    ScheduleService,
    PrismaService,
  ],
  exports: [ScheduleService],
})
export class ScheduleModule {}