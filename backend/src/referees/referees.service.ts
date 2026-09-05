import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/database/prisma.service";
import { CreateRefereeDto } from "./dto/create-referee.dto";

@Injectable()
export class RefereesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.referee.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  async create(dto: CreateRefereeDto) {
    const existing = await this.prisma.referee.findUnique({
      where: {
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        "A referee with this name already exists",
      );
    }

    return this.prisma.referee.create({
      data: {
        name: dto.name,
      },
    });
  }

  async remove(id: string) {
    const referee = await this.prisma.referee.findUnique({
      where: {
        id,
      },
    });

    if (!referee) {
      throw new NotFoundException("Referee not found");
    }

    return this.prisma.referee.delete({
      where: {
        id,
      },
    });
  }
}