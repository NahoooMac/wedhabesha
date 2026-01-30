# Design Document: Emoji Picker and Voice Message Features

## 1. Overview

This design document outlines the architecture and implementation approach for adding emoji picker and voice message recording capabilities to the existing couple-vendor messaging system. The design integrates seamlessly with the current SharedMessageInput and SharedMessageThread components while maintaining security, performance, and accessibility standards.

### 1.1 Design Goals

- Seamless integration with existing messaging UI components
- Native browser APIs for audio recording (MediaRecorder API)
- Lightweight emoji picker with fast search and filtering
- Secure audio file handling with encryption
- Mobile-first responsive design
- Full keyboard and screen reader accessibility
- Real-time voice message delivery via WebSocket

### 1.2 Architecture Principles

- Component reusability across couple and vendor messaging interfaces
- Progressive enhancement for browser compatibility
- Optimistic UI updates for better perceived performance
- Graceful degradation when features are unsupported
- Minimal external dependencies

## 2. System Architecture

### 2.1 Component Hierarchy

```
SharedMessageInput (existing)
├── EmojiPickerButton (new)
│   └── EmojiPicker (new)
│       ├── EmojiSearch (new)
│       ├── EmojiCategories (new)
│       └── EmojiGrid (new)
├── VoiceRecorderButton (new)
│   └── VoiceRecorder (new)
│       ├── RecordingControls (new)
│       ├── RecordingTimer (new)
│       ├── WaveformVisualizer (new)
│       └── AudioPreview (new)
└── TextInput (existing)

SharedMessageThread (existing)
└── VoiceMessageBubble (new)
    ├── AudioPlayer (new)
    ├── WaveformDisplay (new)
    └── PlaybackControls (new)
```

### 2.2 Data Flow

```
User Action → Component State → API Call → Backend Processing → WebSocket Broadcast → UI Update
```

**Emoji Flow:**
1. User clicks emoji button → EmojiPicker opens
2. User selects emoji → Emoji inserted at cursor position
3. User sends message → Standard message flow

**Voice Message Flow:**
1. User clicks voice button → Request microphone permission
2. User records audio → MediaRecorder captures audio chunks
3. User stops recording → Audio blob created
4. User sends → Upload to File_Upload_Service
5. Backend encrypts and stores → Returns file URL
6. Message sent via WebSocket → Recipients receive notification
7. Recipients see voice message → Can play audio



## 3. Component Design

### 3.1 EmojiPicker Component

**Location:** `frontend/src/components/communication/EmojiPicker.tsx`

**Props:**
```typescript
interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  anchorElement: HTMLElement | null;
  position?: 'top' | 'bottom';
}
```

**State:**
```typescript
interface EmojiPickerState {
  searchQuery: string;
  selectedCategory: EmojiCategory;
  recentEmojis: string[];
  filteredEmojis: Emoji[];
}
```

**Key Features:**
- Categorized emoji display (Smileys, Animals, Food, etc.)
- Real-time search with debouncing (100ms)
- Recent emojis tracking (stored in localStorage)
- Keyboard navigation support
- Touch-optimized for mobile
- Lazy loading of emoji images

**Implementation Notes:**
- Use `emoji-mart` or similar lightweight library
- Store recent emojis in localStorage (max 30)
- Implement virtual scrolling for performance
- Use CSS Grid for emoji layout
- Position picker above or below input based on available space

### 3.2 VoiceRecorder Component

**Location:** `frontend/src/components/communication/VoiceRecorder.tsx`

**Props:**
```typescript
interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // default 300 seconds (5 minutes)
}
```

**State:**
```typescript
interface VoiceRecorderState {
  status: 'idle' | 'requesting-permission' | 'recording' | 'paused' | 'preview';
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  waveformData: number[];
}
```

**Key Features:**
- MediaRecorder API integration
- Real-time waveform visualization
- Pause/resume functionality
- Audio preview with playback controls
- Automatic stop at max duration
- Error handling for permission denial

**Implementation Notes:**
- Use MediaRecorder with WebM/Opus codec (fallback to MP3)
- Capture audio chunks every 100ms for waveform
- Calculate waveform from audio data using Web Audio API
- Store recording in memory until sent or cancelled
- Release microphone immediately on cancel/send



### 3.3 VoiceMessageBubble Component

**Location:** `frontend/src/components/communication/VoiceMessageBubble.tsx`

**Props:**
```typescript
interface VoiceMessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  audioUrl: string;
  duration: number;
  waveformData?: number[];
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number) => void;
}
```

**State:**
```typescript
interface VoiceMessageBubbleState {
  isPlaying: boolean;
  currentTime: number;
  isLoading: boolean;
  error: string | null;
}
```

**Key Features:**
- Play/pause controls
- Seek functionality via waveform click
- Progress indicator
- Duration display
- Loading and error states
- Download option on error

**Implementation Notes:**
- Use HTML5 Audio element for playback
- Render waveform as SVG or Canvas
- Highlight played portion of waveform
- Pause other playing messages when starting new one
- Preload audio for smooth playback

### 3.4 AudioPlayer Hook

**Location:** `frontend/src/hooks/useAudioPlayer.ts`

**Interface:**
```typescript
interface UseAudioPlayerReturn {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
}

function useAudioPlayer(audioUrl: string): UseAudioPlayerReturn;
```

**Responsibilities:**
- Manage audio element lifecycle
- Handle playback state
- Provide seek functionality
- Track current time and duration
- Handle errors gracefully

## 4. API Design

### 4.1 Voice Message Upload Endpoint

**Endpoint:** `POST /api/v1/messaging/voice-upload`

**Request:**
```typescript
Content-Type: multipart/form-data

{
  threadId: string;
  audio: File; // WebM or MP3 file
  duration: number; // in seconds
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    fileId: string;
    fileUrl: string;
    duration: number;
    format: 'webm' | 'mp3';
    size: number;
  }
}
```

**Validation:**
- File size: max 10MB
- File type: audio/webm, audio/mp3, audio/ogg
- Duration: max 300 seconds
- Thread must exist and user must be participant



### 4.2 Send Voice Message Endpoint

**Endpoint:** `POST /api/v1/messaging/messages`

**Request:**
```typescript
{
  threadId: string;
  messageType: 'VOICE';
  content: string; // "Voice message"
  attachments: [{
    fileId: string;
    fileUrl: string;
    fileType: 'audio/webm' | 'audio/mp3';
    fileName: string;
    fileSize: number;
    metadata: {
      duration: number;
      waveform?: number[];
    }
  }]
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    message: Message; // includes voice attachment
  }
}
```

### 4.3 WebSocket Events

**New Event: `voice_message`**
```typescript
{
  type: 'voice_message';
  data: {
    messageId: string;
    threadId: string;
    senderId: string;
    senderName: string;
    audioUrl: string;
    duration: number;
    waveform?: number[];
    timestamp: string;
  }
}
```

## 5. Database Schema Updates

### 5.1 Messages Table (No Changes Required)

The existing `messages` table already supports attachments through the `attachments` JSON column. Voice messages will be stored as attachments with type `VOICE`.

### 5.2 Attachment Metadata Structure

```typescript
{
  fileId: string;
  fileUrl: string;
  fileType: 'audio/webm' | 'audio/mp3';
  fileName: string;
  fileSize: number;
  metadata: {
    duration: number; // in seconds
    format: 'webm' | 'mp3';
    waveform?: number[]; // array of amplitude values for visualization
    bitrate?: number;
  }
}
```

## 6. Security Considerations

### 6.1 Audio File Encryption

- All uploaded audio files encrypted using AES-256
- Encryption key stored securely in environment variables
- Files decrypted on-the-fly during retrieval
- Encrypted files stored with `.enc` extension

### 6.2 Permission Validation

- Verify user is participant in thread before upload
- Validate file size and type on server
- Rate limit voice message uploads (max 10 per minute per user)
- Scan uploaded files for malware

### 6.3 Content Security

- Set appropriate CORS headers for audio files
- Use signed URLs with expiration for audio access
- Implement Content Security Policy for audio sources
- Sanitize file names to prevent path traversal



## 7. Performance Optimization

### 7.1 Emoji Picker Optimization

- Lazy load emoji images as user scrolls
- Use sprite sheets for common emojis
- Implement virtual scrolling for large emoji lists
- Cache emoji data in memory after first load
- Debounce search input (100ms)
- Use CSS containment for better rendering performance

### 7.2 Voice Recording Optimization

- Stream audio chunks to prevent memory overflow
- Limit waveform data points (max 100 samples)
- Use Web Workers for waveform calculation
- Release microphone immediately after recording
- Compress audio before upload (if supported)

### 7.3 Voice Playback Optimization

- Preload audio files when message enters viewport
- Use audio sprite technique for multiple short messages
- Implement audio caching with Service Worker
- Lazy load waveform visualizations
- Use requestAnimationFrame for smooth waveform updates

## 8. Browser Compatibility

### 8.1 MediaRecorder API Support

**Supported Browsers:**
- Chrome 47+
- Firefox 25+
- Safari 14.1+
- Edge 79+

**Fallback Strategy:**
- Detect MediaRecorder support on component mount
- Hide voice recording button if unsupported
- Display message: "Voice messages require a modern browser"
- Provide link to browser compatibility information

### 8.2 Audio Format Support

**Primary Format:** WebM with Opus codec
- Best compression and quality
- Supported in Chrome, Firefox, Edge

**Fallback Format:** MP3
- Universal support
- Used when WebM not available (Safari)

**Detection Logic:**
```typescript
const getSupportedMimeType = (): string => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  return 'audio/webm'; // default
};
```

## 9. Accessibility Implementation

### 9.1 Emoji Picker Accessibility

**ARIA Attributes:**
```html
<button aria-label="Open emoji picker" aria-expanded="false">
  😊
</button>

<div role="dialog" aria-label="Emoji picker">
  <input 
    type="search" 
    aria-label="Search emojis"
    placeholder="Search..."
  />
  
  <div role="tablist" aria-label="Emoji categories">
    <button role="tab" aria-selected="true">Smileys</button>
    <button role="tab" aria-selected="false">Animals</button>
  </div>
  
  <div role="tabpanel" aria-label="Smileys">
    <button 
      role="option" 
      aria-label="Grinning face"
      data-emoji="😀"
    >
      😀
    </button>
  </div>
</div>
```

**Keyboard Navigation:**
- Tab: Move between search, categories, and emoji grid
- Arrow keys: Navigate within emoji grid
- Enter/Space: Select emoji
- Escape: Close picker



### 9.2 Voice Recorder Accessibility

**ARIA Attributes:**
```html
<button 
  aria-label="Start voice recording"
  aria-pressed="false"
>
  🎤
</button>

<div role="region" aria-label="Voice recorder" aria-live="polite">
  <div aria-label="Recording in progress">
    <span aria-live="off">Recording: 00:15</span>
    <button aria-label="Pause recording">⏸</button>
    <button aria-label="Stop recording">⏹</button>
  </div>
</div>
```

**Screen Reader Announcements:**
- "Recording started"
- "Recording paused at 15 seconds"
- "Recording resumed"
- "Recording stopped. Duration 45 seconds"
- "Voice message sent"

### 9.3 Voice Message Accessibility

**ARIA Attributes:**
```html
<div 
  role="region" 
  aria-label="Voice message from John, duration 45 seconds"
>
  <button 
    aria-label="Play voice message"
    aria-pressed="false"
  >
    ▶️
  </button>
  
  <div 
    role="slider" 
    aria-label="Audio progress"
    aria-valuemin="0"
    aria-valuemax="45"
    aria-valuenow="0"
    aria-valuetext="0 seconds of 45 seconds"
  >
    <!-- Waveform visualization -->
  </div>
</div>
```

## 10. Mobile Responsiveness

### 10.1 Emoji Picker Mobile Design

**Layout Changes:**
- Full-screen modal on screens < 768px
- Bottom sheet on screens < 480px
- Larger touch targets (min 44x44px)
- Native momentum scrolling
- Sticky search bar at top
- Category tabs at bottom for easy thumb access

**CSS Media Queries:**
```css
@media (max-width: 768px) {
  .emoji-picker {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
  }
}

@media (max-width: 480px) {
  .emoji-picker {
    top: auto;
    height: 60vh;
    border-radius: 16px 16px 0 0;
  }
}
```

### 10.2 Voice Recorder Mobile Design

**Touch Optimizations:**
- Larger recording button (56x56px)
- Haptic feedback on record start/stop
- Swipe up to lock recording
- Swipe left to cancel
- Visual feedback for touch interactions

**Mobile-Specific Features:**
```typescript
// Haptic feedback
if ('vibrate' in navigator) {
  navigator.vibrate(50); // Short vibration on record start
}

// Prevent screen sleep during recording
if ('wakeLock' in navigator) {
  const wakeLock = await navigator.wakeLock.request('screen');
}
```



## 11. Error Handling

### 11.1 Microphone Permission Errors

**Error Types:**
```typescript
enum MicrophoneError {
  PERMISSION_DENIED = 'permission_denied',
  NOT_FOUND = 'not_found',
  NOT_READABLE = 'not_readable',
  OVERCONSTRAINED = 'overconstrained',
  TYPE_ERROR = 'type_error'
}
```

**Error Messages:**
```typescript
const errorMessages = {
  permission_denied: {
    title: 'Microphone Access Denied',
    message: 'Please enable microphone access in your browser settings to record voice messages.',
    action: 'Learn How'
  },
  not_found: {
    title: 'No Microphone Found',
    message: 'No microphone detected. Please connect a microphone and try again.',
    action: 'Retry'
  },
  not_readable: {
    title: 'Microphone Unavailable',
    message: 'Your microphone is being used by another application.',
    action: 'Retry'
  }
};
```

### 11.2 Recording Errors

**Error Scenarios:**
- Recording fails to start
- Recording interrupted by system
- Browser tab loses focus during recording
- Memory limit exceeded
- Audio encoding fails

**Recovery Strategy:**
```typescript
const handleRecordingError = (error: Error) => {
  // Log error for debugging
  console.error('Recording error:', error);
  
  // Release resources
  stopMediaStream();
  
  // Show user-friendly message
  showErrorToast({
    title: 'Recording Failed',
    message: 'Unable to record audio. Please try again.',
    action: 'Retry'
  });
  
  // Reset to idle state
  setRecordingState('idle');
};
```

### 11.3 Upload Errors

**Error Scenarios:**
- Network connection lost
- File too large
- Server error
- Timeout

**Retry Logic:**
```typescript
const uploadWithRetry = async (
  audioBlob: Blob,
  maxRetries = 3
): Promise<UploadResponse> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadAudioFile(audioBlob);
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await delay(Math.pow(2, attempt) * 1000);
      }
    }
  }
  
  throw lastError;
};
```

## 12. Testing Strategy

### 12.1 Unit Tests

**EmojiPicker Tests:**
- Emoji selection inserts at cursor position
- Search filters emojis correctly
- Recent emojis are tracked
- Keyboard navigation works
- Closes on outside click

**VoiceRecorder Tests:**
- Requests microphone permission
- Starts/stops recording correctly
- Pause/resume functionality
- Timer updates accurately
- Handles permission denial
- Releases resources on cancel

**VoiceMessageBubble Tests:**
- Plays/pauses audio
- Seek functionality works
- Progress updates correctly
- Handles playback errors
- Pauses other messages when playing



### 12.2 Integration Tests

**Emoji Integration:**
- Emoji inserted into message and sent successfully
- Emoji displays correctly in message thread
- Multiple emojis can be inserted
- Emoji works with text messages

**Voice Message Integration:**
- Record → Upload → Send → Receive flow
- Voice message displays in thread
- Playback works for received messages
- Real-time delivery via WebSocket
- Encryption/decryption works correctly

### 12.3 Property-Based Tests

**Validates Requirements:**
- 1.4: Emoji search filters within 100ms
- 2.4: Recording timer updates every 100ms
- 2.7: Recording stops at 5 minutes
- 4.3: File size validation under 10MB
- 8.1: Emoji picker renders within 200ms
- 8.2: Emoji search returns results within 100ms

**Test Properties:**
```typescript
// Property: Emoji search is fast
fc.assert(
  fc.property(fc.string(), async (searchQuery) => {
    const startTime = performance.now();
    const results = await searchEmojis(searchQuery);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(100);
  })
);

// Property: Recording duration is accurate
fc.assert(
  fc.property(fc.integer(1, 300), async (targetDuration) => {
    const recording = await recordForDuration(targetDuration);
    const actualDuration = recording.duration;
    
    // Allow 100ms tolerance
    expect(Math.abs(actualDuration - targetDuration)).toBeLessThan(0.1);
  })
);
```

### 12.4 E2E Tests

**Scenarios:**
1. User opens emoji picker, selects emoji, sends message
2. User records voice message, previews, sends
3. User receives voice message, plays audio
4. User cancels voice recording
5. User handles microphone permission denial
6. User uses emoji picker on mobile device
7. User records voice message on mobile device

## 13. Implementation Phases

### Phase 1: Emoji Picker (Week 1)
- Create EmojiPicker component
- Implement emoji selection and insertion
- Add search functionality
- Integrate with SharedMessageInput
- Add keyboard navigation
- Write unit tests

### Phase 2: Voice Recording (Week 2)
- Create VoiceRecorder component
- Implement MediaRecorder integration
- Add recording controls (start, pause, stop)
- Implement waveform visualization
- Add audio preview
- Handle microphone permissions
- Write unit tests

### Phase 3: Voice Message Display (Week 3)
- Create VoiceMessageBubble component
- Implement audio playback
- Add waveform display
- Integrate with SharedMessageThread
- Handle multiple simultaneous messages
- Write unit tests

### Phase 4: Backend Integration (Week 4)
- Create voice upload endpoint
- Implement audio file encryption
- Add file validation and storage
- Update WebSocket handlers
- Add database migrations
- Write integration tests

### Phase 5: Mobile & Accessibility (Week 5)
- Optimize for mobile devices
- Add touch gestures
- Implement accessibility features
- Add ARIA labels and keyboard navigation
- Test with screen readers
- Write E2E tests

### Phase 6: Polish & Performance (Week 6)
- Performance optimization
- Error handling improvements
- UI polish and animations
- Browser compatibility testing
- Load testing
- Documentation



## 14. Correctness Properties

### Property 1: Emoji Insertion Preserves Cursor Position
**Validates:** Requirements 1.3, 1.9

**Specification:**
```
∀ text, cursorPos, emoji:
  LET result = insertEmoji(text, cursorPos, emoji)
  IN result.text = text[0:cursorPos] + emoji + text[cursorPos:]
     AND result.newCursorPos = cursorPos + length(emoji)
```

**Test Strategy:**
- Generate random text strings and cursor positions
- Insert various emojis at different positions
- Verify text integrity and cursor position

### Property 2: Recording Duration Accuracy
**Validates:** Requirements 2.4, 2.7

**Specification:**
```
∀ recording:
  LET actualDuration = recording.endTime - recording.startTime
  LET displayedDuration = recording.timerValue
  IN |actualDuration - displayedDuration| ≤ 100ms
     AND IF actualDuration ≥ 300s THEN recording.autoStopped = true
```

**Test Strategy:**
- Record for various durations
- Verify timer accuracy within 100ms tolerance
- Verify auto-stop at 5 minutes

### Property 3: Audio File Size Validation
**Validates:** Requirements 4.3, 4.4

**Specification:**
```
∀ audioFile:
  IF audioFile.size > 10MB
  THEN uploadResult.success = false
       AND uploadResult.error = 'FILE_TOO_LARGE'
  ELSE uploadResult.success = true
       AND audioFile.encrypted = true
```

**Test Strategy:**
- Generate audio files of various sizes
- Attempt upload and verify rejection for files > 10MB
- Verify encryption for accepted files

### Property 4: Playback State Consistency
**Validates:** Requirements 3.2, 3.3, 3.7

**Specification:**
```
∀ messages M1, M2:
  IF M1.isPlaying = true AND M2.play() is called
  THEN M1.isPlaying = false
       AND M2.isPlaying = true
       AND ∀ M ∈ messages WHERE M ≠ M2: M.isPlaying = false
```

**Test Strategy:**
- Create multiple voice messages
- Play one message, then play another
- Verify only one message plays at a time

### Property 5: Search Performance
**Validates:** Requirements 1.4, 8.2

**Specification:**
```
∀ searchQuery:
  LET startTime = now()
  LET results = searchEmojis(searchQuery)
  LET endTime = now()
  IN (endTime - startTime) ≤ 100ms
     AND results ⊆ allEmojis
     AND ∀ emoji ∈ results: matches(emoji, searchQuery)
```

**Test Strategy:**
- Generate random search queries
- Measure search execution time
- Verify results are correct and complete

### Property 6: Microphone Resource Management
**Validates:** Requirements 8.7, 2.10

**Specification:**
```
∀ recording:
  IF recording.cancelled OR recording.sent
  THEN microphone.released = true
       AND memory.buffers.cleared = true
       AND recording.state = 'idle'
```

**Test Strategy:**
- Start recording and cancel
- Verify microphone is released
- Verify memory is freed
- Start recording and send
- Verify resources are cleaned up

### Property 7: Encryption Integrity
**Validates:** Requirements 4.5, 4.6

**Specification:**
```
∀ audioFile:
  LET encrypted = encrypt(audioFile)
  LET decrypted = decrypt(encrypted)
  IN decrypted = audioFile
     AND encrypted ≠ audioFile
     AND size(encrypted) ≈ size(audioFile)
```

**Test Strategy:**
- Encrypt various audio files
- Decrypt and compare with original
- Verify encrypted data is different from original
- Verify decrypted data matches original exactly



## 15. UI/UX Design Specifications

### 15.1 Emoji Picker Visual Design

**Colors (using design tokens):**
```css
.emoji-picker {
  background: var(--messaging-gray-50);
  border: 1px solid var(--messaging-gray-200);
  border-radius: var(--messaging-radius-lg);
  box-shadow: var(--messaging-shadow-lg);
}

.emoji-picker__search {
  background: white;
  border: 1px solid var(--messaging-gray-300);
  color: var(--messaging-gray-900);
}

.emoji-picker__category-tab--active {
  color: var(--messaging-primary-500);
  border-bottom: 2px solid var(--messaging-primary-500);
}

.emoji-picker__emoji:hover {
  background: var(--messaging-gray-100);
  transform: scale(1.2);
}
```

**Dimensions:**
- Desktop: 352px × 435px
- Mobile: Full screen with 16px padding
- Emoji size: 32px × 32px
- Touch target: 44px × 44px (mobile)

**Animations:**
```css
.emoji-picker {
  animation: slideUp 200ms ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.emoji-picker__emoji {
  transition: transform 150ms ease-out;
}
```

### 15.2 Voice Recorder Visual Design

**Recording States:**

**Idle State:**
```
┌─────────────────────────────────────┐
│  [📝 Text input...        ] [😊] [🎤] │
└─────────────────────────────────────┘
```

**Recording State:**
```
┌─────────────────────────────────────┐
│  🔴 Recording... 00:15               │
│  [▓▓▓▓▓▓▓▓░░░░░░░░] [⏸] [⏹]        │
└─────────────────────────────────────┘
```

**Preview State:**
```
┌─────────────────────────────────────┐
│  Voice Message (00:45)               │
│  [▶] [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓]             │
│  [Cancel] [Send]                     │
└─────────────────────────────────────┘
```

**Colors:**
```css
.voice-recorder--recording {
  background: var(--messaging-error-50);
  border: 1px solid var(--messaging-error-200);
}

.voice-recorder__timer {
  color: var(--messaging-error-600);
  font-weight: var(--messaging-font-weight-semibold);
}

.voice-recorder__waveform-bar {
  background: var(--messaging-error-400);
}

.voice-recorder__button--send {
  background: var(--messaging-primary-500);
  color: white;
}
```

### 15.3 Voice Message Bubble Design

**Layout:**
```
┌─────────────────────────────────────┐
│  [▶] ▁▂▃▅▇▅▃▂▁▂▃▅▇▅▃▂▁  00:45      │
│                                      │
│  Sent 2:30 PM ✓✓                    │
└─────────────────────────────────────┘
```

**Colors:**
```css
.voice-message--own {
  background: var(--messaging-primary-500);
  color: white;
}

.voice-message--received {
  background: var(--messaging-gray-200);
  color: var(--messaging-gray-900);
}

.voice-message__waveform-bar--played {
  background: var(--messaging-primary-300);
}

.voice-message__waveform-bar--unplayed {
  background: var(--messaging-gray-400);
}
```

**Dimensions:**
- Min width: 200px
- Max width: 300px
- Height: 56px
- Play button: 40px × 40px
- Waveform bars: 2px width, 2px gap



## 16. Dependencies

### 16.1 Frontend Dependencies

**New Dependencies:**
```json
{
  "emoji-mart": "^5.5.2",
  "@emoji-mart/data": "^1.1.2",
  "@emoji-mart/react": "^1.1.1"
}
```

**Rationale:**
- `emoji-mart`: Lightweight, performant emoji picker with search
- Well-maintained with good TypeScript support
- Customizable and accessible
- ~50KB gzipped

**Alternative Considered:**
- `emoji-picker-react`: Simpler but less customizable
- Custom implementation: More control but higher maintenance

### 16.2 Backend Dependencies

**No new dependencies required**
- Use existing `multer` for file uploads
- Use existing `crypto` for encryption
- Use existing `fs` for file storage

### 16.3 Browser APIs Used

**Required:**
- MediaRecorder API (voice recording)
- Web Audio API (waveform generation)
- getUserMedia API (microphone access)
- Blob API (audio data handling)
- FileReader API (file processing)

**Optional (Progressive Enhancement):**
- Vibration API (haptic feedback)
- Wake Lock API (prevent sleep during recording)
- Clipboard API (copy emoji)

## 17. Monitoring and Analytics

### 17.1 Metrics to Track

**Emoji Usage:**
- Total emoji insertions per day
- Most popular emojis
- Search usage rate
- Average time to select emoji

**Voice Messages:**
- Total voice messages sent per day
- Average recording duration
- Recording cancellation rate
- Upload success/failure rate
- Playback completion rate
- Average time to record and send

**Performance:**
- Emoji picker render time
- Voice upload time
- Audio playback latency
- Waveform generation time

**Errors:**
- Microphone permission denial rate
- Recording failure rate
- Upload failure rate
- Playback failure rate

### 17.2 Logging

**Events to Log:**
```typescript
// Emoji events
analytics.track('emoji_picker_opened');
analytics.track('emoji_selected', { emoji, category });
analytics.track('emoji_search_used', { query, resultsCount });

// Voice recording events
analytics.track('voice_recording_started');
analytics.track('voice_recording_paused', { duration });
analytics.track('voice_recording_cancelled', { duration });
analytics.track('voice_recording_sent', { duration, fileSize });

// Voice playback events
analytics.track('voice_message_played', { messageId, duration });
analytics.track('voice_message_paused', { messageId, position });
analytics.track('voice_message_completed', { messageId });

// Error events
analytics.track('voice_recording_error', { error, stage });
analytics.track('voice_upload_error', { error, fileSize });
analytics.track('voice_playback_error', { error, messageId });
```

## 18. Documentation Requirements

### 18.1 User Documentation

**Help Articles:**
1. "How to Use Emojis in Messages"
2. "Recording and Sending Voice Messages"
3. "Troubleshooting Microphone Issues"
4. "Voice Message Privacy and Security"

**In-App Tooltips:**
- Emoji button: "Add emoji to your message"
- Voice button: "Record a voice message"
- Recording controls: "Pause/Resume/Stop recording"
- Voice message: "Play voice message"

### 18.2 Developer Documentation

**Component Documentation:**
- EmojiPicker API reference
- VoiceRecorder API reference
- VoiceMessageBubble API reference
- useAudioPlayer hook documentation

**Integration Guide:**
- How to add emoji picker to custom input
- How to customize voice recorder UI
- How to handle voice message events

**API Documentation:**
- Voice upload endpoint specification
- Voice message WebSocket events
- Audio file encryption/decryption



## 19. Risk Assessment

### 19.1 Technical Risks

**Risk 1: Browser Compatibility**
- **Impact:** High
- **Probability:** Medium
- **Mitigation:** Feature detection, graceful degradation, clear messaging for unsupported browsers

**Risk 2: Audio File Size**
- **Impact:** Medium
- **Probability:** High
- **Mitigation:** 5-minute max duration, compression, file size validation, user feedback

**Risk 3: Microphone Permission Denial**
- **Impact:** High
- **Probability:** Medium
- **Mitigation:** Clear permission request messaging, helpful error messages, alternative text input

**Risk 4: Performance on Low-End Devices**
- **Impact:** Medium
- **Probability:** Medium
- **Mitigation:** Optimize waveform generation, lazy loading, reduce memory usage

### 19.2 User Experience Risks

**Risk 1: Accidental Voice Recording**
- **Impact:** Medium
- **Probability:** Low
- **Mitigation:** Confirmation before sending, clear recording indicator, easy cancel

**Risk 2: Emoji Picker Blocking Input**
- **Impact:** Low
- **Probability:** Low
- **Mitigation:** Click outside to close, ESC key to close, proper z-index management

**Risk 3: Voice Message Privacy Concerns**
- **Impact:** High
- **Probability:** Low
- **Mitigation:** Clear encryption messaging, secure storage, deletion options

### 19.3 Security Risks

**Risk 1: Audio File Malware**
- **Impact:** High
- **Probability:** Low
- **Mitigation:** File type validation, malware scanning, sandboxed playback

**Risk 2: Unauthorized Access to Audio Files**
- **Impact:** High
- **Probability:** Low
- **Mitigation:** Encryption, signed URLs, permission validation

**Risk 3: Audio File Injection**
- **Impact:** Medium
- **Probability:** Low
- **Mitigation:** Server-side validation, file type checking, size limits

## 20. Success Criteria

### 20.1 Functional Success

- ✅ Users can select and insert emojis into messages
- ✅ Users can record voice messages up to 5 minutes
- ✅ Voice messages are encrypted and stored securely
- ✅ Voice messages play correctly in message thread
- ✅ Features work on Chrome, Firefox, Safari, Edge
- ✅ Features work on mobile devices (iOS, Android)
- ✅ All accessibility requirements met (WCAG 2.1 AA)

### 20.2 Performance Success

- ✅ Emoji picker opens in < 200ms
- ✅ Emoji search returns results in < 100ms
- ✅ Voice recording uses < 50MB memory
- ✅ Voice upload completes in < 5 seconds (for 1-minute recording)
- ✅ Voice playback starts in < 1 second
- ✅ Waveform renders in < 500ms

### 20.3 User Adoption Success

**Target Metrics (3 months post-launch):**
- 60% of users have used emoji picker
- 30% of users have sent voice messages
- 80% voice message completion rate (not cancelled)
- < 5% error rate for voice recording
- < 2% error rate for voice playback
- 4.5+ star rating in user feedback

### 20.4 Quality Success

- ✅ 90%+ unit test coverage
- ✅ All integration tests passing
- ✅ All property-based tests passing
- ✅ Zero critical bugs in production
- ✅ < 0.1% error rate in production
- ✅ All security requirements validated

## 21. Future Enhancements

### 21.1 Phase 2 Features (Post-Launch)

**Emoji Enhancements:**
- Custom emoji upload
- Emoji reactions to messages
- Animated emoji/GIFs
- Emoji skin tone selection
- Emoji autocomplete while typing

**Voice Message Enhancements:**
- Playback speed control (0.5x, 1x, 1.5x, 2x)
- Voice message transcription
- Voice message forwarding
- Voice message download
- Background noise reduction
- Voice effects/filters

**Additional Features:**
- Video messages
- Screen recording
- Location sharing
- Contact sharing
- Message translation

### 21.2 Technical Improvements

- WebRTC for peer-to-peer voice messages
- Progressive Web App audio caching
- Service Worker for offline voice message access
- WebAssembly for faster audio processing
- Machine learning for voice transcription
- Audio compression optimization

## 22. Conclusion

This design document provides a comprehensive blueprint for implementing emoji picker and voice message features in the couple-vendor messaging system. The design prioritizes:

1. **User Experience:** Intuitive, fast, and accessible interfaces
2. **Security:** Encrypted storage and secure transmission
3. **Performance:** Optimized for speed and resource usage
4. **Compatibility:** Works across modern browsers and devices
5. **Maintainability:** Clean architecture with reusable components

The phased implementation approach allows for iterative development and testing, ensuring high quality at each stage. The correctness properties provide formal specifications for testing, while the comprehensive error handling ensures a robust user experience.

By following this design, the messaging system will gain rich communication capabilities while maintaining the high standards of security, performance, and usability that users expect.

