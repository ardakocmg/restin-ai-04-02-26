import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findByVenue(venueId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { venueId },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: any) {
    return this.prisma.inventoryItem.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.inventoryItem.update({
      where: { id },
      data,
    });
  }

  async addLedgerEntry(itemId: string, data: any) {
    return this.prisma.stockLedger.create({
      data: { ...data, itemId },
    });
  }
}
