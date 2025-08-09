import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProject } from '../get-project';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
  },
}));

describe('getProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a project when user is authenticated and project exists', async () => {
    const mockSession = { userId: 'user-123' };
    const mockMessages = [{ role: 'user', content: 'Hello' }];
    const mockData = { files: { 'index.html': '<html></html>' } };
    const mockProject = {
      id: 'project-123',
      name: 'Test Project',
      userId: 'user-123',
      messages: JSON.stringify(mockMessages),
      data: JSON.stringify(mockData),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

    const result = await getProject('project-123');

    expect(getSession).toHaveBeenCalled();
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'project-123',
        userId: 'user-123',
      },
    });
    expect(result).toEqual({
      id: 'project-123',
      name: 'Test Project',
      messages: mockMessages,
      data: mockData,
      createdAt: mockProject.createdAt,
      updatedAt: mockProject.updatedAt,
    });
  });

  it('should throw error when user is not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getProject('project-123')).rejects.toThrow('Unauthorized');
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it('should throw error when project is not found', async () => {
    const mockSession = { userId: 'user-123' };
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    await expect(getProject('non-existent')).rejects.toThrow('Project not found');
  });

  it('should handle empty messages and data arrays', async () => {
    const mockSession = { userId: 'user-123' };
    const mockProject = {
      id: 'project-123',
      name: 'Empty Project',
      userId: 'user-123',
      messages: '[]',
      data: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject);

    const result = await getProject('project-123');

    expect(result.messages).toEqual([]);
    expect(result.data).toEqual({});
  });
});