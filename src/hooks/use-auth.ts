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
          dispatch(setUser({
            uid: fbUser.uid,
            email: fbUser.email!,
            name: userData.name,
            role: userData.role,
          }));
        } else {
          dispatch(setUser(null));
        }
      } else {
        dispatch(setFirebaseUser(null));
        dispatch(setUser(null));
      }
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [dispatch]);
};