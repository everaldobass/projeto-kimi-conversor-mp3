import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Play,
  Heart,
  HeartCrack,
  Loader2,
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { songsAPI } from '@/services/api';
import type { Song } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function Favorites() {
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { setCurrentSong, setPlaylist, toggleFavorite } = usePlayerStore();

  // Carregar músicas do backend
  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const response = await songsAPI.getAll();
      setSongs(response.data);
      setPlaylist(response.data);
    } catch (error) {
      console.error('Erro ao carregar músicas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (songId: string) => {
    try {
      await songsAPI.toggleFavorite(songId);
      toggleFavorite(songId);
      loadSongs();
    } catch (error) {
      console.error('Erro ao favoritar:', error);
    }
  };

  const favoriteSongs = useMemo(() => {
    return songs.filter(
      (song) =>
        song.favorito &&
        (song.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.artista.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [songs, searchQuery]);

  const handlePlay = (song: Song) => {
    setCurrentSong(song);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-8 pb-32"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Favoritos</h1>
          <p className="text-muted-foreground">
            {favoriteSongs.length} música{favoriteSongs.length !== 1 && 's'} favorita
            {favoriteSongs.length !== 1 && 's'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => favoriteSongs.length > 0 && setCurrentSong(favoriteSongs[0])}
            disabled={favoriteSongs.length === 0}
            className="gap-2"
          >
            <Play className="h-4 w-4 fill-current" />
            Reproduzir Tudo
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar nas favoritas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Songs Grid */}
      {favoriteSongs.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {favoriteSongs.map((song, index) => (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div
                  className="relative aspect-square rounded-xl overflow-hidden mb-3 cursor-pointer"
                  onClick={() => handlePlay(song)}
                >
                  <img
                    src={song.thumbnail}
                    alt={song.titulo}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button className="h-14 w-14 rounded-full bg-primary flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-lg">
                        <Play className="h-7 w-7 text-primary-foreground fill-current ml-1" />
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white font-medium truncate">{song.titulo}</p>
                      <p className="text-white/70 text-sm truncate">{song.artista}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(song.id);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
                  >
                    <Heart className="h-5 w-5 fill-current" />
                  </button>
                </div>
                <div className="px-1">
                  <h3 
                    className="font-medium truncate group-hover:text-primary transition-colors cursor-pointer" 
                    onClick={() => handlePlay(song)}
                  >
                    {song.titulo}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {song.artista}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="h-24 w-24 rounded-full bg-accent flex items-center justify-center mx-auto mb-6">
            <HeartCrack className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Nenhuma música favorita</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Você ainda não marcou nenhuma música como favorita. Explore sua playlist
            e clique no coração para adicionar aos favoritos.
          </p>
          <Button onClick={() => window.location.href = '/playlist'}>
            Explorar Playlist
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
