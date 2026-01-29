import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommunicationCenter from '../CommunicationCenter';
import { guestApi } from '../../../lib/api';

// Mock the API
jest.mock('../../../lib/api', () => ({
  guestApi: {
    getGuests: jest.fn(),
  },
  communicationApi: {
    getMessageTemplates: jest.fn(),
    sendQRInvitations: jest.fn(),
    sendEventUpdate: jest.fn(),
    sendBulkMessages: jest.fn(),
  },
}));

const mockGuests = [
  {
    id: 1,
    wedding_id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+251911234567',
    qr_code: 'QR123',
    table_number: 1,
    dietary_restrictions: null,
    created_at: '2024-01-20T10:00:00Z',
    is_checked_in: false,
    checked_in_at: null,
  },
  {
    id: 2,
    wedding_id: 1,
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+251922345678',
    qr_code: 'QR456',
    table_number: 2,
    dietary_restrictions: 'Vegetarian',
    created_at: '2024-01-20T10:00:00Z',
    is_checked_in: true,
    checked_in_at: '2024-01-20T15:30:00Z',
  },
  {
    id: 3,
    wedding_id: 1,
    name: 'Bob Johnson',
    email: 'bob@example.com',
    phone: null, // Guest without phone
    qr_code: 'QR789',
    table_number: 3,
    dietary_restrictions: null,
    created_at: '2024-01-20T10:00:00Z',
    is_checked_in: false,
    checked_in_at: null,
  },
];

describe('CommunicationCenter', () => {
  beforeEach(() => {
    (guestApi.getGuests as jest.Mock).mockResolvedValue(mockGuests);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders communication center with guest statistics', async () => {
    await act(async () => {
      render(<CommunicationCenter weddingId={1} />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Communication Center')).toBeInTheDocument();
    });

    // Check statistics - use more specific queries
    expect(screen.getByText('Total Guests')).toBeInTheDocument();
    expect(screen.getByText('With Phone Numbers')).toBeInTheDocument();
    expect(screen.getByText('Checked In')).toBeInTheDocument();
    expect(screen.getByText('Pending Check-in')).toBeInTheDocument();
  });

  it('shows warning for guests without phone numbers', async () => {
    await act(async () => {
      render(<CommunicationCenter weddingId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/1 guest without phone numbers/)).toBeInTheDocument();
    });
  });

  it('displays communication action cards', async () => {
    await act(async () => {
      render(<CommunicationCenter weddingId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Send QR Invitations')).toBeInTheDocument();
      expect(screen.getByText('Send Event Updates')).toBeInTheDocument();
      expect(screen.getByText('Bulk Messaging')).toBeInTheDocument();
      expect(screen.getByText('Communication Analytics')).toBeInTheDocument();
    });
  });

  it('opens invitation interface when send invitations is clicked', async () => {
    await act(async () => {
      render(<CommunicationCenter weddingId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Send Invitations \(2 guests\)/)).toBeInTheDocument();
    });

    await act(async () => {
      userEvent.click(screen.getByText(/Send Invitations \(2 guests\)/));
    });

    // Should show the invitation interface
    await waitFor(() => {
      expect(screen.getByText('Send Guest Invitations')).toBeInTheDocument();
    });
  });

  it('opens bulk communication interface when send updates is clicked', async () => {
    await act(async () => {
      render(<CommunicationCenter weddingId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Send Updates')).toBeInTheDocument();
    });

    await act(async () => {
      userEvent.click(screen.getByText('Send Updates'));
    });

    // Should show the bulk communication interface
    await waitFor(() => {
      expect(screen.getByText('Bulk Communication')).toBeInTheDocument();
    });
  });

  it('shows communication history when view history is clicked', async () => {
    await act(async () => {
      render(<CommunicationCenter weddingId={1} />);
    });

    await waitFor(() => {
      expect(screen.getByText('View History')).toBeInTheDocument();
    });

    await act(async () => {
      userEvent.click(screen.getByText('View History'));
    });

    // Should show the communication history
    await waitFor(() => {
      expect(screen.getByText('Communication History')).toBeInTheDocument();
    });
  });

  it('disables buttons when no guests have phone numbers', async () => {
    const guestsWithoutPhone = mockGuests.map(guest => ({ ...guest, phone: null }));
    (guestApi.getGuests as jest.Mock).mockResolvedValue(guestsWithoutPhone);

    await act(async () => {
      render(<CommunicationCenter weddingId={1} />);
    });

    await waitFor(() => {
      const invitationButton = screen.getByText(/Send Invitations \(0 guests\)/);
      expect(invitationButton).toBeDisabled();
    });
  });

  it('shows loading state initially', () => {
    render(<CommunicationCenter weddingId={1} />);

    // Should show loading animation
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (guestApi.getGuests as jest.Mock).mockRejectedValue(new Error('API Error'));

    await act(async () => {
      render(<CommunicationCenter weddingId={1} />);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load guests:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});