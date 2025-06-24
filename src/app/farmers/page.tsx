'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, Upload } from 'lucide-react';
import { FarmerDataTable } from '@/components/farmers/farmer-data-table';
import { getColumns } from '@/components/farmers/farmer-columns';
import { mockFarmers } from '@/lib/mock-data';
import type { Farmer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { UploadReportDialog } from '@/components/farmers/upload-report-dialog';
import { AddEditFarmerDialog, type FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';

type FailedRecord = {
  rowIndex: number;
  rowData: string;
  error: string;
};

export default function FarmersPage() {
  const { toast } = useToast();
  const [farmers, setFarmers] = React.useState<Farmer[]>(() => 
    mockFarmers.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [failedRecords, setFailedRecords] = React.useState<FailedRecord[]>([]);

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
  
  const handleSaveFarmer = (data: FarmerFormValues) => {
    const now = new Date().toISOString();
    
    if (editingFarmer) {
      // Edit mode
      const updatedFarmers = farmers.map(f => 
        f.id === editingFarmer.id 
          ? { ...f, ...data, joinDate: data.joinDate?.toISOString(), updatedAt: now } 
          : f
      );
      setFarmers(updatedFarmers.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      toast({ title: "Farmer Updated", description: `${data.name}'s record has been updated.` });
    } else {
      // Add mode
      const newFarmer: Farmer = {
        id: `FARM${Date.now()}`,
        ...data,
        joinDate: data.joinDate?.toISOString(),
        createdAt: now,
        updatedAt: now,
      };
      setFarmers(prev => [...prev, newFarmer].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      toast({ title: "Farmer Added", description: `${data.name} has been added to the system.` });
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
  }), []);

  const handleExport = () => {
    const csvHeader = "ID,Name,Region,Gender,JoinDate,FarmSize,Status,CreatedAt,UpdatedAt\n";
    const csvRows = farmers.map(f => 
      `"${f.id}","${f.name}","${f.region || ''}","${f.gender || ''}","${f.joinDate || ''}","${f.farmSize ?? ''}","${f.status || ''}","${f.createdAt}","${f.updatedAt}"`
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
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processCsv(text);
    };
    reader.readAsText(file);
    if (event.target) {
        event.target.value = '';
    }
  };
  
  const processCsv = (csvText: string) => {
    const rows = csvText.split('\n').map(row => row.trim()).filter(row => row);
    if (rows.length < 2) {
      toast({ title: 'Error uploading file', description: 'CSV file is empty or has only a header.', variant: 'destructive' });
      return;
    }
    
    const header = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const expectedHeaders = ['ID', 'Name', 'Region', 'Gender', 'JoinDate', 'FarmSize', 'Status'];
    const hasAllHeaders = expectedHeaders.every(h => header.includes(h));

    if (!hasAllHeaders) {
         toast({ title: 'Invalid CSV Header', description: 'CSV header is missing or does not match expected format: ' + expectedHeaders.join(', '), variant: 'destructive' });
         return;
    }
    
    const nameIndex = header.indexOf('Name');
    
    const newFarmers: Farmer[] = [];
    const localFailedRecords: FailedRecord[] = [];
    const now = new Date().toISOString();

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

      const farmer: Farmer = {
        id: rowData[header.indexOf('ID')]?.trim() || `FARM${Date.now()}${index}`,
        name: rowData[nameIndex].trim(),
        region: (rowData[header.indexOf('Region')]?.trim() as Farmer['region']) || undefined,
        gender: (rowData[header.indexOf('Gender')]?.trim() as Farmer['gender']) || undefined,
        joinDate: joinDateStr || undefined,
        farmSize: farmSize,
        status: (rowData[header.indexOf('Status')]?.trim() as Farmer['status']) || undefined,
        createdAt: now,
        updatedAt: now,
      };
      
      newFarmers.push(farmer);
    });

    if (newFarmers.length > 0) {
      setFarmers(prev => [...prev, ...newFarmers].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    }

    if (localFailedRecords.length > 0) {
      setFailedRecords(localFailedRecords);
      setIsReportOpen(true);
    }
    
    toast({
      title: 'Upload Processed',
      description: `${newFarmers.length} farmers added successfully. ${localFailedRecords.length} records failed.`,
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
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2" />
          Export
        </Button>
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2" />
          Add Farmer
        </Button>
      </PageHeader>
      
      <div className="grid gap-6">
        <FarmerDataTable columns={columns} data={farmers} />
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
