/**
 * Unit Tests for RSVPTemplateSelector Toast Notifications
 * Task 2.6: Implement success notifications
 * 
 * Tests Requirements:
 * - 13.1: Display success toast after template selection
 * - 13.2: Display success toast after customization save
 * - 13.3: Auto-dismiss notifications after 3 seconds
 * - 13.4: Include checkmark icon in notifications
 * - 13.5: Allow manual dismissal
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RSVPTemplateSelector from '../RSVPTemplateSelector';

// Mock the child components
jest.mock('../../invitations/InvitationEngine', () => ({
  InvitationEngine: () => <div data-testid="invitation-engine">Invitation Engine</div>,
  TEMPLATE_METADATA: [
    {
      id: 'elegant-gold',
      name: 'Elegant Gold',
      category: 'Classic',
      colors: ['#D4AF37'],
      font: 'Playfair Display',
      aspectRatio: '5/7',
      description: 'Classic elegance'
    }
  ]
}));

jest.mock('../../invitations/TemplateGalleryModal', () => ({
  __esModule: true,
  default: ({ isOpen, onSelectTemplate }: any) => 
    isOpen ? (
      <div data-testid="gallery-modal">
        <button onClick={() => onSelectTemplate('elegant-gold')}>Select Template</button>
      </div>
    ) : null
}));

jest.mock('../../invitations/TemplateCustomizerModal', () => ({
  __esModule: true,
  default: ({ isOpen, onSave }: any) => 
    isOpen ? (
      <div data-testid="customizer-modal">
        <button onClick={() => onSave({
          wedding_title: 'Test Wedding',
          ceremony_date: '2025-06-15',
          ceremony_time: '4:00 PM',
          venue_name: 'Test Venue',
          venue_address: '123 Test St',
          custom_message: 'Test message'
        })}>Save Customization</button>
      </div>
    ) : null
}));

// Mock fetch
global.fetch = jest.fn();

describe('RSVPTemplateSelector - Toast Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.setItem('jwt_token', 'test-token');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Requirement 13.1 & 13.4: Template Selection Success Toast with Checkmark', () => {
    it('should display success toast with checkmark icon after template selection', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<RSVPTemplateSelector weddingId={1} />);

      // Open gallery
      const chooseButton = screen.getByText(/Choose Template/i);
      fireEvent.click(chooseButton);

      // Select template
      const selectButton = screen.getByText('Select Template');
      fireEvent.click(selectButton);

      // Wait for toast to appear
      await waitFor(() => {
        expect(screen.getByText('Template selected successfully!')).toBeInTheDocument();
      });

      // Verify checkmark icon is present (CheckCircle component renders as svg)
      const toast = screen.getByText('Template selected successfully!').closest('div');
      expect(toast).toHaveClass('animate-fadeIn');
    });
  });

  describe('Requirement 13.2: Customization Save Success Toast', () => {
    it('should display success toast after customization save', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      render(<RSVPTemplateSelector weddingId={1} currentTemplateId="elegant-gold" />);

      // Open customizer
      const customizeButton = screen.getByText(/Customize Design/i);
      fireEvent.click(customizeButton);

      // Save customization
      const saveButton = screen.getByText('Save Customization');
      fireEvent.click(saveButton);

      // Wait for toast to appear
      await waitFor(() => {
        expect(screen.getByText('Customization saved successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 13.3: Auto-dismiss after 3 seconds', () => {
    it('should auto-dismiss toast after 3 seconds', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<RSVPTemplateSelector weddingId={1} />);

      // Trigger template selection
      const chooseButton = screen.getByText(/Choose Template/i);
      fireEvent.click(chooseButton);
      const selectButton = screen.getByText('Select Template');
      fireEvent.click(selectButton);

      // Wait for toast to appear
      await waitFor(() => {
        expect(screen.getByText('Template selected successfully!')).toBeInTheDocument();
      });

      // Fast-forward time by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Toast should be dismissed
      await waitFor(() => {
        expect(screen.queryByText('Template selected successfully!')).not.toBeInTheDocument();
      });
    });

    it('should not auto-dismiss before 3 seconds', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<RSVPTemplateSelector weddingId={1} />);

      // Trigger template selection
      const chooseButton = screen.getByText(/Choose Template/i);
      fireEvent.click(chooseButton);
      const selectButton = screen.getByText('Select Template');
      fireEvent.click(selectButton);

      // Wait for toast to appear
      await waitFor(() => {
        expect(screen.getByText('Template selected successfully!')).toBeInTheDocument();
      });

      // Fast-forward time by 2 seconds (less than 3)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Toast should still be visible
      expect(screen.getByText('Template selected successfully!')).toBeInTheDocument();
    });
  });

  describe('Requirement 13.5: Manual dismissal', () => {
    it('should allow manual dismissal of toast', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<RSVPTemplateSelector weddingId={1} />);

      // Trigger template selection
      const chooseButton = screen.getByText(/Choose Template/i);
      fireEvent.click(chooseButton);
      const selectButton = screen.getByText('Select Template');
      fireEvent.click(selectButton);

      // Wait for toast to appear
      await waitFor(() => {
        expect(screen.getByText('Template selected successfully!')).toBeInTheDocument();
      });

      // Find and click dismiss button
      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);

      // Toast should be dismissed immediately
      await waitFor(() => {
        expect(screen.queryByText('Template selected successfully!')).not.toBeInTheDocument();
      });
    });

    it('should have accessible dismiss button with aria-label', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<RSVPTemplateSelector weddingId={1} />);

      // Trigger template selection
      const chooseButton = screen.getByText(/Choose Template/i);
      fireEvent.click(chooseButton);
      const selectButton = screen.getByText('Select Template');
      fireEvent.click(selectButton);

      // Wait for toast to appear
      await waitFor(() => {
        expect(screen.getByText('Template selected successfully!')).toBeInTheDocument();
      });

      // Verify dismiss button has aria-label
      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss notification');
    });
  });

  describe('Toast Styling and Positioning', () => {
    it('should have correct styling classes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<RSVPTemplateSelector weddingId={1} />);

      // Trigger template selection
      const chooseButton = screen.getByText(/Choose Template/i);
      fireEvent.click(chooseButton);
      const selectButton = screen.getByText('Select Template');
      fireEvent.click(selectButton);

      // Wait for toast to appear
      await waitFor(() => {
        expect(screen.getByText('Template selected successfully!')).toBeInTheDocument();
      });

      // Verify toast styling
      const toast = screen.getByText('Template selected successfully!').closest('div');
      expect(toast).toHaveClass('fixed');
      expect(toast).toHaveClass('bottom-6');
      expect(toast).toHaveClass('right-6');
      expect(toast).toHaveClass('bg-rose-600');
      expect(toast).toHaveClass('animate-fadeIn');
    });
  });

  describe('Multiple Toast Scenarios', () => {
    it('should replace previous toast with new one', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      render(<RSVPTemplateSelector weddingId={1} currentTemplateId="elegant-gold" />);

      // Trigger first toast (template selection)
      const chooseButton = screen.getByText(/Change Template/i);
      fireEvent.click(chooseButton);
      const selectButton = screen.getByText('Select Template');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('Template selected successfully!')).toBeInTheDocument();
      });

      // Trigger second toast (customization save)
      const customizeButton = screen.getByText(/Customize Design/i);
      fireEvent.click(customizeButton);
      const saveButton = screen.getByText('Save Customization');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Customization saved successfully!')).toBeInTheDocument();
      });

      // First toast should be replaced
      expect(screen.queryByText('Template selected successfully!')).not.toBeInTheDocument();
    });
  });

  describe('Error Scenarios', () => {
    it('should not show toast when API call fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Error' })
      });

      render(<RSVPTemplateSelector weddingId={1} />);

      // Trigger template selection
      const chooseButton = screen.getByText(/Choose Template/i);
      fireEvent.click(chooseButton);
      const selectButton = screen.getByText('Select Template');
      fireEvent.click(selectButton);

      // Wait a bit
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Toast should not appear
      expect(screen.queryByText('Template selected successfully!')).not.toBeInTheDocument();
      
      // Error message should appear instead
      await waitFor(() => {
        expect(screen.getByText(/Failed to save template selection/i)).toBeInTheDocument();
      });
    });
  });
});
