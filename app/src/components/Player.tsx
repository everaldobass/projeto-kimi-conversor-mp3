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
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

export function Player() {
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    togglePlay,
    setVolume,
    setProgress,
    playNext,
    playPrevious,
    toggleFavorite,
  } = usePlayerStore();

  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setProgress(Math.min(progress + 1, 100));
      }, 1000);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, progress, setProgress]);

  useEffect(() => {
    if (progress >= 100) {
      playNext();
      setProgress(0);
    }
  }, [progress, playNext, setProgress]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationInSeconds = (duration: string) => {
    const [mins, secs] = duration.split(':').map(Number);
    return mins * 60 + secs;
  };

  if (!currentSong) {
    return (
      <div className="fixed bottom-0 left-[280px] right-0 h-20 bg-player border-t border-border flex items-center justify-center px-6">
        <p className="text-muted-foreground text-sm">
          Selecione uma música para começar a ouvir
        </p>
      </div>
    );
  }

  const totalSeconds = getDurationInSeconds(currentSong.duracao);
  const currentSeconds = Math.floor((progress / 100) * totalSeconds);

  return (
    <div className="fixed bottom-0 left-[280px] right-0 h-24 bg-player border-t border-border px-6 flex items-center gap-6">
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
        </div>
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

      {/* Volume */}
      <div className="w-[180px] flex items-center gap-3">
        <button
          onClick={() => setIsMuted(!isMuted)}
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
          onValueChange={(value) => setVolume(value[0] / 100)}
          className="flex-1"
        />
      </div>
    </div>
  );
}
