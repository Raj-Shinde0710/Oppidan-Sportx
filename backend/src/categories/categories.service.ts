import { Injectable, NotFoundException } from "@nestjs/common";
import { CategoryType } from "@prisma/client";
import { PrismaService } from "src/database/prisma.service";
import { CreateCategoryDto } from "./dto/create-categories.dto";

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto & { tournamentId: string }) {
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        minAge: dto.minAge,
        maxAge: dto.maxAge,
        gender: dto.gender,
        type: dto.type,
        playersPerPool: dto.playersPerPool,

        // ⭐ NEW
        sortByBelt: dto.sortByBelt ?? false,

        level: dto.level ?? "",

        tournament: {
          connect: {
            id: dto.tournamentId,
          },
        },
      },
      include: {
        weights: true,
      },
    });

    if (dto.type === CategoryType.KUMITE && dto.weights?.length) {
      await this.prisma.categoryWeight.createMany({
        data: dto.weights.map((w) => ({
          minWeight: Number(w.minWeight),
          maxWeight: Number(w.maxWeight),
          categoryId: category.id,
        })),
      });
    }

    return this.findOne(dto.tournamentId, category.id);
  }

  findAll(tournamentId: string) {
    return this.prisma.category.findMany({
      where: { tournamentId },
      include: {
        weights: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(
    tournamentId: string,
    categoryId: string,
    dto: CreateCategoryDto,
  ) {
    await this.ensureCategoryExists(tournamentId, categoryId);

    await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name,
        minAge: dto.minAge,
        maxAge: dto.maxAge,
        gender: dto.gender,
        type: dto.type,
        playersPerPool: dto.playersPerPool,

        // ⭐ NEW
        sortByBelt: dto.sortByBelt ?? false,

        level: dto.level ?? "",
      },
    });

    await this.prisma.categoryWeight.deleteMany({
      where: { categoryId },
    });

    if (dto.type === CategoryType.KUMITE && dto.weights?.length) {
      await this.prisma.categoryWeight.createMany({
        data: dto.weights.map((w) => ({
          minWeight: Number(w.minWeight),
          maxWeight: Number(w.maxWeight),
          categoryId,
        })),
      });
    }

    return this.findOne(tournamentId, categoryId);
  }

  async remove(tournamentId: string, categoryId: string) {
    await this.ensureCategoryExists(tournamentId, categoryId);

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    return { message: "Category deleted successfully" };
  }

  private findOne(tournamentId: string, categoryId: string) {
    return this.prisma.category.findFirst({
      where: {
        id: categoryId,
        tournamentId,
      },
      include: {
        weights: true,
      },
    });
  }

  private async ensureCategoryExists(
    tournamentId: string,
    categoryId: string,
  ) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        tournamentId,
      },
    });

    if (!category) {
      throw new NotFoundException(
        "Category not found for this tournament",
      );
    }
  }
}