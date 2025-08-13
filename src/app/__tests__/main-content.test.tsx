import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MainContent } from '../main-content';

vi.mock('@/components/ui/resizable', () => ({
  ResizableHandle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  ResizablePanel: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  ResizablePanelGroup: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/lib/contexts/file-system-context', () => ({
  FileSystemProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/lib/contexts/chat-context', () => ({
  ChatProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/chat/ChatInterface', () => ({
  ChatInterface: () => <div>Chat Interface</div>,
}));

vi.mock('@/components/editor/FileTree', () => ({
  FileTree: () => <div>File Tree</div>,
}));

vi.mock('@/components/editor/CodeEditor', () => ({
  CodeEditor: () => <div>Code Editor</div>,
}));

vi.mock('@/components/preview/PreviewFrame', () => ({
  PreviewFrame: () => <div>Preview Frame</div>,
}));

vi.mock('@/components/HeaderActions', () => ({
  HeaderActions: ({ user, projectId }: any) => (
    <div>Header Actions - User: {user?.email || 'none'}, Project: {projectId || 'none'}</div>
  ),
}));

describe('MainContent', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render without props', () => {
    render(<MainContent />);
    
    expect(screen.getByText('React Component Generator')).toBeInTheDocument();
    expect(screen.getByText('Chat Interface')).toBeInTheDocument();
    expect(screen.getByText('Show Preview')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
  });

  it('should render with user prop', () => {
    const user = {
      id: 'user-123',
      email: 'test@example.com',
    };

    render(<MainContent user={user} />);
    
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
  });

  it('should render with project prop', () => {
    const project = {
      id: 'project-123',
      name: 'Test Project',
      messages: [{ role: 'user', content: 'Hello' }],
      data: { files: {} },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<MainContent project={project} />);
    
    expect(screen.getByText(/project-123/)).toBeInTheDocument();
  });

  it('should show preview by default', () => {
    render(<MainContent />);
    
    const previewTabs = screen.getAllByRole('tab', { name: /preview/i });
    expect(previewTabs[0]).toHaveAttribute('data-state', 'active');
    // Use getAllByText since there might be multiple instances
    const previewFrames = screen.getAllByText('Preview Frame');
    expect(previewFrames.length).toBeGreaterThan(0);
    expect(screen.queryByText('File Tree')).not.toBeInTheDocument();
    expect(screen.queryByText('Code Editor')).not.toBeInTheDocument();
  });

  it('should switch to code view when code tab is clicked', () => {
    render(<MainContent />);
    
    const codeTabs = screen.getAllByRole('tab', { name: /code/i });
    fireEvent.click(codeTabs[0]);
    
    // After clicking, re-query to get updated state
    const updatedCodeTabs = screen.getAllByRole('tab', { name: /code/i });
    expect(updatedCodeTabs[0]).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('File Tree')).toBeInTheDocument();
    expect(screen.getByText('Code Editor')).toBeInTheDocument();
    expect(screen.queryByText('Preview Frame')).not.toBeInTheDocument();
  });

  it('should switch back to preview view', () => {
    render(<MainContent />);
    
    const codeTabs = screen.getAllByRole('tab', { name: /code/i });
    fireEvent.click(codeTabs[0]);
    
    const previewTabs = screen.getAllByRole('tab', { name: /preview/i });
    fireEvent.click(previewTabs[0]);
    
    expect(previewTabs[0]).toHaveAttribute('data-state', 'active');
    const previewFrames = screen.getAllByText('Preview Frame');
    expect(previewFrames.length).toBeGreaterThan(0);
    expect(screen.queryByText('File Tree')).not.toBeInTheDocument();
  });

});