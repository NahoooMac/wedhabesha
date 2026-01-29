import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import StaffCheckInPage from '../../pages/StaffCheckInPage';
import { staffApi } from '../../lib/api';

// Mock the staff API
jest.mock('../../lib/api');
const mockStaffApi = staffApi as jest.Mocked<typeof staffApi>;

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock QR Scanner
jest.mock('../../components/staff/QRScanner', () => {
  return function MockQRScanner({ onScan }: { onScan: (code: string) => void }) {
    return (
      <div data-testid="qr-scanner">
        <button
          onClick={() => onScan('GUEST123')}
          data-testid="mock-scan-button"
        >
          Simulate QR Scan
        </button>
      </div>
    );
  };
});

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Check-In Process Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Complete check-in flow from authentication to QR scanning', async () => {
    // Mock staff authentication
    mockStaffApi.verifyCredentials.mockResolvedValue({
      session_token: 'staff_token_123',
      wedding_id: 1,
      expires_in: 3600,
    });

    // Mock QR code scanning
    mockStaffApi.scanQRCode.mockResolvedValue({
      success: true,
      message: 'Guest checked in successfully',
      guest_name: 'John Doe',
      checked_in_at: '2024-01-01T10:00:00Z',
      is_duplicate: false,
    });

    // Mock stats
    mockStaffApi.getStats.mockResolvedValue({
      total_guests: 150,
      checked_in_count: 1,
      pending_count: 149,
      checkin_rate: 0.67,
      recent_checkins: [
        {
          guest_name: 'John Doe',
          checked_in_at: '2024-01-01T10:00:00Z',
          method: 'QR_SCAN',
        },
      ],
    });

    // Mock guest list
    mockStaffApi.getGuests.mockResolvedValue([
      {
        id: 1,
        name: 'John Doe',
        table_number: 1,
        is_checked_in: true,
        checked_in_at: '2024-01-01T10:00:00Z',
        qr_code: 'GUEST123',
      },
      {
        id: 2,
        name: 'Jane Smith',
        table_number: 2,
        is_checked_in: false,
        qr_code: 'GUEST456',
      },
    ]);

    render(
      <TestWrapper>
        <StaffCheckInPage />
      </TestWrapper>
    );

    // Should show authentication form initially
    expect(screen.getByText(/staff authentication/i)).toBeInTheDocument();

    // Fill out authentication form
    const weddingCodeInput = screen.getByLabelText(/wedding code/i);
    const staffPinInput = screen.getByLabelText(/staff pin/i);

    await user.type(weddingCodeInput, 'AB12');
    await user.type(staffPinInput, '123456');

    // Submit authentication
    const loginButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(loginButton);

    // Should authenticate and show check-in interface
    await waitFor(() => {
      expect(screen.getByText(/qr scanner/i)).toBeInTheDocument();
    });

    expect(mockStaffApi.verifyCredentials).toHaveBeenCalledWith({
      wedding_code: 'AB12',
      staff_pin: '123456',
    });

    // Should show stats
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total guests
      expect(screen.getByText('1')).toBeInTheDocument(); // Checked in
    });

    // Simulate QR code scan
    const mockScanButton = screen.getByTestId('mock-scan-button');
    await user.click(mockScanButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/guest checked in successfully/i)).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(mockStaffApi.scanQRCode).toHaveBeenCalledWith('GUEST123', 'staff_token_123');
  });

  test('Manual check-in flow when QR scan fails', async () => {
    // Mock staff authentication
    mockStaffApi.verifyCredentials.mockResolvedValue({
      session_token: 'staff_token_123',
      wedding_id: 1,
      expires_in: 3600,
    });

    // Mock manual check-in
    mockStaffApi.manualCheckIn.mockResolvedValue({
      success: true,
      message: 'Guest checked in manually',
      guest_name: 'Jane Smith',
      checked_in_at: '2024-01-01T10:05:00Z',
      is_duplicate: false,
    });

    // Mock guest search
    mockStaffApi.getGuests.mockResolvedValue([
      {
        id: 1,
        name: 'John Doe',
        table_number: 1,
        is_checked_in: true,
        checked_in_at: '2024-01-01T10:00:00Z',
        qr_code: 'GUEST123',
      },
      {
        id: 2,
        name: 'Jane Smith',
        table_number: 2,
        is_checked_in: false,
        qr_code: 'GUEST456',
      },
    ]);

    mockStaffApi.getStats.mockResolvedValue({
      total_guests: 150,
      checked_in_count: 2,
      pending_count: 148,
      checkin_rate: 1.33,
      recent_checkins: [],
    });

    render(
      <TestWrapper>
        <StaffCheckInPage />
      </TestWrapper>
    );

    // Authenticate first
    const weddingCodeInput = screen.getByLabelText(/wedding code/i);
    const staffPinInput = screen.getByLabelText(/staff pin/i);

    await user.type(weddingCodeInput, 'AB12');
    await user.type(staffPinInput, '123456');

    const loginButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(loginButton);

    // Wait for check-in interface
    await waitFor(() => {
      expect(screen.getByText(/qr scanner/i)).toBeInTheDocument();
    });

    // Switch to manual check-in tab
    const manualCheckInTab = screen.getByRole('tab', { name: /manual check-in/i });
    await user.click(manualCheckInTab);

    // Search for guest
    const searchInput = screen.getByPlaceholderText(/search guests/i);
    await user.type(searchInput, 'Jane');

    // Should show filtered guest list
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Click check-in button for Jane Smith
    const checkInButton = screen.getByRole('button', { name: /check in jane smith/i });
    await user.click(checkInButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/guest checked in manually/i)).toBeInTheDocument();
    });

    expect(mockStaffApi.manualCheckIn).toHaveBeenCalledWith(2, 'staff_token_123');
  });

  test('Duplicate check-in handling', async () => {
    // Mock staff authentication
    mockStaffApi.verifyCredentials.mockResolvedValue({
      session_token: 'staff_token_123',
      wedding_id: 1,
      expires_in: 3600,
    });

    // Mock duplicate check-in attempt
    mockStaffApi.scanQRCode.mockResolvedValue({
      success: true,
      message: 'Guest already checked in',
      guest_name: 'John Doe',
      checked_in_at: '2024-01-01T10:00:00Z',
      is_duplicate: true,
    });

    mockStaffApi.getStats.mockResolvedValue({
      total_guests: 150,
      checked_in_count: 1,
      pending_count: 149,
      checkin_rate: 0.67,
      recent_checkins: [],
    });

    mockStaffApi.getGuests.mockResolvedValue([]);

    render(
      <TestWrapper>
        <StaffCheckInPage />
      </TestWrapper>
    );

    // Authenticate
    const weddingCodeInput = screen.getByLabelText(/wedding code/i);
    const staffPinInput = screen.getByLabelText(/staff pin/i);

    await user.type(weddingCodeInput, 'AB12');
    await user.type(staffPinInput, '123456');

    const loginButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(loginButton);

    // Wait for check-in interface
    await waitFor(() => {
      expect(screen.getByText(/qr scanner/i)).toBeInTheDocument();
    });

    // Simulate QR code scan for already checked-in guest
    const mockScanButton = screen.getByTestId('mock-scan-button');
    await user.click(mockScanButton);

    // Should show duplicate check-in warning
    await waitFor(() => {
      expect(screen.getByText(/guest already checked in/i)).toBeInTheDocument();
      expect(screen.getByText(/duplicate/i)).toBeInTheDocument();
    });

    expect(mockStaffApi.scanQRCode).toHaveBeenCalledWith('GUEST123', 'staff_token_123');
  });

  test('Error handling for invalid wedding code', async () => {
    // Mock authentication failure
    mockStaffApi.verifyCredentials.mockRejectedValue({
      status: 401,
      message: 'Invalid wedding code',
    });

    render(
      <TestWrapper>
        <StaffCheckInPage />
      </TestWrapper>
    );

    // Fill out authentication form with invalid credentials
    const weddingCodeInput = screen.getByLabelText(/wedding code/i);
    const staffPinInput = screen.getByLabelText(/staff pin/i);

    await user.type(weddingCodeInput, 'INVALID');
    await user.type(staffPinInput, '000000');

    // Submit authentication
    const loginButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(loginButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/invalid wedding code/i)).toBeInTheDocument();
    });

    // Should remain on authentication form
    expect(screen.getByLabelText(/wedding code/i)).toBeInTheDocument();
    expect(mockStaffApi.verifyCredentials).toHaveBeenCalledWith({
      wedding_code: 'INVALID',
      staff_pin: '000000',
    });
  });

  test('Error handling for invalid QR code', async () => {
    // Mock staff authentication
    mockStaffApi.verifyCredentials.mockResolvedValue({
      session_token: 'staff_token_123',
      wedding_id: 1,
      expires_in: 3600,
    });

    // Mock invalid QR code scan
    mockStaffApi.scanQRCode.mockRejectedValue({
      status: 404,
      message: 'Guest not found',
    });

    mockStaffApi.getStats.mockResolvedValue({
      total_guests: 150,
      checked_in_count: 0,
      pending_count: 150,
      checkin_rate: 0,
      recent_checkins: [],
    });

    mockStaffApi.getGuests.mockResolvedValue([]);

    render(
      <TestWrapper>
        <StaffCheckInPage />
      </TestWrapper>
    );

    // Authenticate
    const weddingCodeInput = screen.getByLabelText(/wedding code/i);
    const staffPinInput = screen.getByLabelText(/staff pin/i);

    await user.type(weddingCodeInput, 'AB12');
    await user.type(staffPinInput, '123456');

    const loginButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(loginButton);

    // Wait for check-in interface
    await waitFor(() => {
      expect(screen.getByText(/qr scanner/i)).toBeInTheDocument();
    });

    // Simulate invalid QR code scan
    const mockScanButton = screen.getByTestId('mock-scan-button');
    await user.click(mockScanButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/guest not found/i)).toBeInTheDocument();
    });

    expect(mockStaffApi.scanQRCode).toHaveBeenCalledWith('GUEST123', 'staff_token_123');
  });

  test('Real-time updates via WebSocket', async () => {
    // Mock staff authentication
    mockStaffApi.verifyCredentials.mockResolvedValue({
      session_token: 'staff_token_123',
      wedding_id: 1,
      expires_in: 3600,
    });

    mockStaffApi.getStats.mockResolvedValue({
      total_guests: 150,
      checked_in_count: 0,
      pending_count: 150,
      checkin_rate: 0,
      recent_checkins: [],
    });

    mockStaffApi.getGuests.mockResolvedValue([]);

    render(
      <TestWrapper>
        <StaffCheckInPage />
      </TestWrapper>
    );

    // Authenticate
    const weddingCodeInput = screen.getByLabelText(/wedding code/i);
    const staffPinInput = screen.getByLabelText(/staff pin/i);

    await user.type(weddingCodeInput, 'AB12');
    await user.type(staffPinInput, '123456');

    const loginButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(loginButton);

    // Wait for check-in interface
    await waitFor(() => {
      expect(screen.getByText(/qr scanner/i)).toBeInTheDocument();
    });

    // Verify WebSocket connection was established
    expect(global.WebSocket).toHaveBeenCalledWith(
      expect.stringContaining('/ws/checkin/1')
    );

    // Simulate WebSocket message for new check-in
    const mockWebSocketMessage = {
      type: 'checkin_update',
      data: {
        guest_name: 'Alice Johnson',
        checked_in_at: '2024-01-01T10:10:00Z',
        total_checked_in: 1,
      },
    };

    // Simulate receiving WebSocket message
    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    if (messageHandler) {
      messageHandler({
        data: JSON.stringify(mockWebSocketMessage),
      });
    }

    // Should update the UI with real-time data
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });
});