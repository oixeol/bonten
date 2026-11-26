import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DmsService } from './dms.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateKeyPairSync } from 'node:crypto';

const senderKey = Buffer.alloc(32, 42).toString('base64');
const receiverKey = Buffer.alloc(32, 43).toString('base64');
const encryptedContent = JSON.stringify({ v: 1, senderPublicKey: senderKey, recipientPublicKey: receiverKey, iv: Buffer.alloc(12).toString('base64'), ciphertext: Buffer.alloc(32).toString('base64') });

describe('DM encryption enforcement', () => {
  const prisma = {
    friendship: { findFirst: jest.fn() },
    user: { findUnique: jest.fn(), updateMany: jest.fn() },
    dM: { create: jest.fn() },
  };
  const service = new DmsService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.friendship.findFirst.mockResolvedValueOnce({ id: 'friend' }).mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValueOnce({ e2eePublicKey: senderKey }).mockResolvedValueOnce({ e2eePublicKey: receiverKey });
    prisma.dM.create.mockImplementation(async (args) => args.data);
  });
  it('stores ciphertext only', async () => {
    const result = await service.send('alice', 'bob', { encryptedContent, isEncrypted: true });
    expect(result).toMatchObject({ content: null, encryptedContent, isEncrypted: true });
  });
  it.each([{ content: 'leak' }, { content: 'leak', encryptedContent, isEncrypted: true }, { encryptedContent, isEncrypted: false }, { encryptedContent: '{}', isEncrypted: true }])('rejects plaintext or malformed payload %j', async (data) => {
    await expect(service.send('alice', 'bob', data)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.dM.create).not.toHaveBeenCalled();
  });
  it('rejects substituted key', async () => {
    await expect(service.send('alice', 'bob', { encryptedContent: encryptedContent.replace(receiverKey, senderKey), isEncrypted: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.dM.create).not.toHaveBeenCalled();
  });
  it('rejects non-friends', async () => {
    prisma.friendship.findFirst.mockReset().mockResolvedValue(null);
    await expect(service.send('alice', 'bob', { encryptedContent, isEncrypted: true })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('checks blocks in both directions', async () => {
    prisma.friendship.findFirst.mockReset().mockResolvedValue({ id: 'blocked' });
    await expect(service.send('alice', 'bob', { encryptedContent, isEncrypted: true })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.friendship.findFirst).toHaveBeenLastCalledWith({ where: { OR: [
      { senderId: 'bob', receiverId: 'alice', status: 'BLOCKED' },
      { senderId: 'alice', receiverId: 'bob', status: 'BLOCKED' },
    ] } });
  });
  it('key registration is atomic and refuses replacement', async () => {
    const service = new UsersService(prisma as unknown as PrismaService);
    const key = generateKeyPairSync('x25519').publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    await service.setE2eePublicKey('alice', key);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: 'alice', OR: [{ e2eePublicKey: null }, { e2eePublicKey: key }] }, data: { e2eePublicKey: key } });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.setE2eePublicKey('alice', key)).rejects.toThrow('dispositivo original');
  });
});
