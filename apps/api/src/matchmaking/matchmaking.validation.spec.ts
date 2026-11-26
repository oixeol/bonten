import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { JoinQueueDto } from './dto/join-queue.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const gameId = '550e8400-e29b-41d4-a716-446655440000';

describe('Matchmaking request validation', () => {
  it('accepts a valid queue request', async () => {
    const body = { gameId, mode: 'competitive', region: 'BR' };
    await expect(pipe.transform(body, { type: 'body', metatype: JoinQueueDto }))
      .resolves.toBeInstanceOf(JoinQueueDto);
  });

  it('accepts valid role preferences', async () => {
    const body = { gameId, mode: 'competitive', region: 'BR', role: 'mid' };
    await expect(pipe.transform(body, { type: 'body', metatype: JoinQueueDto }))
      .resolves.toBeInstanceOf(JoinQueueDto);
  });

  it.each([
    { gameId: 'not-a-uuid', mode: 'competitive', region: 'BR' },
    { gameId, mode: '', region: 'BR' },
    { gameId, mode: 'competitive', region: 'B' },
    { gameId, mode: 'competitive', region: 'BR', partyId: gameId },
    { gameId, mode: 'competitive', region: 'BR', role: 'x'.repeat(33) },
  ])('rejects invalid queue request %j', async (body) => {
    await expect(pipe.transform(body, { type: 'body', metatype: JoinQueueDto }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
