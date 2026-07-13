import { IsOptional, IsString, IsInt, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateServiceOrderItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  productName?: string;

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

  @IsOptional()
  @IsString()
  problemDesc?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  images?: string;

  @IsOptional()
  @IsString()
  _delete?: string;

  @IsOptional()
  price?: number;

  @IsOptional()
  chargeable?: boolean;
}

export class UpdateServiceOrderDto {
  @IsOptional()
  @IsInt()
  pedido?: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  entryDate?: string;

  @IsOptional()
  billingDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateServiceOrderItemDto)
  items?: UpdateServiceOrderItemDto[];
}
