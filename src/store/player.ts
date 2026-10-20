import { create } from "zustand";
import type { Track } from "../global";

interface PlayerState {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  playIndex: (index: number) => void;
  next: () => void;
  prev: () => void;
  setPlaying: (playing: boolean) => void;
  current: () => Track | null;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  isPlaying: false,

  setQueue: (tracks, startIndex = 0) => set({ queue: tracks, currentIndex: startIndex, isPlaying: tracks.length > 0 }),

  playIndex: (index) => set({ currentIndex: index, isPlaying: true }),

  next: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return;
    set({ currentIndex: (currentIndex + 1) % queue.length, isPlaying: true });
  },

  prev: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return;
    set({ currentIndex: (currentIndex - 1 + queue.length) % queue.length, isPlaying: true });
  },

  setPlaying: (playing) => set({ isPlaying: playing }),

  current: () => {
    const { queue, currentIndex } = get();
    return currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  },
}));
