# Guest Invitation & RSVP System - Requirements

## Feature Overview
Add invitation template selection and delivery options to the existing Guest Management interface. Guests receive personalized invitation links with their name and QR code embedded in the selected template.

## User Stories

### US-1: Template Selection in Guest Management
**As a** couple in the guest management section  
**I want to** select an invitation template from a gallery  
**So that** I can send beautiful invitations to my guests

**Acceptance Criteria:**
- 1.1: Template selector appears in the existing guest management interface
- 1.2: Gallery shows 3-5 pre-designed invitation templates
- 1.3: Selected template is saved to the wedding record
- 1.4: Template preview shows how it will look with guest data
- 1.5: One template applies to all guests for that wedding

### US-2: Delivery Method Selection
**As a** couple  
**I want to** choose how to send invitations (SMS or copy link)  
**So that** I can reach guests through their preferred channel

**Acceptance Criteria:**
- 2.1: Two delivery options: "Send via SMS" and "Copy Link"
- 2.2: SMS option sends to guest's phone number
- 2.3: Copy link option copies the unique URL to clipboard
- 2.4: Both options available in the existing guest list interface
- 2.5: Bulk send option for sending SMS to all guests at once

### US-3: Unique Guest Links
**As a** system  
**I need to** generate unique invitation URLs for each guest  
**So that** each guest sees their personalized invitation

**Acceptance Criteria:**
- 3.1: URL format: `/{wedding_code}/{guest_unique_code}`
- 3.2: Guest unique code is auto-generated when guest is created
- 3.3: Guest code is 8-12 characters, alphanumeric, URL-safe
- 3.4: No duplicate codes within a wedding
- 3.5: Guest code maps to exactly one guest record

### US-4: Dynamic Invitation Page
**As a** guest  
**I want to** view my personalized invitation  
**So that** I can see wedding details and my QR code

**Acceptance Criteria:**
- 4.1: Page shows selected template with guest name inserted
- 4.2: QR code is generated and displayed for the guest
- 4.3: Wedding details shown (date, venue, time)
- 4.4: Download button to save invitation as image
- 4.5: Mobile-responsive design
- 4.6: Invalid codes show friendly error message

### US-5: RSVP on Invitation Page
**As a** guest  
**I want to** respond to the invitation  
**So that** the couple knows if I'm attending

**Acceptance Criteria:**
- 5.1: Accept/Decline buttons on invitation page
- 5.2: Optional message field for guest notes
- 5.3: RSVP response saved to guest record
- 5.4: Confirmation shown after submission
- 5.5: Guest can update response later

### US-6: RSVP Status in Guest List
**As a** couple  
**I want to** see RSVP status in my guest list  
**So that** I can track who's attending

**Acceptance Criteria:**
- 6.1: Guest list shows RSVP status column (Pending/Accepted/Declined)
- 6.2: Filter guests by RSVP status
- 6.3: Summary stats show total accepted/declined/pending
- 6.4: Status updates in real-time when guests respond

### US-7: Template Customization
**As a** couple  
**I want to** customize the invitation template text and layout  
**So that** it matches my wedding theme and includes my details

**Acceptance Criteria:**
- 7.1: Templates use PNG background images with overlay text
- 7.2: Couples can edit wedding title/names (e.g., "Sarah & John")
- 7.3: Couples can edit ceremony details (date, time, venue, address)
- 7.4: Couples can add a custom message (e.g., "Join us for our special day")
- 7.5: Text positioning can be adjusted (top, center, bottom)
- 7.6: Font size can be adjusted (small, medium, large)
- 7.7: Text color can be selected from preset options (white, black, gold, etc.)
- 7.8: QR code position can be set (bottom-left, bottom-right, bottom-center)
- 7.9: Preview shows real-time changes
- 7.10: Customization applies to all guest invitations

### US-8: RSVP Analytics Dashboard
**As a** couple  
**I want to** view detailed RSVP analytics  
**So that** I can make informed decisions about my wedding planning

**Acceptance Criteria:**
- 8.1: Dashboard shows key metrics (total invited, accepted, declined, pending, response rate %)
- 8.2: Visual chart shows RSVP breakdown (pie or bar chart)
- 8.3: Timeline chart shows responses over time
- 8.4: List of guests who haven't responded yet
- 8.5: Average response time metric
- 8.6: SMS delivery success rate
- 8.7: Most recent responses shown with timestamps
- 8.8: Export analytics as PDF or CSV
- 8.9: Filter analytics by date range


## Technical Requirements

### TR-1: Database Changes
**Guest table additions:**
- `unique_code` VARCHAR(12) - unique guest identifier
- `rsvp_status` ENUM('pending', 'accepted', 'declined') - default 'pending'
- `rsvp_message` TEXT - optional guest message
- `rsvp_responded_at` TIMESTAMP - when guest responded
- `invitation_sent_at` TIMESTAMP - when invitation was sent

**Wedding table additions:**
- `invitation_template_id` VARCHAR(50) - selected template identifier
- `invitation_customization` JSON - stores customization settings:
  ```json
  {
    "wedding_title": "Sarah & John",
    "ceremony_date": "June 15, 2024",
    "ceremony_time": "4:00 PM",
    "venue_name": "Grand Hotel",
    "venue_address": "123 Main St, City",
    "custom_message": "Join us for our special day",
    "text_color": "#FFFFFF",
    "font_size": "medium",
    "text_position": "center",
    "qr_position": "bottom-center"
  }
  ```

### TR-2: Template System
**PNG Background Images:**
- Store 3-5 pre-designed PNG templates in `/public/templates/`
- Template dimensions: 1080x1920px (mobile-optimized portrait)
- Templates have designated areas for text overlay
- Each template has a config file defining default text positions

**Text Overlay:**
- Use HTML Canvas API to composite PNG + text + QR code
- Text rendered on top of PNG background
- Support for custom fonts (Google Fonts)
- Text shadow for readability on various backgrounds

**Template Structure:**
```
/public/templates/
  ├── elegant/
  │   ├── background.png
  │   └── config.json
  ├── modern/
  │   ├── background.png
  │   └── config.json
  └── traditional/
      ├── background.png
      └── config.json
```

### TR-3: URL Structure
- Pattern: `/{wedding_code}/{guest_unique_code}`
- Example: `/RST0KZ/ABC123XYZ`
- Both codes are alphanumeric, URL-safe

### TR-4: QR Code
- Contains: `{wedding_code}:{guest_unique_code}`
- Compatible with existing check-in system
- Generated on-demand when invitation page loads
- Size: 200x200px with white background

### TR-5: SMS Integration
- Use existing AfroMessage service
- Message: "You're invited! View your invitation: [URL]"
- Send to guest's phone number from guest record

### TR-6: Image Download
- Use HTML Canvas to composite: PNG background + text + QR code
- Export as PNG (high quality)
- Filename: `invitation-{guest-name}.png`
- Resolution: 1080x1920px

### TR-7: Analytics Calculations
- Response rate: (accepted + declined) / total_invited * 100
- Average response time: AVG(rsvp_responded_at - invitation_sent_at)
- SMS success rate: successful_deliveries / total_sent * 100
- Daily response counts for timeline chart

## Implementation Notes

### Existing Components to Modify
1. **Guest List Component** - Add template selector, send buttons, RSVP column
2. **Guest API** - Add RSVP endpoints
3. **Wedding API** - Add template selection and customization endpoints
4. **Dashboard** - Add RSVP analytics section

### New Components to Create
1. **Invitation Page** - Public route `/{wedding_code}/{guest_code}`
2. **Template Gallery** - Modal for template selection with preview
3. **Template Customizer** - Form for editing text, colors, positions
4. **RSVP Form** - Accept/Decline buttons with optional message
5. **Analytics Dashboard** - Charts and metrics for RSVP tracking

### Integration Points
- Reuse existing SMS service (`smsService.js`)
- Reuse existing QR code generation from check-in system
- Extend existing guest management UI
- Add analytics to existing dashboard

### Libraries Needed
- `qrcode` - QR code generation
- `html2canvas` or `canvas` - Image composition and export
- `recharts` or `chart.js` - Analytics charts
- Google Fonts API - Custom fonts for text overlay

## Success Metrics
- Guests can view invitation in < 2 seconds
- 90%+ SMS delivery success rate
- RSVP response rate > 70%
- Zero guest code collisions
- Template customization saves in < 1 second
- Analytics dashboard loads in < 3 seconds

## Out of Scope
- Email delivery
- Plus-one management
- RSVP deadline enforcement
- Video invitations
- Animated templates
- Multi-page invitations

## Priority
**High** - Core feature for guest communication
