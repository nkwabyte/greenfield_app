'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { useFarmerGroups } from '@/hooks/useData';
import { addFarmerGroup, updateFarmerGroup } from '@/lib/db/services/farmer-groups';
import type { FarmerGroup } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GroupFormValues } from '@/components/groups/add-edit-group-dialog';

const AddEditGroupDialog = dynamic(
    () => import('@/components/groups/add-edit-group-dialog').then(mod => mod.AddEditGroupDialog),
    { ssr: false }
);

export default function FarmerGroupsPage() {
    const { toast } = useToast();
    const groups = useFarmerGroups();

    const [search, setSearch] = React.useState('');
    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
    const [editingGroup, setEditingGroup] = React.useState<FarmerGroup | null>(null);

    const handleOpenAddDialog = () => {
        setEditingGroup(null);
        setIsAddEditDialogOpen(true);
    };

    const handleOpenEditDialog = (group: FarmerGroup) => {
        setEditingGroup(group);
        setIsAddEditDialogOpen(true);
    };

    const handleSaveGroup = async (data: GroupFormValues) => {
        try {
            if (editingGroup) {
                await updateFarmerGroup(editingGroup.id, data);
                toast({ title: 'Success', description: 'Farmer group updated successfully.' });
            } else {
                const id = uuidv4();
                await addFarmerGroup(data, id);
                toast({ title: 'Success', description: 'Farmer group created successfully.' });
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Could not save the farmer group.', variant: 'destructive' });
        }
    };

    const filteredGroups = React.useMemo(() => {
        if (!groups) return [];
        if (!search) return groups;
        return groups.filter(g =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.seasonYear.includes(search)
        );
    }, [groups, search]);

    return (
        <AppShell>
            <PageHeader title="Farmer Groups" description="Organize farmers into annual or seasonal cohorts.">
                <Button onClick={handleOpenAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Group
                </Button>
            </PageHeader>

            <div className="flex items-center space-x-2 mb-6 max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground absolute ml-3" />
                <Input
                    placeholder="Search groups or years..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {!groups ? (
                <div className="flex justify-center p-8 text-muted-foreground">Loading groups...</div>
            ) : filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 py-24 border rounded-xl bg-card border-dashed">
                    <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-xl font-medium">No Groups Found</h3>
                    <p className="text-muted-foreground max-w-sm text-center mt-2 mb-6">
                        {search ? 'No groups match your search criteria.' : 'You haven\'t created any farmer groups yet.'}
                    </p>
                    {!search && (
                        <Button onClick={handleOpenAddDialog} variant="outline">
                            Create your first group
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredGroups.map(group => (
                        <Card key={group.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpenEditDialog(group)}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className="font-semibold text-xs">
                                        <Calendar className="mr-1 h-3 w-3" /> {group.seasonYear}
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl">{group.name}</CardTitle>
                                {group.description && (
                                    <CardDescription className="line-clamp-2 mt-1">
                                        {group.description}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardFooter className="pt-4 pb-4 border-t bg-muted/20">
                                <div className="flex items-center text-sm font-medium text-muted-foreground">
                                    <Users className="mr-2 h-4 w-4" />
                                    {group.farmerIds.length} {group.farmerIds.length === 1 ? 'Farmer' : 'Farmers'} Enrolled
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <AddEditGroupDialog
                open={isAddEditDialogOpen}
                onOpenChange={setIsAddEditDialogOpen}
                group={editingGroup}
                onSave={handleSaveGroup}
            />
        </AppShell>
    );
}
