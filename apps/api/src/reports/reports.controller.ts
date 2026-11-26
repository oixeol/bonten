import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReportsService } from './reports.service';
import { ReportType, ReportStatus, ModerationActionType } from '@prisma/client';
import { ParseUUIDPipe } from '@nestjs/common';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() body: { targetId: string; type: ReportType; reason: string; evidenceUrl?: string },
  ) {
    return this.reportsService.createReport(user.id, body);
  }

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Query('admin') admin?: string,
  ) {
    return this.reportsService.listPending(user.id, admin === 'true');
  }

  @Put(':id')
  async moderate(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) reportId: string,
    @Body() body: { status: ReportStatus; action?: ModerationActionType; reason?: string },
  ) {
    return this.reportsService.moderate(user.id, reportId, body);
  }

  @Get('stats/:userId')
  async stats(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.reportsService.userReportCount(userId);
  }
}