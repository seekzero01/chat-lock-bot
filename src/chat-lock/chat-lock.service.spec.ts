import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChatLockService } from './chat-lock.service';
import { PrismaService } from '../prisma.service';
import { AppLogger } from '../logger/app-logger.service';
import { CreateLockDto } from './dto/create-lock.dto';
import { ChatLock } from '../generated/prisma/client';
import { ScheduleConflictError } from '../common/errors/schedule-conflict.error';
import { ScheduleNotFoundError } from '../common/errors/schedule-not-found.error';

interface MockPrismaError extends Error {
  code: string;
  meta?: Record<string, unknown>;
}

describe('ChatLockService', () => {
  let service: ChatLockService;

  // Standalone spy variables to satisfy the @typescript-eslint/unbound-method rule
  let spyLoggerSetContext: ReturnType<typeof vi.fn>;
  let spyLoggerError: ReturnType<typeof vi.fn>;
  let spyLoggerWarn: ReturnType<typeof vi.fn>;
  let spyLoggerLog: ReturnType<typeof vi.fn>;

  let spyCreate: ReturnType<typeof vi.fn>;
  let spyDelete: ReturnType<typeof vi.fn>;
  let spyFindUnique: ReturnType<typeof vi.fn>;
  let spyUpdateMany: ReturnType<typeof vi.fn>;
  let spyQueryRaw: ReturnType<typeof vi.fn>;

  // Conforms exactly to your PrismaClientErrorStructure requirement
  const createMockPrismaError = (code: string): MockPrismaError => {
    const error = new Error(
      `Prisma Client Exception: ${code}`,
    ) as MockPrismaError;
    error.code = code;
    return error;
  };

  const sampleChatLock: ChatLock = {
    chatId: '12345',
    isLocked: false,
    lockHour: 22,
    lockMinute: 0,
    unlockHour: 6,
    unlockMinute: 0,
    timezone: 'Europe/Helsinki',
    lockedAt: null,
  } as ChatLock;

  beforeEach(() => {
    spyLoggerSetContext = vi.fn();
    spyLoggerError = vi.fn();
    spyLoggerWarn = vi.fn();
    spyLoggerLog = vi.fn();

    spyCreate = vi.fn();
    spyDelete = vi.fn();
    spyFindUnique = vi.fn();
    spyUpdateMany = vi.fn();
    spyQueryRaw = vi.fn();

    const mockLogger = {
      setContext: spyLoggerSetContext,
      error: spyLoggerError,
      warn: spyLoggerWarn,
      log: spyLoggerLog,
    } as unknown as AppLogger;

    const mockPrisma = {
      chatLock: {
        create: spyCreate,
        delete: spyDelete,
        findUnique: spyFindUnique,
        updateMany: spyUpdateMany,
      },
      $queryRaw: spyQueryRaw,
    } as unknown as PrismaService;

    service = new ChatLockService(mockLogger, mockPrisma);
  });

  describe('createLock', () => {
    const dto: CreateLockDto = { chatId: '12345' } as CreateLockDto;

    it('creates lock successfully', async () => {
      spyCreate.mockResolvedValue(sampleChatLock);

      const result = await service.createLock(dto);

      expect(result).toEqual(sampleChatLock);
      expect(spyCreate).toHaveBeenCalledWith({ data: dto });
    });

    it('throws ScheduleConflictError on P2002 code', async () => {
      const prismaError = createMockPrismaError('P2002');
      spyCreate.mockRejectedValue(prismaError);

      await expect(service.createLock(dto)).rejects.toThrow(
        ScheduleConflictError,
      );
      expect(spyLoggerError).toHaveBeenCalled();
    });

    it('rethrows generic errors unmodified', async () => {
      const genericError = new Error('Database down');
      spyCreate.mockRejectedValue(genericError);

      await expect(service.createLock(dto)).rejects.toThrow(genericError);
    });
  });

  describe('removeLock', () => {
    it('removes lock successfully', async () => {
      spyDelete.mockResolvedValue(sampleChatLock);

      const result = await service.removeLock('12345');

      expect(result).toEqual(sampleChatLock);
      expect(spyDelete).toHaveBeenCalledWith({ where: { chatId: '12345' } });
    });

    it('throws ScheduleNotFoundError on P2025 code', async () => {
      const prismaError = createMockPrismaError('P2025');
      spyDelete.mockRejectedValue(prismaError);

      await expect(service.removeLock('12345')).rejects.toThrow(
        ScheduleNotFoundError,
      );
      expect(spyLoggerError).toHaveBeenCalled();
    });
  });

  describe('findLock', () => {
    it('returns record when found', async () => {
      spyFindUnique.mockResolvedValue(sampleChatLock);

      const result = await service.findLock('12345');

      expect(result).toEqual(sampleChatLock);
    });

    it('throws ScheduleNotFoundError when record missing', async () => {
      spyFindUnique.mockResolvedValue(null);

      await expect(service.findLock('12345')).rejects.toThrow(
        ScheduleNotFoundError,
      );
      expect(spyLoggerWarn).toHaveBeenCalled();
    });
  });

  describe('findPendingLocks', () => {
    it('returns pending locks from raw query', async () => {
      const mockLocks = [sampleChatLock];
      spyQueryRaw.mockResolvedValue(mockLocks);

      const result = await service.findPendingLocks();

      expect(result).toEqual(mockLocks);
      expect(spyQueryRaw).toHaveBeenCalled();
    });

    it('rethrows query processing exceptions', async () => {
      const queryError = new Error('Syntax error');
      spyQueryRaw.mockRejectedValue(queryError);

      await expect(service.findPendingLocks()).rejects.toThrow(queryError);
      expect(spyLoggerError).toHaveBeenCalled();
    });
  });

  describe('findPendingUnlocks', () => {
    it('returns pending unlocks from raw query', async () => {
      const mockLocks = [{ ...sampleChatLock, isLocked: true }];
      spyQueryRaw.mockResolvedValue(mockLocks);

      const result = await service.findPendingUnlocks();

      expect(result).toEqual(mockLocks);
    });
  });

  describe('tryTransitionToLocked', () => {
    it('returns true on successful mutex claim', async () => {
      spyUpdateMany.mockResolvedValue({ count: 1 });

      const result = await service.tryTransitionToLocked('12345');

      expect(result).toBe(true);
      expect(spyLoggerLog).toHaveBeenCalled();
    });

    it('returns false when state change skipped', async () => {
      spyUpdateMany.mockResolvedValue({ count: 0 });

      const result = await service.tryTransitionToLocked('12345');

      expect(result).toBe(false);
      expect(spyLoggerWarn).toHaveBeenCalled();
    });

    it('returns false on critical exception', async () => {
      spyUpdateMany.mockRejectedValue(new Error('Deadlock'));

      const result = await service.tryTransitionToLocked('12345');

      expect(result).toBe(false);
      expect(spyLoggerError).toHaveBeenCalled();
    });
  });

  describe('tryTransitionToUnlocked', () => {
    it('returns true on successful safe unlock', async () => {
      spyUpdateMany.mockResolvedValue({ count: 1 });

      const result = await service.tryTransitionToUnlocked('12345');

      expect(result).toBe(true);
      expect(spyLoggerLog).toHaveBeenCalled();
    });

    it('returns false when transition skipped concurrently', async () => {
      spyUpdateMany.mockResolvedValue({ count: 0 });

      const result = await service.tryTransitionToUnlocked('12345');

      expect(result).toBe(false);
    });
  });
});
