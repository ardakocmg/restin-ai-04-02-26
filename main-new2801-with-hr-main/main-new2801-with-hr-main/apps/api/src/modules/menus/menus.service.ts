import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MenusService {
  constructor(private prisma: PrismaService) {}

  async findByVenue(venueId: string) {
    return this.prisma.menu.findMany({
      where: { venueId },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: true,
          },
        },
      },
    });
  }

  async getActiveMenu(venueId: string) {
    return this.prisma.menu.findFirst({
      where: { venueId, isActive: true },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: true,
          },
        },
      },
    });
  }

  async createMenu(venueId: string, name: string) {
    return this.prisma.menu.create({
      data: { name, venueId },
    });
  }

  async createCategory(menuId: string, data: { name: string; sortOrder?: number }) {
    return this.prisma.menuCategory.create({
      data: { ...data, menuId },
    });
  }

  async createItem(categoryId: string, data: any) {
    return this.prisma.menuItem.create({
      data: { ...data, categoryId },
    });
  }

  async updateItem(id: string, data: any) {
    return this.prisma.menuItem.update({
      where: { id },
      data,
    });
  }

  async deleteItem(id: string) {
    return this.prisma.menuItem.delete({ where: { id } });
  }
}
