import { IsString, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  fabric?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
