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
  

  // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;

  //   const reader = new FileReader();
  //   const fileExtension = file.name.split('.').pop()?.toLowerCase();

  //   if (fileExtension === 'csv') {
  //     reader.onload = (e) => {
  //       const text = e.target?.result as string;
  //       const rows = text.split('\n').map(row => row.trim().split(','));
  //       processFarmerData(rows);
  //     };
  //     reader.readAsText(file);
  //   } else if (fileExtension === 'xlsx') {
  //     reader.onload = (e) => {
  //       const data = e.target?.result;
  //       try {
  //           const workbook = XLSX.read(data, { type: 'array' });
  //           const sheetName = workbook.SheetNames[0];
  //           const worksheet = workbook.Sheets[sheetName];
  //           const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
  //           processFarmerData(rows);
  //       } catch (error) {
  //           console.error(error);
  //           toast({ title: 'Error processing XLSX file', description: 'The file might be corrupted or in an unsupported format.', variant: 'destructive'})
  //       }
  //     };
  //     reader.readAsArrayBuffer(file);
  //   } else {
  //     toast({ title: 'Unsupported File Type', description: 'Please upload a .csv or .xlsx file.', variant: 'destructive' });
  //   }

  //   if (event.target) {
  //     event.target.value = '';
  //   }
  // };

  const processFarmerData = async (dataBuffer: ArrayBuffer) => {
    const workbook = XLSX.read(dataBuffer, { type: 'array' });
  
    const farmers: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const failedRecords: FailedRecord[] = [];
  
    const sheetNames = workbook.SheetNames.filter(
      sheet => sheet.toLowerCase() !== 'summary'
    );
  
    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
  
      if (sheetData.length === 0) continue;
  
      const columnNames = Object.keys(sheetData[0]);
      const lowerCaseMap = Object.fromEntries(
        columnNames.map((col) => [col.toLowerCase(), col])
      );
  
      const getColumn = (key: string) =>
        columnNames.find((col) => col.toLowerCase().includes(key)) || '';
  
      const numberColumn = getColumn('no');
      const nameColumn = getColumn('name');
      const societyColumn = getColumn('society');
      const genderColumn = getColumn('gender');
      const ageColumn = getColumn('age');
      const sizeColumn = getColumn('size');
      const regionColumn = getColumn('region');
  
      const otherColumns = columnNames.filter((col) =>
        ![numberColumn, nameColumn, societyColumn, genderColumn, ageColumn, sizeColumn, regionColumn]
          .includes(col)
      );
  
      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
  
        try {
          if (!row[numberColumn]) continue;
  
          const name = (row[nameColumn] || '').toString().trim();
          const genderRaw = (row[genderColumn] || 'U').toString().trim().toLowerCase();
          const gender = genderRaw === 'f' ? 'Female' : genderRaw === 'm' ? 'Male' : 'Other';
  
          const age = parseInt(row[ageColumn]) || 0;
          const farmSize = parseFloat(row[sizeColumn]) || 0.0;
          const region = (row[regionColumn] || 'Unknown').toString().trim();
  
          if (!name || !gender || !region) {
            throw new Error('Missing required fields.');
          }
  
          const farmer: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'> = {
            name: name.toLowerCase(),
            gender: gender as Farmer['gender'],
            region,
            district: sheetName,
            community: '',
            contact: '',
            age,
            farmSize,
            educationLevel: undefined,
            joinDate: undefined,
            status: 'Active',
            cropsGrown: undefined,
          };
  
          const details = otherColumns.reduce((acc, col) => {
            acc[col] = row[col];
            return acc;
          }, {} as Record<string, string>);
  
          // optionally attach details (or you can skip this)
          Object.assign(farmer, details);
  
          farmers.push(farmer);
        } catch (err: any) {
          failedRecords.push({
            rowIndex: i + 2,
            rowData: JSON.stringify(sheetData[i]),
            error: err.message || 'Unknown error',
          });
        }
      }
    }
  
    // Proceed to upload valid farmers
    if (farmers.length > 0) {
      setIsUploading(true);
      setUploadProgress({ processed: 0, total: farmers.length });
      const chunkSize = 100;
  
      try {
        for (let i = 0; i < farmers.length; i += chunkSize) {
          const chunk = farmers.slice(i, i + chunkSize);
          await addFarmersBatch(chunk);
          setUploadProgress({ processed: i + chunk.length, total: farmers.length });
        }
  
        toast({
          title: 'Upload Successful',
          description: `${farmers.length} farmers added from ${sheetNames.length} sheet(s).`,
        });
  
        fetchAndSetFarmers();
      } catch (error) {
        toast({ title: 'Upload Failed', description: 'Error during batch upload', variant: 'destructive' });
      } finally {
        setIsUploading(false);
  
        if (failedRecords.length > 0) {
          setFailedRecords(failedRecords);
          setIsReportOpen(true);
        }
      }
    } else {
      toast({ title: 'No valid farmers found', variant: 'destructive' });
      if (failedRecords.length > 0) {
        setFailedRecords(failedRecords);
        setIsReportOpen(true);
      }
    }
  };  

  // const processFarmerData = async (dataRows: (string | number)[][]) => {
  //   if (dataRows.length < 2) {
  //     toast({ title: 'Error uploading file', description: 'File is empty or has only a header.', variant: 'destructive' });
  //     return;
  //   }
  //   const rawHeader = dataRows[0];
  //   const header = rawHeader.map(h => String(h).trim().replace(/"/g, '').toLowerCase());

  //   // const header = dataRows[0].map(h => String(h).trim().replace(/"/g, ''));
  //   if (!header.includes('farmer name') && !header.includes('name')) {
  //     toast({
  //       title: 'Invalid File Header',
  //       description: 'File header must include at least a "Farmer Name" column.',
  //       variant: 'destructive',
  //     });
  //     return;
  //   }

  //   const newFarmers: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  //   const localFailedRecords: FailedRecord[] = [];
    
  //   // const getHeaderIndex = (name: string) => header.indexOf(name);
  //   const getHeaderIndex = (name: string) => header.indexOf(name.toLowerCase());

    
  //   dataRows.slice(1).forEach((row, index) => {
  //     if (!row || row.length === 0) return;

  //     const rowData = row.map(cell => String(cell ?? '').trim());
  //     const rowStrForReport = row.join(',');

  //     const name = rowData[getHeaderIndex('farmer name')] || rowData[getHeaderIndex('name')];
  //     if (!name) {
  //       localFailedRecords.push({ rowIndex: index + 2, rowData: rowStrForReport, error: 'Farmer name is missing.' });
  //       return;
  //     }    

  //     const farmSizeStr = rowData[getHeaderIndex('FARM SIZE (ACRES)')] || rowData[getHeaderIndex('FARM SIZE')];
  //     const farmSize = farmSizeStr ? parseFloat(farmSizeStr) : 0;
  //     if (farmSizeStr && isNaN(farmSize)) {
  //       localFailedRecords.push({ rowIndex: index + 2, rowData: rowStrForReport, error: 'Invalid format for farm size.' });
  //       return;
  //     }

  //     const ageStr = rowData[getHeaderIndex('age')];
  //     const age = ageStr ? parseInt(ageStr, 10) : 0;
  //     if (ageStr && isNaN(age)) {
  //       localFailedRecords.push({ rowIndex: index + 2, rowData: rowStrForReport, error: 'Invalid format for age.' });
  //       return;
  //     }

  //     const region = rowData[getHeaderIndex('region')] || '';
  //     if (region && !/^[a-zA-Z\s]+$/.test(region)) {
  //       localFailedRecords.push({ rowIndex: index + 2, rowData: rowStrForReport, error: 'Invalid format for region.' });
  //       return;
  //     }

  //     let gender = rowData[getHeaderIndex('gender')]?.trim() || 'Other';
  //     let newGender = 'Other';
  //     if (gender?.toLowerCase() === 'f' || gender?.toLowerCase() === 'F') {
  //       newGender = 'Female';
  //     } else if (gender?.toLowerCase() === 'm' || gender?.toLowerCase() === 'M') {
  //       newGender = 'Male';
  //     } else {
  //       newGender = 'Other';
  //     }
  //     if (newGender && !['Male', 'Female', 'Other', 'M', 'F'].includes(newGender)) {
  //       localFailedRecords.push({
  //         rowIndex: index + 2,
  //         rowData: rowStrForReport,
  //         error: 'Invalid format for gender. Must be "Male", "Female", "Other", "M", or "F".',
  //       });
  //       return;
  //     }

  //     const joinDateStr = rowData[getHeaderIndex('join date')];
  //     if (joinDateStr && isNaN(new Date(joinDateStr).getTime())) {
  //       localFailedRecords.push({ rowIndex: index + 2, rowData: rowStrForReport, error: 'Invalid format for join date.' });
  //       return;
  //     }

  //     const cropsGrown = rowData[getHeaderIndex('CropsGrown')]?.split(';').map(c => c.trim()).filter(Boolean);
  //     // create ISO date string for joinDate
  //     let defaultJoinDate = new Date();
  //     if (joinDateStr && !isNaN(new Date(joinDateStr).getTime())) {
  //       defaultJoinDate = new Date(joinDateStr);
  //     }

  //     const farmer: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'> = {
  //       name,
  //       region,
  //       gender: newGender as Farmer['gender'],
  //       joinDate: joinDateStr && !isNaN(new Date(joinDateStr).getTime()) ? joinDateStr : defaultJoinDate.toISOString(),
  //       farmSize: !isNaN(farmSize) ? farmSize : 0.0,
  //       status: rowData[getHeaderIndex('status')] as Farmer['status'] || 'Active',
  //       district: rowData[getHeaderIndex('district')] || '',
  //       community: rowData[getHeaderIndex('community')] || '',
  //       contact: rowData[getHeaderIndex('contact')] || '',
  //       age: !isNaN(age) ? age : 0,
  //       educationLevel: rowData[getHeaderIndex('educationlevel')] as Farmer['educationLevel'] || "None",
  //       cropsGrown: cropsGrown?.length ? cropsGrown : [],
  //     };      
      
  //     newFarmers.push(farmer);
  //   });

  //   if (newFarmers.length > 0) {
  //     setIsUploading(true);
  //     setUploadProgress({ processed: 0, total: newFarmers.length });
  //     const chunkSize = 100;
      
  //     try {
  //       for (let i = 0; i < newFarmers.length; i += chunkSize) {
  //         const chunk = newFarmers.slice(i, i + chunkSize);
  //         await addFarmersBatch(chunk);
  //         const newProcessedCount = i + chunk.length;
  //         setUploadProgress({ processed: newProcessedCount, total: newFarmers.length });
  //         toast({
  //           title: 'Upload in Progress...',
  //           description: `Uploaded ${newProcessedCount} of ${newFarmers.length} farmers.`,
  //         });
  //       }
  //       toast({
  //         title: 'Upload Successful',
  //         description: `${newFarmers.length} farmers have been added.`,
  //       });
  //       fetchAndSetFarmers();
  //     } catch (error) {
  //       console.error(error);
  //       const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  //       toast({
  //         title: 'Batch Upload Failed',
  //         description: errorMessage,
  //         variant: 'destructive'
  //       });
  //     } finally {
  //       setIsUploading(false);

  //       if (localFailedRecords.length > 0) {
  //         setFailedRecords(localFailedRecords);
  //         setIsReportOpen(true);
  //       } else if (newFarmers.length === 0) {
  //         toast({
  //           title: 'Upload Finished',
  //           description: 'No new valid farmer records were found to upload.',
  //           variant: 'default',
  //         });
  //       }
  //     }
  //   }
  // };

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
