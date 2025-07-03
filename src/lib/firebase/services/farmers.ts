'use client';
import { db } from '@/lib/firebase/config';
import {
  collection,
  getDocs,
  setDoc,
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

export async function getFirebaseFarmers(): Promise<Farmer[]> {
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
  const cropsArray = cropsGrown || [];

  const dataToSave: any = {
    ...rest,
    cropsGrown: cropsArray,
    joinDate: joinDate ? new Date(joinDate) : null,
  };

  // Remove undefined fields so they don't overwrite existing data in Firestore
  Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);

  return dataToSave;
}

export async function addFirebaseFarmer(farmerData: FarmerFormValues, id: string) {
  const dataToSave = prepareFarmerData(farmerData);
  const farmerDoc = doc(farmerCollection, id); // use passed id
  await setDoc(farmerDoc, {
    ...dataToSave,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}


export async function addFirebaseFarmersBatch(farmers: Farmer[]) {
  const batch = writeBatch(db);

  farmers.forEach(farmer => {
    const docRef = doc(farmerCollection, farmer.id); // use given id

    const { id, joinDate, createdAt, updatedAt, ...rest } = farmer;
    batch.set(docRef, {
      ...rest,
      joinDate: joinDate ? new Date(joinDate) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}


export async function updateFirebaseFarmer(id: string, farmerData: FarmerFormValues) {
  const farmerDoc = doc(db, 'farmers', id);
  const dataToSave = prepareFarmerData(farmerData);
  await updateDoc(farmerDoc, {
    ...dataToSave,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFirebaseFarmer(id: string) {
  const farmerDoc = doc(db, 'farmers', id);
  await deleteDoc(farmerDoc);
}

