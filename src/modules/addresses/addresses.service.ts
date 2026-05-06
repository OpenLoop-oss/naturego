import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return address;
  }

  async create(userId: string, createAddressDto: CreateAddressDto) {
    const { isDefault, ...rest } = createAddressDto;

    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const addressCount = await this.prisma.address.count({ where: { userId } });

    return this.prisma.address.create({
      data: {
        userId,
        label: rest.label || 'Home',
        fullName: rest.fullName,
        phone: rest.phone,
        addressLine1: rest.addressLine1,
        addressLine2: rest.addressLine2,
        city: rest.city,
        state: rest.state,
        postalCode: rest.postalCode,
        country: rest.country || 'India',
        isDefault: addressCount === 0 ? true : isDefault || false,
      },
    });
  }

  async update(userId: string, id: string, updateAddressDto: UpdateAddressDto) {
    await this.findOne(userId, id);

    const { isDefault, ...rest } = updateAddressDto;

    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: {
        ...rest,
        ...(isDefault !== undefined && { isDefault }),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    const address = await this.prisma.address.delete({
      where: { id },
    });

    if (address.isDefault) {
      const nextDefault = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (nextDefault) {
        await this.prisma.address.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Address deleted successfully' };
  }

  async setDefault(userId: string, id: string) {
    await this.findOne(userId, id);

    await this.prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
