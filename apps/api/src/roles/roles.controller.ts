import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Controller('roles')
@UseGuards(AuthGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post()
  async create(@CurrentUser() user: { id: string }, @Body() body: CreateRoleDto) {
    return this.rolesService.create(user.id, body.communityId, body);
  }

  @Get('community/:communityId')
  async listByCommunity(@CurrentUser() user: { id: string }, @Param('communityId', ParseUUIDPipe) communityId: string) {
    return this.rolesService.listByCommunity(user.id, communityId);
  }

  @Get(':id')
  async findById(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findById(user.id, id);
  }

  @Put(':id')
  async update(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateRoleDto) {
    return this.rolesService.update(user.id, id, body);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.delete(user.id, id);
  }

  @Post('assign/:memberId')
  async assignRole(
    @CurrentUser() user: { id: string },
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() body: AssignRoleDto,
  ) {
    return this.rolesService.assignRole(user.id, memberId, body.roleId);
  }
}