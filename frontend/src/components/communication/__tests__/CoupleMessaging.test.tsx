import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CoupleMessaging from '../CoupleMessaging';

// Mock the realtime handler
vi.mock('../../../services/realtimeHandler', () => ({
  realtimeHandler: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onMessageReceived: vi.fn(() => vi.fn()),
    onTypingIndicator: vi.fn(() => vi.fn()),
    onUserStatusChange: vi.fn(() => vi.fn()),
    joinThread: vi.fn(),
    leaveThread: vi.fn(),
    emitMessage: vi.fn(),
    emitTyping: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('CoupleMessaging Component', () => {
  const defaultProps = {
    coupleId: 'couple-123',
    userId: 'user-456'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ threads: [] })
    });
  });

  it('renders without crashing', () => {
    render(<CoupleMessaging {...defaultProps} />);
    expect(screen.getByText('Vendor Messages')).toBeInTheDocument();
  });

  it('displays search input', () => {
    render(<CoupleMessaging {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument();
  });

  it('connects to WebSocket on mount', () => {
    render(<CoupleMessaging {...defaultProps} />);
    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith('/api/v1/messaging/couple/threads', {
      headers: {
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json'
      }
    });
  });
});