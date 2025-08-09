import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProject } from '../create-project';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      create: vi.fn(),
    },
  },
}));

describe('createProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a project when user is authenticated', async () => {
    const mockSession = { userId: 'user-123' };
    const mockProject = {
      id: 'project-123',
      name: 'Test Project',
      userId: 'user-123',
      messages: '[]',
      data: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const input = {
      name: 'Test Project',
      messages: [],
      data: {},
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject);

    const result = await createProject(input);

    expect(getSession).toHaveBeenCalled();
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: 'Test Project',
        userId: 'user-123',
        messages: '[]',
        data: '{}',
      },
    });
    expect(result).toEqual(mockProject);
  });

  it('should throw error when user is not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const input = {
      name: 'Test Project',
      messages: [],
      data: {},
    };

    await expect(createProject(input)).rejects.toThrow('Unauthorized');
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  it('should handle complex messages and data', async () => {
    const mockSession = { userId: 'user-123' };
    const complexMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];
    const complexData = {
      files: { 'index.html': '<html></html>' },
      settings: { theme: 'dark' },
    };
    const input = {
      name: 'Complex Project',
      messages: complexMessages,
      data: complexData,
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.create).mockResolvedValue({
      id: 'project-456',
      name: 'Complex Project',
      userId: 'user-123',
      messages: JSON.stringify(complexMessages),
      data: JSON.stringify(complexData),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createProject(input);

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: 'Complex Project',
        userId: 'user-123',
        messages: JSON.stringify(complexMessages),
        data: JSON.stringify(complexData),
      },
    });
  });
});