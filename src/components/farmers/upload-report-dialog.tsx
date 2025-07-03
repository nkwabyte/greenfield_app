'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

type FailedRecord = {
  rowIndex: number;
  rowData: string;
  error: string;
};

type UploadReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  failedRecords: FailedRecord[];
};

export function UploadReportDialog({ open, onOpenChange, failedRecords }: UploadReportDialogProps) {
  
  const handleDownloadReport = () => {
    const csvHeader = "Row Number,Row Data,Error\n";
    const csvRows = failedRecords.map(r => 
      `${r.rowIndex},"${r.rowData.replace(/"/g, '""')}","${r.error.replace(/"/g, '""')}"`
    ).join("\n");

    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "failed_upload_report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
    
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Upload Report</DialogTitle>
          <DialogDescription>
            The following records could not be imported. Please review the errors and add them manually or fix the CSV and re-upload.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Row</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failedRecords.map((record, index) => (
                <TableRow key={index}>
                  <TableCell>{record.rowIndex}</TableCell>
                  <TableCell className="font-mono text-xs">{record.rowData}</TableCell>
                  <TableCell className="text-destructive">{record.error}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogFooter>
            <Button variant="outline" onClick={handleDownloadReport}>Download Report</Button>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
