import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class KdsService {
  constructor(private prisma: PrismaService) {}

  async findByVenue(venueId: string, status?: TicketStatus) {
    return this.prisma.kDSTicket.findMany({
      where: { venueId, ...(status && { status }) },
      include: {
        order: {
          include: {
            table: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: any) {
    const ticketNumber = `KDS-${Date.now()}`;
    
    return this.prisma.kDSTicket.create({
      data: {
        ticketNumber,
        venueId: data.venueId,
        orderId: data.orderId,
        station: data.station,
        priority: data.priority,
        items: data.items,
      },
    });
  }

  async updateStatus(id: string, status: TicketStatus) {
    const updateData: any = { status };
    
    if (status === 'IN_PROGRESS' && !updateData.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    
    return this.prisma.kDSTicket.update({
      where: { id },
      data: updateData,
    });
  }
}
