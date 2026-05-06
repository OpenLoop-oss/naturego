import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, GetUsersDto, ChangePasswordDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../../config/interface';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Query() query: GetUsersDto) {
    const result = await this.usersService.findAll(query);
    return {
      success: true,
      message: 'Users retrieved successfully',
      data: result,
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.usersService.findOne(user.id);
    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const result = await this.usersService.findOne(id);
    return {
      success: true,
      message: 'User retrieved successfully',
      data: result,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const result = await this.usersService.update(user.id, updateUserDto);
    return {
      success: true,
      message: 'Profile updated successfully',
      data: result,
    };
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.id, changePasswordDto);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const result = await this.usersService.update(id, updateUserDto);
    return {
      success: true,
      message: 'User updated successfully',
      data: result,
    };
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async deleteAccount(@CurrentUser() user: AuthenticatedUser) {
    await this.usersService.remove(user.id);
    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    const result = await this.usersService.remove(id);
    return {
      success: true,
      message: result.message,
    };
  }
}
