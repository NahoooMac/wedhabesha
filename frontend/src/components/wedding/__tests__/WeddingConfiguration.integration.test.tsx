/**
 * Integration tests for WeddingConfiguration component
 * Task 3.1: Add templates tab to WeddingConfiguration
 * Requirements: 9.1, 9.2, 9.3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WeddingConfiguration from '../WeddingConfiguration';
import { Wedding } from '../../../lib/api';

// Mock the child components
vi.mock('../WeddingDetailsSection', () => ({
  default: () => <div data-testid="wedding-details-section">Wedding Details Section</div>
}));

vi.mock('../RSVPTemplateSelector', () => ({
  default: ({ weddingId, currentTemplateId, currentCustomization, onTemplateChange }: any) => (
    <div data-testid="rsvp-template-selector">
      <div data-testid="wedding-id">{weddingId}</div>
      <div data-testid="current-template-id">{currentTemplateId || 'none'}</div>
      <div data-testid="current-customization">{JSON.stringify(currentCustomization)}</div>
      <button onClick={() => onTemplateChange?.('new-template')}>Change Template</button>
    </div>
  )
}));

vi.mock('../../invitations/TemplateSelector', () => ({
  default: () => <div data-testid="template-selector">Template Selector</div>
}));

vi.mock('../../invitations/InvitationEngine', () => ({
  InvitationEngine: () => <div data-testid="invitation-engine">Invitation Engine</div>
}));

describe('WeddingConfiguration - Task 3.1 Integration', () => {
  const mockWedding: Wedding = {
    id: 123,
    wedding_code: 'TEST123',
    wedding_date: '2025-06-15',
    venue_name: 'Test Venue',
    venue_address: '123 Test St',
    expected_guests: 100,
    template_id: 'elegant-gold',
    template_customization: {
      wedding_title: 'Test Wedding',
      ceremony_date: '2025-06-15',
      ceremony_time: '4:00 PM',
      venue_name: 'Test Venue',
      venue_address: '123 Test St',
      custom_message: 'Join us!'
    },
    created_at: '2024-01-01T00:00:00Z'
  };

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  describe('Requirement 9.1: Templates tab in dashboard navigation', () => {
    it('should display "Invitation Design" tab in navigation', () => {
      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: createWrapper() });
      
      const invitationDesignTab = screen.getByRole('button', { name: /invitation design/i });
      expect(invitationDesignTab).toBeInTheDocument();
    });

    it('should display all tabs in correct order', () => {
      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: createWrapper() });
      
      const tabs = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('Wedding Details') ||
        btn.textContent?.includes('Invitation Design') ||
        btn.textContent?.includes('Invitation Template') ||
        btn.textContent?.includes('Preview')
      );

      expect(tabs).toHaveLength(4);
      expect(tabs[0]).toHaveTextContent('Wedding Details');
      expect(tabs[1]).toHaveTextContent('Invitation Design');
      expect(tabs[2]).toHaveTextContent('Invitation Template');
      expect(tabs[3]).toHaveTextContent('Preview');
    });
  });

  describe('Requirement 9.2: Render RSVPTemplateSelector in tab content', () => {
    it('should render RSVPTemplateSelector when Invitation Design tab is clicked', async () => {
      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: createWrapper() });
      
      const invitationDesignTab = screen.getByRole('button', { name: /invitation design/i });
      fireEvent.click(invitationDesignTab);

      await waitFor(() => {
        expect(screen.getByTestId('rsvp-template-selector')).toBeInTheDocument();
      });
    });

    it('should pass weddingId prop to RSVPTemplateSelector', async () => {
      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: createWrapper() });
      
      const invitationDesignTab = screen.getByRole('button', { name: /invitation design/i });
      fireEvent.click(invitationDesignTab);

      await waitFor(() => {
        expect(screen.getByTestId('wedding-id')).toHaveTextContent('123');
      });
    });

    it('should pass currentTemplateId prop to RSVPTemplateSelector', async () => {
      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: createWrapper() });
      
      const invitationDesignTab = screen.getByRole('button', { name: /invitation design/i });
      fireEvent.click(invitationDesignTab);

      await waitFor(() => {
        expect(screen.getByTestId('current-template-id')).toHaveTextContent('elegant-gold');
      });
    });

    it('should pass currentCustomization prop to RSVPTemplateSelector', async () => {
      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: createWrapper() });
      
      const invitationDesignTab = screen.getByRole('button', { name: /invitation design/i });
      fireEvent.click(invitationDesignTab);

      await waitFor(() => {
        const customizationElement = screen.getByTestId('current-customization');
        const customization = JSON.parse(customizationElement.textContent || '{}');
        expect(customization.wedding_title).toBe('Test Wedding');
        expect(customization.ceremony_date).toBe('2025-06-15');
      });
    });

    it('should handle wedding without template data', async () => {
      const weddingWithoutTemplate: Wedding = {
        ...mockWedding,
        template_id: undefined,
        template_customization: undefined
      };

      render(<WeddingConfiguration wedding={weddingWithoutTemplate} />, { wrapper: createWrapper() });
      
      const invitationDesignTab = screen.getByRole('button', { name: /invitation design/i });
      fireEvent.click(invitationDesignTab);

      await waitFor(() => {
        expect(screen.getByTestId('current-template-id')).toHaveTextContent('none');
      });
    });
  });

  describe('Requirement 9.3: Maintain navigation state when switching tabs', () => {
    it('should switch from Details to Invitation Design tab', async () => {
      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: createWrapper() });
      
      // Initially on Details tab
      expect(screen.getByTestId('wedding-details-section')).toBeInTheDocument();
      expect(screen.queryByTestId('rsvp-template-selector')).not.toBeInTheDocument();

      // Switch to Invitation Design tab
      const invitationDesignTab = screen.getByRole('button', { name: /invitation design/i });
      fireEvent.click(invitationDesignTab);

      await waitFor(() => {
        expect(screen.queryByTestId('wedding-details-section')).not.toBeInTheDocument();
        expect(screen.getByTestId('rsvp-template-selector')).toBeInTheDocument();
      });
    });

    it('should switch from Invitation Design back to Details tab', async () => {
      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: createWrapper() });
      
      // Switch to Invitation Design tab
      const invitationDesignTab = screen.getByRole('button', { name: /invitation design/i });
      fireEvent.click(invitationDesignTab);

      await waitFor(() => {
        expect(screen.getByTestId('rsvp-template-selector')).toBeInTheDocument();
      });

      // Switch back to Details tab
      const detailsTab = screen.getByRole('button', { name: /wedding details/i });
      fireEvent.click(detailsTab);

      await waitFor(() => {
        expect(screen.getByTestId('wedding-details-section')).toBeInTheDocument();
        expect(screen.queryByTestId('rsvp-template-selector')).not.toBeInTheDocument();
      });
    });

    it('should maintain active tab styling', async () => {
      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: createWrapper() });
      
      const invitationDesignTab = screen.getByRole('button', { name: /invitation design/i });
      const detailsTab = screen.getByRole('button', { name: /wedding details/i });

      // Initially Details tab should be active
      expect(detailsTab).toHaveClass('border-rose-500', 'text-rose-600');
      expect(invitationDesignTab).toHaveClass('border-transparent', 'text-gray-500');

      // Click Invitation Design tab
      fireEvent.click(invitationDesignTab);

      await waitFor(() => {
        expect(invitationDesignTab).toHaveClass('border-rose-500', 'text-rose-600');
        expect(detailsTab).toHaveClass('border-transparent', 'text-gray-500');
      });
    });

    it('should switch between all tabs without errors', async () => {
      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: createWrapper() });
      
      const tabs = [
        { name: /invitation design/i, testId: 'rsvp-template-selector' },
        { name: /invitation template/i, testId: 'template-selector' },
        { name: /preview/i, testId: 'invitation-engine' },
        { name: /wedding details/i, testId: 'wedding-details-section' }
      ];

      for (const tab of tabs) {
        const tabButton = screen.getByRole('button', { name: tab.name });
        fireEvent.click(tabButton);

        await waitFor(() => {
          expect(screen.getByTestId(tab.testId)).toBeInTheDocument();
        });
      }
    });
  });

  describe('onTemplateChange callback', () => {
    it('should handle template change callback from RSVPTemplateSelector', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      render(<WeddingConfiguration wedding={mockWedding} />, { wrapper: Wrapper });
      
      const invitationDesignTab = screen.getByRole('button', { name: /invitation design/i });
      fireEvent.click(invitationDesignTab);

      await waitFor(() => {
        expect(screen.getByTestId('rsvp-template-selector')).toBeInTheDocument();
      });

      // Trigger template change
      const changeButton = screen.getByRole('button', { name: /change template/i });
      fireEvent.click(changeButton);

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['wedding', 'current'] });
      });
    });
  });
});
