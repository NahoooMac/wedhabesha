import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import VendorDirectoryPage from '../../pages/VendorDirectoryPage';
import { vendorApi } from '../../lib/api';

// Mock the vendor API
jest.mock('../../lib/api');
const mockVendorApi = vendorApi as jest.Mocked<typeof vendorApi>;

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  },
  googleProvider: {},
}));

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

describe('Vendor Discovery and Lead Generation Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  const mockVendors = [
    {
      id: 1,
      business_name: 'Elegant Photography',
      category: 'photography' as const,
      location: 'New York, NY',
      description: 'Professional wedding photography services',
      is_verified: true,
      rating: 4.8,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      business_name: 'Grand Venues',
      category: 'venue' as const,
      location: 'Los Angeles, CA',
      description: 'Luxury wedding venues and event spaces',
      is_verified: true,
      rating: 4.9,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 3,
      business_name: 'Gourmet Catering',
      category: 'catering' as const,
      location: 'Chicago, IL',
      description: 'Fine dining catering for special events',
      is_verified: false,
      rating: 4.5,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockCategories = [
    { value: 'photography', label: 'Photography' },
    { value: 'venue', label: 'Venue' },
    { value: 'catering', label: 'Catering' },
    { value: 'music', label: 'Music' },
  ];

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();

    // Mock successful auth state for couple
    const mockUser = {
      id: 1,
      email: 'couple@example.com',
      user_type: 'COUPLE' as const,
      auth_provider: 'EMAIL' as const,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    };

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

  test('Complete vendor discovery flow with search and filtering', async () => {
    // Mock API responses
    mockVendorApi.searchVendors.mockResolvedValue({
      vendors: mockVendors,
      total: mockVendors.length,
      skip: 0,
      limit: 20,
      has_more: false,
    });

    mockVendorApi.getCategories.mockResolvedValue(mockCategories);

    render(
      <TestWrapper>
        <VendorDirectoryPage />
      </TestWrapper>
    );

    // Should show vendor directory
    await waitFor(() => {
      expect(screen.getByText(/vendor directory/i)).toBeInTheDocument();
    });

    // Should show all vendors initially
    await waitFor(() => {
      expect(screen.getByText('Elegant Photography')).toBeInTheDocument();
      expect(screen.getByText('Grand Venues')).toBeInTheDocument();
      expect(screen.getByText('Gourmet Catering')).toBeInTheDocument();
    });

    expect(mockVendorApi.searchVendors).toHaveBeenCalledWith({
      skip: 0,
      limit: 20,
    });

    // Test search functionality
    const searchInput = screen.getByPlaceholderText(/search vendors/i);
    await user.type(searchInput, 'photography');

    // Should trigger search
    await waitFor(() => {
      expect(mockVendorApi.searchVendors).toHaveBeenCalledWith({
        search: 'photography',
        skip: 0,
        limit: 20,
      });
    });

    // Test category filtering
    const categoryFilter = screen.getByLabelText(/category/i);
    await user.selectOptions(categoryFilter, 'venue');

    await waitFor(() => {
      expect(mockVendorApi.searchVendors).toHaveBeenCalledWith({
        search: 'photography',
        category: 'venue',
        skip: 0,
        limit: 20,
      });
    });

    // Test location filtering
    const locationInput = screen.getByPlaceholderText(/location/i);
    await user.type(locationInput, 'New York');

    await waitFor(() => {
      expect(mockVendorApi.searchVendors).toHaveBeenCalledWith({
        search: 'photography',
        category: 'venue',
        location: 'New York',
        skip: 0,
        limit: 20,
      });
    });

    // Test verified only filter
    const verifiedOnlyCheckbox = screen.getByLabelText(/verified only/i);
    await user.click(verifiedOnlyCheckbox);

    await waitFor(() => {
      expect(mockVendorApi.searchVendors).toHaveBeenCalledWith({
        search: 'photography',
        category: 'venue',
        location: 'New York',
        verified_only: true,
        skip: 0,
        limit: 20,
      });
    });

    // Test minimum rating filter
    const ratingFilter = screen.getByLabelText(/minimum rating/i);
    await user.selectOptions(ratingFilter, '4.5');

    await waitFor(() => {
      expect(mockVendorApi.searchVendors).toHaveBeenCalledWith({
        search: 'photography',
        category: 'venue',
        location: 'New York',
        verified_only: true,
        min_rating: 4.5,
        skip: 0,
        limit: 20,
      });
    });
  });

  test('Vendor profile viewing and lead generation', async () => {
    // Mock vendor search
    mockVendorApi.searchVendors.mockResolvedValue({
      vendors: [mockVendors[0]],
      total: 1,
      skip: 0,
      limit: 20,
      has_more: false,
    });

    mockVendorApi.getCategories.mockResolvedValue(mockCategories);

    // Mock vendor details
    mockVendorApi.getVendor.mockResolvedValue(mockVendors[0]);

    // Mock vendor reviews
    mockVendorApi.getVendorReviews.mockResolvedValue({
      reviews: [
        {
          id: 1,
          vendor_id: 1,
          couple_id: 2,
          rating: 5,
          comment: 'Amazing photography service!',
          is_verified: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      skip: 0,
      limit: 10,
      has_more: false,
      average_rating: 5.0,
    });

    // Mock rating breakdown
    mockVendorApi.getRatingBreakdown.mockResolvedValue({
      total_reviews: 10,
      average_rating: 4.8,
      rating_distribution: {
        5: 8,
        4: 2,
        3: 0,
        2: 0,
        1: 0,
      },
      recent_reviews: [],
    });

    // Mock lead creation
    mockVendorApi.contactVendor.mockResolvedValue({
      id: 1,
      vendor_id: 1,
      couple_id: 1,
      message: 'Interested in your photography services',
      budget_range: '$2000-$3000',
      event_date: '2024-12-25',
      status: 'new',
      created_at: '2024-01-01T00:00:00Z',
    });

    render(
      <TestWrapper>
        <VendorDirectoryPage />
      </TestWrapper>
    );

    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Elegant Photography')).toBeInTheDocument();
    });

    // Click on vendor to view profile
    const vendorCard = screen.getByText('Elegant Photography');
    await user.click(vendorCard);

    // Should show vendor profile modal
    await waitFor(() => {
      expect(screen.getByText(/vendor profile/i)).toBeInTheDocument();
      expect(screen.getByText('Professional wedding photography services')).toBeInTheDocument();
    });

    expect(mockVendorApi.getVendor).toHaveBeenCalledWith(1);
    expect(mockVendorApi.getVendorReviews).toHaveBeenCalledWith(1, {
      verified_only: true,
      skip: 0,
      limit: 10,
    });

    // Should show reviews
    await waitFor(() => {
      expect(screen.getByText('Amazing photography service!')).toBeInTheDocument();
    });

    // Click contact vendor button
    const contactButton = screen.getByRole('button', { name: /contact vendor/i });
    await user.click(contactButton);

    // Should show contact form
    await waitFor(() => {
      expect(screen.getByText(/contact elegant photography/i)).toBeInTheDocument();
    });

    // Fill out contact form
    const messageTextarea = screen.getByLabelText(/message/i);
    const budgetSelect = screen.getByLabelText(/budget range/i);
    const eventDateInput = screen.getByLabelText(/event date/i);

    await user.type(messageTextarea, 'Interested in your photography services for our wedding');
    await user.selectOptions(budgetSelect, '$2000-$3000');
    await user.type(eventDateInput, '2024-12-25');

    // Submit contact form
    const sendMessageButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendMessageButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument();
    });

    expect(mockVendorApi.contactVendor).toHaveBeenCalledWith(1, {
      message: 'Interested in your photography services for our wedding',
      budget_range: '$2000-$3000',
      event_date: '2024-12-25',
    });
  });

  test('Review submission flow', async () => {
    // Mock vendor search
    mockVendorApi.searchVendors.mockResolvedValue({
      vendors: [mockVendors[0]],
      total: 1,
      skip: 0,
      limit: 20,
      has_more: false,
    });

    mockVendorApi.getCategories.mockResolvedValue(mockCategories);
    mockVendorApi.getVendor.mockResolvedValue(mockVendors[0]);
    mockVendorApi.getVendorReviews.mockResolvedValue({
      reviews: [],
      total: 0,
      skip: 0,
      limit: 10,
      has_more: false,
    });

    // Mock review eligibility check
    mockVendorApi.checkReviewEligibility.mockResolvedValue({
      can_review: true,
      has_booking: true,
      already_reviewed: false,
      reason: 'You can review this vendor',
    });

    // Mock review creation
    mockVendorApi.createReview.mockResolvedValue({
      id: 1,
      vendor_id: 1,
      couple_id: 1,
      rating: 5,
      comment: 'Excellent service!',
      is_verified: false,
      created_at: '2024-01-01T00:00:00Z',
    });

    render(
      <TestWrapper>
        <VendorDirectoryPage />
      </TestWrapper>
    );

    // Wait for vendors to load and click on vendor
    await waitFor(() => {
      expect(screen.getByText('Elegant Photography')).toBeInTheDocument();
    });

    const vendorCard = screen.getByText('Elegant Photography');
    await user.click(vendorCard);

    // Wait for profile modal
    await waitFor(() => {
      expect(screen.getByText(/vendor profile/i)).toBeInTheDocument();
    });

    // Click write review button
    const writeReviewButton = screen.getByRole('button', { name: /write review/i });
    await user.click(writeReviewButton);

    // Should check eligibility
    expect(mockVendorApi.checkReviewEligibility).toHaveBeenCalledWith(1);

    // Should show review form
    await waitFor(() => {
      expect(screen.getByText(/write a review/i)).toBeInTheDocument();
    });

    // Fill out review form
    const ratingStars = screen.getAllByRole('button', { name: /star/i });
    await user.click(ratingStars[4]); // 5 stars

    const commentTextarea = screen.getByLabelText(/comment/i);
    await user.type(commentTextarea, 'Excellent service! Highly recommended.');

    // Submit review
    const submitReviewButton = screen.getByRole('button', { name: /submit review/i });
    await user.click(submitReviewButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/review submitted successfully/i)).toBeInTheDocument();
    });

    expect(mockVendorApi.createReview).toHaveBeenCalledWith(1, {
      rating: 5,
      comment: 'Excellent service! Highly recommended.',
    });
  });

  test('Error handling for ineligible review submission', async () => {
    // Mock vendor search
    mockVendorApi.searchVendors.mockResolvedValue({
      vendors: [mockVendors[0]],
      total: 1,
      skip: 0,
      limit: 20,
      has_more: false,
    });

    mockVendorApi.getCategories.mockResolvedValue(mockCategories);
    mockVendorApi.getVendor.mockResolvedValue(mockVendors[0]);
    mockVendorApi.getVendorReviews.mockResolvedValue({
      reviews: [],
      total: 0,
      skip: 0,
      limit: 10,
      has_more: false,
    });

    // Mock review eligibility check - not eligible
    mockVendorApi.checkReviewEligibility.mockResolvedValue({
      can_review: false,
      has_booking: false,
      already_reviewed: false,
      reason: 'You must book services with this vendor before reviewing',
    });

    render(
      <TestWrapper>
        <VendorDirectoryPage />
      </TestWrapper>
    );

    // Wait for vendors to load and click on vendor
    await waitFor(() => {
      expect(screen.getByText('Elegant Photography')).toBeInTheDocument();
    });

    const vendorCard = screen.getByText('Elegant Photography');
    await user.click(vendorCard);

    // Wait for profile modal
    await waitFor(() => {
      expect(screen.getByText(/vendor profile/i)).toBeInTheDocument();
    });

    // Click write review button
    const writeReviewButton = screen.getByRole('button', { name: /write review/i });
    await user.click(writeReviewButton);

    // Should show eligibility error
    await waitFor(() => {
      expect(screen.getByText(/you must book services with this vendor before reviewing/i)).toBeInTheDocument();
    });

    expect(mockVendorApi.checkReviewEligibility).toHaveBeenCalledWith(1);
  });

  test('Pagination in vendor search results', async () => {
    // Mock first page
    mockVendorApi.searchVendors.mockResolvedValueOnce({
      vendors: mockVendors.slice(0, 2),
      total: 3,
      skip: 0,
      limit: 2,
      has_more: true,
    });

    // Mock second page
    mockVendorApi.searchVendors.mockResolvedValueOnce({
      vendors: mockVendors.slice(2, 3),
      total: 3,
      skip: 2,
      limit: 2,
      has_more: false,
    });

    mockVendorApi.getCategories.mockResolvedValue(mockCategories);

    render(
      <TestWrapper>
        <VendorDirectoryPage />
      </TestWrapper>
    );

    // Should show first page of vendors
    await waitFor(() => {
      expect(screen.getByText('Elegant Photography')).toBeInTheDocument();
      expect(screen.getByText('Grand Venues')).toBeInTheDocument();
      expect(screen.queryByText('Gourmet Catering')).not.toBeInTheDocument();
    });

    // Should show pagination controls
    expect(screen.getByText(/showing 1-2 of 3/i)).toBeInTheDocument();

    // Click next page
    const nextPageButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextPageButton);

    // Should load second page
    await waitFor(() => {
      expect(screen.getByText('Gourmet Catering')).toBeInTheDocument();
      expect(screen.queryByText('Elegant Photography')).not.toBeInTheDocument();
    });

    expect(mockVendorApi.searchVendors).toHaveBeenCalledWith({
      skip: 2,
      limit: 2,
    });
  });

  test('Error handling for failed vendor search', async () => {
    // Mock API error
    mockVendorApi.searchVendors.mockRejectedValue({
      status: 500,
      message: 'Internal server error',
    });

    mockVendorApi.getCategories.mockResolvedValue(mockCategories);

    render(
      <TestWrapper>
        <VendorDirectoryPage />
      </TestWrapper>
    );

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/failed to load vendors/i)).toBeInTheDocument();
    });

    // Should show retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Mock successful retry
    mockVendorApi.searchVendors.mockResolvedValue({
      vendors: mockVendors,
      total: mockVendors.length,
      skip: 0,
      limit: 20,
      has_more: false,
    });

    // Click retry
    await user.click(retryButton);

    // Should load vendors successfully
    await waitFor(() => {
      expect(screen.getByText('Elegant Photography')).toBeInTheDocument();
    });
  });
});