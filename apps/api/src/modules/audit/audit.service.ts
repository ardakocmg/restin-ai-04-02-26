import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    action: string;
    entity: string;
    entityId: string;
    venueId: string;
    userId?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data,
    });
  }

  async findByVenue(venueId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { venueId },
      include: {
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
