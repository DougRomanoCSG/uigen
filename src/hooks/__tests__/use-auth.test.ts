import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../use-auth';
import { signIn as signInAction, signUp as signUpAction } from '@/actions';
import { getAnonWorkData, clearAnonWork } from '@/lib/anon-work-tracker';
import { getProjects } from '@/actions/get-projects';
import { createProject } from '@/actions/create-project';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/actions', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('@/lib/anon-work-tracker', () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock('@/actions/get-projects', () => ({
  getProjects: vi.fn(),
}));

vi.mock('@/actions/create-project', () => ({
  createProject: vi.fn(),
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('should sign in and navigate to existing project', async () => {
      const mockProjects = [
        { id: 'project-1', name: 'Project 1' },
        { id: 'project-2', name: 'Project 2' },
      ];

      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'password');
        expect(response.success).toBe(true);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/project-1');
      });
    });

    it('should sign in and create project from anonymous work', async () => {
      const mockAnonWork = {
        messages: [{ role: 'user', content: 'Hello' }],
        fileSystemData: { files: {} },
      };
      const mockProject = { id: 'new-project-123' };

      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork);
      vi.mocked(createProject).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      await waitFor(() => {
        expect(createProject).toHaveBeenCalledWith({
          name: expect.stringContaining('Design from'),
          messages: mockAnonWork.messages,
          data: mockAnonWork.fileSystemData,
        });
        expect(clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/new-project-123');
      });
    });

    it('should create new project when no existing projects', async () => {
      const mockProject = { id: 'brand-new-project' };

      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      await waitFor(() => {
        expect(createProject).toHaveBeenCalledWith({
          name: expect.stringContaining('New Design #'),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith('/brand-new-project');
      });
    });

    it('should handle sign in failure', async () => {
      vi.mocked(signInAction).mockResolvedValue({ 
        success: false, 
        error: 'Invalid credentials' 
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'wrong');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Invalid credentials');
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should set loading state during sign in', async () => {
      vi.mocked(signInAction).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: 'project-123' });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        const signInPromise = result.current.signIn('test@example.com', 'password');
        // Check loading state immediately after calling signIn
        expect(result.current.isLoading).toBe(true);
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('signUp', () => {
    it('should sign up and navigate to new project', async () => {
      const mockProject = { id: 'signup-project' };

      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.signUp('new@example.com', 'password');
        expect(response.success).toBe(true);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/signup-project');
      });
    });

    it('should sign up and preserve anonymous work', async () => {
      const mockAnonWork = {
        messages: [{ role: 'assistant', content: 'Welcome' }],
        fileSystemData: { files: { 'test.js': 'content' } },
      };
      const mockProject = { id: 'anon-project' };

      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork);
      vi.mocked(createProject).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp('new@example.com', 'password');
      });

      await waitFor(() => {
        expect(createProject).toHaveBeenCalledWith({
          name: expect.stringContaining('Design from'),
          messages: mockAnonWork.messages,
          data: mockAnonWork.fileSystemData,
        });
        expect(clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/anon-project');
      });
    });

    it('should handle sign up failure', async () => {
      vi.mocked(signUpAction).mockResolvedValue({ 
        success: false, 
        error: 'Email already exists' 
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.signUp('existing@example.com', 'password');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Email already exists');
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should set loading state during sign up', async () => {
      vi.mocked(signUpAction).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: 'project-456' });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        const signUpPromise = result.current.signUp('new@example.com', 'password');
        // Check loading state immediately after calling signUp
        expect(result.current.isLoading).toBe(true);
        await signUpPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});