import { IsIn, IsInt, IsOptional, Min } from "class-validator";

export class UpdateScoreDto {
  @IsOptional()
  @IsIn(["A", "B"])
  player?: "A" | "B";

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  scoreA?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  scoreB?: number;
}
