import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';
import { Search, UsersRound, MapPin, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddToGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentGroupId?: string;
    onSave: (groupId: string) => Promise<void>;
}

export function AddToGroupDialog({ open, onOpenChange, currentGroupId, onSave }: AddToGroupDialogProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedGroupId, setSelectedGroupId] = React.useState<string | undefined>(currentGroupId);
    const [isSaving, setIsSaving] = React.useState(false);

    // Reset selection when dialog opens
    React.useEffect(() => {
        if (open) {
            setSelectedGroupId(currentGroupId);
            setSearchQuery('');
        }
    }, [open, currentGroupId]);

    const groups = useLiveQuery(() => db.farmerGroups.toArray());

    const filteredGroups = React.useMemo(() => {
        if (!groups) return [];
        if (!searchQuery) return groups;
        const q = searchQuery.toLowerCase();
        return groups.filter(g =>
            g.name.toLowerCase().includes(q) ||
            g.region.toLowerCase().includes(q) ||
            g.district.toLowerCase().includes(q)
        );
    }, [groups, searchQuery]);

    const handleSave = async () => {
        if (!selectedGroupId) return;
        setIsSaving(true);
        try {
            await onSave(selectedGroupId);
            onOpenChange(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add to Farmer Group</DialogTitle>
                    <DialogDescription>
                        Select a cooperative or group to assign this farmer to.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search groups by name, region or district..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <ScrollArea className="h-[300px] rounded-md border p-2">
                        {!groups ? (
                            <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">
                                Loading groups...
                            </div>
                        ) : filteredGroups.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                {searchQuery ? `No groups found matching "${searchQuery}".` : 'No groups yet.'}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredGroups.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => setSelectedGroupId(group.id)}
                                        className={`w-full flex flex-col items-start gap-1 rounded-lg p-3 text-left transition-colors hover:bg-muted ${selectedGroupId === group.id ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 shadow-sm' : 'border border-transparent'
                                            }`}
                                    >
                                        <div className="flex w-full items-center justify-between">
                                            <span className="font-semibold text-sm flex items-center gap-2">
                                                <UsersRound className="h-4 w-4 text-muted-foreground" />
                                                {group.name}
                                            </span>
                                            {selectedGroupId === group.id && (
                                                <Check className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-6">
                                            <MapPin className="h-3 w-3" />
                                            {group.district}, {group.region}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!selectedGroupId || selectedGroupId === currentGroupId || isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
