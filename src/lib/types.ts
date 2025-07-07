export type User = {
  uid: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employee';
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
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: 'Manager' | 'Field Agent' | 'Accountant' | 'Support';
  salary: number;
  startDate: string; // ISO date string
  status: 'Active' | 'On Leave' | 'Terminated';
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
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
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
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
};

export type Kpi = {
  label: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};
