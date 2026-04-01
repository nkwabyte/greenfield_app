/**
 * Maps Supabase Auth error messages to user-friendly messages.
 * Supabase errors come as { message: string, status: number } rather than error codes.
 */
export function getFriendlyErrorMessage(error: any): string {
    if (!error) {
        return 'An unknown error occurred. Please try again.';
    }

    const message = (error.message || error.error_description || '').toLowerCase();

    if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
        return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (message.includes('email already registered') || message.includes('user already registered')) {
        return 'This email is already registered. Please sign in instead.';
    }
    if (message.includes('password') && message.includes('at least')) {
        return 'Password is too weak. Please use at least 6 characters.';
    }
    if (message.includes('invalid email') || message.includes('unable to validate email')) {
        return 'Please enter a valid email address.';
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
        return 'Too many attempts. Please try again later.';
    }
    if (message.includes('network') || message.includes('fetch')) {
        return 'Network error. Please check your internet connection.';
    }
    if (message.includes('email not confirmed')) {
        return 'Please confirm your email address before signing in.';
    }
    if (message.includes('new password should be different')) {
        return 'New password must be different from your current password.';
    }
    if (message.includes('session_not_found') || message.includes('not authenticated')) {
        return 'Your session has expired. Please sign in again.';
    }

    // Fallback: return the original message or a generic one
    console.error('Unhandled Supabase Error:', error);
    return error.message || 'An error occurred. Please try again.';
}
