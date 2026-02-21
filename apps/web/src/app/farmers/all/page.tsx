'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, Upload, ArrowLeft } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { getColumns } from '@/components/farmers/farmer-columns';
import type { FailedRecord, Farmer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { type FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';
import dynamic from 'next/dynamic';

const UploadReportDialog = dynamic(() => import('@/components/farmers/upload-report-dialog').then(mod => mod.UploadReportDialog), { ssr: false });
const AddEditFarmerDialog = dynamic(() => import('@/components/farmers/add-edit-farmer-dialog').then(mod => mod.AddEditFarmerDialog), { ssr: false });
const BulkEditFarmerDialog = dynamic(() => import('@/components/farmers/bulk-edit-dialog').then(mod => mod.BulkEditFarmerDialog), { ssr: false });
import { type BulkEditField } from '@/components/farmers/bulk-edit-dialog';

// NEW: Import Dexie hooks and services instead of Redux
import { useFarmersPaginatedAndFiltered } from '@/hooks/useData';
import { FarmerFilters, type FarmerFiltersState } from '@/components/farmers/farmer-filters';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import {
  addFarmer as addFarmerService,
  updateFarmer as updateFarmerService,
  deleteFarmer as deleteFarmerService,
  updateFarmersBatch
} from '@/lib/db/services/farmers';
import { v4 as uuidv4 } from 'uuid';
import { useRouter, useSearchParams } from 'next/navigation';

function FarmersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);

  // Pagination & Filter State
  const [pagination, setPagination] = React.useState({
    pageIndex: 0, // TanStack table is 0-indexed
    pageSize: 10,
  });
  const [searchQuery, setSearchQuery] = React.useState("");

  // Debounce search query to prevent excessive DB queries
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter State
  const initialRegion = searchParams.get('region') || 'all';

  const [filters, setFilters] = React.useState<FarmerFiltersState>({
    region: initialRegion,
    district: 'all',
    society: 'all',
    community: 'all',
    status: 'all',
    minFarmSize: '',
    maxFarmSize: '',
    gender: 'all',
    minAge: '',
    maxAge: '',
    dateRange: undefined,
  });

  // Fetch paginated data
  const { data, total } = useFarmersPaginatedAndFiltered(
    pagination.pageIndex + 1, // DB service is 1-indexed
    pagination.pageSize,
    {
      search: debouncedSearch,
      region: filters.region === 'all' ? undefined : filters.region,
      district: filters.district === 'all' ? undefined : filters.district,
      society: filters.society === 'all' ? undefined : filters.society,
      community: filters.community === 'all' ? undefined : filters.community,
      status: filters.status === 'all' ? undefined : filters.status as 'Active' | 'Inactive',
      minFarmSize: filters.minFarmSize ? Number(filters.minFarmSize) : undefined,
      maxFarmSize: filters.maxFarmSize ? Number(filters.maxFarmSize) : undefined,
      gender: filters.gender === 'all' ? undefined : filters.gender,
      minAge: filters.minAge ? Number(filters.minAge) : undefined,
      maxAge: filters.maxAge ? Number(filters.maxAge) : undefined,
      startDate: filters.dateRange?.from,
      endDate: filters.dateRange?.to,
    }
  ) || { data: [], total: 0 };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [failedRecords, setFailedRecords] = React.useState<FailedRecord[]>([]);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingFarmer, setEditingFarmer] = React.useState<Farmer | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState({ processed: 0, total: 0 });
  const [farmerToDelete, setFarmerToDelete] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Bulk Edit State
  const [rowSelection, setRowSelection] = React.useState({});
  const [isBulkEditOpen, setIsBulkEditOpen] = React.useState(false);

  const handleBulkSave = async (field: BulkEditField, value: string) => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    try {
      await updateFarmersBatch(selectedIds, { [field]: value });
      toast({ title: "Bulk Update Successful", description: `Updated ${field} for ${selectedIds.length} farmers.` });
      setRowSelection({}); // Clear selection
    } catch (error) {
      toast({ title: "Update Failed", description: "Failed to update farmers.", variant: "destructive" });
    }
  };

  const handleOpenAddDialog = () => {
    setEditingFarmer(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveFarmer = async (formData: FarmerFormValues) => {
    try {
      if (editingFarmer) {
        await updateFarmerService(editingFarmer.id, formData);
        toast({ title: "Farmer Updated", description: `${formData.name}'s record has been updated.` });
      } else {
        const id = uuidv4();
        await addFarmerService(formData, id);
        toast({ title: "Farmer Added", description: `${formData.name} has been added.` });
      }
    } catch (error) {
      toast({ title: "Save Failed", description: "An error occurred while saving the farmer.", variant: "destructive" });
    }
  };

  const handleDeleteFarmer = (farmerId: string) => {
    setFarmerToDelete(farmerId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteFarmer = async () => {
    if (!farmerToDelete) return;

    try {
      await deleteFarmerService(farmerToDelete);
      toast({ title: "Farmer Deleted", description: "Farmer record has been removed." });
    } catch (error) {
      toast({ title: "Delete Failed", description: "Failed to delete farmer.", variant: "destructive" });
    } finally {
      setFarmerToDelete(null);
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
    onDelete: handleDeleteFarmer,
  }), []);

  const handleExport = async () => {
    // Dynamic import for export functionality if needed, or keeping it as is since it uses the current 'data' which is paginated.
    // Wait, export usually wants ALL data. 
    // We should fetch ALL data for export or warn user it exports current view.
    // For now, let's fetch all for export.

    const { getAllFarmers } = await import('@/lib/db/services/farmers');
    const allFarmers = await getAllFarmers();

    if (!allFarmers || allFarmers.length === 0) {
      toast({
        title: 'No Data',
        description: 'There are no farmers to export.',
        variant: 'destructive',
      });
      return;
    }

    const csvHeader = "ID,Farmer Name,Gender,Region,District,Community,Contact,Age,EducationLevel,FarmSize,CropsGrown,Status,JoinDate,CreatedAt,UpdatedAt\n";
    const csvRows = allFarmers.map(f =>
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
      description: 'All farmer data has been exported to CSV.',
    });
  };

  const workerRef = React.useRef<Worker | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (event.target) event.target.value = '';

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv') {
      toast({ title: 'Unsupported File Type', description: 'Please upload a .csv or .xlsx file.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) return;
      startWorkerImport(buffer);
    };
    reader.readAsArrayBuffer(file);
  };

  const startWorkerImport = (buffer: ArrayBuffer) => {
    // Spin up the worker (terminate any previous one)
    if (workerRef.current) workerRef.current.terminate();

    const worker = new Worker(
      new URL('@/workers/farmer-import.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    setIsUploading(true);
    setUploadProgress({ processed: 0, total: 0 });
    toast({ title: 'Processing file…', description: 'Reading and validating rows in background.' });

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setUploadProgress({ processed: msg.savedSoFar, total: msg.savedSoFar + 1 });
      } else if (msg.type === 'staged') {
        // Staging complete — navigate to preview
        setIsUploading(false);
        worker.terminate();
        workerRef.current = null;
        // Store error count so the preview page can show the "Fix errors" button
        sessionStorage.setItem('farmer_import_error_count', String(msg.errorCount ?? 0));
        router.push('/farmers/import-preview');
      } else if (msg.type === 'error') {
        setIsUploading(false);
        worker.terminate();
        workerRef.current = null;
        toast({ title: 'Import Failed', description: msg.message, variant: 'destructive' });
      }
    };

    worker.onerror = (err) => {
      setIsUploading(false);
      worker.terminate();
      workerRef.current = null;
      toast({ title: 'Worker Error', description: err.message, variant: 'destructive' });
    };

    // Phase 1: stage — zero-copy buffer transfer to worker
    worker.postMessage({ mode: 'stage', buffer }, [buffer]);
  };

  // Clean up worker on unmount
  React.useEffect(() => {
    return () => { workerRef.current?.terminate(); };
  }, []);

  return (
    <AppShell>
      <div className="mb-4">
        <Link href="/farmers" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Farmer Hub
        </Link>
      </div>
      <PageHeader title="Farmer Management" description="View, add, edit, and manage all farmer records.">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx" style={{ display: 'none' }} />

        <Button variant="outline" onClick={handleUploadClick} disabled={isUploading}>
          {isUploading ? `Uploading ${uploadProgress.processed}/${uploadProgress.total}...` : <><Upload className="mr-2" /> Upload</>}
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2" /> Export
        </Button>
        {Object.keys(rowSelection).length > 0 && (
          <Button variant="secondary" onClick={() => setIsBulkEditOpen(true)}>
            Edit {Object.keys(rowSelection).length} Selected
          </Button>
        )}
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2" /> Add Farmer
        </Button>

      </PageHeader>



      <FarmerFilters filters={filters} onFilterChange={setFilters} />

      <div className="grid gap-6">
        <DataTable
          columns={columns}
          data={data}
          filterColumnId="name"
          filterPlaceholder="Search farmers..."
          isLoading={!data && total > 0}
          pageCount={Math.ceil(total / pagination.pageSize)}
          pagination={pagination}
          onPaginationChange={setPagination}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection as any}
          getRowId={(row) => row.id}
          onRowClick={(farmer) => router.push(`/farmers/${farmer.id}`)}
        />
      </div>
      <div className="flex items-center gap-2 mb-4 px-1">
      </div>

      <UploadReportDialog open={isReportOpen} onOpenChange={setIsReportOpen} failedRecords={failedRecords} />
      <BulkEditFarmerDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedCount={Object.keys(rowSelection).length}
        onSave={handleBulkSave}
      />
      <AddEditFarmerDialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen} farmer={editingFarmer} onSave={handleSaveFarmer} />
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Farmer"
        description="Are you sure you want to delete this farmer? This action cannot be undone."
        onConfirm={confirmDeleteFarmer}
      />
    </AppShell >
  );
}

export default function FarmersPage() {
  return (
    <React.Suspense fallback={<AppShell><div className="p-8">Loading farmers database...</div></AppShell>}>
      <FarmersContent />
    </React.Suspense>
  );
}
