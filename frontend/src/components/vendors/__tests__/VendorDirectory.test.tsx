import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import VendorDirectory from '../VendorDirectory';
import { vendorApi } from '../../../lib/api';

// Mock the API
jest.mock('../../../lib/api', () => ({
  vendorApi: {
    getCategories: jest.fn(),
    searchVendors: jest.fn(),
  }
}));

// Mock the auth context
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false
  })
}));

const mockCategories = [
  { value: 'photography', label: 'Photography' },
  { value: 'catering', label: 'Catering' }
];

const mockVendors = {
  vendors: [
    {
      id: 1,
      business_name: 'Test Photographer',
      category: 'photography',
      location: 'Addis Ababa',
      description: 'Professional wedding photography',
      is_verified: true,
      rating: 4.5,
      created_at: '2024-01-01T00:00:00Z'
    }
  ],
  total: 1,
  skip: 0,
  limit: 12,
  has_more: false
};

describe('VendorDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vendorApi.getCategories as jest.Mock).mockResolvedValue(mockCategories);
    (vendorApi.searchVendors as jest.Mock).mockResolvedValue(mockVendors);
  });

  it('renders the vendor directory with search and results', async () => {
    render(<VendorDirectory />);

    // Check if the search component is rendered
    expect(screen.getByPlaceholderText('Search vendors by name or service...')).toBeInTheDocument();
    
    // Wait for vendors to load
    await waitFor(() => {
      expect(screen.getByText('Test Photographer')).toBeInTheDocument();
    });

    // Check if vendor information is displayed
    expect(screen.getByText('Addis Ababa')).toBeInTheDocument();
    expect(screen.getByText('Professional wedding photography')).toBeInTheDocument();
  });

  it('loads categories and vendors on mount', async () => {
    render(<VendorDirectory />);

    await waitFor(() => {
      expect(vendorApi.getCategories).toHaveBeenCalled();
      expect(vendorApi.searchVendors).toHaveBeenCalledWith({
        skip: 0,
        limit: 12
      });
    });
  });

  it('displays correct results count', async () => {
    render(<VendorDirectory />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1-1 of 1 vendors')).toBeInTheDocument();
    });
  });
});