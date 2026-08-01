import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { RequireFeatures } from '../../common/auth.decorators';
import { ALL_FEATURES } from '../features';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
@RequireFeatures('ADMIN_USUARIOS')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('features')
  getFeatures() { return ALL_FEATURES; }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: CreateUserDto) { return this.service.create(body); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateUserDto) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }

  @Post('fix-features')
  fixFeatures() { return this.service.fixAllFeatures(); }
}
