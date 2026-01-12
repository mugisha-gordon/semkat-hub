import { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { createUserDocument, getUserDocument } from "@/integrations/firebase/users";

type Role = "admin" | "agent" | "user";

interface AuthContextValue {
  user: FirebaseUser | null;
  session: FirebaseUser | null; // Firebase doesn't have separate session object, using user
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Hard-coded admin email for application-level admin access
// NOTE: For production, prefer configuring admins via Firestore/ scripts (see ADMIN_SETUP.md)
const HARD_CODED_ADMIN_EMAIL = "adminsemkat@gmail.com";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const deriveRoleFromUserDoc = (userDoc: any): Role => {
    const docRole = userDoc?.role;
    if (docRole === 'admin' || docRole === 'agent' || docRole === 'user') {
      return docRole;
    }
    return 'user';
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // If this is the hard-coded admin email, ALWAYS treat as admin (highest priority)
          if (firebaseUser.email === HARD_CODED_ADMIN_EMAIL) {
            setRole("admin");
            // Ensure user document exists and has admin role
            try {
              let userDoc = await getUserDocument(firebaseUser.uid);
              if (!userDoc) {
                // Create admin user document if it doesn't exist
                await createUserDocument(
                  firebaseUser.uid,
                  firebaseUser.email || "",
                  firebaseUser.displayName || "Admin"
                );
                // Update to admin role
                const { updateUserRole } = await import("@/integrations/firebase/users");
                await updateUserRole(firebaseUser.uid, "admin", firebaseUser.uid);
              } else if (userDoc.role !== "admin") {
                // Update existing user to admin role
                const { updateUserRole } = await import("@/integrations/firebase/users");
                await updateUserRole(firebaseUser.uid, "admin", firebaseUser.uid);
              }
            } catch (error) {
              console.error("Error ensuring admin role in Firestore:", error);
              // Still set role to admin in app even if Firestore update fails
            }
            setLoading(false);
            return;
          }

          // For non-admin users, check Firestore document
          let userDoc = await getUserDocument(firebaseUser.uid);

          if (!userDoc) {
            // User exists in Auth but not in Firestore - create document
            try {
              await createUserDocument(
                firebaseUser.uid,
                firebaseUser.email || "",
                firebaseUser.displayName || undefined
              );
              // Fetch the newly created document so we have a consistent shape
              userDoc = await getUserDocument(firebaseUser.uid);
            } catch (error) {
              console.error("Error creating user document:", error);
            }
          }

          if (userDoc) {
            const detectedRole = deriveRoleFromUserDoc(userDoc);
            console.log('User role detected:', { 
              email: firebaseUser.email, 
              uid: firebaseUser.uid, 
              role: detectedRole,
              docRole: userDoc.role 
            });
            setRole(detectedRole);
          } else {
            console.log('No user document found, defaulting to user role:', firebaseUser.email);
            setRole("user");
          }
        } catch (error) {
          console.error("Error resolving user role:", error);
          // Fallback: check email even on error
          if (firebaseUser.email === HARD_CODED_ADMIN_EMAIL) {
            setRole("admin");
          } else {
            setRole("user");
          }
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: undefined };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create user document in Firestore
      await createUserDocument(userCredential.user.uid, email, fullName);
      return { error: undefined };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Check if user document exists, create if not (first-time Google login)
      const userDoc = await getUserDocument(result.user.uid);
      if (!userDoc) {
        await createUserDocument(
          result.user.uid,
          result.user.email || '',
          result.user.displayName || undefined
        );
      }
      return { error: undefined };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const value: AuthContextValue = {
    user,
    session: user, // Firebase uses user object as session
    role,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

