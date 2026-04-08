import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ResetPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    password?: string;
    employeeName?: string;
}

export function ResetPasswordDialog({ open, onOpenChange, password, employeeName }: ResetPasswordDialogProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        if (password) {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Password Reset Successful</DialogTitle>
                    <DialogDescription>
                        A new temporary password has been generated for {employeeName || 'this employee'}. 
                        Please copy it and share it with them securely.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 mt-4">
                    <div className="grid flex-1 gap-2">
                        <Input
                            id="rpassword"
                            value={password || ''}
                            readOnly
                            className="font-mono bg-muted text-lg tracking-wider"
                        />
                    </div>
                    <Button type="button" size="icon" className="px-3" onClick={handleCopy}>
                        <span className="sr-only">Copy</span>
                        {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>

                <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <p className="text-sm text-amber-600 dark:text-amber-400 mb-4 sm:mb-0">
                        * This password will only be shown once.
                    </p>
                    <Button type="button" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
