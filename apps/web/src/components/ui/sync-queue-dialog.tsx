import { useState } from 'react';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { syncService } from '@/lib/db/sync';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, RefreshCw, Trash2, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface SyncQueueDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SyncQueueDialog({ open, onOpenChange }: SyncQueueDialogProps) {
    const [isRetrying, setIsRetrying] = useState<number | null>(null);
    const [isDiscarding, setIsDiscarding] = useState<number | null>(null);
    const { toast } = useToast();

    // Fetch only items that are not fully synced
    const queueItems = useLiveQuery(
        () => db.syncQueue
            .where('synced')
            .equals(0)
            .reverse()
            .sortBy('timestamp'),
        []
    );

    const handleRetry = async (id: number) => {
        setIsRetrying(id);
        try {
            // Reset the item for immediate retry
            await db.syncQueue.update(id, {
                status: 'pending',
                retryCount: 0,
                lastAttemptAt: 0,
            });
            // Trigger global sync (won't do anything if offline, but will queue it up immediately)
            await syncService.syncAll();
            toast({
                title: "Retry started",
                description: "The item has been queued for synchronization.",
            });
        } catch (error) {
            console.error('Failed to retry item:', error);
            toast({
                title: "Error",
                description: "Failed to initiate retry.",
                variant: "destructive"
            });
        } finally {
            setIsRetrying(null);
        }
    };

    const handleDiscard = async (id: number) => {
        setIsDiscarding(id);
        try {
            await db.syncQueue.delete(id);
            toast({
                title: "Discarded",
                description: "Offline change permanently discarded.",
            });
        } catch (error) {
            console.error('Failed to discard item:', error);
            toast({
                title: "Error",
                description: "Failed to discard item.",
                variant: "destructive"
            });
        } finally {
            setIsDiscarding(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'syncing':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'failed':
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case 'synced':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'pending':
            default:
                return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'failed':
                return <Badge variant="destructive" className="capitalize">{status}</Badge>;
            case 'syncing':
                return <Badge variant="secondary" className="capitalize bg-blue-100 text-blue-800 hover:bg-blue-100">{status}</Badge>;
            case 'pending':
                return <Badge variant="outline" className="capitalize bg-yellow-50 text-yellow-800 border-yellow-200">{status}</Badge>;
            default:
                return <Badge variant="outline" className="capitalize">{status}</Badge>;
        }
    };

    const formatEntityName = (entityType: string) => {
        return entityType
            .replace(/([A-Z])/g, ' $1') // insert a space before all caps
            .replace(/^./, (str) => str.toUpperCase()); // uppercase the first character
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-muted-foreground" />
                        Sync Queue
                    </DialogTitle>
                    <DialogDescription>
                        Review offline changes pending upload. You can retry failed uploads or permanently discard changes causing errors.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto mt-4 border rounded-md">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="w-[140px]">Entity</TableHead>
                                <TableHead className="w-[100px]">Action</TableHead>
                                <TableHead>Details & Errors</TableHead>
                                <TableHead className="w-[140px] text-right">Time</TableHead>
                                <TableHead className="w-[180px] text-right">Manage</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!queueItems ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : queueItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                                            <p>All changes have been synced up to the cloud.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                queueItems.map((item) => (
                                    <TableRow key={item.id} className={item.status === 'failed' ? 'bg-red-50/30' : ''}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(item.status)}
                                                {getStatusBadge(item.status)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {formatEntityName(item.entityType)}
                                        </TableCell>
                                        <TableCell className="capitalize">
                                            {item.operation}
                                        </TableCell>
                                        <TableCell className="max-w-xs">
                                            <div className="text-sm">
                                                ID: <span className="font-mono text-xs text-muted-foreground">{item.entityId.slice(0, 8)}...</span>
                                            </div>
                                            {item.lastError && (
                                                <div className="mt-1 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                    <span className="line-clamp-2" title={item.lastError}>{item.lastError}</span>
                                                </div>
                                            )}
                                            {item.retryCount ? (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Retries: {item.retryCount}
                                                </div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRetry(item.id!)}
                                                    disabled={isRetrying === item.id || isDiscarding === item.id || item.status === 'syncing'}
                                                >
                                                    {isRetrying === item.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                    ) : (
                                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                                    )}
                                                    Retry
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDiscard(item.id!)}
                                                    disabled={isRetrying === item.id || isDiscarding === item.id}
                                                    title="Discard local change"
                                                >
                                                    {isDiscarding === item.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
