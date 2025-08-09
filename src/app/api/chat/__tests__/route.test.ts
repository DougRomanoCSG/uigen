import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { streamText } from 'ai';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLanguageModel } from '@/lib/provider';
import { VirtualFileSystem } from '@/lib/file-system';

vi.mock('ai', () => ({
  streamText: vi.fn(),
  appendResponseMessages: vi.fn((data) => data.messages.concat(data.responseMessages)),
}));

vi.mock('@/lib/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/provider', () => ({
  getLanguageModel: vi.fn(),
}));

vi.mock('@/lib/file-system', () => {
  const MockVirtualFileSystem = vi.fn(() => ({
    deserializeFromNodes: vi.fn(),
    serialize: vi.fn(() => ({ files: {} })),
  }));
  return { VirtualFileSystem: MockVirtualFileSystem };
});

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
  });

  it('should process chat request and return stream response', async () => {
    const mockModel = { id: 'test-model' };
    const mockStreamResponse = {
      toDataStreamResponse: vi.fn(() => new Response('stream')),
    };
    
    vi.mocked(getLanguageModel).mockReturnValue(mockModel);
    vi.mocked(streamText).mockReturnValue(mockStreamResponse as any);

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        files: {},
      }),
    });

    const response = await POST(request);

    expect(getLanguageModel).toHaveBeenCalled();
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: mockModel,
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          { role: 'user', content: 'Hello' },
        ]),
        maxTokens: 10_000,
        maxSteps: 40,
      })
    );
    expect(response).toBeInstanceOf(Response);
  });

  it('should use fewer steps for mock provider', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const mockModel = { id: 'mock-model' };
    const mockStreamResponse = {
      toDataStreamResponse: vi.fn(() => new Response('stream')),
    };
    
    vi.mocked(getLanguageModel).mockReturnValue(mockModel);
    vi.mocked(streamText).mockReturnValue(mockStreamResponse as any);

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        files: {},
      }),
    });

    await POST(request);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        maxSteps: 4,
      })
    );
  });

  it('should save project data when projectId is provided and user is authenticated', async () => {
    const mockSession = { userId: 'user-123' };
    const mockModel = { id: 'test-model' };
    const mockResponseMessages = [{ role: 'assistant', content: 'Response' }];
    let onFinishCallback: any;
    const mockStreamResponse = {
      toDataStreamResponse: vi.fn(() => new Response('stream')),
    };
    
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(getLanguageModel).mockReturnValue(mockModel);
    vi.mocked(streamText).mockImplementation((config: any) => {
      onFinishCallback = config.onFinish;
      return mockStreamResponse as any;
    });

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        files: {},
        projectId: 'project-123',
      }),
    });

    await POST(request);

    // Simulate onFinish callback
    await onFinishCallback({
      response: { messages: mockResponseMessages },
    });

    expect(getSession).toHaveBeenCalled();
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: {
        id: 'project-123',
        userId: 'user-123',
      },
      data: {
        messages: expect.any(String),
        data: expect.any(String),
      },
    });
  });

  it('should not save project when user is not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const mockModel = { id: 'test-model' };
    let onFinishCallback: any;
    const mockStreamResponse = {
      toDataStreamResponse: vi.fn(() => new Response('stream')),
    };
    
    vi.mocked(getLanguageModel).mockReturnValue(mockModel);
    vi.mocked(streamText).mockImplementation((config: any) => {
      onFinishCallback = config.onFinish;
      return mockStreamResponse as any;
    });

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        files: {},
        projectId: 'project-123',
      }),
    });

    await POST(request);

    // Simulate onFinish callback
    await onFinishCallback({
      response: { messages: [] },
    });

    expect(getSession).toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('should handle errors in onFinish gracefully', async () => {
    const mockSession = { userId: 'user-123' };
    const mockModel = { id: 'test-model' };
    let onFinishCallback: any;
    const mockStreamResponse = {
      toDataStreamResponse: vi.fn(() => new Response('stream')),
    };
    
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(getLanguageModel).mockReturnValue(mockModel);
    vi.mocked(streamText).mockImplementation((config: any) => {
      onFinishCallback = config.onFinish;
      return mockStreamResponse as any;
    });
    vi.mocked(prisma.project.update).mockRejectedValue(new Error('Database error'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        files: {},
        projectId: 'project-123',
      }),
    });

    await POST(request);

    // Simulate onFinish callback
    await onFinishCallback({
      response: { messages: [] },
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save project data:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});