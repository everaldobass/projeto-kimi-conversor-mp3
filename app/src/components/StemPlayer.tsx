import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Repeat,
  Shuffle,
  SlidersHorizontal,
  X,
  Mic2,
  Drum,
  Guitar,
  Music2,
  Download,
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { stemsAPI, songsAPI } from '@/services/api';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

const stemConfig = {
  VOCAL: { icon: Mic2, label: 'Vocal', color: 'from-pink-500 to-rose-500' },
  BATERIA: { icon: Drum, label: 'Bateria', color: 'from-blue-500 to-cyan-500' },
  BAIXO: { icon: Guitar, label: 'Baixo', color: 'from-amber-500 to-orange-500' },
  OUTRO: { icon: Music2, label: 'Outros', color: 'from-purple-500 to-violet-500' },
};

export function StemPlayer() {
  const {
    currentSong,
    stems,
    isPlaying,
    volume,
    progress,
    showStemControls,
    setStems,
    updateStemVolume,
    togglePlay,
    setVolume,
    setProgress,
    playNext,
    playPrevious,
    toggleFavorite,
    toggleStemControls,
  } = usePlayerStore();

  const [isMuted, setIsMuted] = useState(false);
  const [lastVolumeBeforeMute, setLastVolumeBeforeMute] = useState(volume || 0.7);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [loadingStems, setLoadingStems] = useState(false);
  const latestLoadRequestRef = useRef(0);

  // Carregar stems quando a música mudar
  useEffect(() => {
    if (currentSong?.id) {
      loadStems(currentSong.id);
    }
  }, [currentSong?.id]);

  const loadStems = async (songId: string) => {
    const requestId = Date.now();
    latestLoadRequestRef.current = requestId;

    try {
      setLoadingStems(true);
      const response = await stemsAPI.getBySongId(songId);
      // Evita sobrescrever com resposta atrasada de outra música.
      if (latestLoadRequestRef.current === requestId) {
        setStems(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar stems:', error);
      if (latestLoadRequestRef.current === requestId) {
        setStems([]);
      }
    } finally {
      if (latestLoadRequestRef.current === requestId) {
        setLoadingStems(false);
      }
    }
  };

  const handleVolumeChange = async (stemId: string, newVolume: number) => {
    updateStemVolume(stemId, newVolume);
    try {
      await stemsAPI.updateVolume(stemId, newVolume);
    } catch (error) {
      console.error('Erro ao atualizar volume:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationInSeconds = (duration: string) => {
    const parts = duration.split(':').map(Number);
    if (parts.some((value) => Number.isNaN(value))) return 0;
    if (parts.length === 2) {
      const [mins, secs] = parts;
      return mins * 60 + secs;
    }
    if (parts.length === 3) {
      const [hours, mins, secs] = parts;
      return hours * 3600 + mins * 60 + secs;
    }
    return 0;
  };

  if (!currentSong) {
    return (
      <div className="fixed bottom-0 left-[280px] right-0 h-24 bg-player border-t border-border flex items-center justify-center px-6">
        <p className="text-muted-foreground text-sm">
          Selecione uma música para começar a ouvir
        </p>
      </div>
    );
  }

  const totalSeconds = getDurationInSeconds(currentSong.duracao);
  const currentSeconds = Math.floor((progress / 100) * totalSeconds);

  return (
    <>
      {/* Stem Controls Panel */}
      <AnimatePresence>
        {showStemControls && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-24 left-[280px] right-0 bg-card border-t border-border z-30"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5" />
                  Controle de Faixas (Stems)
                </h3>
                <button
                  onClick={toggleStemControls}
                  className="p-2 rounded-full hover:bg-accent transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stems.map((stem) => {
                  const config = stemConfig[stem.tipo];
                  const Icon = config.icon;
                  
                  return (
                    <motion.div
                      key={stem.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-accent/50 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{stem.volume}%</p>
                        </div>
                      </div>
                      
                      <Slider
                        value={[stem.volume]}
                        max={100}
                        step={1}
                        onValueChange={(value) => handleVolumeChange(stem.id, value[0])}
                        className="w-full"
                      />
                      
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Mudo</span>
                        <span>Máx</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {stems.length === 0 && !loadingStems && (
                <div className="text-center py-8 text-muted-foreground">
                  <Music2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Esta música não possui stems separados.</p>
                  <p className="text-sm">
                    Converta novamente com a opção "Separar Faixas" ativada.
                  </p>
                </div>
              )}

              {loadingStems && (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-muted-foreground mt-2">Carregando stems...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Player */}
      <div className="fixed bottom-0 left-[280px] right-0 h-24 bg-player border-t border-border px-6 flex items-center gap-6 z-40">
        {/* Song Info */}
        <div className="flex items-center gap-4 w-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSong.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="relative h-14 w-14 rounded-lg overflow-hidden flex-shrink-0"
            >
              <img
                src={currentSong.thumbnail}
                alt={currentSong.titulo}
                className="h-full w-full object-cover"
              />
            </motion.div>
          </AnimatePresence>
          <div className="min-w-0 flex-1">
            <motion.h4
              key={`title-${currentSong.id}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-semibold text-foreground truncate"
            >
              {currentSong.titulo}
            </motion.h4>
            <motion.p
              key={`artist-${currentSong.id}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-xs text-muted-foreground truncate"
            >
              {currentSong.artista}
            </motion.p>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">
                <Music2 className={cn('h-3 w-3', isPlaying && 'animate-pulse text-primary')} />
                {`Tom: ${currentSong.tom || '--'}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleFavorite(currentSong.id)}
              className={cn(
                'p-2 rounded-full transition-all duration-200 hover:bg-white/10',
                currentSong.favorito ? 'text-red-500' : 'text-muted-foreground'
              )}
            >
              <Heart
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  currentSong.favorito && 'fill-current scale-110'
                )}
              />
            </button>
            <a
              href={songsAPI.download(currentSong.id)}
              download
              className="p-2 rounded-full text-muted-foreground hover:bg-white/10 transition-colors"
            >
              <Download className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={cn(
                'p-2 rounded-full transition-all duration-200 hover:bg-white/10',
                isShuffle ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={playPrevious}
              className="p-2 rounded-full text-foreground hover:bg-white/10 transition-all duration-200 hover:scale-110"
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </button>
            <button
              onClick={togglePlay}
              className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={playNext}
              className="p-2 rounded-full text-foreground hover:bg-white/10 transition-all duration-200 hover:scale-110"
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </button>
            <button
              onClick={() => setIsRepeat(!isRepeat)}
              className={cn(
                'p-2 rounded-full transition-all duration-200 hover:bg-white/10',
                isRepeat ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(currentSeconds)}
            </span>
            <div className="flex-1 relative">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                  layoutId="progress"
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-xs text-muted-foreground w-10">
              {currentSong.duracao}
            </span>
          </div>
        </div>

        {/* Volume & Stems */}
        <div className="w-[200px] flex items-center gap-3">
          {/* Stem Controls Button */}
          <button
            onClick={toggleStemControls}
            className={cn(
              'p-2 rounded-full transition-all duration-200 hover:bg-white/10',
              showStemControls ? 'text-primary' : 'text-muted-foreground'
            )}
            title="Controle de Faixas"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => {
              if (isMuted || volume === 0) {
                setVolume(lastVolumeBeforeMute || 0.7);
                setIsMuted(false);
                return;
              }
              setLastVolumeBeforeMute(volume || 0.7);
              setVolume(0);
              setIsMuted(true);
            }}
            className="p-2 rounded-full text-muted-foreground hover:bg-white/10 transition-all duration-200"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            max={100}
            step={1}
            onValueChange={(value) => {
              const nextVolume = value[0] / 100;
              setVolume(nextVolume);
              setIsMuted(nextVolume === 0);
              if (nextVolume > 0) {
                setLastVolumeBeforeMute(nextVolume);
              }
            }}
            className="flex-1"
          />
        </div>
      </div>
    </>
  );
}
