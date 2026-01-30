# Implementation Plan: Guest Check-In Status Display

## Overview

This implementation plan converts the guest check-in status display design into discrete coding tasks. The approach focuses on enhancing the existing GuestList component with minimal changes, adding visual indicators for check-in status, implementing filtering capabilities, and ensuring all existing functionality remains intact.

## Tasks

- [ ] 1. Create CheckInStatusCell component
  - Create new component file `frontend/src/components/guests/CheckInStatusCell.tsx`
  - Implement visual states for checked-in (green checkmark badge) and not-checked-in (gray pending badge)
  - Add timestamp formatting and display for checked-in guests
  - Ensure dark mode compatibility with appropriate color classes
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 4.1, 4.2_

  - [ ]* 1.1 Write property test for check-in status display
    - **Property 1: Check-In Status Display**
    - **Validates: Requirements 1.2, 1.3, 4.1, 4.2**

  - [ ]* 1.2 Write property test for timestamp display and formatting
    - **Property 2: Timestamp Display and Formatting**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 1.3 Write unit tests for CheckInStatusCell edge cases
    - Test missing timestamp with is_checked_in true
    - Test invalid timestamp format handling
    - Test visual indicator rendering
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3_

- [ ] 2. Add check-in column to GuestList table
  - Modify `frontend/src/components/guests/GuestList.tsx` to add "Checked In" column header
  - Position the column between "Table" and "RSVP Status" columns
  - Add CheckInStatusCell component to table rows
  - Pass `is_checked_in` and `checked_in_at` props from guest data
  - Ensure responsive design is maintained
  - _Requirements: 1.1, 1.4, 5.3_

  - [ ]* 2.1 Write unit tests for column integration
    - Test column header presence and positioning
    - Test CheckInStatusCell rendering in table rows
    - Test responsive layout preservation
    - _Requirements: 1.1, 1.4, 5.3_

- [ ] 3. Implement check-in status filtering
  - Add `checkInFilter` state variable to GuestList component
  - Create filter UI with three options: "All", "Checked In", "Not Checked In"
  - Implement filter logic in the existing `filteredGuests` computation
  - Ensure filter UI matches existing RSVP filter styling
  - _Requirements: 7.1, 7.2_

  - [ ]* 3.1 Write property test for filter combination
    - **Property 7: Filter Combination**
    - **Validates: Requirements 7.4**

  - [ ]* 3.2 Write unit tests for filter functionality
    - Test "Checked In" filter shows only checked-in guests
    - Test "Not Checked In" filter shows only pending guests
    - Test "All" filter shows all guests
    - _Requirements: 7.1, 7.2_

- [ ] 4. Update guest count statistics
  - Modify statistics calculation to account for check-in filters
  - Ensure guest count updates when check-in filter is applied
  - Maintain existing statistics for RSVP and search filters
  - _Requirements: 7.3_

  - [ ]* 4.1 Write property test for filter statistics update
    - **Property 6: Filter Statistics Update**
    - **Validates: Requirements 7.3**

  - [ ]* 4.2 Write unit tests for statistics calculation
    - Test count accuracy with check-in filter applied
    - Test count accuracy with combined filters
    - _Requirements: 7.3_

- [ ] 5. Checkpoint - Verify UI enhancements
  - Ensure all tests pass for CheckInStatusCell and filtering
  - Manually test check-in column display with various guest states
  - Manually test filter combinations (check-in + RSVP + search)
  - Verify responsive design on mobile and desktop
  - Ask the user if questions arise

- [ ] 6. Enhance CSV export functionality
  - Modify CSV export logic in GuestList to include check-in status column
  - Format check-in status as "Yes" or "No" in exported data
  - Include `checked_in_at` timestamp in ISO format for checked-in guests
  - Add column headers for check-in data in CSV
  - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 6.1 Write property test for CSV export integration
    - **Property 5: CSV Export Integration**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 6.2 Write unit tests for CSV export format
    - Test check-in status column presence in CSV
    - Test "Yes/No" formatting for status
    - Test ISO timestamp format for checked-in guests
    - Test empty timestamp for not-checked-in guests
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 7. Verify real-time updates
  - Test that check-in status updates when staff checks in guests
  - Verify 30-second polling interval updates the display
  - Ensure both status indicator and timestamp update together
  - Test with multiple guests checking in simultaneously
  - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 7.1 Write property test for data change reactivity
    - **Property 3: Data Change Reactivity**
    - **Validates: Requirements 3.2**

  - [ ]* 7.2 Write unit tests for real-time update scenarios
    - Test status change from pending to checked-in
    - Test timestamp appearance after check-in
    - Test multiple simultaneous updates
    - _Requirements: 3.1, 3.2_

- [ ] 8. Regression testing for existing functionality
  - Test all existing guest management operations (add, edit, delete)
  - Test existing search functionality with check-in column present
  - Test existing RSVP filter functionality
  - Test existing sort functionality
  - Test send invitation functionality
  - Verify table layout and responsive design
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 8.1 Write property test for existing functionality preservation
    - **Property 4: Existing Functionality Preservation**
    - **Validates: Requirements 5.1, 5.2, 5.4**

  - [ ]* 8.2 Write unit tests for regression scenarios
    - Test search with check-in column present
    - Test RSVP filter with check-in column present
    - Test guest edit/delete with check-in column present
    - Test send invitation with check-in column present
    - _Requirements: 5.1, 5.2, 5.4_

- [ ] 9. Visual consistency and theming
  - Verify check-in status indicators match existing RSVP status styling
  - Test dark mode appearance for all check-in UI elements
  - Ensure color contrast meets accessibility standards
  - Test visual indicators on various screen sizes
  - _Requirements: 4.3, 4.4_

  - [ ]* 9.1 Write unit tests for visual consistency
    - Test color classes for light and dark themes
    - Test badge styling consistency with RSVP badges
    - Test icon rendering
    - _Requirements: 4.3, 4.4_

- [ ] 10. Final checkpoint - Comprehensive testing
  - Run all unit tests and property tests
  - Verify all 7 correctness properties pass with 100+ iterations
  - Manually test complete guest management workflow with check-in status
  - Test filter combinations (all permutations)
  - Test CSV export with various guest states
  - Verify real-time updates work correctly
  - Ask the user if questions arise

- [ ] 11. Documentation and cleanup
  - Add JSDoc comments to CheckInStatusCell component
  - Update GuestList component documentation
  - Document filter behavior and CSV export format
  - Remove any console.log statements
  - Verify code follows project style guidelines
  - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests should run with minimum 100 iterations using fast-check library
- No backend changes required - existing API already provides check-in data
- No database changes required - existing schema already has check-in fields
- The implementation leverages existing 30-second polling for real-time updates
- All visual elements should maintain consistency with existing UI patterns
- Dark mode support is required for all new UI components
