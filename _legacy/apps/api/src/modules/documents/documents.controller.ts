import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get('venue/:venueId')
  async getVenueDocuments(@Param('venueId') venueId: string) {
    return this.documentsService.findByVenue(venueId);
  }

  @Post()
  async createDocument(@Body() dto: any) {
    return this.documentsService.create(dto);
  }
}
