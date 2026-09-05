import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-categories.dto";

@Controller("tournaments/:tournamentId/categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Param("tournamentId") tournamentId: string, @Body() body: CreateCategoryDto) {
    return this.categoriesService.create({ ...body, tournamentId });
  }

  @Get()
  findAll(@Param("tournamentId") tournamentId: string) {
    return this.categoriesService.findAll(tournamentId);
  }

  @Put(":categoryId")
  update(
    @Param("tournamentId") tournamentId: string,
    @Param("categoryId") categoryId: string,
    @Body() body: CreateCategoryDto,
  ) {
    return this.categoriesService.update(tournamentId, categoryId, body);
  }

  @Delete(":categoryId")
  remove(
    @Param("tournamentId") tournamentId: string,
    @Param("categoryId") categoryId: string,
  ) {
    return this.categoriesService.remove(tournamentId, categoryId);
  }
}
