'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, Upload } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/farmers/farmer-columns';
import type { FailedRecord, Farmer, FarmerParseResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { UploadReportDialog } from '@/components/farmers/upload-report-dialog';
import { AddEditFarmerDialog, type FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';
import { useFarmers } from '@/hooks/use-farmers';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useQueryClient } from '@tanstack/react-query';


const queryClient = useQueryClient();

export default function FarmersPage() {
  const { toast } = useToast();
  const farmers = useSelector((state: RootState) => state.farmers.data);
  const isLoading = farmers.length === 0;
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [failedRecords, setFailedRecords] = React.useState<FailedRecord[]>([]);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingFarmer, setEditingFarmer] = React.useState<Farmer | null>(null);

  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState({ processed: 0, total: 0 });

  const {
    addFarmer,
    updateFarmer,
    deleteFarmer
  } = useFarmers();

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
        await updateFarmer({ id: editingFarmer.id, data });
        toast({ title: "Farmer Updated", description: `${data.name}'s record has been updated.` });
      } else {
        const id = crypto.randomUUID();
        await addFarmer({ id, data });
        toast({ title: "Farmer Added", description: `${data.name} has been added.` });
      }
    } catch (error) {
      toast({ title: "Save Failed", description: "An error occurred while saving the farmer.", variant: "destructive" });
    }
  };
  
  const handleDeleteFarmer = async (farmerId: string) => {
    if (window.confirm("Are you sure you want to delete this farmer?")) {
      try {
        await deleteFarmer(farmerId);
        toast({ title: "Farmer Deleted", description: "Farmer record has been removed." });
      } catch (error) {
        toast({ title: "Delete Failed", description: "Failed to delete farmer.", variant: "destructive" });
      }
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
    onDelete: handleDeleteFarmer,
  }), []);

  const handleExport = () => {
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
        // Convert CSV text into ArrayBuffer for uniformity
        const csvBuffer = new TextEncoder().encode(text);
        processFarmerData(csvBuffer.buffer); // Pass as ArrayBuffer
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx') {
      reader.onload = (e) => {
        const data = e.target?.result;
        if (data) {
          processFarmerData(data as ArrayBuffer);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({
        title: 'Unsupported File Type',
        description: 'Please upload a .csv or .xlsx file.',
        variant: 'destructive',
      });
    }
  
    // Clear file input value so same file can be uploaded again if needed
    if (event.target) {
      event.target.value = '';
    }
  };
  
  const parseFarmerRow = (
    row: any,
    i: number,
    sheetName: string,
    columnMap: Record<string, string>,
    otherColumns: string[]
  ): FarmerParseResult | null => {
    const rowIndex = i + 2;
  
    if (!row[columnMap.no]) return null; // skip completely empty rows
  
    const name = (row[columnMap.name] || '').toString().trim();
    const genderRaw = (row[columnMap.gender] || 'U').toString().trim().toLowerCase();
    const gender = genderRaw === 'f' ? 'Female' : genderRaw === 'm' ? 'Male' : 'Other';
  
    const age = parseInt(row[columnMap.age]) || 0;
    const farmSize = parseFloat(row[columnMap.size]) || 0.0;
    const region = (row[columnMap.region] || '').toString().trim();
  
    const errors: string[] = [];
    if (!name || name.length === 0) errors.push('Missing or invalid farmer name.');
    if (!region || region.length === 0) errors.push('Missing or invalid region.');
  
    if (errors.length > 0) {
      return {
        status: 'invalid',
        error: {
          rowIndex,
          rowData: JSON.stringify(row),
          error: errors.join(' ')
        }
      };
    }

    // default join date for firebase
    const joinDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
    const farmer: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.toLowerCase(),
      gender: gender as Farmer['gender'],
      region,
      district: sheetName,
      community: '',
      contact: '',
      age,
      farmSize,
      educationLevel: 'None',
      joinDate: joinDate,
      status: 'Active',
      cropsGrown: [],
    };
  
    const details = otherColumns.reduce((acc, col) => {
      acc[col] = row[col];
      return acc;
    }, {} as Record<string, string>);
  
    Object.assign(farmer, details);
  
    return {
      status: 'valid',
      data: farmer
    };
  };  

  const processFarmerData = async (dataBuffer: ArrayBuffer) => {
    const workbook = XLSX.read(dataBuffer, { type: 'array' });
  
    const validFarmers: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const failedRecords: FailedRecord[] = [];
  
    const sheetNames = workbook.SheetNames.filter(
      sheet => sheet.toLowerCase() !== 'summary'
    );
  
    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
  
      if (sheetData.length === 0) continue;
  
      const columnNames = Object.keys(sheetData[0]);
      const getColumn = (key: string) =>
        columnNames.find(col => col.toLowerCase().includes(key)) || '';
  
      const columnMap = {
        no: getColumn('no'),
        name: getColumn('name'),
        gender: getColumn('gender'),
        age: getColumn('age'),
        size: getColumn('size'),
        region: getColumn('region'),
      };
  
      const otherColumns = columnNames.filter(
        col => !Object.values(columnMap).includes(col)
      );
  
      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        const result = parseFarmerRow(row, i, sheetName, columnMap, otherColumns);
  
        if (result?.status === 'valid') {
          validFarmers.push(result.data);
        } else if (result?.status === 'invalid') {
          failedRecords.push(result.error);
        }
      }
    }
  
    // Upload all valid farmers
    if (validFarmers.length > 0) {
      setIsUploading(true);
      setUploadProgress({ processed: 0, total: validFarmers.length });
      const chunkSize = 100;
    
      try {
        for (let i = 0; i < validFarmers.length; i += chunkSize) {
          const chunk = validFarmers.slice(i, i + chunkSize);
          await Promise.all(chunk.map(async (farmer) => {
            const id = crypto.randomUUID();
            await addFarmer({
              id,
              data: {
                ...farmer,
                joinDate: farmer.joinDate ? new Date(farmer.joinDate) : new Date(),
              },
            });
          }));
          setUploadProgress({ processed: i + chunk.length, total: validFarmers.length });
        }        
        await queryClient.invalidateQueries({ queryKey: ['farmers'] });
        setUploadProgress({ processed: 0, total: 0 });
        toast({
          title: 'Import Complete',
          description: `${validFarmers.length} farmers uploaded to Firebase.`,
        });
      } catch (error) {
        console.error('Local DB insert failed:', error);
        toast({
          title: 'Local Storage Failed',
          description: 'Could not store farmers locally.',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    }    
  
    // Show failed records
    if (failedRecords.length > 0 && isUploading == false) {
      setFailedRecords(failedRecords);
      setIsReportOpen(true);
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

