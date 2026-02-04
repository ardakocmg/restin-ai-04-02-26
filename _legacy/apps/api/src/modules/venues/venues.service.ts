import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.venue.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        zones: {
          include: {
            tables: true,
          },
        },
      },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    return venue;
  }

  async create(dto: CreateVenueDto) {
    return this.prisma.venue.create({
      data: dto,
    });
  }

  async update(id: string, dto: Partial<CreateVenueDto>) {
    return this.prisma.venue.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    return this.prisma.venue.delete({ where: { id } });
  }

  // Zones
  async createZone(venueId: string, name: string) {
    return this.prisma.zone.create({
      data: { name, venueId },
    });
  }

  async getZones(venueId: string) {
    return this.prisma.zone.findMany({
      where: { venueId },
      include: { tables: true },
    });
  }

  // Tables
  async createTable(zoneId: string, data: { name: string; seats: number }) {
    return this.prisma.table.create({
      data: { ...data, zoneId },
    });
  }

  async getTables(venueId: string) {
    return this.prisma.table.findMany({
      where: { zone: { venueId } },
      include: { zone: true },
    });
  }

  async updateTableStatus(id: string, status: any) {
    return this.prisma.table.update({
      where: { id },
      data: { status },
    });
  }
}
