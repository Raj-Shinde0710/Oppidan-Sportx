import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { GenderType, CategoryType } from "@prisma/client";

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  minAge: number;

  @IsInt()
  maxAge: number;

  @IsEnum(GenderType)
  gender: GenderType = GenderType.BOTH;

  @IsEnum(CategoryType)
  type: CategoryType;

  @IsInt()
  playersPerPool: number;

  // ⭐ NEW FIELD
  @IsOptional()
  @IsBoolean()
  sortByBelt?: boolean;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsArray()
  weights?: {
    minWeight: number;
    maxWeight: number;
  }[];
}