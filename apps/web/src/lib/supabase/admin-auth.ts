/**
 * Creates a new employee in Supabase Auth using the admin API route.
 * The server-side route also immediately writes to public.users and public.employees.
 * This calls a server-side API route so the service_role key stays server-only.
 */
export async function createEmployeeAuth(
    email: string,
    password: string,
    name?: string,
    role: string = 'Field Agent',
    salary: number = 0,
): Promise<string> {
    const response = await fetch('/api/admin/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role, salary }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to create employee account.');
    }

    return data.uid;
}
