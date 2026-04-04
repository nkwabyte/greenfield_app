'use client';

import { MapPin } from 'lucide-react';

interface NoDistrictAssignedProps {
  /** Optional context message to tailor the description. */
  context?: string;
}

/**
 * Shown to Field Agents who have not yet been assigned any districts.
 * Replacing page content with this component prevents them from seeing
 * data that belongs to other districts.
 */
export function NoDistrictAssigned({ context }: NoDistrictAssignedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="p-5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-6">
        <MapPin className="h-10 w-10 text-amber-500" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No Districts Assigned</h2>
      <p className="text-muted-foreground max-w-sm leading-relaxed">
        {context
          ? context
          : 'You have not been assigned to any districts yet. Please contact your administrator to get districts assigned to your account.'}
      </p>
      <p className="text-xs text-muted-foreground mt-4 max-w-xs">
        Once districts are assigned, you will be able to view and manage farmers, groups, and requests in those areas.
      </p>
    </div>
  );
}
