import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApplyLfgListingDto } from './dto/apply-lfg-listing.dto';
import { CreateLfgListingDto } from './dto/create-lfg-listing.dto';
import { LfgService } from './lfg.service';

@Controller('lfg')
@UseGuards(AuthGuard)
export class LfgController {
  constructor(private readonly lfg: LfgService) {}

  @Get('mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.lfg.mine(user.id);
  }

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query('gameId') gameId?: string,
    @Query('mode') mode?: string,
    @Query('region') region?: string,
  ) {
    return this.lfg.list(user.id, { gameId, mode, region });
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateLfgListingDto) {
    return this.lfg.create(user.id, dto);
  }

  @Post(':id/apply')
  apply(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyLfgListingDto,
  ) {
    return this.lfg.apply(id, user.id, dto);
  }

  @Post(':listingId/applications/:applicationId/accept')
  accept(
    @CurrentUser() user: { id: string },
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.lfg.acceptApplication(listingId, applicationId, user.id);
  }

  @Post(':listingId/applications/:applicationId/reject')
  reject(
    @CurrentUser() user: { id: string },
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.lfg.rejectApplication(listingId, applicationId, user.id);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.lfg.cancel(id, user.id);
  }
}
