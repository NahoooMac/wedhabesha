import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmbeddedMap from './EmbeddedMap';

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true
});

// Mock fetch for geocoding
global.fetch = vi.fn();

// Mock Leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: any) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: (props: any) => <div data-testid="tile-layer" {...props} />,
  Marker: ({ children, ...props }: any) => (
    <div data-testid="marker" {...props}>
      {children}
    </div>
  ),
  Popup: ({ children, ...props }: any) => (
    <div data-testid="popup" {...props}>
      {children}
    </div>
  ),
}));

// Mock Leaflet CSS import
vi.mock('leaflet/dist/leaflet.css', () => ({}));

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
}));

describe('EmbeddedMap', () => {
  beforeEach(() => {
    mockWindowOpen.mockClear();
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    // Mock successful geocoding response
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve([
        { lat: '9.0320', lon: '38.7469' }
      ])
    });

    render(
      <EmbeddedMap 
        venueName="Test Venue"
        venueAddress="Test Address"
      />
    );

    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('renders map after successful geocoding', async () => {
    // Mock successful geocoding response
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve([
        { lat: '9.0320', lon: '38.7469' }
      ])
    });

    render(
      <EmbeddedMap 
        venueName="Test Venue"
        venueAddress="Test Address"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // Use getAllByText since venue name appears in both overlay and popup
    expect(screen.getAllByText('Test Venue')).toHaveLength(2);
    expect(screen.getAllByText('Test Address')).toHaveLength(2);
  });

  it('opens Google Maps when overlay button is clicked', async () => {
    // Mock successful geocoding response
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve([
        { lat: '9.0320', lon: '38.7469' }
      ])
    });

    render(
      <EmbeddedMap 
        venueName="Test Venue"
        venueAddress="Test Address"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // Find the overlay button by title attribute
    const overlayButton = screen.getByTitle('Open in Google Maps');
    fireEvent.click(overlayButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('google.com/maps/search'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('uses default location when no address provided', async () => {
    // Mock successful geocoding response
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve([
        { lat: '9.0320', lon: '38.7469' }
      ])
    });

    render(
      <EmbeddedMap venueName="Test Venue" />
    );

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // Check that the geocoding was called with the default query
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('Test%20Venue%2C%20Addis%20Ababa%2C%20Ethiopia')
    );
  });

  it('renders with custom className', async () => {
    // Mock successful geocoding response
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve([
        { lat: '9.0320', lon: '38.7469' }
      ])
    });

    const { container } = render(
      <EmbeddedMap 
        venueName="Test Venue"
        className="custom-class"
      />
    );

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});