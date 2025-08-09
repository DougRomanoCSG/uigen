import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProjects } from '../get-projects';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
  },
}));

describe('getProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return projects when user is authenticated', async () => {
    const mockSession = { userId: 'user-123' };
    const mockProjects = [
      {
        id: 'project-1',
        name: 'Project 1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-03'),
      },
      {
        id: 'project-2',
        name: 'Project 2',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);

    const result = await getProjects();

    expect(getSession).toHaveBeenCalled();
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual(mockProjects);
  });

  it('should throw error when user is not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getProjects()).rejects.toThrow('Unauthorized');
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it('should return empty array when user has no projects', async () => {
    const mockSession = { userId: 'user-456' };
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    const result = await getProjects();

    expect(result).toEqual([]);
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-456',
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('should order projects by updatedAt descending', async () => {
    const mockSession = { userId: 'user-123' };
    const mockProjects = [
      {
        id: 'project-newer',
        name: 'Newer Project',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-10'),
      },
      {
        id: 'project-older',
        name: 'Older Project',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-05'),
      },
    ];

    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);

    const result = await getProjects();

    expect(result[0].id).toBe('project-newer');
    expect(result[1].id).toBe('project-older');
  });
});