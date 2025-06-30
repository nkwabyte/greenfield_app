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

const prepareFarmerData = (farmerData: FarmerFormValues) => {
    const { joinDate, cropsGrown, ...rest } = farmerData;
    const cropsArray = cropsGrown ? cropsGrown.split(',').map(c => c.trim()).filter(Boolean) : [];
    
    const dataToSave: any = {
        ...rest,
        cropsGrown: cropsArray,
        joinDate: joinDate ? new Date(joinDate) : null,
    };

    // Remove undefined fields so they don't overwrite existing data in Firestore
    Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);

    return dataToSave;
}

export async function addFarmer(farmerData: FarmerFormValues) {
  const dataToSave = prepareFarmerData(farmerData);
  await addDoc(farmerCollection, {
    ...dataToSave,
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
  const farmerDoc = doc(db, 'farmers', id);
  const dataToSave = prepareFarmerData(farmerData);
  await updateDoc(farmerDoc, {
    ...dataToSave,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFarmer(id: string) {
  const farmerDoc = doc(db, 'farmers', id);
  await deleteDoc(farmerDoc);
}
