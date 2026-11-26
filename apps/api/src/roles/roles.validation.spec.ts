import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const id = '550e8400-e29b-41d4-a716-446655440000';

describe('Role request validation', () => {
  it('accepts valid create, update and assignment', async () => {
    await expect(pipe.transform({ communityId: id, name: 'role', permissions: ['MANAGE_ROLES'] }, { type: 'body', metatype: CreateRoleDto })).resolves.toBeInstanceOf(CreateRoleDto);
    await expect(pipe.transform({ permissions: [] }, { type: 'body', metatype: UpdateRoleDto })).resolves.toBeInstanceOf(UpdateRoleDto);
    await expect(pipe.transform({ roleId: id }, { type: 'body', metatype: AssignRoleDto })).resolves.toBeInstanceOf(AssignRoleDto);
  });

  it.each([
    { communityId: 'bad', name: 'role' }, { communityId: id, name: '' }, { communityId: id, name: 'x'.repeat(51) },
    { communityId: id, name: 'role', permissions: ['ADMINISTRATOR'] },
    { communityId: id, name: 'role', permissions: 'ADMIN' },
    { communityId: id, name: 'role', permissions: null },
    { communityId: id, name: 'role', members: { connect: { id } } },
  ])('rejects invalid create %j', async (body) => {
    await expect(pipe.transform(body, { type: 'body', metatype: CreateRoleDto })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    { permissions: null }, { permissions: ['BOGUS'] }, { name: null }, { color: 3 },
    { color: 'too-long-color' }, { communityId: id }, { isDefault: true },
    { community: { update: { ownerId: id } } },
  ])('rejects invalid update %j', async (body) => {
    await expect(pipe.transform(body, { type: 'body', metatype: UpdateRoleDto })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([{ roleId: 'bad' }, { roleId: null }, {}, { roleId: id, userId: id }])('rejects invalid assignment %j', async (body) => {
    await expect(pipe.transform(body, { type: 'body', metatype: AssignRoleDto })).rejects.toBeInstanceOf(BadRequestException);
  });
});
