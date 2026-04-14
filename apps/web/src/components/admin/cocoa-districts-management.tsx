'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface CocoaDistrict {
    id: string;
    name: string;
    is_active: boolean;
    deleted: boolean;
    created_at: string;
}

export function CocaoDistrictsManagement() {
    const [districts, setDistricts] = React.useState<CocoaDistrict[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState({ name: '', is_active: true });
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        fetchDistricts();
    }, []);

    const fetchDistricts = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/cocoa-districts');
            if (!response.ok) {
                console.error('Failed to fetch districts:', response.statusText);
                return;
            }
            const { data } = await response.json();
            setDistricts(data || []);
        } catch (error) {
            console.error('Error fetching districts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (district?: CocoaDistrict) => {
        if (district) {
            setEditingId(district.id);
            setFormData({ name: district.name, is_active: district.is_active });
        } else {
            setEditingId(null);
            setFormData({ name: '', is_active: true });
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingId(null);
        setFormData({ name: '', is_active: true });
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            alert('District name is required');
            return;
        }

        setSubmitting(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId
                ? `/api/admin/cocoa-districts/${editingId}`
                : '/api/admin/cocoa-districts';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                console.error('Failed to save district:', response.statusText);
                alert('Failed to save district');
                return;
            }

            await fetchDistricts();
            handleCloseDialog();
        } catch (error) {
            console.error('Error saving district:', error);
            alert('Error saving district');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this district?')) return;

        try {
            const response = await fetch(`/api/admin/cocoa-districts/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                console.error('Failed to delete district:', response.statusText);
                alert('Failed to delete district');
                return;
            }

            await fetchDistricts();
        } catch (error) {
            console.error('Error deleting district:', error);
            alert('Error deleting district');
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Cocoa Districts
                        </CardTitle>
                        <CardDescription>Manage cocoa districts and their status</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => handleOpenDialog()}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add District
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {editingId ? 'Edit District' : 'Add New District'}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingId
                                        ? 'Update the district information'
                                        : 'Create a new cocoa district'}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">District Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter district name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, is_active: checked as boolean })
                                        }
                                    />
                                    <Label htmlFor="active">Active</Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={handleCloseDialog}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmit} disabled={submitting}>
                                    {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                        Loading districts...
                                    </TableCell>
                                </TableRow>
                            ) : districts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                        No districts found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                districts.map((district) => (
                                    <TableRow key={district.id}>
                                        <TableCell className="font-medium">{district.name}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={district.is_active ? 'default' : 'secondary'}
                                            >
                                                {district.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenDialog(district)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(district.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                    {districts.length} {districts.length === 1 ? 'district' : 'districts'}
                </p>
            </CardContent>
        </Card>
    );
}
