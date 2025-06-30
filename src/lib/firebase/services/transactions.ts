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
import type { Transaction } from '@/lib/types';
import type { TransactionFormValues } from '@/components/finances/add-edit-transaction-dialog';

const transactionCollection = collection(db, 'transactions');

export async function getTransactions(): Promise<Transaction[]> {
  const q = query(transactionCollection, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate().toISOString(),
    createdAt: doc.data().createdAt.toDate().toISOString(),
    updatedAt: doc.data().updatedAt.toDate().toISOString(),
  })) as Transaction[];
}

export async function addTransaction(transactionData: TransactionFormValues) {
  const { date, ...rest } = transactionData;
  await addDoc(transactionCollection, {
    ...rest,
    date: new Date(date),
    createdAt: serverTimestamp(),
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
