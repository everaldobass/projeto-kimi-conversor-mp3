import { create } from 'zustand';
import type { Song } from '@/types';

export interface Stem {
  id: string;
  musicaId: string;
  tipo: 'VOCAL' | 'BATERIA' | 'BAIXO' | 'OUTRO';
  caminhoArquivo: string;
  volume: number;
}

interface PlayerState {
  currentSong: Song | null;
  stems: Stem[];
  isPlaying: boolean;
  volume: number;
  progress: number;
  playlist: Song[];
  currentIndex: number;
  showStemControls: boolean;
  setCurrentSong: (song: Song | null) => void;
  setStems: (stems: Stem[]) => void;
  updateStemVolume: (stemId: string, volume: number) => void;
  resetStemVolumes: () => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setPlaylist: (songs: Song[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleFavorite: (songId: string) => void;
  toggleStemControls: () => void;
  resetStems: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  stems: [],
  isPlaying: false,
  volume: 0.7,
  progress: 0,
  playlist: [],
  currentIndex: 0,
  showStemControls: false,
  
  setCurrentSong: (song) => {
    const { playlist } = get();
    const index = song ? playlist.findIndex((item) => item.id === song.id) : -1;
    set({
      currentSong: song,
      isPlaying: !!song,
      stems: [],
      showStemControls: false,
      progress: 0,
      currentIndex: index >= 0 ? index : 0,
    });
  },
  
  setStems: (stems) => set({ stems }),
  
  updateStemVolume: (stemId, volume) => {
    const { stems } = get();
    const updatedStems = stems.map(stem =>
      stem.id === stemId ? { ...stem, volume } : stem
    );
    set({ stems: updatedStems });
  },

  resetStemVolumes: () => {
    const { stems } = get();
    if (stems.length === 0) return;
    set({
      stems: stems.map((stem) => ({ ...stem, volume: 100 })),
    });
  },
  
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setPlaying: (playing) => set({ isPlaying: playing }),
  
  setVolume: (volume) => set({ volume }),
  
  setProgress: (progress) => set({ progress }),
  
  setPlaylist: (songs) => {
    const { currentSong } = get();
    const index = currentSong ? songs.findIndex((item) => item.id === currentSong.id) : -1;
    set({ playlist: songs, currentIndex: index >= 0 ? index : 0 });
  },
  
  playNext: () => {
    const { playlist, currentIndex } = get();
    if (playlist.length > 0) {
      const nextIndex = (currentIndex + 1) % playlist.length;
      set({ 
        currentIndex: nextIndex, 
        currentSong: playlist[nextIndex], 
        isPlaying: true,
        stems: [],
        progress: 0
      });
    }
  },
  
  playPrevious: () => {
    const { playlist, currentIndex } = get();
    if (playlist.length > 0) {
      const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
      set({ 
        currentIndex: prevIndex, 
        currentSong: playlist[prevIndex], 
        isPlaying: true,
        stems: [],
        progress: 0
      });
    }
  },
  
  toggleFavorite: (songId) => {
    const { playlist, currentSong } = get();
    const updatedPlaylist = playlist.map((song) =>
      song.id === songId ? { ...song, favorito: !song.favorito } : song
    );
    const updatedCurrentSong =
      currentSong?.id === songId
        ? { ...currentSong, favorito: !currentSong.favorito }
        : currentSong;
    set({ playlist: updatedPlaylist, currentSong: updatedCurrentSong });
  },
  
  toggleStemControls: () => set((state) => ({ 
    showStemControls: !state.showStemControls 
  })),
  
  resetStems: () => set({ stems: [], showStemControls: false }),
}));
