import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('should merge class names', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class'
    );
    expect(result).toBe('base-class active-class');
  });

  it('should override conflicting Tailwind classes', () => {
    const result = cn('text-sm', 'text-lg');
    expect(result).toBe('text-lg');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['text-sm', 'font-bold'], 'bg-white');
    expect(result).toBe('text-sm font-bold bg-white');
  });

  it('should handle object notation', () => {
    const result = cn({
      'text-sm': true,
      'text-lg': false,
      'font-bold': true,
    });
    expect(result).toBe('text-sm font-bold');
  });

  it('should handle undefined and null values', () => {
    const result = cn('text-sm', undefined, null, 'font-bold');
    expect(result).toBe('text-sm font-bold');
  });

  it('should handle empty string', () => {
    const result = cn('', 'text-sm', '', 'font-bold', '');
    expect(result).toBe('text-sm font-bold');
  });

  it('should merge padding and margin correctly', () => {
    const result = cn('p-4', 'px-6');
    expect(result).toBe('p-4 px-6');
  });

  it('should handle complex Tailwind overrides', () => {
    const result = cn(
      'bg-red-500 hover:bg-red-600',
      'bg-blue-500 hover:bg-blue-600'
    );
    expect(result).toBe('bg-blue-500 hover:bg-blue-600');
  });

  it('should handle no arguments', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle mixed input types', () => {
    const result = cn(
      'base',
      ['array-1', 'array-2'],
      { 'obj-true': true, 'obj-false': false },
      undefined,
      null,
      'final'
    );
    expect(result).toBe('base array-1 array-2 obj-true final');
  });
});