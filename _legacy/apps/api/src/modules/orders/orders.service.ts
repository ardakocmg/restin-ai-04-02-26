import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findByVenue(venueId: string, status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: { venueId, ...(status && { status }) },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
        server: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
    });
  }

  async create(data: any) {
    const orderNumber = `ORD-${Date.now()}`;
    
    return this.prisma.order.create({
      data: {
        orderNumber,
        venueId: data.venueId,
        tableId: data.tableId,
        serverId: data.serverId,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        notes: data.notes,
        items: {
          create: data.items,
        },
      },
      include: {
        items: true,
      },
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }
}
