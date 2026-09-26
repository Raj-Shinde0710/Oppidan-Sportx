import { IsNotEmpty, IsString } from "class-validator";

export class MatchResultDto {
  @IsString()
  @IsNotEmpty()
  winnerId: string;
}
