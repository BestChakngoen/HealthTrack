import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    signInWithRedirect, // เพิ่ม
    getRedirectResult,  // เพิ่ม
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    signInAnonymously,
    signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export default class FirebaseManager {
    constructor(onAuthChange) {
        // --- 1. CONFIGURATION ---
        let firebaseConfig = {};
        if (typeof __firebase_config !== 'undefined') {
            firebaseConfig = JSON.parse(__firebase_config);
        } else {
            // Default config (Fallback)
            firebaseConfig = {
                apiKey: "AIzaSyDxhzmc-IXsatiuGnkNfxrA_LoxdR5rHEE",
                authDomain: "health-track-51fae.firebaseapp.com",
                projectId: "health-track-51fae",
                storageBucket: "health-track-51fae.firebasestorage.app",
                messagingSenderId: "446398919665",
                appId: "1:446398919665:web:bd28472ec6ef45f9814a50",
                measurementId: "G-EVC652G2YE"
            };
        }

        // --- 2. INITIALIZATION ---
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.provider = new GoogleAuthProvider();

        // App ID สำหรับ Path
        this.appId = typeof __app_id !== 'undefined' ? __app_id : 'health-dashboard-v1';
        this.user = null;
        this.onAuthChange = onAuthChange;

        // --- 3. AUTH LISTENER ---
        this.initAuth();
    }

    async initAuth() {
        // A. ตรวจสอบ environment token (Custom Token)
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try {
                await signInWithCustomToken(this.auth, __initial_auth_token);
            } catch (e) {
                console.error("Custom token login failed", e);
            }
        }

        // B. ตรวจสอบผลลัพธ์จากการ Redirect Login (กรณี Fallback ทำงาน)
        try {
            await getRedirectResult(this.auth);
        } catch (error) {
            console.error("Redirect login result error:", error);
        }

        // C. ฟังสถานะ Authentication
        onAuthStateChanged(this.auth, (user) => {
            this.user = user;
            if (this.onAuthChange) {
                this.onAuthChange(user);
            }
        });
    }

    // --- 4. AUTH ACTIONS ---
    async loginWithGoogle() {
        try {
            // พยายาม Login ด้วย Popup ก่อน
            await signInWithPopup(this.auth, this.provider);
        } catch (error) {
            console.warn("Popup login failed, trying redirect...", error);
            
            // ดักจับ Error เรื่อง Domain เพื่อแจ้งเตือน
            if (error.code === 'auth/unauthorized-domain') {
                throw new Error("Domain ไม่ได้รับอนุญาต: กรุณาเพิ่ม 'localhost' หรือ '127.0.0.1' ใน Firebase Console -> Authentication -> Settings -> Authorized Domains");
            }
            
            // Fallback: ถ้า Popup พัง (เช่นติด Cross-Origin Policy) ให้ใช้ Redirect แทน
            try {
                await signInWithRedirect(this.auth, this.provider);
            } catch (redirectError) {
                console.error("Redirect login failed:", redirectError);
                throw redirectError;
            }
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            window.location.reload();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }

    // --- 5. FIRESTORE ACTIONS ---
    // Path: artifacts/{appId}/users/{userId}/{collectionName}/main

    async saveData(collectionName, data) {
        if (!this.user) return;

        try {
            const docRef = doc(this.db, 'artifacts', this.appId, 'users', this.user.uid, collectionName, 'main');
            // บันทึก timestamp เพื่อดูความเคลื่อนไหว
            await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (error) {
            console.error(`Error saving ${collectionName}:`, error);
        }
    }

    async loadData(collectionName) {
        if (!this.user) return null;

        try {
            const docRef = doc(this.db, 'artifacts', this.appId, 'users', this.user.uid, collectionName, 'main');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error(`Error loading ${collectionName}:`, error);
            return null;
        }
    }

    // เพิ่มฟังก์ชัน Subscribe สำหรับ Real-time update
    subscribe(collectionName, callback) {
        if (!this.user) return () => { };

        const docRef = doc(this.db, 'artifacts', this.appId, 'users', this.user.uid, collectionName, 'main');
        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data());
            } else {
                callback(null);
            }
        });
    }
}