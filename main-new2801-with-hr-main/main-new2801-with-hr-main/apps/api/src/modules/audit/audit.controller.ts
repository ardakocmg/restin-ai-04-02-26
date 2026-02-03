import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('venue/:venueId')
  async getVenueAuditLogs(
    @Param('venueId') venueId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findByVenue(venueId, limit ? +limit : 100);
  }
}
