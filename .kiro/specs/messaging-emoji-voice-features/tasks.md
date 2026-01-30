# Implementation Tasks: Emoji Picker and Voice Message Features

## Phase 1: Foundation and Dependencies

- [x] 1.1 Install Required Dependencies
  **Requirements:** 16.1  
  **Description:** Install emoji-mart library and configure TypeScript types
  
  **Completion Notes:**
  - ✅ Installed `emoji-mart@^5.6.0`, `@emoji-mart/data@^1.2.1`, `@emoji-mart/react@^1.1.1`
  - ✅ TypeScript types working correctly
  - ✅ Verified installation and imports

- [x] 1.2 Create Audio Utilities and Types
  **Requirements:** 4.1, 4.2, 5.1  
  **Description:** Create utility functions and TypeScript types for audio handling
  
  **Completion Notes:**
  - ✅ Created `frontend/src/utils/audioUtils.ts` with all required functions
  - ✅ Added audio-related types to `frontend/src/types/messaging.ts`
  - ✅ Written comprehensive unit tests in `frontend/src/utils/__tests__/audioUtils.test.ts`

## Phase 2: Emoji Picker Implementation

- [x] 2.1 Create EmojiPicker Component
  **Requirements:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9  
  **Description:** Build the emoji picker component with search and keyboard navigation
  
  **Completion Notes:**
  - ✅ Created `frontend/src/components/communication/EmojiPicker.tsx`
  - ✅ Created `frontend/src/components/communication/EmojiPickerButton.tsx`
  - ✅ Implemented emoji-mart integration with all categories
  - ✅ Added search functionality with debouncing
  - ✅ Implemented keyboard navigation
  - ✅ Added recent emojis tracking
  - ✅ Implemented positioning logic
  - ✅ Added ARIA labels and screen reader support
  - ✅ Styled using messaging-design-tokens.css
  - ✅ Written unit tests and property-based tests

- [x] 2.2 Integrate Emoji Picker with SharedMessageInput
  **Requirements:** 1.1, 1.3, 1.9, 10.1, 10.2  
  **Description:** Add emoji button and integrate picker with message input
  
  **Completion Notes:**
  - ✅ Imported EmojiPickerButton into SharedMessageInput component
  - ✅ Added emoji button next to file upload button in the input area
  - ✅ Implemented emoji insertion at cursor position in textarea
  - ✅ Added cursor position tracking state (`cursorPosition`)
  - ✅ Implemented `handleEmojiSelect` function for emoji insertion
  - ✅ Added `handleCursorPositionChange` function to track cursor movements
  - ✅ Updated textarea with `onSelect` and `onClick` handlers for cursor tracking
  - ✅ Maintained cursor position after emoji insertion
  - ✅ Added mobile-specific styling considerations
  - ✅ Ensured design consistency with existing components
  - ✅ Written comprehensive unit tests covering emoji functionality
  
  **Details:**
  - Import EmojiPickerButton into SharedMessageInput component
  - Add emoji button next to file upload button in the input area
  - Implement emoji insertion at cursor position in textarea
  - Handle picker open/close state
  - Maintain cursor position after emoji insertion
  - Add mobile-specific styling (full-screen modal on mobile)
  - Ensure design consistency with existing components
  - Test emoji insertion with existing text
  - Test keyboard shortcuts don't conflict
  - Update SharedMessageInput tests to cover emoji functionality

- [-] 2.3 Mobile Emoji Picker Optimization
  **Requirements:** 6.1, 6.2, 6.3, 6.4  
  **Description:** Optimize emoji picker for mobile devices
  
  **Details:**
  - Review EmojiPicker component for mobile responsiveness
  - Verify full-screen modal works for screens < 768px
  - Verify bottom sheet layout works for screens < 480px
  - Ensure touch targets are minimum 44x44px
  - Test native momentum scrolling
  - Handle orientation changes
  - Adjust position when keyboard is visible
  - Add haptic feedback if supported (navigator.vibrate)
  - Test on iOS and Android devices or simulators

## Phase 3: Voice Recording Implementation

- [ ] 3.1 Create useAudioPlayer Hook
  **Requirements:** 3.1, 3.2, 3.3, 3.4, 3.7, 3.8  
  **Description:** Build custom hook for audio playback management
  
  **Details:**
  - Create `frontend/src/hooks/useAudioPlayer.ts`
  - Implement play/pause functionality using HTML5 Audio API
  - Add seek functionality
  - Track current time and duration with state
  - Handle audio loading states
  - Implement error handling for playback failures
  - Ensure only one audio plays at a time (global playback manager)
  - Add cleanup on unmount to release audio resources
  - Write unit tests for playback controls in `frontend/src/hooks/__tests__/useAudioPlayer.test.ts`

- [ ] 3.2 Create VoiceRecorder Component
  **Requirements:** 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7  
  **Description:** Build voice recording component with MediaRecorder API
  
  **Details:**
  - Create `frontend/src/components/communication/VoiceRecorder.tsx`
  - Implement microphone permission request using navigator.mediaDevices.getUserMedia
  - Add MediaRecorder integration with format detection (use getSupportedMimeType from audioUtils)
  - Create recording controls (start, pause, resume, stop, cancel)
  - Implement recording timer that updates every 100ms
  - Add 5-minute (300 seconds) auto-stop functionality
  - Create audio preview with playback controls
  - Integrate WaveformVisualizer component (to be created in Task 3.3)
  - Add error handling for permission denial and recording failures
  - Release microphone on cancel/send
  - Style using messaging-design-tokens.css
  - Write unit tests for recording lifecycle in `frontend/src/components/communication/__tests__/VoiceRecorder.test.tsx`
  
  **Property-Based Test:**
  - Property 2: Recording Duration Accuracy (±100ms)
  - Property 6: Microphone Resource Management

- [ ] 3.3 Create WaveformVisualizer Component
  **Requirements:** 2.3, 3.5, 3.6, 8.4  
  **Description:** Build waveform visualization for recording and playback
  
  **Details:**
  - Create `frontend/src/components/communication/WaveformVisualizer.tsx`
  - Implement real-time waveform during recording (max 100 samples)
  - Use Web Audio API for amplitude calculation
  - Render waveform as SVG for better performance and scalability
  - Add seek functionality on click for playback
  - Highlight played portion during playback
  - Optimize for performance using requestAnimationFrame
  - Consider using Web Workers for waveform calculation if performance issues arise
  - Style using messaging-design-tokens.css
  - Write unit tests for waveform rendering in `frontend/src/components/communication/__tests__/WaveformVisualizer.test.tsx`

- [ ] 3.4 Integrate Voice Recorder with SharedMessageInput
  **Requirements:** 2.1, 2.8, 2.9, 10.1, 10.3  
  **Description:** Add voice recording button and integrate with message input
  
  **Details:**
  - Import VoiceRecorder component into SharedMessageInput
  - Add voice recording button next to emoji button in the input area
  - Implement recording state management (idle, recording, paused, preview)
  - Handle recording UI states and transitions
  - Integrate with message sending flow (upload audio, then send message)
  - Add mobile-specific touch optimizations (larger button, haptic feedback)
  - Ensure design consistency with existing components
  - Test recording and sending flow end-to-end
  - Handle errors gracefully with user-friendly messages
  - Update SharedMessageInput tests to cover voice recording functionality

## Phase 4: Voice Message Display

- [ ] 4.1 Create VoiceMessageBubble Component
  **Requirements:** 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 10.4, 10.5  
  **Description:** Build voice message display component with playback controls
  
  **Details:**
  - Create `frontend/src/components/communication/VoiceMessageBubble.tsx`
  - Implement play/pause button using useAudioPlayer hook
  - Display audio duration using formatDuration from audioUtils
  - Show waveform visualization using WaveformVisualizer component
  - Add progress indicator that updates during playback
  - Implement seek functionality via waveform click
  - Handle loading and error states
  - Add download option on error
  - Style to match existing message bubbles (use messaging-design-tokens.css)
  - Support both sent and received message styling
  - Write unit tests for playback controls in `frontend/src/components/communication/__tests__/VoiceMessageBubble.test.tsx`
  
  **Property-Based Test:**
  - Property 4: Playback State Consistency (only one message plays at a time)

- [ ] 4.2 Integrate Voice Messages with SharedMessageThread
  **Requirements:** 3.1, 3.7, 3.8, 10.4  
  **Description:** Add voice message rendering to message thread
  
  **Details:**
  - Update SharedMessageThread component to detect VOICE message type
  - Render VoiceMessageBubble for voice messages
  - Implement global playback state (pause others when playing)
  - Add preloading for smooth playback (preload audio when message enters viewport)
  - Handle voice message errors (show error state in bubble)
  - Ensure consistent styling with text messages
  - Test with multiple voice messages in thread
  - Test playback state management (only one plays at a time)
  - Update SharedMessageThread tests to cover voice message rendering

## Phase 5: Backend Integration

- [ ] 5.1 Create Voice Upload Backend Endpoint
  **Requirements:** 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9  
  **Description:** Implement backend endpoint for voice message upload
  
  **Details:**
  - Create `POST /api/v1/messaging/voice-upload` endpoint in `backend-node/routes/messaging-unified.js`
  - Configure multer for audio file uploads (audio/webm, audio/mp3, audio/ogg, audio/mp4, audio/mpeg)
  - Validate file size (max 10MB = 10 * 1024 * 1024 bytes)
  - Validate file type using MIME type checking
  - Validate duration (max 300 seconds) from request body
  - Implement audio file encryption using existing encryption service
  - Store encrypted files in uploads/ directory with `.enc` extension
  - Generate unique file ID (use UUID or similar)
  - Generate file URL for retrieval
  - Return file metadata (fileId, fileUrl, duration, format, size)
  - Add rate limiting (max 10 uploads per minute per user)
  - Write integration tests for upload endpoint in `backend-node/tests/voice-upload.test.js`
  
  **Property-Based Test:**
  - Property 3: Audio File Size Validation (reject > 10MB)
  - Property 7: Encryption Integrity (encrypt/decrypt matches original)

- [ ] 5.2 Update Message Sending for Voice Messages
  **Requirements:** 4.8, 4.9  
  **Description:** Update message sending to support voice message type
  
  **Details:**
  - Update `POST /api/v1/messaging/messages` endpoint to handle VOICE message type
  - Store voice attachment metadata in messages.attachments JSON column
  - Include duration, format, waveform data in attachment metadata
  - Ensure WebSocket broadcasts voice messages correctly
  - Update message validation to accept voice attachments
  - Handle voice message content (set to "Voice message" or similar)
  - Write integration tests for voice message sending in `backend-node/tests/voice-message-send.test.js`

- [ ] 5.3 Implement Audio File Decryption
  **Requirements:** 4.6, 4.9  
  **Description:** Add endpoint for decrypting and serving audio files
  
  **Details:**
  - Create `GET /api/v1/messaging/audio/:fileId` endpoint in `backend-node/routes/messaging-unified.js`
  - Verify user has access to the thread (check thread participants)
  - Decrypt audio file on-the-fly using encryption service
  - Set appropriate Content-Type headers (audio/webm, audio/mp3, etc.)
  - Set Content-Disposition header for proper browser handling
  - Implement signed URLs with expiration (optional enhancement for security)
  - Add CORS headers for audio playback
  - Handle file not found errors
  - Write integration tests for audio retrieval in `backend-node/tests/audio-retrieval.test.js`

- [ ] 5.4 Update WebSocket Handlers for Voice Messages
  **Requirements:** 4.8  
  **Description:** Update WebSocket to broadcast voice messages
  
  **Details:**
  - Update WebSocket message handler in `backend-node/services/websocketServer.js`
  - Add `voice_message` event type to WebSocketEvent enum
  - Include audio metadata in WebSocket payload (duration, format, fileUrl, waveform)
  - Ensure real-time delivery to all thread participants
  - Test WebSocket delivery for voice messages
  - Write integration tests for real-time voice message delivery in `backend-node/tests/voice-websocket.test.js`

## Phase 6: Frontend API Integration

- [ ] 6.1 Update Messaging API Service
  **Requirements:** 4.1, 4.8  
  **Description:** Add voice message upload and sending to API service
  
  **Details:**
  - Update `frontend/src/services/messagingApi.ts`
  - Add `uploadVoiceMessage(audioBlob: Blob, threadId: string, duration: number)` function
  - Update `sendMessage()` to handle VOICE message type with audio attachment
  - Add proper TypeScript types for voice messages
  - Handle upload progress for voice files (use XMLHttpRequest or fetch with progress)
  - Implement retry logic for failed uploads (exponential backoff)
  - Add error handling for network failures
  - Write unit tests for API functions in `frontend/src/services/__tests__/messagingApi.voice.test.ts`

- [ ] 6.2 Update Message Types
  **Requirements:** 4.1, 4.9  
  **Description:** Verify voice message types in TypeScript definitions
  
  **Details:**
  - Review `frontend/src/types/messaging.ts` to ensure all voice types are present
  - Verify `VOICE` exists in MessageType enum (already added)
  - Verify AudioAttachment interface is complete
  - Verify RecordingState type is complete
  - Verify AudioPlayerState interface is complete
  - Verify AudioError types are complete
  - Update any missing types or interfaces
  - Ensure type safety across components

## Phase 7: Accessibility and Polish

- [ ] 7.1 Implement Accessibility Features
  **Requirements:** 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8  
  **Description:** Add comprehensive accessibility support
  
  **Details:**
  - Review and enhance ARIA labels in EmojiPicker component
  - Review and enhance keyboard navigation for emoji picker
  - Add screen reader announcements for recording states in VoiceRecorder
  - Add ARIA labels to voice recorder controls (start, pause, stop, cancel)
  - Implement keyboard shortcuts for voice recorder (Space to start/stop, Escape to cancel)
  - Add ARIA labels to voice message playback controls
  - Test with screen readers (NVDA on Windows, VoiceOver on Mac/iOS)
  - Ensure color contrast meets WCAG 2.1 AA standards (use contrast checker)
  - Add focus indicators for all interactive elements
  - Write accessibility tests using @testing-library/react

- [ ] 7.2 Error Handling and User Feedback
  **Requirements:** 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7  
  **Description:** Implement comprehensive error handling
  
  **Details:**
  - Add user-friendly error messages for all failure scenarios
  - Implement microphone permission error handling with instructions
  - Add recording failure error handling with retry option
  - Implement upload failure with retry logic (exponential backoff)
  - Add playback error handling with download option
  - Show browser compatibility messages for unsupported browsers
  - Implement network error recovery (queue uploads for retry)
  - Add error logging for debugging (use console.error with context)
  - Test all error scenarios manually and with automated tests

- [ ] 7.3 Performance Optimization
  **Requirements:** 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7  
  **Description:** Optimize performance for all features
  
  **Details:**
  - Profile emoji picker rendering time (should be < 200ms)
  - Implement virtual scrolling for emoji grid if needed
  - Verify emoji search performance (should be < 100ms)
  - Profile voice recording memory usage (should be < 50MB)
  - Implement lazy loading for waveforms (load when visible)
  - Add audio preloading for smooth playback
  - Ensure resources are released on component unmount
  - Profile and optimize rendering performance using React DevTools
  - Write performance tests using vitest or similar

## Phase 8: Testing and Documentation

- [ ] 8.1 Write Unit Tests
  **Requirements:** All  
  **Description:** Comprehensive unit test coverage
  
  **Details:**
  - Review and enhance tests for EmojiPicker component
  - Write tests for VoiceRecorder component
  - Write tests for VoiceMessageBubble component
  - Write tests for WaveformVisualizer component
  - Write tests for useAudioPlayer hook
  - Review and enhance tests for audio utilities
  - Write tests for API functions
  - Achieve 90%+ code coverage
  - Test edge cases and error scenarios

- [ ] 8.2 Write Integration Tests
  **Requirements:** All  
  **Description:** End-to-end integration testing
  
  **Details:**
  - Test emoji selection and message sending flow
  - Test voice recording and sending flow
  - Test voice message playback flow
  - Test real-time delivery via WebSocket
  - Test encryption/decryption flow
  - Test error recovery scenarios
  - Test mobile responsiveness
  - Test browser compatibility (Chrome, Firefox, Safari, Edge)

- [ ] 8.3 Write Property-Based Tests
  **Requirements:** 1.4, 2.4, 2.7, 4.3, 8.1, 8.2  
  **Description:** Implement property-based tests for correctness properties
  
  **Details:**
  - Property 1: Emoji Insertion Preserves Cursor Position
  - Property 2: Recording Duration Accuracy
  - Property 3: Audio File Size Validation
  - Property 4: Playback State Consistency
  - Property 5: Search Performance
  - Property 6: Microphone Resource Management
  - Property 7: Encryption Integrity
  - Use fast-check library for property-based testing
  - Ensure all properties pass with 100+ test cases

- [ ] 8.4 Write E2E Tests
  **Requirements:** All  
  **Description:** End-to-end user scenario testing
  
  **Details:**
  - Test complete emoji picker workflow
  - Test complete voice recording workflow
  - Test complete voice playback workflow
  - Test mobile device scenarios
  - Test accessibility with assistive technologies
  - Test browser compatibility (Chrome, Firefox, Safari, Edge)
  - Test error scenarios and recovery
  - Document test results

- [ ] 8.5 Create User Documentation
  **Requirements:** 18.1  
  **Description:** Write user-facing documentation
  
  **Details:**
  - Create "How to Use Emojis in Messages" guide
  - Create "Recording and Sending Voice Messages" guide
  - Create "Troubleshooting Microphone Issues" guide
  - Create "Voice Message Privacy and Security" guide
  - Add in-app tooltips for new features
  - Create video tutorials (optional)

- [ ] 8.6 Create Developer Documentation
  **Requirements:** 18.2  
  **Description:** Write technical documentation
  
  **Details:**
  - Document EmojiPicker API and usage
  - Document VoiceRecorder API and usage
  - Document VoiceMessageBubble API and usage
  - Document useAudioPlayer hook
  - Create integration guide for custom implementations
  - Document API endpoints and WebSocket events
  - Add code examples and best practices

## Phase 9: Deployment and Monitoring

- [ ] 9.1 Setup Monitoring and Analytics
  **Requirements:** 17.1, 17.2  
  **Description:** Implement tracking and monitoring
  
  **Details:**
  - Add analytics events for emoji usage
  - Add analytics events for voice recording
  - Add analytics events for voice playback
  - Track performance metrics (render time, upload time, etc.)
  - Track error rates and types
  - Setup alerts for critical errors
  - Create monitoring dashboard

- [ ] 9.2 Browser Compatibility Testing
  **Requirements:** 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.1, 8.2  
  **Description:** Test across all supported browsers
  
  **Details:**
  - Test on Chrome 47+ (desktop and mobile)
  - Test on Firefox 25+ (desktop and mobile)
  - Test on Safari 14.1+ (desktop and mobile)
  - Test on Edge 79+ (desktop and mobile)
  - Verify MediaRecorder API support detection
  - Test audio format fallbacks (WebM → MP3)
  - Document browser-specific issues
  - Implement browser-specific workarounds if needed

- [ ] 9.3 Production Deployment
  **Requirements:** All  
  **Description:** Deploy features to production
  
  **Details:**
  - Review all code changes
  - Run full test suite
  - Update environment variables if needed
  - Deploy backend changes
  - Deploy frontend changes
  - Verify WebSocket functionality in production
  - Monitor error rates and performance
  - Prepare rollback plan

- [ ] 9.4 Post-Launch Monitoring
  **Requirements:** 17.1, 17.2, 20.1, 20.2, 20.3  
  **Description:** Monitor feature adoption and performance
  
  **Details:**
  - Monitor emoji picker usage metrics
  - Monitor voice message usage metrics
  - Track error rates and types
  - Monitor performance metrics
  - Collect user feedback
  - Identify and fix issues
  - Plan future enhancements based on usage data

## Summary

**Total Tasks:** 34  
**Completed Tasks:** 3 (Tasks 1.1, 1.2, 2.1)  
**Remaining Tasks:** 31  
**Estimated Timeline:** 5-6 weeks for remaining tasks

**Current Status:**
- ✅ Phase 1: Foundation and Dependencies (100% complete)
- ⚠️ Phase 2: Emoji Picker Implementation (33% complete - core component done, integration pending)
- ❌ Phase 3: Voice Recording Implementation (0% complete)
- ❌ Phase 4: Voice Message Display (0% complete)
- ❌ Phase 5: Backend Integration (0% complete)
- ❌ Phase 6: Frontend API Integration (0% complete)
- ❌ Phase 7: Accessibility and Polish (0% complete)
- ❌ Phase 8: Testing and Documentation (0% complete)
- ❌ Phase 9: Deployment and Monitoring (0% complete)

**Next Steps:**
1. Complete Task 2.2: Integrate emoji picker with SharedMessageInput
2. Complete Task 2.3: Mobile emoji picker optimization
3. Begin Phase 3: Voice recording implementation
