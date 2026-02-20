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
import type { Employee } from '@/lib/types';
import type { EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';
import { Timestamp } from 'firebase/firestore';

const employeeCollection = collection(db, 'employees');

/**
 * Delta sync: fetches only employees modified since lastSyncTime.
 * Includes soft-deleted records so the local DB can remove them.
 */
export async function getFirebaseEmployees(lastSyncTime?: number): Promise<Employee[]> {
  let q;
  if (lastSyncTime) {
    const lastSyncDate = new Date(lastSyncTime);
    q = query(
      employeeCollection,
      where('updatedAt', '>', lastSyncDate),
      orderBy('updatedAt', 'desc')
    );
  } else {
    q = query(employeeCollection, orderBy('updatedAt', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      isVerified: data.isVerified ?? true,
      startDate: data.startDate instanceof Timestamp
        ? data.startDate.toDate().toISOString()
        : data.startDate ?? null,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt ?? null,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt ?? null,
    };
  }) as Employee[];
}

export async function addFirebaseEmployee(employeeData: EmployeeFormValues, id: string) {
  const { startDate, ...rest } = employeeData;
  const employeeDoc = doc(employeeCollection, id);
  await addDoc(employeeCollection, {
    ...rest,
    startDate: new Date(startDate),
    isVerified: true, // Admin-created employees are automatically verified
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFirebaseEmployee(
  id: string,
  employeeData: EmployeeFormValues
) {
  const { startDate, ...rest } = employeeData;
  const employeeDoc = doc(db, 'employees', id);
  await updateDoc(employeeDoc, {
    ...rest,
    startDate: new Date(startDate),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Soft-delete: marks the record as deleted so other devices pick it up via delta sync.
 */
export async function deleteFirebaseEmployee(id: string) {
  const employeeDoc = doc(db, 'employees', id);
  await updateDoc(employeeDoc, {
    deleted: true,
    updatedAt: serverTimestamp(),
  });
}


export async function updateEmployee(
  id: string,
  employeeData: EmployeeFormValues
) {
  const { startDate, ...rest } = employeeData;
  const employeeDoc = doc(db, 'employees', id);
  await updateDoc(employeeDoc, {
    ...rest,
    startDate: new Date(startDate),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEmployee(id: string) {
  const employeeDoc = doc(db, 'employees', id);
  await deleteDoc(employeeDoc);
}
