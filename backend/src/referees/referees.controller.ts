import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { RefereesService } from "./referees.service";
import { CreateRefereeDto } from "./dto/create-referee.dto";

@Controller("referees")
export class RefereesController {
  constructor(private readonly refereesService: RefereesService) {}

  @Get()
  findAll() {
    return this.refereesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateRefereeDto) {
    return this.refereesService.create(dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.refereesService.remove(id);
  }
}