# Guest Invitation & RSVP System - Implementation Tasks

## Phase 1: Database & Backend Setup

- [ ] 1.1 Create database migration script for guests table
- [ ] 1.2 Create database migration script for weddings table
- [ ] 1.3 Run database migrations
- [ ] 1.4 Create Template Service
- [ ] 1.5 Create Invitation Service
- [ ] 1.6 Create RSVP Service
- [ ] 1.7 Add invitation routes to server.js

## Phase 2: Template System

- [ ] 2.1 Create template directory structure
- [ ] 2.2 Add template PNG images and configs
- [ ] 2.3 Create invitation routes (GET templates, GET/PUT wedding settings)
- [ ] 2.4 Create Template Gallery Modal component
- [ ] 2.5 Create Template Customizer Form component
- [ ] 2.6 Create Canvas Renderer component

## Phase 3: Guest Management Integration

- [ ] 3.1 Update Guest List component with template selector
- [ ] 3.2 Add RSVP status column to Guest List
- [ ] 3.3 Add Send SMS button per guest
- [ ] 3.4 Add Copy Link button per guest
- [ ] 3.5 Add Send All bulk SMS button
- [ ] 3.6 Add RSVP filter tabs

## Phase 4: Public Invitation Page

- [ ] 4.1 Create Public Invitation Page component
- [ ] 4.2 Add route for /:weddingCode/:guestCode
- [ ] 4.3 Implement invitation data fetching
- [ ] 4.4 Implement Canvas rendering with guest data
- [ ] 4.5 Add download invitation button
- [ ] 4.6 Add error handling for invalid codes
- [ ] 4.7 Update API client with invitation endpoints

## Phase 5: RSVP System

- [ ] 5.1 Create RSVP routes (POST/PUT/GET)
- [ ] 5.2 Add RSVP form to invitation page
- [ ] 5.3 Implement RSVP submission logic
- [ ] 5.4 Add RSVP update functionality
- [ ] 5.5 Add confirmation message after RSVP
- [ ] 5.6 Update API client with RSVP endpoints

## Phase 6: Analytics Dashboard

- [ ] 6.1 Create RSVP analytics routes
- [ ] 6.2 Create RSVPAnalytics component
- [ ] 6.3 Add metrics display (totals, response rate)
- [ ] 6.4 Add RSVP breakdown chart
- [ ] 6.5 Add response timeline chart
- [ ] 6.6 Add export functionality

## Phase 7: Testing

- [ ] 7.1 Write unit tests for Template Service
- [ ] 7.2 Write unit tests for Invitation Service
- [ ] 7.3 Write unit tests for RSVP Service
- [ ] 7.4 Write unit tests for frontend components
- [ ] 7.5 Write property-based tests for guest code generation
- [ ] 7.6 Write integration tests for end-to-end flows

## Phase 8: Deployment

- [ ] 8.1 Update environment variables
- [ ] 8.2 Test SMS integration
- [ ] 8.3 Verify all routes are accessible
- [ ] 8.4 Deploy and monitor
