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
import type { Transaction } from '@/lib/types';
import type { TransactionFormValues } from '@/components/finances/add-edit-transaction-dialog';
import { Timestamp } from 'firebase/firestore';

const transactionCollection = collection(db, 'transactions');

/**
 * Delta sync: fetches only transactions modified since lastSyncTime.
 * Includes soft-deleted records so the local DB can remove them.
 */
export async function getFirebaseTransactions(lastSyncTime?: number): Promise<Transaction[]> {
  let q;
  if (lastSyncTime) {
    const lastSyncDate = new Date(lastSyncTime);
    q = query(
      transactionCollection,
      where('updatedAt', '>', lastSyncDate),
      orderBy('updatedAt', 'desc')
    );
  } else {
    q = query(transactionCollection, orderBy('date', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date instanceof Timestamp
        ? data.date.toDate().toISOString()
        : data.date ?? null,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt ?? null,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt ?? null,
    };
  }) as Transaction[];
}

export async function addFirebaseTransaction(transactionData: TransactionFormValues, id: string) {
  const { date, ...rest } = transactionData;
  const transactionDoc = doc(transactionCollection, id);
  await addDoc(transactionCollection, {
    ...rest,
    date: new Date(date),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFirebaseTransaction(
  id: string,
  transactionData: TransactionFormValues
) {
  const { date, ...rest } = transactionData;
  const transactionDoc = doc(db, 'transactions', id);
  await updateDoc(transactionDoc, {
    ...rest,
    date: new Date(date),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Soft-delete: marks the record as deleted so other devices pick it up via delta sync.
 */
export async function deleteFirebaseTransaction(id: string) {
  const transactionDoc = doc(db, 'transactions', id);
  await updateDoc(transactionDoc, {
    deleted: true,
    updatedAt: serverTimestamp(),
  });
}


export async function updateTransaction(
  id: string,
  transactionData: TransactionFormValues
) {
  const { date, ...rest } = transactionData;
  const transactionDoc = doc(db, 'transactions', id);
  await updateDoc(transactionDoc, {
    ...rest,
    date: new Date(date),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTransaction(id: string) {
  const transactionDoc = doc(db, 'transactions', id);
  await deleteDoc(transactionDoc);
}
