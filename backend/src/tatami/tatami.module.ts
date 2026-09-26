import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TatamiController } from "./tatami.controller";
import { TatamiService } from "./tatami.service";
import { PrismaService } from "../database/prisma.service";
import { TatamiAuthGuard } from "./guards/tatami-auth.guard";

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        "sports_ai_platform_jwt_super_secret_key_2026",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [TatamiController],
  providers: [TatamiService, PrismaService, TatamiAuthGuard],
  exports: [TatamiService, JwtModule, TatamiAuthGuard],
})
export class TatamiModule {}

