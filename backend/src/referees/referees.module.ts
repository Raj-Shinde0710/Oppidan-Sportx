import { Module } from "@nestjs/common";
import { RefereesController } from "./referees.controller";
import { RefereesService } from "./referees.service";
import { PrismaService } from "src/database/prisma.service";

@Module({
  controllers: [RefereesController],
  providers: [RefereesService, PrismaService],
  exports: [RefereesService],
})
export class RefereesModule {}