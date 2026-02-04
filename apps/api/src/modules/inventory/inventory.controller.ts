import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('venue/:venueId')
  async getVenueInventory(@Param('venueId') venueId: string) {
    return this.inventoryService.findByVenue(venueId);
  }

  @Post()
  async createItem(@Body() dto: any) {
    return this.inventoryService.create(dto);
  }

  @Put(':id')
  async updateItem(@Param('id') id: string, @Body() dto: any) {
    return this.inventoryService.update(id, dto);
  }

  @Post(':id/ledger')
  async addLedgerEntry(@Param('id') id: string, @Body() dto: any) {
    return this.inventoryService.addLedgerEntry(id, dto);
  }
}
