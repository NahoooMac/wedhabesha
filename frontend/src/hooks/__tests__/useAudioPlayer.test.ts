import { renderHook, act } from '@testing-library/react';
import { useAudioPlayer } from '../useAudioPlayer';

// Mock HTMLAudioElement
class MockAudio {
  public src = '';
  public currentTime = 0;
  public duration = 0;
  public paused = true;
  public preload = '';
  public error: MediaError | null = null;
  
  private listeners: { [key: string]: EventListener[] } = {};

  constructor() {
    // Simulate metadata loading after a short delay
    setTimeout(() => {
      this.duration = 45; // 45 seconds
      this.dispatchEvent(new Event('loadedmetadata'));
      this.dispatchEvent(new Event('canplay'));
    }, 10);
  }

  addEventListener(event: string, listener: EventListener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  removeEventListener(event: string, listener: EventListener) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }

  dispatchEvent(event: Event) {
    if (this.listeners[event.type]) {
      this.listeners[event.type].forEach(listener => {
        listener.call(this, event);
      });
    }
    return true;
  }

  async play() {
    if (this.src === '') {
      throw new Error('No source');
    }
    this.paused = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }

  load() {
    this.dispatchEvent(new Event('loadstart'));
  }
}

// Mock global Audio constructor
(global as any).Audio = MockAudio;

// Mock MediaError constants
(global as any).MediaError = {
  MEDIA_ERR_ABORTED: 1,
  MEDIA_ERR_NETWORK: 2,
  MEDIA_ERR_DECODE: 3,
  MEDIA_ERR_SRC_NOT_SUPPORTED: 4
};

describe('useAudioPlayer', () => {
  const mockAudioUrl = 'https://example.com/audio.mp3';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useAudioPlayer(mockAudioUrl));

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(true);
  });

  it('should load audio metadata and update duration', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAudioPlayer(mockAudioUrl));

    // Wait for metadata to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(result.current.duration).toBe(45);
    expect(result.current.isLoading).toBe(false);
  });

  it('should play audio when play is called', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAudioPlayer(mockAudioUrl));

    // Wait for metadata to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    await act(async () => {
      await result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);
  });

  it('should pause audio when pause is called', async () => {
    const { result } = renderHook(() => useAudioPlayer(mockAudioUrl));

    // Wait for metadata to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    // Start playing
    await act(async () => {
      await result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);

    // Pause
    act(() => {
      result.current.pause();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('should seek to specified time', async () => {
    const { result } = renderHook(() => useAudioPlayer(mockAudioUrl));

    // Wait for metadata to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    act(() => {
      result.current.seek(15);
    });

    expect(result.current.currentTime).toBe(15);
  });

  it('should clamp seek time to valid range', async () => {
    const { result } = renderHook(() => useAudioPlayer(mockAudioUrl));

    // Wait for metadata to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    // Seek beyond duration
    act(() => {
      result.current.seek(100);
    });

    expect(result.current.currentTime).toBe(45); // Clamped to duration

    // Seek to negative time
    act(() => {
      result.current.seek(-10);
    });

    expect(result.current.currentTime).toBe(0); // Clamped to 0
  });

  it('should handle audio loading errors', async () => {
    // Create a mock that throws an error
    const ErrorAudio = class extends MockAudio {
      constructor() {
        super();
        setTimeout(() => {
          this.error = { code: 4 } as MediaError;
          this.dispatchEvent(new Event('error'));
        }, 10);
      }
    };

    (global as any).Audio = ErrorAudio;

    const { result } = renderHook(() => useAudioPlayer(mockAudioUrl));

    // Wait for error to occur
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(result.current.error).toBe('Audio source not supported');
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle play errors', async () => {
    // Create a mock that throws on play
    const ErrorAudio = class extends MockAudio {
      async play() {
        throw new Error('Play failed');
      }
    };

    (global as any).Audio = ErrorAudio;

    const { result } = renderHook(() => useAudioPlayer(mockAudioUrl));

    // Wait for metadata to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    await act(async () => {
      await result.current.play();
    });

    expect(result.current.error).toBe('Play failed');
    expect(result.current.isPlaying).toBe(false);
  });

  it('should reset state when audio ends', async () => {
    const { result } = renderHook(() => useAudioPlayer(mockAudioUrl));

    // Wait for metadata to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    // Start playing
    await act(async () => {
      await result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);

    // Simulate audio ending
    act(() => {
      const audio = (global as any).Audio.mock?.instances?.[0];
      if (audio) {
        audio.dispatchEvent(new Event('ended'));
      }
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
  });

  it('should cleanup resources on unmount', () => {
    const { unmount } = renderHook(() => useAudioPlayer(mockAudioUrl));

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();
  });

  it('should handle empty audio URL', () => {
    const { result } = renderHook(() => useAudioPlayer(''));

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.duration).toBe(0);
    expect(result.current.error).toBe(null);
  });

  it('should update current time during playback', async () => {
    // Create a mock that simulates time updates
    const TimeUpdateAudio = class extends MockAudio {
      private timeUpdateInterval?: NodeJS.Timeout;

      async play() {
        await super.play();
        // Simulate time updates
        this.timeUpdateInterval = setInterval(() => {
          this.currentTime += 0.1;
          this.dispatchEvent(new Event('timeupdate'));
        }, 100);
        return Promise.resolve();
      }

      pause() {
        super.pause();
        if (this.timeUpdateInterval) {
          clearInterval(this.timeUpdateInterval);
        }
      }
    };

    (global as any).Audio = TimeUpdateAudio;

    const { result } = renderHook(() => useAudioPlayer(mockAudioUrl));

    // Wait for metadata to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    // Start playing
    await act(async () => {
      await result.current.play();
    });

    // Wait for time updates
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 250));
    });

    expect(result.current.currentTime).toBeGreaterThan(0);
  });
});

// Test global audio manager functionality
describe('Global Audio Manager', () => {
  it('should pause previous audio when new audio starts playing', async () => {
    const { result: result1 } = renderHook(() => useAudioPlayer('audio1.mp3'));
    const { result: result2 } = renderHook(() => useAudioPlayer('audio2.mp3'));

    // Wait for both to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    // Start playing first audio
    await act(async () => {
      await result1.current.play();
    });

    expect(result1.current.isPlaying).toBe(true);

    // Start playing second audio
    await act(async () => {
      await result2.current.play();
    });

    expect(result1.current.isPlaying).toBe(false);
    expect(result2.current.isPlaying).toBe(true);
  });
});