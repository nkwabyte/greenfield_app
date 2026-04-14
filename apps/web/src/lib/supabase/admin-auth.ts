/**
 * When running inside the packaged Electron app the page is served via the
 * custom `app://` scheme, so relative URLs like `/api/...` resolve to
 * `app:///api/...` (a static file) instead of a real server.
 * Employee creation always requires internet (Supabase service-role key lives
 * on the server), so we route the call to the Vercel deployment in that case.
 */
function getApiBase(): string {
    if (typeof window !== 'undefined' && window.location.protocol === 'app:') {
        return process.env.NEXT_PUBLIC_APP_URL ?? 'https://greenfield-app-web.vercel.app';
    }
    return '';
}

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
    const response = await fetch(`${getApiBase()}/api/admin/create-employee`, {
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

export async function updateEmployeeRole(uid: string, role: string, adminId?: string): Promise<boolean> {
    const response = await fetch(`${getApiBase()}/api/admin/update-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role, adminId }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to update employee role.');
    }
    return true;
}

export async function resetEmployeePassword(uid: string, adminId?: string): Promise<string> {
    const response = await fetch(`${getApiBase()}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, adminId }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to reset employee password.');
    }
    return data.password;
}

export async function setEmployeeStatus(uid: string, status: string, adminId?: string): Promise<boolean> {
    const response = await fetch(`${getApiBase()}/api/admin/set-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, status, adminId }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to set employee status.');
    }
    return true;
}
