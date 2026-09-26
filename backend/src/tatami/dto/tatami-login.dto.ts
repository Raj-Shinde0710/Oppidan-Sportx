import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class TatamiLoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  tournamentId?: string;
}
