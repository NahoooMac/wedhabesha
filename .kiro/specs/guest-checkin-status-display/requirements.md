# Requirements Document

## Introduction

This specification defines the enhancement to the guest management system to display check-in status information in the guest management table. The system already has a working check-in infrastructure with QR code scanning capabilities for staff, and the database contains the necessary check-in fields. This enhancement will make the check-in status visible to couples in their guest management interface.

## Glossary

- **Guest_Management_System**: The frontend interface used by couples to view and manage their wedding guests
- **Check_In_Status**: The current state of a guest's check-in (checked in or not checked in)
- **Check_In_Timestamp**: The date and time when a guest was checked in
- **Guest_Table**: The data table component that displays guest information in rows and columns
- **Real_Time_Updates**: The automatic refresh mechanism that updates the display when data changes
- **Staff_Check_In_System**: The existing QR code scanning system used by staff to check in guests

## Requirements

### Requirement 1: Display Check-In Status Column

**User Story:** As a couple, I want to see a "Checked In" column in the guest management table, so that I can quickly identify which guests have arrived at my wedding.

#### Acceptance Criteria

1. WHEN viewing the guest management table, THE Guest_Management_System SHALL display a "Checked In" column header
2. WHEN a guest is checked in, THE Guest_Management_System SHALL display "Yes" or a checkmark indicator in the check-in status column
3. WHEN a guest is not checked in, THE Guest_Management_System SHALL display "No" or an empty/pending indicator in the check-in status column
4. THE Guest_Management_System SHALL position the check-in status column between the "Table" and "RSVP Status" columns for logical flow

### Requirement 2: Display Check-In Timestamp

**User Story:** As a couple, I want to see when each guest checked in, so that I can track arrival patterns and timing.

#### Acceptance Criteria

1. WHEN a guest has checked in, THE Guest_Management_System SHALL display the check-in timestamp below the status indicator
2. WHEN displaying the timestamp, THE Guest_Management_System SHALL format it as a readable date and time (e.g., "Dec 15, 2:30 PM")
3. WHEN a guest has not checked in, THE Guest_Management_System SHALL not display any timestamp information

### Requirement 3: Real-Time Status Updates

**User Story:** As a couple, I want the check-in status to update automatically when staff check in guests, so that I can see live arrival information without manually refreshing.

#### Acceptance Criteria

1. WHEN the Staff_Check_In_System checks in a guest, THE Guest_Management_System SHALL reflect the updated status within 30 seconds
2. WHEN the check-in status changes, THE Guest_Management_System SHALL update both the status indicator and timestamp
3. THE Guest_Management_System SHALL maintain the existing 30-second polling interval for data refresh

### Requirement 4: Visual Status Indicators

**User Story:** As a couple, I want clear visual indicators for check-in status, so that I can quickly scan the table and identify checked-in guests.

#### Acceptance Criteria

1. WHEN displaying checked-in status, THE Guest_Management_System SHALL use a green checkmark icon or "✓ Checked In" badge
2. WHEN displaying not-checked-in status, THE Guest_Management_System SHALL use a gray pending indicator or "Pending" text
3. THE Guest_Management_System SHALL maintain visual consistency with existing RSVP status styling
4. THE Guest_Management_System SHALL ensure the status indicators are clearly visible in both light and dark themes

### Requirement 5: Maintain Existing Functionality

**User Story:** As a couple, I want all existing guest management features to continue working normally, so that adding check-in status doesn't break my current workflow.

#### Acceptance Criteria

1. WHEN the check-in column is added, THE Guest_Management_System SHALL preserve all existing columns and their functionality
2. WHEN the check-in column is added, THE Guest_Management_System SHALL maintain existing search, filter, and sort capabilities
3. WHEN the check-in column is added, THE Guest_Management_System SHALL preserve existing responsive design and table layout
4. THE Guest_Management_System SHALL continue to support all existing guest management actions (edit, delete, send invitations)

### Requirement 6: Export Functionality Integration

**User Story:** As a couple, I want check-in status included in CSV exports, so that I can analyze attendance data offline.

#### Acceptance Criteria

1. WHEN exporting guest data to CSV, THE Guest_Management_System SHALL include the check-in status as a column
2. WHEN exporting checked-in guests, THE Guest_Management_System SHALL include the check-in timestamp in the export
3. THE Guest_Management_System SHALL format exported check-in data as "Yes/No" for status and ISO timestamp for check-in time

### Requirement 7: Filter by Check-In Status

**User Story:** As a couple, I want to filter guests by their check-in status, so that I can focus on either checked-in guests or those who haven't arrived yet.

#### Acceptance Criteria

1. THE Guest_Management_System SHALL provide a filter option to show only checked-in guests
2. THE Guest_Management_System SHALL provide a filter option to show only guests who haven't checked in
3. WHEN applying check-in filters, THE Guest_Management_System SHALL update the guest count statistics accordingly
4. THE Guest_Management_System SHALL allow combining check-in filters with existing RSVP and search filters