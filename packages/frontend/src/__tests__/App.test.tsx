import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mock matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('App', () => {
  it('renders without crashing and shows login page elements', () => {
    render(<App />);
    // The app should show login since there is no token
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows username and password labels on login page', () => {
    render(<App />);
    expect(screen.getByText(/Username/i)).toBeDefined();
    expect(screen.getByText(/Password/i)).toBeDefined();
  });

  it('shows login and register tabs', () => {
    render(<App />);
    const loginElements = screen.getAllByText(/Log In/i);
    expect(loginElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Create Account/i)).toBeDefined();
  });

  it('renders theme toggle button', () => {
    render(<App />);
    expect(screen.getByLabelText(/dark mode|light mode/i)).toBeDefined();
  });

  it('renders language toggle button', () => {
    render(<App />);
    expect(screen.getByLabelText(/Toggle language/i)).toBeDefined();
  });
});
