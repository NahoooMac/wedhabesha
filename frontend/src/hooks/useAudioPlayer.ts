import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseAudioPlayerReturn {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  isLoading: boolean;
}

// Global playback manager to ensure only one audio plays at a time
class GlobalAudioManager {
  private currentPlayer: HTMLAudioElement | null = null;
  private currentCallback: (() => void) | null = null;

  setCurrentPlayer(audio: HTMLAudioElement, onStop: () => void) {
    // Pause previous player if exists
    if (this.currentPlayer && this.currentPlayer !== audio) {
      this.currentPlayer.pause();
      if (this.currentCallback) {
        this.currentCallback();
      }
    }
    
    this.currentPlayer = audio;
    this.currentCallback = onStop;
  }

  clearCurrentPlayer(audio: HTMLAudioElement) {
    if (this.currentPlayer === audio) {
      this.currentPlayer = null;
      this.currentCallback = null;
    }
  }
}

const globalAudioManager = new GlobalAudioManager();

export function useAudioPlayer(audioUrl: string): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio();
    audioRef.current = audio;

    // Set up event listeners
    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      globalAudioManager.clearCurrentPlayer(audio);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleError = (e: Event) => {
      const audioError = (e.target as HTMLAudioElement).error;
      let errorMessage = 'Failed to load audio';
      
      if (audioError) {
        switch (audioError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading audio';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio format not supported';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio source not supported';
            break;
          default:
            errorMessage = 'Unknown audio error';
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      // Start time update interval for smooth progress
      intervalRef.current = setInterval(() => {
        if (audio.currentTime !== undefined) {
          setCurrentTime(audio.currentTime);
        }
      }, 100);
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    // Set audio source
    audio.src = audioUrl;
    audio.preload = 'metadata';

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      
      audio.pause();
      audio.src = '';
      globalAudioManager.clearCurrentPlayer(audio);
    };
  }, [audioUrl]);

  // Play function
  const play = useCallback(async (): Promise<void> => {
    if (!audioRef.current || error) return;

    try {
      // Register with global manager to pause other players
      globalAudioManager.setCurrentPlayer(audioRef.current, () => {
        setIsPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      });

      await audioRef.current.play();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to play audio';
      setError(errorMessage);
      setIsPlaying(false);
      globalAudioManager.clearCurrentPlayer(audioRef.current);
    }
  }, [error]);

  // Pause function
  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    globalAudioManager.clearCurrentPlayer(audioRef.current);
  }, []);

  // Seek function
  const seek = useCallback((time: number) => {
    if (!audioRef.current || !duration) return;
    
    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(time, duration));
    audioRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, [duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioRef.current) {
        globalAudioManager.clearCurrentPlayer(audioRef.current);
      }
    };
  }, []);

  return {
    play,
    pause,
    seek,
    isPlaying,
    currentTime,
    duration,
    error,
    isLoading
  };
}