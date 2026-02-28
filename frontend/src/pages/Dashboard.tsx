import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Heart, History, TrendingUp, Clock, Disc, Loader2 } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { songsAPI, historyAPI, statsAPI } from '@/services/api';
import type { Song, ConversionHistory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
};

interface Stats {
  totalSongs: number;
  favorites: number;
  conversions: number;
  totalDuration: number;
}

export function Dashboard() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSongs: 0, favorites: 0, conversions: 0, totalDuration: 0 });
  const [loading, setLoading] = useState(true);
  const { setPlaylist, setCurrentSong } = usePlayerStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [songsRes, historyRes, statsRes] = await Promise.all([
        songsAPI.getAll(),
        historyAPI.getAll(),
        statsAPI.getStats(),
      ]);
      
      setSongs(songsRes.data);
      setHistory(historyRes.data);
      setStats(statsRes.data);
      setPlaylist(songsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  };

  const statsData = [
    {
      title: 'Total de Músicas',
      value: stats.totalSongs,
      icon: Music,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Favoritos',
      value: stats.favorites,
      icon: Heart,
      color: 'from-red-500 to-red-600',
    },
    {
      title: 'Conversões',
      value: stats.conversions,
      icon: History,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Horas de Música',
      value: formatDuration(stats.totalDuration),
      icon: Clock,
      color: 'from-purple-500 to-purple-600',
    },
  ];

  const recentSongs = songs.slice(0, 6);
  const recentConversions = history.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-8 pb-32"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta! Aqui está o resumo da sua atividade.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <div
                      className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Recent Songs */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Músicas Recentes</h2>
          <button className="text-sm text-primary hover:underline">
            Ver todas
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {recentSongs.map((song, index) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="group cursor-pointer"
              onClick={() => setCurrentSong(song)}
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                <img
                  src={song.thumbnail}
                  alt={song.titulo}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
                    <Disc className="h-6 w-6 text-primary-foreground animate-spin-slow" />
                  </div>
                </div>
              </div>
              <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {song.titulo}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {song.artista}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Conversions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversões Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentConversions.map((conversion, index) => (
                <motion.div
                  key={conversion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0">
                    {conversion.thumbnail ? (
                      <img
                        src={conversion.thumbnail}
                        alt={conversion.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Music className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {conversion.titulo || 'Conversão em andamento'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(conversion.dataInicio).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      conversion.status === 'DONE'
                        ? 'bg-green-500/20 text-green-500'
                        : conversion.status === 'PROCESSING'
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : conversion.status === 'ERROR'
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-gray-500/20 text-gray-500'
                    }`}
                  >
                    {conversion.status === 'DONE'
                      ? 'Concluído'
                      : conversion.status === 'PROCESSING'
                      ? 'Processando'
                      : conversion.status === 'ERROR'
                      ? 'Erro'
                      : 'Pendente'}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
