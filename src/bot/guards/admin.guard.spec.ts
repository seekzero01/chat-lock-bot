import { ExecutionContext } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdminGuard } from './admin.guard';
import { UserType } from '../types';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  function createMockExecutionContext(telegrafCtx: unknown): ExecutionContext {
    return {
      getArgs: () => [telegrafCtx],
      getArgByIndex: (index: number) => [telegrafCtx][index],
      getClass: vi.fn(),
      getHandler: vi.fn(),
      getType: vi.fn(() => 'telegraf'),
      switchToHttp: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
    } as unknown as ExecutionContext;
  }

  it('returns false if chat is missing', async () => {
    const mockCtx = {
      from: { id: 456 },
      telegram: { getChatMember: vi.fn() },
    };
    const execCtx = createMockExecutionContext(mockCtx);

    const result = await guard.canActivate(execCtx);

    expect(result).toBe(false);
    expect(mockCtx.telegram.getChatMember).not.toHaveBeenCalled();
  });

  it('returns false if from is missing', async () => {
    const mockCtx = {
      chat: { id: 123 },
      telegram: { getChatMember: vi.fn() },
    };
    const execCtx = createMockExecutionContext(mockCtx);

    const result = await guard.canActivate(execCtx);

    expect(result).toBe(false);
    expect(mockCtx.telegram.getChatMember).not.toHaveBeenCalled();
  });

  it('returns false if getChatMember throws an error', async () => {
    const mockGetChatMember = vi
      .fn()
      .mockRejectedValue(new Error('Telegram API failure'));
    const mockCtx = {
      chat: { id: 123 },
      from: { id: 456 },
      telegram: { getChatMember: mockGetChatMember },
    };
    const execCtx = createMockExecutionContext(mockCtx);

    const result = await guard.canActivate(execCtx);

    expect(result).toBe(false);
    expect(mockGetChatMember).toHaveBeenCalledWith(123, 456);
  });

  it('returns false if member status is not allowed', async () => {
    const mockGetChatMember = vi.fn().mockResolvedValue({ status: 'member' });
    const mockCtx = {
      chat: { id: 123 },
      from: { id: 456 },
      telegram: { getChatMember: mockGetChatMember },
    };
    const execCtx = createMockExecutionContext(mockCtx);

    const result = await guard.canActivate(execCtx);

    expect(result).toBe(false);
    expect(mockGetChatMember).toHaveBeenCalledWith(123, 456);
  });

  it('returns true if member is an administrator', async () => {
    const mockGetChatMember = vi
      .fn()
      .mockResolvedValue({ status: UserType.ADMINISTRATOR });
    const mockCtx = {
      chat: { id: 123 },
      from: { id: 456 },
      telegram: { getChatMember: mockGetChatMember },
    };
    const execCtx = createMockExecutionContext(mockCtx);

    const result = await guard.canActivate(execCtx);

    expect(result).toBe(true);
    expect(mockGetChatMember).toHaveBeenCalledWith(123, 456);
  });

  it('returns true if member is the creator', async () => {
    const mockGetChatMember = vi
      .fn()
      .mockResolvedValue({ status: UserType.CREATOR });
    const mockCtx = {
      chat: { id: 123 },
      from: { id: 456 },
      telegram: { getChatMember: mockGetChatMember },
    };
    const execCtx = createMockExecutionContext(mockCtx);

    const result = await guard.canActivate(execCtx);

    expect(result).toBe(true);
    expect(mockGetChatMember).toHaveBeenCalledWith(123, 456);
  });
});
