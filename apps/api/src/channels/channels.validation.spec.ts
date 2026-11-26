import { BadRequestException, ParseUUIDPipe, ValidationPipe } from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const valid = { communityId: '550e8400-e29b-41d4-a716-446655440000', name: 'voice', type: 'VOICE' };

describe('Channel request validation', () => {
  it('accepts valid bodies', async () => {
    await expect(pipe.transform(valid, { type: 'body', metatype: CreateChannelDto })).resolves.toEqual(valid);
    await expect(pipe.transform({ isPrivate: false, position: 0 }, { type: 'body', metatype: UpdateChannelDto })).resolves.toEqual({ isPrivate: false, position: 0 });
  });

  it.each([
    { ...valid, communityId: 'invalid' }, { ...valid, name: '' }, { ...valid, name: 'x'.repeat(101) },
    { ...valid, type: 'INVALID' }, { ...valid, isPrivate: 'false' }, { ...valid, isPrivate: null },
    { ...valid, community: { connect: { id: valid.communityId } } }, {},
  ])('rejects invalid create %j', async (body) => {
    await expect(pipe.transform(body, { type: 'body', metatype: CreateChannelDto })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    { isPrivate: 'false' }, { isPrivate: null }, { position: -1 }, { position: 0.5 },
    { position: 2147483648 }, { position: null }, { name: null }, { communityId: valid.communityId },
    { community: { update: { ownerId: valid.communityId } } },
  ])('rejects invalid update %j', async (body) => {
    await expect(pipe.transform(body, { type: 'body', metatype: UpdateChannelDto })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects malformed UUID route params', async () => {
    await expect(new ParseUUIDPipe().transform('not-uuid', { type: 'param', data: 'id' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
