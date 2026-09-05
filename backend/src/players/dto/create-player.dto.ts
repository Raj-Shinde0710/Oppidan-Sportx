import {
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { GenderType } from '@prisma/client';

export class CreatePlayerDto {
  @IsString()
  name!: string;

  @IsEnum(GenderType)
  gender!: GenderType;

  @IsDateString()
  dob!: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  belt?: string;

  @IsUUID()
  tournamentId!: string;

  @IsOptional()
  @IsUUID()
  coachId?: string;

  @IsOptional()
  @IsString()
  club?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;
}