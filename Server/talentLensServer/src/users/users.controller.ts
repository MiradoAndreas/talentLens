import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Delete,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/CreateUser.dto';
import { UpdateUserDto } from './dto/UpdateUser.dto';
import mongoose from 'mongoose';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get()
  getUsers() {
    return this.userService.getUsers();
  }

  @Get(':id')
  @UsePipes(new ValidationPipe())
  async getUserById(@Param('id') id: string) {
    const isValid = mongoose.Types.ObjectId.isValid(id);

    if (!isValid) throw new HttpException('User not found', 404);

    const findUser = await this.userService.getUserById(id);

    if (!findUser) throw new HttpException('User not found', 404);

    return findUser;
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe())
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const isValid = mongoose.Types.ObjectId.isValid(id);

    if (!isValid) throw new HttpException('Invalid ID', 404);

    const updateUser = await this.userService.updateUser(id, updateUserDto);

    if (!updateUser) throw new HttpException('User not found', 404);

    return updateUser;
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    const isValid = mongoose.Types.ObjectId.isValid(id);

    if (!isValid) throw new HttpException('Invalid ID', 404);

    const deleteUser = await this.userService.deleteUser(id);
    if (!deleteUser)
      throw new HttpException('User not found or maybe already deleted', 404);

    return deleteUser;
  }
}
