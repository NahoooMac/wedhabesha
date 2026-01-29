import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import DashboardPage from '../../pages/DashboardPage';
import { apiClient } from '../../lib/api';

// Mock the API client
jest.mock('../../lib/api');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  },
  googleProvider: {},
}));

// Mock components that might cause issues in tests
jest.mock('../../components/staff/QRScanner', () => {
  return function MockQRScanner() {
    return <div data-testid="qr-scanner">QR Scanner Mock</div>;
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
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Wedding Setup and Guest Management Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    
    // Mock successful auth state
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      user_type: 'COUPLE' as const,
      auth_provider: 'EMAIL' as const,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    };

    // Mock auth context
    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
      user: mockUser,
      firebaseUser: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signInWithEmail: jest.fn(),
      signUpWithEmail: jest.fn(),
      logout: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Complete wedding setup flow', async () => {
    // Mock API responses for wedding setup
    mockApiClient.get.mockImplementation((endpoint) => {
      if (endpoint === '/api/v1/weddings/me') {
        return Promise.reject({ status: 404 }); // No wedding exists yet
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    mockApiClient.post.mockImplementation((endpoint, data) => {
      if (endpoint === '/api/v1/weddings') {
        return Promise.resolve({
          id: 1,
          wedding_code: 'AB12',
          staff_pin: '123456',
          wedding_date: data.wedding_date,
          venue_name: data.venue_name,
          venue_address: data.venue_address,
          expected_guests: data.expected_guests,
          created_at: '2024-01-01T00:00:00Z',
        });
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Should show wedding setup wizard when no wedding exists
    await waitFor(() => {
      expect(screen.getByText(/set up your wedding/i)).toBeInTheDocument();
    });

    // Fill out wedding setup form
    const weddingDateInput = screen.getByLabelText(/wedding date/i);
    const venueNameInput = screen.getByLabelText(/venue name/i);
    const venueAddressInput = screen.getByLabelText(/venue address/i);
    const expectedGuestsInput = screen.getByLabelText(/expected guests/i);

    await user.type(weddingDateInput, '2024-12-25');
    await user.type(venueNameInput, 'Grand Ballroom');
    await user.type(venueAddressInput, '123 Wedding St, City, State');
    await user.type(expectedGuestsInput, '150');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create wedding/i });
    await user.click(submitButton);

    // Should show success message and wedding details
    await waitFor(() => {
      expect(screen.getByText(/wedding created successfully/i)).toBeInTheDocument();
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/weddings', {
      wedding_date: '2024-12-25',
      venue_name: 'Grand Ballroom',
      venue_address: '123 Wedding St, City, State',
      expected_guests: 150,
    });
  });

  test('Guest management flow - add, edit, and delete guests', async () => {
    // Mock existing wedding
    const mockWedding = {
      id: 1,
      wedding_code: 'AB12',
      wedding_date: '2024-12-25',
      venue_name: 'Grand Ballroom',
      venue_address: '123 Wedding St, City, State',
      expected_guests: 150,
      created_at: '2024-01-01T00:00:00Z',
    };

    const mockGuests = [
      {
        id: 1,
        wedding_id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        qr_code: 'QR123',
        table_number: 1,
        dietary_restrictions: 'Vegetarian',
        created_at: '2024-01-01T00:00:00Z',
        is_checked_in: false,
      },
    ];

    mockApiClient.get.mockImplementation((endpoint) => {
      if (endpoint === '/api/v1/weddings/me') {
        return Promise.resolve(mockWedding);
      }
      if (endpoint === '/api/v1/weddings/1/guests') {
        return Promise.resolve(mockGuests);
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    mockApiClient.post.mockImplementation((endpoint, data) => {
      if (endpoint === '/api/v1/weddings/1/guests') {
        return Promise.resolve({
          id: 2,
          wedding_id: 1,
          name: data.name,
          email: data.email,
          phone: data.phone,
          qr_code: 'QR456',
          table_number: data.table_number,
          dietary_restrictions: data.dietary_restrictions,
          created_at: '2024-01-01T00:00:00Z',
          is_checked_in: false,
        });
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    mockApiClient.put.mockImplementation((endpoint, data) => {
      if (endpoint === '/api/v1/weddings/1/guests/1') {
        return Promise.resolve({
          ...mockGuests[0],
          ...data,
        });
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    mockApiClient.delete.mockImplementation((endpoint) => {
      if (endpoint === '/api/v1/weddings/1/guests/1') {
        return Promise.resolve({});
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Wait for wedding and guests to load
    await waitFor(() => {
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    // Navigate to guest management
    const guestManagementTab = screen.getByRole('tab', { name: /guests/i });
    await user.click(guestManagementTab);

    // Should show existing guest
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Add a new guest
    const addGuestButton = screen.getByRole('button', { name: /add guest/i });
    await user.click(addGuestButton);

    // Fill out guest form
    const nameInput = screen.getByLabelText(/guest name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const phoneInput = screen.getByLabelText(/phone/i);
    const tableInput = screen.getByLabelText(/table number/i);
    const dietaryInput = screen.getByLabelText(/dietary restrictions/i);

    await user.type(nameInput, 'Jane Smith');
    await user.type(emailInput, 'jane@example.com');
    await user.type(phoneInput, '+1987654321');
    await user.type(tableInput, '2');
    await user.type(dietaryInput, 'Gluten-free');

    // Submit guest form
    const saveGuestButton = screen.getByRole('button', { name: /save guest/i });
    await user.click(saveGuestButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/guest added successfully/i)).toBeInTheDocument();
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/weddings/1/guests', {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1987654321',
      table_number: 2,
      dietary_restrictions: 'Gluten-free',
    });

    // Edit existing guest
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    // Update guest information
    const editNameInput = screen.getByDisplayValue('John Doe');
    await user.clear(editNameInput);
    await user.type(editNameInput, 'John Smith');

    const updateGuestButton = screen.getByRole('button', { name: /update guest/i });
    await user.click(updateGuestButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/guest updated successfully/i)).toBeInTheDocument();
    });

    expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/weddings/1/guests/1', {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+1234567890',
      table_number: 1,
      dietary_restrictions: 'Vegetarian',
    });

    // Delete guest
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    // Confirm deletion
    const confirmDeleteButton = screen.getByRole('button', { name: /confirm delete/i });
    await user.click(confirmDeleteButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/guest deleted successfully/i)).toBeInTheDocument();
    });

    expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/weddings/1/guests/1');
  });

  test('Bulk guest import flow', async () => {
    // Mock existing wedding
    const mockWedding = {
      id: 1,
      wedding_code: 'AB12',
      wedding_date: '2024-12-25',
      venue_name: 'Grand Ballroom',
      venue_address: '123 Wedding St, City, State',
      expected_guests: 150,
      created_at: '2024-01-01T00:00:00Z',
    };

    mockApiClient.get.mockImplementation((endpoint) => {
      if (endpoint === '/api/v1/weddings/me') {
        return Promise.resolve(mockWedding);
      }
      if (endpoint === '/api/v1/weddings/1/guests') {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    mockApiClient.post.mockImplementation((endpoint, data) => {
      if (endpoint === '/api/v1/weddings/1/guests/bulk-import') {
        return Promise.resolve({
          total_guests: data.guests.length,
          successful_imports: data.guests.length,
          failed_imports: 0,
          errors: [],
          imported_guests: data.guests.map((guest: any, index: number) => ({
            id: index + 1,
            wedding_id: 1,
            ...guest,
            qr_code: `QR${index + 1}`,
            created_at: '2024-01-01T00:00:00Z',
            is_checked_in: false,
          })),
        });
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Wait for wedding to load
    await waitFor(() => {
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    // Navigate to guest management
    const guestManagementTab = screen.getByRole('tab', { name: /guests/i });
    await user.click(guestManagementTab);

    // Open bulk import modal
    const bulkImportButton = screen.getByRole('button', { name: /bulk import/i });
    await user.click(bulkImportButton);

    // Should show bulk import modal
    await waitFor(() => {
      expect(screen.getByText(/import guests/i)).toBeInTheDocument();
    });

    // Add guests manually in the bulk import interface
    const addRowButton = screen.getByRole('button', { name: /add row/i });
    await user.click(addRowButton);

    // Fill out first guest
    const nameInputs = screen.getAllByLabelText(/name/i);
    const emailInputs = screen.getAllByLabelText(/email/i);

    await user.type(nameInputs[0], 'Alice Johnson');
    await user.type(emailInputs[0], 'alice@example.com');

    // Add another row
    await user.click(addRowButton);

    // Fill out second guest
    await user.type(nameInputs[1], 'Bob Wilson');
    await user.type(emailInputs[1], 'bob@example.com');

    // Submit bulk import
    const importButton = screen.getByRole('button', { name: /import guests/i });
    await user.click(importButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/2 guests imported successfully/i)).toBeInTheDocument();
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/weddings/1/guests/bulk-import', {
      guests: [
        { name: 'Alice Johnson', email: 'alice@example.com' },
        { name: 'Bob Wilson', email: 'bob@example.com' },
      ],
    });
  });

  test('Error handling in wedding setup flow', async () => {
    // Mock API error
    mockApiClient.get.mockImplementation((endpoint) => {
      if (endpoint === '/api/v1/weddings/me') {
        return Promise.reject({ status: 404 });
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    mockApiClient.post.mockImplementation((endpoint) => {
      if (endpoint === '/api/v1/weddings') {
        return Promise.reject({
          status: 400,
          message: 'Wedding date must be in the future',
        });
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Should show wedding setup wizard
    await waitFor(() => {
      expect(screen.getByText(/set up your wedding/i)).toBeInTheDocument();
    });

    // Fill out form with invalid data
    const weddingDateInput = screen.getByLabelText(/wedding date/i);
    const venueNameInput = screen.getByLabelText(/venue name/i);
    const venueAddressInput = screen.getByLabelText(/venue address/i);
    const expectedGuestsInput = screen.getByLabelText(/expected guests/i);

    await user.type(weddingDateInput, '2020-01-01'); // Past date
    await user.type(venueNameInput, 'Test Venue');
    await user.type(venueAddressInput, 'Test Address');
    await user.type(expectedGuestsInput, '50');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create wedding/i });
    await user.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/wedding date must be in the future/i)).toBeInTheDocument();
    });

    // Form should still be visible for retry
    expect(screen.getByLabelText(/wedding date/i)).toBeInTheDocument();
  });
});