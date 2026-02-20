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
import type { Product } from '@/lib/types';
import type { ProductFormValues } from '@/components/products/add-edit-product-dialog';
import { Timestamp } from 'firebase/firestore';

const productCollection = collection(db, 'products');

/**
 * Delta sync: fetches only products modified since lastSyncTime.
 * Includes soft-deleted records so the local DB can remove them.
 */
export async function getFirebaseProducts(lastSyncTime?: number): Promise<Product[]> {
  let q;
  if (lastSyncTime) {
    const lastSyncDate = new Date(lastSyncTime);
    q = query(
      productCollection,
      where('updatedAt', '>', lastSyncDate),
      orderBy('updatedAt', 'desc')
    );
  } else {
    q = query(productCollection, orderBy('updatedAt', 'desc'));
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
  }) as Product[];
}

export async function addFirebaseProduct(productData: ProductFormValues, id: string) {
  const productDoc = doc(productCollection, id);
  await addDoc(productCollection, {
    ...productData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFirebaseProduct(id: string, productData: ProductFormValues) {
  const productDoc = doc(db, 'products', id);
  await updateDoc(productDoc, {
    ...productData,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Soft-delete: marks the record as deleted so other devices pick it up via delta sync.
 */
export async function deleteFirebaseProduct(id: string) {
  const productDoc = doc(db, 'products', id);
  await updateDoc(productDoc, {
    deleted: true,
    updatedAt: serverTimestamp(),
  });
}
