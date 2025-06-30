'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
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

  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState({ processed: 0, total: 0 });

  const fetchAndSetFarmers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const farmerData = await getFarmers();
      setFarmers(farmerData);
    } catch (error) {
      console.error(error);
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
      console.error(error);
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
    const csvHeader = "ID,Name,Gender,Region,District,Community,Contact,Age,EducationLevel,FarmSize,CropsGrown,Status,JoinDate,CreatedAt,UpdatedAt\n";
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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(row => row.trim().split(','));
        processFarmerData(rows);
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx') {
      reader.onload = (e) => {
        const data = e.target?.result;
        try {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
            processFarmerData(rows);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error processing XLSX file', description: 'The file might be corrupted or in an unsupported format.', variant: 'destructive'})
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({ title: 'Unsupported File Type', description: 'Please upload a .csv or .xlsx file.', variant: 'destructive' });
    }

    if (event.target) {
      event.target.value = '';
    }
  };

  const processFarmerData = async (dataRows: (string | number)[][]) => {
    if (dataRows.length < 2) {
      toast({ title: 'Error uploading file', description: 'File is empty or has only a header.', variant: 'destructive' });
      return;
    }

    const header = dataRows[0].map(h => String(h).trim().replace(/"/g, ''));
    if (!header.includes('Name')) {
      toast({ title: 'Invalid File Header', description: 'File header must include at least a "Name" column.', variant: 'destructive' });
      return;
    }

    const newFarmers: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const localFailedRecords: FailedRecord[] = [];
    
    const getHeaderIndex = (name: string) => header.indexOf(name);
    
    dataRows.slice(1).forEach((row, index) => {
      if (!row || row.length === 0) return;

      const rowData = row.map(cell => String(cell ?? '').trim());
      const rowStrForReport = row.join(',');

      const name = rowData[getHeaderIndex('Name')];
      if (!name) {
        localFailedRecords.push({ rowIndex: index + 2, rowData: rowStrForReport, error: 'Farmer name is missing.' });
        return;
      }

      const farmSizeStr = rowData[getHeaderIndex('FarmSize')];
      const farmSize = farmSizeStr ? parseFloat(farmSizeStr) : undefined;
      if (farmSizeStr && isNaN(farmSize)) {
        localFailedRecords.push({ rowIndex: index + 2, rowData: rowStrForReport, error: 'Invalid format for FarmSize.' });
        return;
      }
      
      const ageStr = rowData[getHeaderIndex('Age')];
      const age = ageStr ? parseInt(ageStr, 10) : undefined;
      if (ageStr && isNaN(age)) {
        localFailedRecords.push({ rowIndex: index + 2, rowData: rowStrForReport, error: 'Invalid format for Age.' });
        return;
      }

      const joinDateStr = rowData[getHeaderIndex('JoinDate')];
      if (joinDateStr && isNaN(new Date(joinDateStr).getTime())) {
        localFailedRecords.push({ rowIndex: index + 2, rowData: rowStrForReport, error: 'Invalid format for JoinDate.' });
        return;
      }

      const cropsGrown = rowData[getHeaderIndex('CropsGrown')]?.split(';').map(c => c.trim()).filter(Boolean);

      const farmer: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        region: rowData[getHeaderIndex('Region')],
        gender: rowData[getHeaderIndex('Gender')] as Farmer['gender'],
        joinDate: joinDateStr || undefined,
        farmSize,
        status: (rowData[getHeaderIndex('Status')] as Farmer['status']) || 'Active',
        district: rowData[getHeaderIndex('District')],
        community: rowData[getHeaderIndex('Community')],
        contact: rowData[getHeaderIndex('Contact')],
        age,
        educationLevel: rowData[getHeaderIndex('EducationLevel')] as Farmer['educationLevel'],
        cropsGrown: cropsGrown?.length ? cropsGrown : undefined,
      };
      
      newFarmers.push(farmer);
    });

    if (newFarmers.length > 0) {
      setIsUploading(true);
      setUploadProgress({ processed: 0, total: newFarmers.length });
      const chunkSize = 100;
      
      try {
        for (let i = 0; i < newFarmers.length; i += chunkSize) {
          const chunk = newFarmers.slice(i, i + chunkSize);
          await addFarmersBatch(chunk);
          const newProcessedCount = i + chunk.length;
          setUploadProgress({ processed: newProcessedCount, total: newFarmers.length });
          toast({
            title: 'Upload in Progress...',
            description: `Uploaded ${newProcessedCount} of ${newFarmers.length} farmers.`,
          });
        }
        toast({
          title: 'Upload Successful',
          description: `${newFarmers.length} farmers have been added.`,
        });
        fetchAndSetFarmers();
      } catch (error) {
        toast({ title: 'Batch Upload Failed', description: 'An error occurred during the batch upload.', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    }
    
    if (localFailedRecords.length > 0) {
      setFailedRecords(localFailedRecords);
      setIsReportOpen(true);
    } else if (newFarmers.length === 0) {
      toast({
        title: 'Upload Finished',
        description: 'No new valid farmer records were found to upload.',
        variant: 'default',
      });
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Farmer Management"
        description="View, add, edit, and manage all farmer records."
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx" style={{ display: 'none' }} />
        <Button variant="outline" onClick={handleUploadClick} disabled={isUploading}>
          {isUploading ? `Uploading ${uploadProgress.processed}/${uploadProgress.total}...` : <><Upload className="mr-2" /> Upload</>}
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
