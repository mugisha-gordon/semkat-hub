import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import type { Property } from '@/types/property';

export interface FavoritePropertyDocument {
  id: string; // propertyId
  propertyId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  property: Property;
}

function favoritesCollection(userId: string) {
  return collection(db, 'users', userId, 'favorites');
}

export async function saveFavoriteProperty(userId: string, property: Property): Promise<void> {
  const ref = doc(db, 'users', userId, 'favorites', property.id);
  const now = Timestamp.now();
  await setDoc(ref, {
    propertyId: property.id,
    createdAt: now,
    updatedAt: now,
    property,
  });
}

export async function removeFavoriteProperty(userId: string, propertyId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'favorites', propertyId);
  await deleteDoc(ref);
}

export function subscribeToFavoriteProperties(
  userId: string,
  callback: (favorites: FavoritePropertyDocument[]) => void,
  options?: { limit?: number }
): Unsubscribe {
  const max = options?.limit ?? 60;
  const q = query(favoritesCollection(userId), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FavoritePropertyDocument, 'id'>),
    }));
    callback(items);
  });
}
