import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { KdsService } from './kds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketStatus } from '@prisma/client';

@Controller('kds')
@UseGuards(JwtAuthGuard)
export class KdsController {
  constructor(private kdsService: KdsService) {}

  @Get('venue/:venueId')
  async getVenueTickets(
    @Param('venueId') venueId: string,
    @Query('status') status?: TicketStatus,
  ) {
    return this.kdsService.findByVenue(venueId, status);
  }

  @Post()
  async createTicket(@Body() dto: any) {
    return this.kdsService.create(dto);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: { status: TicketStatus }) {
    return this.kdsService.updateStatus(id, dto.status);
  }
}
