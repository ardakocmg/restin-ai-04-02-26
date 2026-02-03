import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get('venue/:venueId')
  async getVenueOrders(
    @Param('venueId') venueId: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findByVenue(venueId, status);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Post()
  async createOrder(@Body() dto: any) {
    return this.ordersService.create(dto);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: { status: OrderStatus }) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
