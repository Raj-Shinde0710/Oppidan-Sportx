import { Module } from "@nestjs/common";
import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import { PrismaModule } from "src/database/prisma.module";
import { PrismaService } from "src/database/prisma.service";
@Module({
  imports:[PrismaModule],
  controllers: [CategoriesController],
  providers: [CategoriesService,PrismaService],
})
export class CategoriesModule {}
