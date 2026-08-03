import { IsOptional, IsString, IsInt, IsArray, ValidateNested, Min, IsNumber, IsBoolean, IsDateString, IsIn, MaxLength } from 'class-validator';
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
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
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
  @IsDateString()
  entryDate?: string;

  @IsOptional()
  @IsDateString()
  billingDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDO', 'ENTREGUE', 'CANCELADO', 'AGUARDANDO_FINANCEIRO', 'AGUARDANDO_AUT_CLIENTE', 'AUTORIZADO_CLIENTE'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  finishedImages?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateServiceOrderItemDto)
  items?: UpdateServiceOrderItemDto[];
}
