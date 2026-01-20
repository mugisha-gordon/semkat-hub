import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';

export interface RecentSearchDocument {
  id: string;
  queryText: string;
  createdAt: Timestamp;
}

function recentSearchesCollection(userId: string) {
  return collection(db, 'users', userId, 'recentSearches');
}

export async function addRecentSearch(userId: string, queryText: string, options?: { maxItems?: number }): Promise<void> {
  const trimmed = queryText.trim();
  if (!trimmed) return;

  await addDoc(recentSearchesCollection(userId), {
    queryText: trimmed,
    createdAt: Timestamp.now(),
  });

  // Best-effort cleanup so the list doesn't grow forever.
  const maxItems = options?.maxItems ?? 10;
  const snap = await getDocs(query(recentSearchesCollection(userId), orderBy('createdAt', 'desc'), limit(maxItems + 20)));
  const docs = snap.docs;
  if (docs.length <= maxItems) return;

  const toDelete = docs.slice(maxItems);
  await Promise.all(toDelete.map((d) => deleteDoc(doc(db, 'users', userId, 'recentSearches', d.id))));
}

export function subscribeToRecentSearches(
  userId: string,
  callback: (searches: RecentSearchDocument[]) => void,
  options?: { limit?: number }
): Unsubscribe {
  const max = options?.limit ?? 10;
  const q = query(recentSearchesCollection(userId), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<RecentSearchDocument, 'id'>),
    }));
    callback(items);
  });
}
