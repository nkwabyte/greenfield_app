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
import type { Supplier } from '@/lib/types';
import type { SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';

const supplierCollection = collection(db, 'suppliers');

export async function getSuppliers(): Promise<Supplier[]> {
  const q = query(supplierCollection, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate().toISOString(),
    updatedAt: doc.data().updatedAt.toDate().toISOString(),
  })) as Supplier[];
}

export async function addSupplier(supplierData: SupplierFormValues) {
  await addDoc(supplierCollection, {
    ...supplierData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSupplier(id: string, supplierData: SupplierFormValues) {
  const supplierDoc = doc(db, 'suppliers', id);
  await updateDoc(supplierDoc, {
    ...supplierData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSupplier(id: string) {
  const supplierDoc = doc(db, 'suppliers', id);
  await deleteDoc(supplierDoc);
}
