import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import type { SanitizedUser } from './users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('admin')
  @Get()
  findAll(@Query('search') search?: string): Promise<SanitizedUser[]> {
    if (search) {
      return this.usersService.searchByEmail(search, 20);
    }
    return this.usersService.findAll();
  }

  @Get('me')
  getProfile(@Req() req: RequestWithUser): SanitizedUser {
    return req.user;
  }

  @Roles('admin')
  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<SanitizedUser> {
    return this.usersService.create(createUserDto, { allowAdminRole: true });
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<SanitizedUser> {
    return this.usersService.update(id, updateUserDto, {
      allowRoleChange: true,
    });
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}

