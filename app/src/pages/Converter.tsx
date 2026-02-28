import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Music,
  Wand2,
} from 'lucide-react';
import { convertAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type ConversionStatus = 'idle' | 'pending' | 'processing' | 'success' | 'error';

interface ConversionState {
  id?: string;
  status: ConversionStatus;
  progress: number;
  message: string;
  song?: {
    titulo: string;
    artista: string;
    thumbnail: string;
    duracao: string;
  };
}

export function Converter() {
  const [url, setUrl] = useState('');
  const [conversion, setConversion] = useState<ConversionState>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [enableStems, setEnableStems] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setConversion({
      status: 'pending',
      progress: 10,
      message: 'Iniciando conversão...',
    });

    try {
      const response = await convertAPI.convert(url, enableStems);
      const { id, status } = response.data;

      setConversion({
        id,
        status: status === 'PENDING' ? 'pending' : 'processing',
        progress: 20,
        message: 'Conversão iniciada...',
      });

      // Iniciar polling de status
      startPolling(id);
    } catch (error: any) {
      setConversion({
        status: 'error',
        progress: 0,
        message: error.response?.data?.error || 'Erro ao iniciar conversão',
      });
    }
  };

  const startPolling = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await convertAPI.getStatus(id);
        const { status, titulo, thumbnail, duracao, artista, mensagemErro } = response.data;

        let progress = 20;
        let message = 'Processando...';

        switch (status) {
          case 'PENDING':
            progress = 20;
            message = 'Aguardando na fila...';
            break;
          case 'PROCESSING':
            progress = 50;
            message = 'Convertendo vídeo...';
            break;
          case 'DONE':
            progress = 100;
            message = 'Conversão concluída!';
            clearInterval(interval);
            setConversion({
              id,
              status: 'success',
              progress: 100,
              message: 'Conversão concluída com sucesso!',
              song: {
                titulo: titulo || 'Música Convertida',
                artista: artista || 'Artista Desconhecido',
                thumbnail: thumbnail || 'https://picsum.photos/300/300',
                duracao: duracao || '3:00',
              },
            });
            return;
          case 'ERROR':
            clearInterval(interval);
            setConversion({
              id,
              status: 'error',
              progress: 0,
              message: mensagemErro || 'Erro na conversão',
            });
            return;
        }

        setConversion((prev) => ({
          ...prev,
          status: status === 'PROCESSING' ? 'processing' : 'pending',
          progress,
          message,
        }));
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 2000);

    setPollingInterval(interval);
  };

  const resetConversion = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setUrl('');
    setConversion({
      status: 'idle',
      progress: 0,
      message: '',
    });
    setEnableStems(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 pb-32 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3">Converter YouTube para MP3</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Cole o link do vídeo do YouTube abaixo para converter em arquivo MP3
          de alta qualidade.
        </p>
      </div>

      {/* Converter Form */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-12 h-14 text-base"
                disabled={conversion.status === 'pending' || conversion.status === 'processing'}
                required
              />
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/50">
              <button
                type="button"
                onClick={() => setEnableStems(!enableStems)}
                className={cn(
                  'flex items-center gap-3 flex-1',
                  (conversion.status === 'pending' || conversion.status === 'processing') && 'pointer-events-none opacity-50'
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center transition-colors',
                    enableStems
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Wand2 className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Separar Faixas (Stems)</p>
                  <p className="text-sm text-muted-foreground">
                    Separe vocal, bateria, baixo e outros instrumentos
                  </p>
                </div>
                <div
                  className={cn(
                    'h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors',
                    enableStems
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  )}
                >
                  {enableStems && <CheckCircle className="h-4 w-4 text-primary-foreground" />}
                </div>
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={conversion.status === 'pending' || conversion.status === 'processing' || !url.trim()}
            >
              {conversion.status === 'pending' || conversion.status === 'processing' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Converter para MP3
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Progress / Result */}
      <AnimatePresence mode="wait">
        {conversion.status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              className={cn(
                'overflow-hidden',
                conversion.status === 'success' && 'border-green-500/50',
                conversion.status === 'error' && 'border-red-500/50'
              )}
            >
              <CardContent className="p-6">
                {(conversion.status === 'pending' || conversion.status === 'processing') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="font-medium">{conversion.message}</span>
                    </div>
                    <Progress value={conversion.progress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      {conversion.progress}% completo
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      Não feche esta página até a conversão terminar
                    </p>
                  </div>
                )}

                {conversion.status === 'success' && conversion.song && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={conversion.song.thumbnail}
                          alt={conversion.song.titulo}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{conversion.song.titulo}</h3>
                        <p className="text-muted-foreground">
                          {conversion.song.artista}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Duração: {conversion.song.duracao}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={resetConversion}>
                        Converter Outro
                      </Button>
                    </div>
                  </div>
                )}

                {conversion.status === 'error' && (
                  <div className="text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-bold text-red-500">
                        Erro na conversão
                      </h3>
                      <p className="text-muted-foreground">{conversion.message}</p>
                    </div>
                    <Button onClick={resetConversion}>Tentar Novamente</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {[
          {
            icon: Music,
            title: 'Alta Qualidade',
            description: 'Conversão em 320kbps para a melhor experiência sonora.',
          },
          {
            icon: Wand2,
            title: 'Separação de Faixas',
            description: 'Separe vocal, bateria, baixo e outros instrumentos.',
          },
          {
            icon: CheckCircle,
            title: 'Rápido e Fácil',
            description: 'Cole o link e converta em segundos.',
          },
        ].map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <Card className="h-full">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
