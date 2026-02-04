import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findByVenue(venueId: string) {
    return this.prisma.document.findMany({
      where: { venueId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async create(data: any) {
    return this.prisma.document.create({
      data,
    });
  }
}
