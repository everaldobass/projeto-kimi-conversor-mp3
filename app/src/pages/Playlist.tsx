import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Play,
  Heart,
  MoreVertical,
  Download,
  Trash2,
  Music,
  Filter,
  Disc,
  Loader2,
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { songsAPI } from '@/services/api';
import { genres } from '@/data/mockData';
import type { Song } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function Playlist() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [songPendingDelete, setSongPendingDelete] = useState<Song | null>(null);
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
      // Recarregar para atualizar estado
      loadSongs();
    } catch (error) {
      console.error('Erro ao favoritar:', error);
    }
  };

  const handleDelete = async (songId: string) => {
    try {
      await songsAPI.delete(songId);
      loadSongs();
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch =
        song.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artista.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre =
        selectedGenre === 'Todos' || song.genero === selectedGenre;
      return matchesSearch && matchesGenre;
    });
  }, [songs, searchQuery, selectedGenre]);

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
          <h1 className="text-3xl font-bold mb-2">Minha Playlist</h1>
          <p className="text-muted-foreground">
            {filteredSongs.length} música{filteredSongs.length !== 1 && 's'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => filteredSongs.length > 0 && setCurrentSong(filteredSongs[0])}
            disabled={filteredSongs.length === 0}
            className="gap-2"
          >
            <Play className="h-4 w-4 fill-current" />
            Reproduzir Tudo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por música ou artista..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          {genres.slice(0, 8).map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
                selectedGenre === genre
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-accent-foreground hover:bg-accent/80'
              )}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Songs List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredSongs.map((song, index) => (
            <motion.div
              key={song.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.03 }}
              className="group flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-all duration-200 cursor-pointer"
              onClick={() => handlePlay(song)}
            >
              {/* Index / Play Button */}
              <div className="w-8 text-center">
                <span className="text-sm text-muted-foreground group-hover:hidden">
                  {index + 1}
                </span>
                <Play className="h-4 w-4 hidden group-hover:block mx-auto fill-current" />
              </div>

              {/* Thumbnail */}
              <div className="relative h-12 w-12 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={song.thumbnail}
                  alt={song.titulo}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Disc className="h-5 w-5 text-white animate-spin-slow" />
                </div>
              </div>

              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {song.titulo}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {song.artista}
                </p>
              </div>

              {/* Genre */}
              <div className="hidden md:block">
                <span className="px-3 py-1 rounded-full text-xs bg-accent text-accent-foreground">
                  {song.genero}
                </span>
              </div>

              {/* Duration */}
              <div className="hidden sm:block text-sm text-muted-foreground w-16 text-right">
                {song.duracao}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(song.id);
                  }}
                  className={cn(
                    'p-2 rounded-full transition-all duration-200 hover:bg-white/10',
                    song.favorito ? 'text-red-500' : 'text-muted-foreground'
                  )}
                >
                  <Heart
                    className={cn(
                      'h-5 w-5',
                      song.favorito && 'fill-current'
                    )}
                  />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-full text-muted-foreground hover:bg-white/10 transition-colors"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={songsAPI.download(song.id)} download>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        setSongPendingDelete(song);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredSongs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma música encontrada</h3>
            <p className="text-muted-foreground">
              Tente ajustar seus filtros ou buscar por outro termo.
            </p>
          </motion.div>
        )}
      </div>
      <ConfirmDialog
        open={!!songPendingDelete}
        onOpenChange={(open) => {
          if (!open) setSongPendingDelete(null);
        }}
        title="Remover música da playlist?"
        description={
          songPendingDelete
            ? `A música \"${songPendingDelete.titulo}\" será removida permanentemente da sua playlist.`
            : 'Esta ação não pode ser desfeita.'
        }
        confirmLabel="Sim, remover"
        cancelLabel="Manter"
        onConfirm={async () => {
          if (!songPendingDelete) return;
          await handleDelete(songPendingDelete.id);
          setSongPendingDelete(null);
        }}
      />
    </motion.div>
  );
}
