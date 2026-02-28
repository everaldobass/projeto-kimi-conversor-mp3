import { useEffect, useMemo, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { api, stemsAPI } from '@/services/api';

const AUDIO_BASE_URL = api.defaults.baseURL?.replace(/\/api\/?$/, '') || window.location.origin;

function toAbsoluteAudioUrl(filePath: string) {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  return `${AUDIO_BASE_URL}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
}

function parseDurationToSeconds(duration: string) {
  const parts = duration.split(':').map(Number);
  if (parts.some((value) => Number.isNaN(value))) return 0;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}

export function AudioEngine() {
  const {
    currentSong,
    stems,
    isPlaying,
    volume,
    progress,
    setProgress,
    setPlaying,
    playNext,
    resetStemVolumes,
  } = usePlayerStore();

  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const stemAudioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const suppressNextProgressSeekRef = useRef(false);

  const hasStemMixAdjustment = useMemo(
    () => stems.some((stem) => Math.round(stem.volume) !== 100),
    [stems]
  );
  const useStemMix = useMemo(
    () => stems.length > 0 && hasStemMixAdjustment,
    [stems.length, hasStemMixAdjustment]
  );

  const getActiveMasterAudio = () => {
    if (useStemMix) {
      const preferredStem = stems.find((stem) => stem.volume > 0) || stems[0];
      return preferredStem ? stemAudioMapRef.current.get(preferredStem.id) ?? null : null;
    }
    return mainAudioRef.current;
  };

  useEffect(() => {
    if (!mainAudioRef.current || !currentSong?.caminhoArquivo) return;

    const nextSrc = toAbsoluteAudioUrl(currentSong.caminhoArquivo);
    if (mainAudioRef.current.src !== nextSrc) {
      mainAudioRef.current.src = nextSrc;
      mainAudioRef.current.currentTime = 0;
      setProgress(0);
    }
  }, [currentSong?.id, currentSong?.caminhoArquivo, setProgress]);

  useEffect(() => {
    const currentMap = stemAudioMapRef.current;
    const validIds = new Set(stems.map((stem) => stem.id));

    for (const [stemId, audio] of currentMap.entries()) {
      if (!validIds.has(stemId)) {
        audio.pause();
        currentMap.delete(stemId);
      }
    }

    for (const stem of stems) {
      const currentAudio = currentMap.get(stem.id);
      const nextSrc = toAbsoluteAudioUrl(stem.caminhoArquivo);

      if (!currentAudio) {
        const audio = new Audio(nextSrc);
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        currentMap.set(stem.id, audio);
        continue;
      }

      if (currentAudio.src !== nextSrc) {
        currentAudio.pause();
        currentAudio.src = nextSrc;
      }
    }
  }, [stems]);

  useEffect(() => {
    const safeVolume = Math.max(0, Math.min(1, volume));

    if (mainAudioRef.current) {
      mainAudioRef.current.volume = useStemMix ? 0 : safeVolume;
    }

    for (const stem of stems) {
      const stemAudio = stemAudioMapRef.current.get(stem.id);
      if (!stemAudio) continue;
      stemAudio.volume = safeVolume * Math.max(0, Math.min(1, stem.volume / 100));
    }
  }, [volume, stems, useStemMix]);

  useEffect(() => {
    if (!currentSong) return;

    const syncTime = (targetTime: number) => {
      if (mainAudioRef.current) {
        mainAudioRef.current.currentTime = targetTime;
      }
      for (const audio of stemAudioMapRef.current.values()) {
        audio.currentTime = targetTime;
      }
    };

    const playMainFallback = () => {
      if (!mainAudioRef.current) return;
      for (const audio of stemAudioMapRef.current.values()) {
        audio.pause();
      }
      mainAudioRef.current.volume = Math.max(0, Math.min(1, volume));
      mainAudioRef.current.play().catch(() => setPlaying(false));
    };

    const playTarget = async () => {
      if (useStemMix) {
        if (mainAudioRef.current) mainAudioRef.current.pause();

        const playResults = await Promise.allSettled(
          Array.from(stemAudioMapRef.current.values()).map((audio) => audio.play())
        );

        const startedCount = playResults.filter((result) => result.status === 'fulfilled').length;
        if (startedCount === 0) {
          playMainFallback();
        }
      } else if (mainAudioRef.current) {
        for (const audio of stemAudioMapRef.current.values()) {
          audio.pause();
        }
        mainAudioRef.current.play().catch(() => setPlaying(false));
      }
    };

    const pauseAll = () => {
      if (mainAudioRef.current) mainAudioRef.current.pause();
      for (const audio of stemAudioMapRef.current.values()) {
        audio.pause();
      }
    };

    const master = getActiveMasterAudio();
    const currentTime = master?.currentTime ?? 0;
    syncTime(currentTime);

    if (isPlaying) {
      void playTarget();
    } else {
      pauseAll();
    }
  }, [isPlaying, currentSong?.id, useStemMix, stems, setPlaying, volume]);

  useEffect(() => {
    if (!currentSong) return;

    const totalSeconds = parseDurationToSeconds(currentSong.duracao);
    if (totalSeconds <= 0) return;

    const master = getActiveMasterAudio();
    if (!master) return;

    const targetTime = (Math.max(0, Math.min(100, progress)) / 100) * totalSeconds;
    if (Math.abs(targetTime - master.currentTime) <= 1.2) return;

    suppressNextProgressSeekRef.current = true;

    if (mainAudioRef.current) {
      mainAudioRef.current.currentTime = targetTime;
    }
    for (const audio of stemAudioMapRef.current.values()) {
      audio.currentTime = targetTime;
    }
  }, [progress, currentSong?.id, useStemMix, stems]);

  useEffect(() => {
    const master = getActiveMasterAudio();
    if (!master || !currentSong) return;

    const handleTimeUpdate = () => {
      const totalSeconds = parseDurationToSeconds(currentSong.duracao);
      if (totalSeconds <= 0) return;

      const percent = (master.currentTime / totalSeconds) * 100;

      if (suppressNextProgressSeekRef.current) {
        suppressNextProgressSeekRef.current = false;
        return;
      }

      setProgress(Math.max(0, Math.min(100, percent)));
    };

    const handleEnded = () => {
      const stemsToReset = [...stems];
      if (stemsToReset.length > 0) {
        resetStemVolumes();
        void Promise.allSettled(
          stemsToReset.map((stem) => stemsAPI.updateVolume(stem.id, 100))
        );
      }
      setProgress(100);
      playNext();
    };

    const handlePause = () => {
      if (!master.ended) {
        setPlaying(false);
      }
    };

    const handlePlay = () => {
      setPlaying(true);
    };

    master.addEventListener('timeupdate', handleTimeUpdate);
    master.addEventListener('ended', handleEnded);
    master.addEventListener('pause', handlePause);
    master.addEventListener('play', handlePlay);

    return () => {
      master.removeEventListener('timeupdate', handleTimeUpdate);
      master.removeEventListener('ended', handleEnded);
      master.removeEventListener('pause', handlePause);
      master.removeEventListener('play', handlePlay);
    };
  }, [currentSong?.id, useStemMix, stems, playNext, resetStemVolumes, setPlaying, setProgress]);

  useEffect(() => {
    return () => {
      if (mainAudioRef.current) {
        mainAudioRef.current.pause();
      }
      for (const audio of stemAudioMapRef.current.values()) {
        audio.pause();
      }
      stemAudioMapRef.current.clear();
    };
  }, []);

  return <audio ref={mainAudioRef} preload="metadata" style={{ display: 'none' }} />;
}
