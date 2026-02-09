'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GHANA_REGIONS } from '@/lib/utils/region-normalizer';
import { Loader2 } from 'lucide-react';

export type BulkEditField = 'region' | 'district' | 'community' | 'society';

interface BulkEditFarmerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onSave: (field: BulkEditField, value: string) => Promise<void>;
}

export function BulkEditFarmerDialog({
    open,
    onOpenChange,
    selectedCount,
    onSave,
}: BulkEditFarmerDialogProps) {
    const [field, setField] = React.useState<BulkEditField>('region');
    const [value, setValue] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        if (!value) return;
        setIsSaving(true);
        try {
            await onSave(field, value);
            onOpenChange(false);
            setValue(''); // Reset value after success
        } catch (error) {
            console.error('Failed to save bulk edit', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Bulk Edit Farmers</DialogTitle>
                    <DialogDescription>
                        Update the **{field}** for {selectedCount} selected farmer{selectedCount !== 1 ? 's' : ''}.
                        Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="field" className="text-right">
                            Field
                        </Label>
                        <Select
                            value={field}
                            onValueChange={(val) => {
                                setField(val as BulkEditField);
                                setValue(''); // Reset value when field changes
                            }}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="region">Region</SelectItem>
                                <SelectItem value="district">District</SelectItem>
                                <SelectItem value="community">Community</SelectItem>
                                <SelectItem value="society">Society</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="value" className="text-right">
                            Value
                        </Label>
                        <div className="col-span-3">
                            {field === 'region' ? (
                                <Select value={value} onValueChange={setValue}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GHANA_REGIONS.map((region) => (
                                            <SelectItem key={region} value={region}>
                                                {region}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id="value"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder={`Enter new ${field}`}
                                />
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!value || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
