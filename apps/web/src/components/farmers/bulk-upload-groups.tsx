import * as React from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { parseFarmerGroupsExcel, ParseStats } from '@/lib/excel-parser';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkUploadGroupsProps {
    onSuccess?: () => void;
}

export function BulkUploadGroups({ onSuccess }: BulkUploadGroupsProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [progressMsg, setProgressMsg] = React.useState('');
    const [stats, setStats] = React.useState<ParseStats | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setStats(null);
        setProgressMsg('Reading file...');

        try {
            const result = await parseFarmerGroupsExcel(file, (msg) => {
                setProgressMsg(msg);
            });
            setStats(result);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to parse Excel file');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    const handleClose = () => {
        setStats(null);
        setError(null);
    };

    return (
        <>
            <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {isUploading ? 'Importing...' : 'Import from Excel'}
            </Button>

            <Dialog open={!!stats || !!error} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {stats ? 'Import Complete' : 'Import Error'}
                        </DialogTitle>
                        <DialogDescription>
                            {stats ? 'Successfully processed the uploaded Excel file.' : 'There was a problem processing your file.'}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {stats && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <FileSpreadsheet className="h-8 w-8 text-primary" />
                                <div>
                                    <div className="font-medium">Total Rows Parsed</div>
                                    <div className="text-sm text-muted-foreground">{stats.totalRows} records analyzed</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-600">{stats.newGroups}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">New Groups</div>
                                </div>
                                <div className="border rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-600">{stats.newFarmers}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">New Farmers</div>
                                </div>
                                <div className="border rounded-lg p-3 text-center col-span-2">
                                    <div className="text-2xl font-bold text-orange-600">{stats.updatedFarmers}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Farmers Added to Groups</div>
                                </div>
                            </div>

                            {stats.errors.length > 0 && (
                                <div className="mt-4">
                                    <div className="text-sm font-medium text-destructive mb-2">Warnings ({stats.errors.length})</div>
                                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1 max-h-32 overflow-y-auto">
                                        {stats.errors.slice(0, 10).map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                        {stats.errors.length > 10 && (
                                            <li>...and {stats.errors.length - 10} more warnings.</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={handleClose}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
