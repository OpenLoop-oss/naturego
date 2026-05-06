import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all addresses' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  async findAll(@CurrentUser('id') userId: string) {
    const addresses = await this.addressesService.findAll(userId);
    return {
      success: true,
      message: 'Addresses retrieved successfully',
      data: addresses,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiResponse({ status: 200, description: 'Address details' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const address = await this.addressesService.findOne(userId, id);
    return {
      success: true,
      message: 'Address retrieved successfully',
      data: address,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  async create(@CurrentUser('id') userId: string, @Body() createAddressDto: CreateAddressDto) {
    const address = await this.addressesService.create(userId, createAddressDto);
    return {
      success: true,
      message: 'Address created successfully',
      data: address,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update address' })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const address = await this.addressesService.update(userId, id, updateAddressDto);
    return {
      success: true,
      message: 'Address updated successfully',
      data: address,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete address' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.addressesService.remove(userId, id);
    return {
      success: true,
      message: 'Address deleted successfully',
    };
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set address as default' })
  @ApiResponse({ status: 200, description: 'Address set as default' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async setDefault(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const address = await this.addressesService.setDefault(userId, id);
    return {
      success: true,
      message: 'Address set as default',
      data: address,
    };
  }
}
