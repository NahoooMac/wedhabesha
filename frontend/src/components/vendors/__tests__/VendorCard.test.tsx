import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VendorCard from '../VendorCard';
import { VendorResponse } from '../../../lib/api';

const mockVendor: VendorResponse = {
  id: 1,
  business_name: 'Test Vendor',
  category: 'photography',
  location: 'Addis Ababa',
  description: 'A professional photography service for weddings',
  is_verified: true,
  rating: 4.5,
  created_at: '2024-01-01T00:00:00Z'
};

const mockOnContact = jest.fn();
const mockOnViewProfile = jest.fn();

describe('VendorCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders vendor information correctly', () => {
    render(
      <VendorCard
        vendor={mockVendor}
        onContact={mockOnContact}
        onViewProfile={mockOnViewProfile}
      />
    );

    expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    expect(screen.getByText('Addis Ababa')).toBeInTheDocument();
    expect(screen.getByText('Photography')).toBeInTheDocument();
    expect(screen.getByText('A professional photography service for weddings')).toBeInTheDocument();
  });

  it('shows verified badge for verified vendors', () => {
    render(
      <VendorCard
        vendor={mockVendor}
        onContact={mockOnContact}
        onViewProfile={mockOnViewProfile}
      />
    );

    expect(screen.getByText('Verified Business')).toBeInTheDocument();
  });

  it('displays rating correctly', () => {
    render(
      <VendorCard
        vendor={mockVendor}
        onContact={mockOnContact}
        onViewProfile={mockOnViewProfile}
      />
    );

    expect(screen.getByText('(4.5)')).toBeInTheDocument();
  });

  it('calls onContact when contact button is clicked', () => {
    render(
      <VendorCard
        vendor={mockVendor}
        onContact={mockOnContact}
        onViewProfile={mockOnViewProfile}
      />
    );

    fireEvent.click(screen.getByText('Contact'));
    expect(mockOnContact).toHaveBeenCalledWith(mockVendor);
  });

  it('calls onViewProfile when view profile button is clicked', () => {
    render(
      <VendorCard
        vendor={mockVendor}
        onContact={mockOnContact}
        onViewProfile={mockOnViewProfile}
      />
    );

    fireEvent.click(screen.getByText('View Profile'));
    expect(mockOnViewProfile).toHaveBeenCalledWith(mockVendor);
  });

  it('handles vendor without rating', () => {
    const vendorWithoutRating = { ...mockVendor, rating: undefined };
    
    render(
      <VendorCard
        vendor={vendorWithoutRating}
        onContact={mockOnContact}
        onViewProfile={mockOnViewProfile}
      />
    );

    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
  });
});