export type User = {
  uid: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employee';
  status: 'Active' | 'Pending' | 'Disabled';
  geminiApiKey?: string;
  preferredModel?: string;
};

export type FailedRecord = {
  rowIndex: number;
  rowData: string;
  error: string;
};

export type FarmerParseResult = {
  status: 'valid';
  data: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>;
} | {
  status: 'invalid';
  error: FailedRecord;
};

export type Farmer = {
  id: string;
  name: string;
  gender?: 'Male' | 'Female' | 'Other';
  region?: string;
  district?: string;
  society?: string;
  community?: string;
  contact?: string;
  age?: number;
  educationLevel?: 'None' | 'Primary' | 'JHS' | 'SHS' | 'Tertiary' | 'Other';
  farmSize?: number; // in acres
  cropsGrown?: string[]; // if applicable
  status?: 'Active' | 'Inactive';
  joinDate?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  deleted?: boolean; // Soft-delete flag for delta sync
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: 'Manager' | 'Field Agent' | 'Accountant' | 'Support';
  salary?: number;
  startDate: string; // ISO date string
  status: 'Active' | 'On Leave' | 'Terminated';
  isVerified: boolean; // true when added by admin; false for self-registered pending approval
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  deleted?: boolean; // Soft-delete flag for delta sync
};

export type Transaction = {
  id: string;
  type: 'Income' | 'Expense';
  category: 'Salary' | 'Travel' | 'Equipment' | 'Utilities' | 'Marketing' | 'Purchase' | 'Investment' | 'Loan' | 'Sales' | 'Other';
  description: string;
  amount: number;
  date: string; // ISO date string
  employeeName: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  deleted?: boolean; // Soft-delete flag for delta sync
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  deleted?: boolean; // Soft-delete flag for delta sync
};

export type ProductCategory = 'Seeds' | 'Fertilizers' | 'Pesticides' | 'Equipment' | 'Other';

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  supplierId: string;
  quantity: number;
  price: number; // per unit
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  deleted?: boolean; // Soft-delete flag for delta sync
};

export type Kpi = {
  label: string;
  value: string;
  icon: any;
  change?: string;
};

export interface FarmerGroup {
  id: string;
  name: string;             // Custom name (e.g., "Best Farmers A")
  description?: string;
  seasonYear: string;       // Annual segregation (e.g., "2024", "2025")
  farmerIds: string[];      // List of IDs belonging to this group
  createdAt: string;
  updatedAt: string;
}

export interface RequestItem {
  productId: string;
  productName: string;      // Store name in case product is deleted later
  quantity: number;
  dynamicPrice: number;     // Manual price entry (per unit)
  total: number;            // quantity * dynamicPrice
}

export interface FarmerRequest {
  id: string;
  farmerId: string;         // Who made the request
  groupId?: string;         // Optional: if made as part of a group
  seasonYear: string;       // For filtering by year
  items: RequestItem[];
  grandTotal: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Delivered';
  requestDate: string;      // ISO Date
  createdAt: string;
  updatedAt: string;
}
