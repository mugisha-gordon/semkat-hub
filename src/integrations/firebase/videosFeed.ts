import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./client";
import type { VideoDocument } from "./videos";

const COLLECTION_NAME = "videos";

/**
 * Realtime subscribe to the Explore feed (newest first).
 */
export function subscribeToVideosFeed(
  limitCount: number,
  callback: (videos: VideoDocument[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const videosRef = collection(db, COLLECTION_NAME);
  const q = query(videosRef, orderBy("createdAt", "desc"), limit(limitCount));

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<VideoDocument, "id">),
      })) as VideoDocument[];
      callback(data);
    },
    (error) => {
      onError?.(error);
    }
  );
}
