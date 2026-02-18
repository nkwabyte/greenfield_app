import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from './config';

/**
 * Creates a new user in Firebase Auth using a secondary app instance.
 * This prevents the current user (admin) from being logged out.
 */
export async function createEmployeeAuth(email: string, password: string): Promise<string> {
    const SECONDARY_APP_NAME = 'secondaryAuthApp';
    let secondaryApp;

    try {
        // Check if the secondary app is already initialized, if so, use it, otherwise initialize it
        const existingApp = getApps().find(app => app.name === SECONDARY_APP_NAME);
        secondaryApp = existingApp || initializeApp(firebaseConfig, SECONDARY_APP_NAME);

        const secondaryAuth = getAuth(secondaryApp);

        // Create the user
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;

        // Immediately sign out from the secondary app to be safe (though it shouldn't affect the primary one)
        await signOut(secondaryAuth);

        return uid;
    } catch (error) {
        console.error('Error creating employee auth:', error);
        throw error;
    } finally {
        // Optional: Delete the app instance to clean up
        // if (secondaryApp) {
        //    await deleteApp(secondaryApp); 
        // }
        // Keeping it might be better for performance if actively adding multiple, 
        // but for safety/cleanup in a client app, maybe better to leave it or handle it carefully.
        // For now, we leave it as standard pattern often keeps it.
        // However, the Firebase SDK might throw if we try to re-init with same name if we don't check existence.
        // The code above checks existence.
    }
}
