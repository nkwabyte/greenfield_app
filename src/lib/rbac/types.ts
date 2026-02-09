export type Role = 'Admin' | 'Employee';

export type Resource =
    | 'farmer'
    | 'employee'
    | 'product'
    | 'supplier'
    | 'transaction'
    | 'user';

export type Action = 'create' | 'read' | 'update' | 'delete';

export interface Permission {
    action: Action;
    resource: Resource;
}
