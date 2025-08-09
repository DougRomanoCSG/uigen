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
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise(resolve => {
        resolveSignIn = resolve;
      });
      
      vi.mocked(signInAction).mockReturnValue(signInPromise);
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: 'project-123' });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let authPromise: Promise<any>;
      act(() => {
        authPromise = result.current.signIn('test@example.com', 'password');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the sign in
      resolveSignIn!({ success: true });

      await act(async () => {
        await authPromise;
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
      let resolveSignUp: (value: any) => void;
      const signUpPromise = new Promise(resolve => {
        resolveSignUp = resolve;
      });
      
      vi.mocked(signUpAction).mockReturnValue(signUpPromise);
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: 'project-456' });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let authPromise: Promise<any>;
      act(() => {
        authPromise = result.current.signUp('new@example.com', 'password');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the sign up
      resolveSignUp!({ success: true });

      await act(async () => {
        await authPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle error when creating project from anonymous work fails', async () => {
      const mockAnonWork = {
        messages: [{ role: 'user', content: 'Test message' }],
        fileSystemData: { files: {} },
      };

      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork);
      vi.mocked(createProject).mockRejectedValue(new Error('Failed to create project'));

      const { result } = renderHook(() => useAuth());

      await expect(act(async () => {
        await result.current.signIn('test@example.com', 'password');
      })).rejects.toThrow('Failed to create project');

      expect(clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle error when creating new project fails', async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => useAuth());

      await expect(act(async () => {
        await result.current.signIn('test@example.com', 'password');
      })).rejects.toThrow('Database error');

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle error when fetching projects fails', async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await expect(act(async () => {
        await result.current.signIn('test@example.com', 'password');
      })).rejects.toThrow('Network error');

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle anonymous work with empty messages array', async () => {
      const mockAnonWork = {
        messages: [],
        fileSystemData: { files: {} },
      };

      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork);
      vi.mocked(getProjects).mockResolvedValue([{ id: 'existing-project' }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      await waitFor(() => {
        expect(createProject).not.toHaveBeenCalled();
        expect(clearAnonWork).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/existing-project');
      });
    });

    it('should prevent concurrent sign in attempts', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });

      vi.mocked(signInAction).mockReturnValue(signInPromise);

      const { result } = renderHook(() => useAuth());

      let firstCallPromise: Promise<any>;
      let secondCallPromise: Promise<any>;

      act(() => {
        firstCallPromise = result.current.signIn('test@example.com', 'password');
        secondCallPromise = result.current.signIn('test2@example.com', 'password2');
      });

      expect(result.current.isLoading).toBe(true);

      resolveSignIn!({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: 'new-project' });

      await act(async () => {
        await Promise.all([firstCallPromise!, secondCallPromise!]);
      });

      expect(vi.mocked(signInAction)).toHaveBeenCalledTimes(2);
    });

    it('should prevent concurrent sign up attempts', async () => {
      let resolveSignUp: (value: any) => void;
      const signUpPromise = new Promise((resolve) => {
        resolveSignUp = resolve;
      });

      vi.mocked(signUpAction).mockReturnValue(signUpPromise);

      const { result } = renderHook(() => useAuth());

      let firstCallPromise: Promise<any>;
      let secondCallPromise: Promise<any>;

      act(() => {
        firstCallPromise = result.current.signUp('new@example.com', 'password');
        secondCallPromise = result.current.signUp('new2@example.com', 'password2');
      });

      expect(result.current.isLoading).toBe(true);

      resolveSignUp!({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: 'new-project' });

      await act(async () => {
        await Promise.all([firstCallPromise!, secondCallPromise!]);
      });

      expect(vi.mocked(signUpAction)).toHaveBeenCalledTimes(2);
    });

    it('should reset loading state even when handlePostSignIn throws', async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const { result } = renderHook(() => useAuth());

      await expect(act(async () => {
        await result.current.signIn('test@example.com', 'password');
      })).rejects.toThrow('Unexpected error');

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle project creation with special characters in name', async () => {
      const mockAnonWork = {
        messages: [{ role: 'user', content: 'Test' }],
        fileSystemData: {},
      };
      const mockProject = { id: 'special-project' };

      // Mock Date to return a specific time with special characters
      const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
      Date.prototype.toLocaleTimeString = vi.fn(() => '12:34:56 PM');

      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(mockAnonWork);
      vi.mocked(createProject).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      await waitFor(() => {
        expect(createProject).toHaveBeenCalledWith({
          name: 'Design from 12:34:56 PM',
          messages: mockAnonWork.messages,
          data: mockAnonWork.fileSystemData,
        });
      });

      // Restore original function
      Date.prototype.toLocaleTimeString = originalToLocaleTimeString;
    });

    it('should handle mixed success/failure in rapid succession', async () => {
      vi.mocked(signInAction)
        .mockResolvedValueOnce({ success: false, error: 'First attempt failed' })
        .mockResolvedValueOnce({ success: true });
      
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([{ id: 'project-1' }]);

      const { result } = renderHook(() => useAuth());

      // First attempt fails
      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'wrong');
        expect(response.success).toBe(false);
      });

      expect(mockPush).not.toHaveBeenCalled();

      // Second attempt succeeds
      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'correct');
        expect(response.success).toBe(true);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/project-1');
      });
    });
  });
});