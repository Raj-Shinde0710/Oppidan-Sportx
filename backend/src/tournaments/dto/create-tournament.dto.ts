import { IsString, IsDateString } from "class-validator";

export class CreateTournamentDto {
  @IsString()
  name: string;

  @IsString()
  level: string;

  @IsString()
  venue: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsDateString()
  registrationOpen: string;

  @IsDateString()
  registrationClose: string;
}
