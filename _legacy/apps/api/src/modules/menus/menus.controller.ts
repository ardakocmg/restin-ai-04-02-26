import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MenusService } from './menus.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('menus')
export class MenusController {
  constructor(private menusService: MenusService) {}

  @Get('venue/:venueId')
  async getVenueMenus(@Param('venueId') venueId: string) {
    return this.menusService.findByVenue(venueId);
  }

  @Get('venue/:venueId/active')
  async getActiveMenu(@Param('venueId') venueId: string) {
    return this.menusService.getActiveMenu(venueId);
  }

  @Post('venue/:venueId')
  @UseGuards(JwtAuthGuard)
  async createMenu(@Param('venueId') venueId: string, @Body() dto: { name: string }) {
    return this.menusService.createMenu(venueId, dto.name);
  }

  @Post(':menuId/categories')
  @UseGuards(JwtAuthGuard)
  async createCategory(@Param('menuId') menuId: string, @Body() dto: { name: string; sortOrder?: number }) {
    return this.menusService.createCategory(menuId, dto);
  }

  @Post('categories/:categoryId/items')
  @UseGuards(JwtAuthGuard)
  async createItem(@Param('categoryId') categoryId: string, @Body() dto: any) {
    return this.menusService.createItem(categoryId, dto);
  }

  @Put('items/:itemId')
  @UseGuards(JwtAuthGuard)
  async updateItem(@Param('itemId') itemId: string, @Body() dto: any) {
    return this.menusService.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @UseGuards(JwtAuthGuard)
  async deleteItem(@Param('itemId') itemId: string) {
    return this.menusService.deleteItem(itemId);
  }
}
