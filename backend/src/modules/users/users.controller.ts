import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseIntPipe, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { ALL_FEATURES } from '../features';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly service: UsersService) {}

  private checkAdmin(req: any) {
    if (req.user?.email !== 'ronyrosene@gmail.com') {
      throw new ForbiddenException('Apenas ronyrosene@gmail.com pode gerenciar usuários');
    }
  }

  @Get()
  findAll(@Req() req: any) {
    this.checkAdmin(req);
    return this.service.findAll();
  }

  @Get('features')
  getFeatures(@Req() req: any) {
    this.checkAdmin(req);
    return ALL_FEATURES;
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    this.checkAdmin(req);
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string; email: string; password: string; features?: string[] }, @Req() req: any) {
    this.checkAdmin(req);
    return this.service.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; email?: string; password?: string; features?: string[] },
    @Req() req: any,
  ) {
    this.checkAdmin(req);
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    this.checkAdmin(req);
    return this.service.remove(id);
  }

  @Post('fix-features')
  async fixFeatures(@Req() req: any) {
    this.checkAdmin(req);
    return this.service.fixAllFeatures();
  }
}
