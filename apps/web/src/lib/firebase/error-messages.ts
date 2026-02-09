/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * @param error The error object from Firebase
 * @returns A user-friendly error message string
 */
export function getFriendlyErrorMessage(error: any): string {
    if (!error || !error.code) {
        return error?.message || 'An unknown error occurred. Please try again.';
    }

    switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password. Please check your credentials and try again.';
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please sign in instead.';
        case 'auth/weak-password':
            return 'Password is too weak. Please use at least 6 characters.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later or reset your password.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in cancelled. Please try again.';
        default:
            // Log the original error code for debugging but show a generic message or the cleaned message
            console.error('Unhandled Firebase Error:', error.code);
            return 'An error occurred during authentication. Please try again.';
    }
}
