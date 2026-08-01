import { IsString, IsOptional, IsInt, IsArray, ValidateNested, Min, IsNumber, IsBoolean, IsDateString, MaxLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceOrderItemDto {
  @IsString()
  @MaxLength(160)
  productName: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  productColor?: string;

  @IsOptional()
  @IsString()
  productFabric?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsString()
  problemDesc: string;

  @IsOptional()
  @IsString()
  images?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  chargeable?: boolean;
}

export class CreateServiceOrderDto {
  @IsOptional()
  @IsInt()
  pedido?: number;

  @IsString()
  @MaxLength(160)
  customerName: string;

  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @IsOptional()
  @IsDateString()
  billingDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderItemDto)
  items: CreateServiceOrderItemDto[];
}
