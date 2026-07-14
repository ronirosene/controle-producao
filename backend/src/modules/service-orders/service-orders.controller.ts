import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';

@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly service: ServiceOrdersService) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.service.findAll({ status, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() dto: CreateServiceOrderDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.create(dto, user?.id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() dto: UpdateServiceOrderDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.update(id, dto, user?.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.remove(id, user?.id);
  }

  @Post(':id/create-production-service')
  @UseGuards(AuthGuard('jwt'))
  createProductionService(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.service.createProductionService(id, user?.id);
  }
}
