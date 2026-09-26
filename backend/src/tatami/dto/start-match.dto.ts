import { IsInt, Max, Min } from "class-validator";

export class StartMatchDto {
  @IsInt()
  @Min(1)
  @Max(600)
  durationSeconds: number;
}
