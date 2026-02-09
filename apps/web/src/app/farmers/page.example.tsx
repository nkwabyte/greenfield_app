/**
 * EXAMPLE: Migrated Farmers Page using Dexie Hooks
 * This is an example showing how to migrate from Redux to Dexie hooks
 * 
 * Key changes:
 * 1. Replace useSelector with useFarmers() hook
 * 2. Use direct service calls instead of Redux actions
 * 3. No blocking data fetch - UI renders immediately
 */

'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, Upload } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/farmers/farmer-columns';
import type { Farmer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddEditFarmerDialog, type FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';

// NEW: Import Dexie hooks and services instead of Redux
import { useFarmers } from '@/hooks/useData';
import {
    addFarmer as addFarmerService,
    updateFarmer as updateFarmerService,
    deleteFarmer as deleteFarmerService
} from '@/lib/db/services/farmers';
import { v4 as uuidv4 } from 'uuid';

export default function FarmersPageExample() {
    const { toast } = useToast();

    // ✅ NEW: Use Dexie hook - auto-updates, no blocking
    const farmers = useFarmers();

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
    const [editingFarmer, setEditingFarmer] = React.useState<Farmer | null>(null);

    const handleOpenAddDialog = () => {
        setEditingFarmer(null);
        setIsAddEditDialogOpen(true);
    };

    const handleOpenEditDialog = (farmer: Farmer) => {
        setEditingFarmer(farmer);
        setIsAddEditDialogOpen(true);
    };

    // ✅ NEW: Direct service call - saves to IndexedDB + queues sync
    const handleSaveFarmer = async (data: FarmerFormValues) => {
        try {
            if (editingFarmer) {
                await updateFarmerService(editingFarmer.id, data);
                toast({
                    title: "Farmer Updated",
                    description: `${data.name}'s record has been updated.`
                });
            } else {
                const id = uuidv4();
                await addFarmerService(data, id);
                toast({
                    title: "Farmer Added",
                    description: `${data.name} has been added.`
                });
            }
            // Component auto-updates via useFarmers() hook!
        } catch (error) {
            toast({
                title: "Save Failed",
                description: "An error occurred while saving the farmer.",
                variant: "destructive"
            });
        }
    };

    // ✅ NEW: Direct service call
    const handleDeleteFarmer = async (farmerId: string) => {
        if (window.confirm("Are you sure you want to delete this farmer?")) {
            try {
                await deleteFarmerService(farmerId);
                toast({
                    title: "Farmer Deleted",
                    description: "Farmer record has been removed."
                });
                // Component auto-updates via useFarmers() hook!
            } catch (error) {
                toast({
                    title: "Delete Failed",
                    description: "Failed to delete farmer.",
                    variant: "destructive"
                });
            }
        }
    };

    const columns = React.useMemo(() => getColumns({
        onEdit: handleOpenEditDialog,
        onDelete: handleDeleteFarmer,
    }), []);

    const handleExport = () => {
        if (!farmers) return;

        const csvHeader = "ID,Farmer Name,Gender,Region,District,Community,Contact,Age,EducationLevel,FarmSize,CropsGrown,Status,JoinDate,CreatedAt,UpdatedAt\n";
        const csvRows = farmers.map(f =>
            [
                `"${f.id}"`,
                `"${f.name}"`,
                `"${f.gender || ''}"`,
                `"${f.region || ''}"`,
                `"${f.district || ''}"`,
                `"${f.community || ''}"`,
                `"${f.contact || ''}"`,
                `"${f.age || ''}"`,
                `"${f.educationLevel || ''}"`,
                `"${f.farmSize ?? ''}"`,
                `"${f.cropsGrown?.join('; ') || ''}"`,
                `"${f.status || ''}"`,
                `"${f.joinDate || ''}"`,
                `"${f.createdAt}"`,
                `"${f.updatedAt}"`,
            ].join(',')
        ).join("\n");

        const csvContent = csvHeader + csvRows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "farmers_export.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        toast({
            title: 'Export Successful',
            description: 'Farmer data has been exported to CSV.',
        });
    };

    // ✅ NEW: Show loading state while data loads in background
    if (!farmers) {
        return (
            <AppShell>
                <PageHeader
                    title="Farmer Management"
                    description="View, add, edit, and manage all farmer records."
                />
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                        <p className="mt-4 text-sm text-muted-foreground">Loading farmers...</p>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <PageHeader
                title="Farmer Management"
                description="View, add, edit, and manage all farmer records."
            >
                <Button variant="outline" onClick={handleExport} disabled={farmers.length === 0}>
                    <Download className="mr-2" />
                    Export
                </Button>
                <Button onClick={handleOpenAddDialog}>
                    <PlusCircle className="mr-2" />
                    Add Farmer
                </Button>
            </PageHeader>

            <div className="grid gap-6">
                <DataTable
                    columns={columns}
                    data={farmers}
                    filterColumnId="name"
                    filterPlaceholder="Filter by name..."
                    isLoading={false}
                />
            </div>

            <AddEditFarmerDialog
                open={isAddEditDialogOpen}
                onOpenChange={setIsAddEditDialogOpen}
                farmer={editingFarmer}
                onSave={handleSaveFarmer}
            />
        </AppShell>
    );
}
