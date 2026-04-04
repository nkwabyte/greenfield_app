import { User } from '@/lib/types';
import { Role, Resource, Action } from './types';

/**
 * Checks if a user has a specific role.
 */
export function hasRole(user: User | null, role: Role): boolean {
    if (!user) return false;
    return user.role === role;
}

/**
 * Checks if a user can create a specific resource.
 */
export function canCreate(user: User | null, resource: Resource): boolean {
    if (!user) return false;

    switch (resource) {
        case 'employee':
        case 'user':
            // Only Admins can create employees or manage users
            return hasRole(user, 'Admin');

        case 'farmer':
        case 'product':
        case 'supplier':
        case 'transaction':
            // Both Admins and Employees can create operational data
            return hasRole(user, 'Admin') || user.role !== 'Admin';

        default:
            return false;
    }
}

/**
 * Checks if a user can read a specific resource.
 */
export function canRead(user: User | null, resource: Resource): boolean {
    if (!user) return false;

    // All authenticated users with a valid role can read all resources
    // based on the current requirements.
    return !!user;
}

/**
 * Checks if a user can update a specific resource.
 * @param resourceId Optional ID of the resource (needed for ownership checks)
 */
export function canUpdate(user: User | null, resource: Resource, resourceId?: string): boolean {
    if (!user) return false;

    switch (resource) {
        case 'employee':
            // Admin can update any employee.
            // Any other role can only update their own profile.
            if (hasRole(user, 'Admin')) return true;
            if (resourceId && user.uid === resourceId) return true;
            return false;

        case 'user':
            // Only Admins can manage user accounts
            return hasRole(user, 'Admin');

        case 'farmer':
        case 'product':
        case 'supplier':
        case 'transaction':
            // Both Admins and Employees can update operational data
            return !!user;

        default:
            return false;
    }
}

/**
 * Checks if a user can delete a specific resource.
 */
export function canDelete(user: User | null, resource: Resource): boolean {
    if (!user) return false;

    switch (resource) {
        case 'employee':
        case 'user':
            // Only Admins can delete employees or users
            return hasRole(user, 'Admin');

        case 'farmer':
        case 'product':
        case 'supplier':
        case 'transaction':
            // Both Admins and Employees can delete operational data
            return !!user;

        default:
            return false;
    }
}
