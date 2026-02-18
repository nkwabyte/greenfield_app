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
import type { Employee } from '@/lib/types';
import type { EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';

const employeeCollection = collection(db, 'employees');

export async function getFirebaseEmployees(): Promise<Employee[]> {
  const q = query(employeeCollection, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    isVerified: doc.data().isVerified ?? true, // Default true for existing records added by admin
    startDate: doc.data().startDate.toDate().toISOString(),
    createdAt: doc.data().createdAt.toDate().toISOString(),
    updatedAt: doc.data().updatedAt.toDate().toISOString(),
  })) as Employee[];
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

export async function deleteFirebaseEmployee(id: string) {
  const employeeDoc = doc(db, 'employees', id);
  await deleteDoc(employeeDoc);
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
