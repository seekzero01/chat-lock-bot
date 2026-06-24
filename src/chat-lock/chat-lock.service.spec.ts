import { Test, TestingModule } from '@nestjs/testing';
import { ChatLockService } from './chat-lock.service';
import { PrismaService } from '../prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ChatLockService', () => {
  let service: ChatLockService;
  let prisma: PrismaService;

  const mockPrismaService = {
    chatLock: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatLockService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ChatLockService>(ChatLockService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLock', () => {
    it('should create a lock successfully', async () => {
      const dto: any = { chatId: '123' };
      mockPrismaService.chatLock.create.mockResolvedValue(dto);
      expect(await service.createLock(dto)).toEqual(dto);
    });

    it('should throw ConflictException on P2002 error', async () => {
      const error = { code: 'P2002' };
      mockPrismaService.chatLock.create.mockRejectedValue(error);
      await expect(service.createLock({} as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('removeLock', () => {
    it('should remove a lock successfully', async () => {
      const lock: any = { chatId: '123' };
      mockPrismaService.chatLock.delete.mockResolvedValue(lock);
      expect(await service.removeLock('123')).toEqual(lock);
    });

    it('should throw NotFoundException on P2025 error', async () => {
      const error = { code: 'P2025' };
      mockPrismaService.chatLock.delete.mockRejectedValue(error);
      await expect(service.removeLock('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findLock', () => {
    it('should find a lock successfully', async () => {
      const lock: any = { chatId: '123' };
      mockPrismaService.chatLock.findUnique.mockResolvedValue(lock);
      expect(await service.findLock('123')).toEqual(lock);
    });

    it('should throw NotFoundException if lock not found', async () => {
      mockPrismaService.chatLock.findUnique.mockResolvedValue(null);
      await expect(service.findLock('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('tryTransitionToLocked', () => {
    it('should return true when transition succeeds', async () => {
      mockPrismaService.chatLock.updateMany.mockResolvedValue({ count: 1 });
      expect(await service.tryTransitionToLocked('123')).toBe(true);
    });

    it('should return false when transition fails', async () => {
      mockPrismaService.chatLock.updateMany.mockResolvedValue({ count: 0 });
      expect(await service.tryTransitionToLocked('123')).toBe(false);
    });
  });

  describe('tryTransitionToUnlocked', () => {
    it('should return true when transition succeeds', async () => {
      mockPrismaService.chatLock.updateMany.mockResolvedValue({ count: 1 });
      expect(await service.tryTransitionToUnlocked('123')).toBe(true);
    });

    it('should return false when transition fails', async () => {
      mockPrismaService.chatLock.updateMany.mockResolvedValue({ count: 0 });
      expect(await service.tryTransitionToUnlocked('123')).toBe(false);
    });
  });
});
