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
  where,
} from 'firebase/firestore';
import type { Supplier } from '@/lib/types';
import type { SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';
import { Timestamp } from 'firebase/firestore';

const supplierCollection = collection(db, 'suppliers');

/**
 * Delta sync: fetches only suppliers modified since lastSyncTime.
 * Includes soft-deleted records so the local DB can remove them.
 */
export async function getFirebaseSuppliers(lastSyncTime?: number): Promise<Supplier[]> {
  let q;
  if (lastSyncTime) {
    const lastSyncDate = new Date(lastSyncTime);
    q = query(
      supplierCollection,
      where('updatedAt', '>', lastSyncDate),
      orderBy('updatedAt', 'desc')
    );
  } else {
    q = query(supplierCollection, orderBy('updatedAt', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt ?? null,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt ?? null,
    };
  }) as Supplier[];
}

export async function addFirebaseSupplier(supplierData: SupplierFormValues, id: string) {
  const supplierDoc = doc(supplierCollection, id);
  await addDoc(supplierCollection, {
    ...supplierData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFirebaseSupplier(id: string, supplierData: SupplierFormValues) {
  const supplierDoc = doc(db, 'suppliers', id);
  await updateDoc(supplierDoc, {
    ...supplierData,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Soft-delete: marks the record as deleted so other devices pick it up via delta sync.
 */
export async function deleteFirebaseSupplier(id: string) {
  const supplierDoc = doc(db, 'suppliers', id);
  await updateDoc(supplierDoc, {
    deleted: true,
    updatedAt: serverTimestamp(),
  });
}
