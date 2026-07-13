import { IsString, IsOptional, IsInt, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceOrderItemDto {
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
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
  price?: number;

  @IsOptional()
  chargeable?: boolean;
}

export class CreateServiceOrderDto {
  @IsOptional()
  @IsInt()
  pedido?: number;

  @IsString()
  customerName: string;

  @IsOptional()
  entryDate?: string;

  @IsOptional()
  billingDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderItemDto)
  items: CreateServiceOrderItemDto[];
}
