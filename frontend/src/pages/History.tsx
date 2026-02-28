import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RotateCcw,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { historyAPI } from '@/services/api';
import type { ConversionHistory } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyPendingDelete, setHistoryPendingDelete] = useState<ConversionHistory | null>(null);

  // Carregar histórico do backend
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await historyAPI.getAll();
      setHistory(response.data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter(
      (item) =>
        item.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [history, searchQuery]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'PROCESSING':
        return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'ERROR':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'Concluído';
      case 'PROCESSING':
        return 'Processando';
      case 'ERROR':
        return 'Erro';
      default:
        return 'Pendente';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'PROCESSING':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'ERROR':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await historyAPI.delete(id);
      loadHistory();
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
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
          <h1 className="text-3xl font-bold mb-2">Histórico de Conversões</h1>
          <p className="text-muted-foreground">
            {filteredHistory.length} conversão{filteredHistory.length !== 1 && 's'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadHistory}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar no histórico..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* History List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredHistory.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {getStatusIcon(item.status)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {item.titulo || 'Conversão em andamento'}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.url}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
                            getStatusClass(item.status)
                          )}
                        >
                          {getStatusIcon(item.status)}
                          {getStatusText(item.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.dataInicio).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {item.dataFim && (
                          <span className="text-xs text-muted-foreground">
                            •{' '}
                            {Math.round(
                              (new Date(item.dataFim).getTime() -
                                new Date(item.dataInicio).getTime()) /
                                1000
                            )}{' '}
                            segundos
                          </span>
                        )}
                      </div>
                      {item.mensagemErro && (
                        <p className="text-xs text-red-500 mt-1">
                          {item.mensagemErro}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              setHistoryPendingDelete(item);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredHistory.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="h-24 w-24 rounded-full bg-accent flex items-center justify-center mx-auto mb-6">
              <Clock className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Histórico vazio</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Você ainda não realizou nenhuma conversão. Comece convertendo seu
              primeiro vídeo!
            </p>
          </motion.div>
        )}
      </div>
      <ConfirmDialog
        open={!!historyPendingDelete}
        onOpenChange={(open) => {
          if (!open) setHistoryPendingDelete(null);
        }}
        title="Remover item do histórico?"
        description={
          historyPendingDelete
            ? `O registro de \"${historyPendingDelete.titulo || 'conversão'}\" será removido do histórico.`
            : 'Esta ação não pode ser desfeita.'
        }
        confirmLabel="Sim, remover"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          if (!historyPendingDelete) return;
          await handleDelete(historyPendingDelete.id);
          setHistoryPendingDelete(null);
        }}
      />
    </motion.div>
  );
}
