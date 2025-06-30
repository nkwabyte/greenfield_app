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
import { UploadReportDialog } from '@/components/farmers/upload-report-dialog';
import { AddEditFarmerDialog, type FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';
import { getFarmers, addFarmer, updateFarmer, deleteFarmer, addFarmersBatch } from '@/lib/firebase/services/farmers';

type FailedRecord = {
  rowIndex: number;
  rowData: string;
  error: string;
};

export default function FarmersPage() {
  const { toast } = useToast();
  const [farmers, setFarmers] = React.useState<Farmer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [failedRecords, setFailedRecords] = React.useState<FailedRecord[]>([]);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingFarmer, setEditingFarmer] = React.useState<Farmer | null>(null);

  const fetchAndSetFarmers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const farmerData = await getFarmers();
      setFarmers(farmerData);
    } catch (error) {
      toast({ title: "Error fetching farmers", description: "Could not retrieve farmer data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAndSetFarmers();
  }, [fetchAndSetFarmers]);

  const handleOpenAddDialog = () => {
    setEditingFarmer(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveFarmer = async (data: FarmerFormValues) => {
    try {
      if (editingFarmer) {
        await updateFarmer(editingFarmer.id, data);
        toast({ title: "Farmer Updated", description: `${data.name}'s record has been updated.` });
      } else {
        await addFarmer(data);
        toast({ title: "Farmer Added", description: `${data.name} has been added to the system.` });
      }
      fetchAndSetFarmers();
    } catch (error) {
      toast({ title: "Save Failed", description: "An error occurred while saving the farmer.", variant: "destructive" });
    }
  };

  const handleDeleteFarmer = async (farmerId: string) => {
    if (window.confirm("Are you sure you want to delete this farmer? This action cannot be undone.")) {
      try {
        await deleteFarmer(farmerId);
        toast({ title: "Farmer Deleted", description: "The farmer record has been removed." });
        fetchAndSetFarmers();
      } catch (error) {
        toast({ title: "Delete Failed", description: "An error occurred while deleting the farmer.", variant: "destructive" });
      }
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
    onDelete: handleDeleteFarmer,
  }), []);

  const handleExport = () => {
    const csvHeader = "ID,Name,Region,Gender,JoinDate,FarmSize,Status,CreatedAt,UpdatedAt\n";
    const csvRows = farmers.map(f =>
      `"${f.id}","${f.name}","${f.region || ''}","${f.gender || ''}","${f.joinDate || ''}","${f.farmSize ?? ''}","${f.status || ''}","${f.createdAt}","${f.updatedAt}"`
    ).join("\n");

    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-t;' });
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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processCsv(text);
    };
    reader.readAsText(file);
    if (event.target) {
      event.target.value = '';
    }
  };

  const processCsv = async (csvText: string) => {
    const rows = csvText.split('\n').map(row => row.trim()).filter(row => row);
    if (rows.length < 2) {
      toast({ title: 'Error uploading file', description: 'CSV file is empty or has only a header.', variant: 'destructive' });
      return;
    }

    const header = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const expectedHeaders = ['Name', 'Region', 'Gender', 'JoinDate', 'FarmSize', 'Status'];
    const hasAllHeaders = expectedHeaders.every(h => header.includes(h));

    if (!hasAllHeaders) {
      toast({ title: 'Invalid CSV Header', description: 'CSV header is missing or does not match expected format: ' + expectedHeaders.join(', '), variant: 'destructive' });
      return;
    }

    const nameIndex = header.indexOf('Name');
    const newFarmers: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const localFailedRecords: FailedRecord[] = [];
    
    rows.slice(1).forEach((rowStr, index) => {
      if (!rowStr) return;
      const rowData = rowStr.split(',');

      if (!rowData[nameIndex] || rowData[nameIndex].trim() === '') {
        localFailedRecords.push({ rowIndex: index + 2, rowData: rowStr, error: 'Farmer name is missing.' });
        return;
      }

      const farmSizeStr = rowData[header.indexOf('FarmSize')]?.trim();
      const farmSize = farmSizeStr ? parseFloat(farmSizeStr) : undefined;
      if (farmSizeStr && isNaN(farmSize)) {
        localFailedRecords.push({ rowIndex: index + 2, rowData: rowStr, error: 'Invalid format for FarmSize.' });
        return;
      }

      const joinDateStr = rowData[header.indexOf('JoinDate')]?.trim();
      if (joinDateStr && isNaN(new Date(joinDateStr).getTime())) {
        localFailedRecords.push({ rowIndex: index + 2, rowData: rowStr, error: 'Invalid format for JoinDate.' });
        return;
      }

      const farmer = {
        name: rowData[nameIndex].trim(),
        region: (rowData[header.indexOf('Region')]?.trim() as Farmer['region']) || undefined,
        gender: (rowData[header.indexOf('Gender')]?.trim() as Farmer['gender']) || undefined,
        joinDate: joinDateStr || undefined,
        farmSize: farmSize,
        status: (rowData[header.indexOf('Status')]?.trim() as Farmer['status']) || 'Active',
      };
      
      newFarmers.push(farmer);
    });

    if (newFarmers.length > 0) {
      try {
        await addFarmersBatch(newFarmers);
        fetchAndSetFarmers();
      } catch (error) {
        toast({ title: 'Batch Upload Failed', description: 'An error occurred during the batch upload.', variant: 'destructive' });
      }
    }
    
    if (localFailedRecords.length > 0) {
      setFailedRecords(localFailedRecords);
      setIsReportOpen(true);
    }
    
    toast({
      title: 'Upload Processed',
      description: `${newFarmers.length} farmers queued for addition. ${localFailedRecords.length} records failed validation.`,
      variant: localFailedRecords.length > 0 ? 'default' : 'default',
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Farmer Management"
        description="View, add, edit, and manage all farmer records."
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ display: 'none' }} />
        <Button variant="outline" onClick={handleUploadClick}>
          <Upload className="mr-2" />
          Upload
        </Button>
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
          isLoading={isLoading}
        />
      </div>

      <UploadReportDialog open={isReportOpen} onOpenChange={setIsReportOpen} failedRecords={failedRecords} />

      <AddEditFarmerDialog
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        farmer={editingFarmer}
        onSave={handleSaveFarmer}
      />
    </AppShell>
  );
}
