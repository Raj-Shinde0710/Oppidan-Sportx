import { Module } from '@nestjs/common';
import { VerifyController } from './verify.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [VerifyController],
  providers: [PrismaService],
})
export class VerifyModule {}
