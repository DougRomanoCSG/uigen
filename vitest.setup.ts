import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock server-only package
vi.mock('server-only', () => ({}));