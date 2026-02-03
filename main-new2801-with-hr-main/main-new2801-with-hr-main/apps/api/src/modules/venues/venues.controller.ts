import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('venues')
export class VenuesController {
  constructor(private venuesService: VenuesService) {}

  @Get()
  async getVenues() {
    return this.venuesService.findAll();
  }

  @Get(':id')
  async getVenue(@Param('id') id: string) {
    return this.venuesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createVenue(@Body() dto: CreateVenueDto) {
    return this.venuesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateVenue(@Param('id') id: string, @Body() dto: Partial<CreateVenueDto>) {
    return this.venuesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteVenue(@Param('id') id: string) {
    return this.venuesService.delete(id);
  }

  // Zones
  @Get(':venueId/zones')
  async getZones(@Param('venueId') venueId: string) {
    return this.venuesService.getZones(venueId);
  }

  @Post(':venueId/zones')
  @UseGuards(JwtAuthGuard)
  async createZone(@Param('venueId') venueId: string, @Body() dto: { name: string }) {
    return this.venuesService.createZone(venueId, dto.name);
  }

  // Tables
  @Get(':venueId/tables')
  async getTables(@Param('venueId') venueId: string) {
    return this.venuesService.getTables(venueId);
  }

  @Post('zones/:zoneId/tables')
  @UseGuards(JwtAuthGuard)
  async createTable(@Param('zoneId') zoneId: string, @Body() dto: { name: string; seats: number }) {
    return this.venuesService.createTable(zoneId, dto);
  }

  @Put('tables/:tableId/status')
  @UseGuards(JwtAuthGuard)
  async updateTableStatus(@Param('tableId') tableId: string, @Body() dto: { status: string }) {
    return this.venuesService.updateTableStatus(tableId, dto.status);
  }
}
