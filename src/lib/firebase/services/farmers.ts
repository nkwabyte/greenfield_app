'use client';
import { db } from '@/lib/firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import type { Farmer } from '@/lib/types';
import type { FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';

const farmerCollection = collection(db, 'farmers');

export async function getFarmers(): Promise<Farmer[]> {
  const q = query(farmerCollection, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      joinDate: data.joinDate?.toDate().toISOString(),
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.updatedAt.toDate().toISOString(),
    }
  }) as Farmer[];
}

export async function addFarmer(farmerData: FarmerFormValues) {
  const { joinDate, ...rest } = farmerData;
  await addDoc(farmerCollection, {
    ...rest,
    joinDate: joinDate ? new Date(joinDate) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function addFarmersBatch(farmers: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>[]) {
    const batch = writeBatch(db);
    farmers.forEach(farmerData => {
        const docRef = doc(farmerCollection);
        const { joinDate, ...rest } = farmerData;
        batch.set(docRef, {
            ...rest,
            joinDate: farmerData.joinDate ? new Date(farmerData.joinDate) : null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    });
    await batch.commit();
}

export async function updateFarmer(id: string, farmerData: FarmerFormValues) {
  const { joinDate, ...rest } = farmerData;
  const farmerDoc = doc(db, 'farmers', id);
  await updateDoc(farmerDoc, {
    ...rest,
    joinDate: joinDate ? new Date(joinDate) : null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFarmer(id: string) {
  const farmerDoc = doc(db, 'farmers', id);
  await deleteDoc(farmerDoc);
}
