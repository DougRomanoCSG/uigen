import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from '../anon-work-tracker';

describe('anon-work-tracker', () => {
  let mockSessionStorage: Record<string, string>;

  beforeEach(() => {
    mockSessionStorage = {};
    
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockSessionStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockSessionStorage[key];
        }),
        clear: vi.fn(() => {
          mockSessionStorage = {};
        }),
      },
      writable: true,
    });
  });

  describe('setHasAnonWork', () => {
    it('should store data when messages exist', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const fileSystemData = { '/': {} };

      setHasAnonWork(messages, fileSystemData);

      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'uigen_has_anon_work',
        'true'
      );
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'uigen_anon_data',
        JSON.stringify({ messages, fileSystemData })
      );
    });

    it('should store data when fileSystemData has content beyond root', () => {
      const messages: any[] = [];
      const fileSystemData = {
        '/': {},
        '/index.html': '<html></html>',
      };

      setHasAnonWork(messages, fileSystemData);

      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'uigen_has_anon_work',
        'true'
      );
    });

    it('should not store data when both are empty', () => {
      const messages: any[] = [];
      const fileSystemData = { '/': {} };

      setHasAnonWork(messages, fileSystemData);

      expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle server-side rendering', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const messages = [{ role: 'user', content: 'Hello' }];
      const fileSystemData = { '/': {} };

      // Should not throw
      expect(() => setHasAnonWork(messages, fileSystemData)).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('getHasAnonWork', () => {
    it('should return true when data exists', () => {
      mockSessionStorage['uigen_has_anon_work'] = 'true';

      const result = getHasAnonWork();

      expect(result).toBe(true);
      expect(window.sessionStorage.getItem).toHaveBeenCalledWith('uigen_has_anon_work');
    });

    it('should return false when data does not exist', () => {
      const result = getHasAnonWork();

      expect(result).toBe(false);
    });

    it('should return false on server-side', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const result = getHasAnonWork();

      expect(result).toBe(false);

      global.window = originalWindow;
    });
  });

  describe('getAnonWorkData', () => {
    it('should return parsed data when it exists', () => {
      const data = {
        messages: [{ role: 'user', content: 'Test' }],
        fileSystemData: { '/test.js': 'console.log("test")' },
      };
      mockSessionStorage['uigen_anon_data'] = JSON.stringify(data);

      const result = getAnonWorkData();

      expect(result).toEqual(data);
    });

    it('should return null when data does not exist', () => {
      const result = getAnonWorkData();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      mockSessionStorage['uigen_anon_data'] = 'invalid-json';

      const result = getAnonWorkData();

      expect(result).toBeNull();
    });

    it('should return null on server-side', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const result = getAnonWorkData();

      expect(result).toBeNull();

      global.window = originalWindow;
    });
  });

  describe('clearAnonWork', () => {
    it('should remove both storage items', () => {
      mockSessionStorage['uigen_has_anon_work'] = 'true';
      mockSessionStorage['uigen_anon_data'] = '{"messages":[]}';

      clearAnonWork();

      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('uigen_has_anon_work');
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('uigen_anon_data');
    });

    it('should handle server-side rendering', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      // Should not throw
      expect(() => clearAnonWork()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('integration', () => {
    it('should handle full workflow', () => {
      // Initially no work
      expect(getHasAnonWork()).toBe(false);
      expect(getAnonWorkData()).toBeNull();

      // Set some work
      const messages = [
        { role: 'user', content: 'Create a button' },
        { role: 'assistant', content: 'Here is a button component' },
      ];
      const fileSystemData = {
        '/': {},
        '/Button.tsx': 'export const Button = () => <button>Click me</button>',
      };

      setHasAnonWork(messages, fileSystemData);

      // Check work exists
      expect(getHasAnonWork()).toBe(true);
      expect(getAnonWorkData()).toEqual({ messages, fileSystemData });

      // Clear work
      clearAnonWork();

      // Check work is cleared
      expect(getHasAnonWork()).toBe(false);
      expect(getAnonWorkData()).toBeNull();
    });
  });
});