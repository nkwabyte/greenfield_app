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
} from 'firebase/firestore';
import type { Product } from '@/lib/types';
import type { ProductFormValues } from '@/components/products/add-edit-product-dialog';

const productCollection = collection(db, 'products');

export async function getFirebaseProducts(): Promise<Product[]> {
  const q = query(productCollection, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate().toISOString(),
    updatedAt: doc.data().updatedAt.toDate().toISOString(),
  })) as Product[];
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

export async function deleteFirebaseProduct(id: string) {
  const productDoc = doc(db, 'products', id);
  await deleteDoc(productDoc);
}
