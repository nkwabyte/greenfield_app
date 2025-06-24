export type User = {
  name: string;
  email: string;
  role: 'Admin' | 'Employee';
};

export type Farmer = {
  id: string;
  name: string;
  region?: 'North' | 'South' | 'East' | 'West';
  gender?: 'Male' | 'Female' | 'Other';
  joinDate?: string; // ISO date string
  farmSize?: number; // in acres
  status?: 'Active' | 'Inactive';
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
};

export type Kpi = {
  label: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};
