import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthDialog } from '../AuthDialog';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('../SignInForm', () => ({
  SignInForm: ({ onSuccess }: any) => (
    <div>
      Sign In Form
      <button onClick={onSuccess}>Sign In Success</button>
    </div>
  ),
}));

vi.mock('../SignUpForm', () => ({
  SignUpForm: ({ onSuccess }: any) => (
    <div>
      Sign Up Form
      <button onClick={onSuccess}>Sign Up Success</button>
    </div>
  ),
}));

describe('AuthDialog', () => {
  it('should not render when closed', () => {
    render(<AuthDialog open={false} onOpenChange={vi.fn()} />);
    
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
  });

  it('should render sign in mode by default', () => {
    render(<AuthDialog open={true} onOpenChange={vi.fn()} />);
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument();
    expect(screen.getByText('Sign In Form')).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  it('should render sign up mode when specified', () => {
    render(<AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />);
    
    expect(screen.getByText('Create an account')).toBeInTheDocument();
    expect(screen.getByText('Sign up to start creating AI-powered React components')).toBeInTheDocument();
    expect(screen.getByText('Sign Up Form')).toBeInTheDocument();
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
  });

  it('should switch from sign in to sign up mode', () => {
    render(<AuthDialog open={true} onOpenChange={vi.fn()} />);
    
    const signUpLink = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(signUpLink);
    
    expect(screen.getByText('Create an account')).toBeInTheDocument();
    expect(screen.getByText('Sign Up Form')).toBeInTheDocument();
  });

  it('should switch from sign up to sign in mode', () => {
    render(<AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />);
    
    const signInLink = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(signInLink);
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Sign In Form')).toBeInTheDocument();
  });

  it('should close dialog on sign in success', () => {
    const onOpenChange = vi.fn();
    render(<AuthDialog open={true} onOpenChange={onOpenChange} />);
    
    const successButton = screen.getByText('Sign In Success');
    fireEvent.click(successButton);
    
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should close dialog on sign up success', () => {
    const onOpenChange = vi.fn();
    render(<AuthDialog open={true} onOpenChange={onOpenChange} defaultMode="signup" />);
    
    const successButton = screen.getByText('Sign Up Success');
    fireEvent.click(successButton);
    
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should update mode when defaultMode prop changes', () => {
    const { rerender } = render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signin" />
    );
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    
    rerender(<AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />);
    
    expect(screen.getByText('Create an account')).toBeInTheDocument();
  });
});