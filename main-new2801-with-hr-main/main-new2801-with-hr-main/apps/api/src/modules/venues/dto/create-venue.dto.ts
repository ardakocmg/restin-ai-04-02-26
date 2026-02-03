import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { VenueType, ServiceStyle } from '@prisma/client';

export class CreateVenueDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(VenueType)
  type: VenueType;

  @IsEnum(ServiceStyle)
  serviceStyle: ServiceStyle;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsObject()
  @IsOptional()
  config?: any;
}
