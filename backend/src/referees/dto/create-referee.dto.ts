import { IsNotEmpty, IsString } from "class-validator";

export class CreateRefereeDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}