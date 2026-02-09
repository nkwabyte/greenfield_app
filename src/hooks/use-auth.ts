'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { setUser, setFirebaseUser, setLoading, SerializableFirebaseUser } from '@/lib/store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      try {
        console.log("Auth State Changed:", fbUser?.uid);
        if (fbUser) {
          // Create a serializable user object
          const firebaseCompatibleUser: SerializableFirebaseUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            emailVerified: fbUser.emailVerified,
            isAnonymous: fbUser.isAnonymous,
            providerId: fbUser.providerId,
            phoneNumber: fbUser.phoneNumber || null,
          };
          dispatch(setFirebaseUser(firebaseCompatibleUser));

          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User Doc Data:", userData);
            dispatch(setUser({
              uid: fbUser.uid,
              email: fbUser.email!,
              name: userData.name,
              role: userData.role,
              status: userData.status || 'Active', // Default to Active for existing users
            }));
          } else {
            console.log("User doc does not exist");
            dispatch(setUser(null));
          }
        } else {
          console.log("No Firebase User");
          dispatch(setFirebaseUser(null));
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error("Error in useAuth:", error);
      } finally {
        dispatch(setLoading(false));
      }
    });

    return () => unsubscribe();
  }, [dispatch]);
};