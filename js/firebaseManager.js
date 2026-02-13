import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
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
    collection
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export default class FirebaseManager {
    constructor(onAuthChange) {
        // --- 1. CONFIGURATION ---
        // เมื่อนำไปใช้จริง ให้ลบส่วนนี้และใส่ค่า config ของคุณเอง
        let firebaseConfig = {};
        if (typeof __firebase_config !== 'undefined') {
            firebaseConfig = JSON.parse(__firebase_config);
        } else {
            // TODO: ใส่ค่า Config จาก Firebase Console ของคุณที่นี่
            const firebaseConfig = {
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

        // App ID สำหรับ Path (ใช้ default ถ้าไม่มี)
        this.appId = typeof __app_id !== 'undefined' ? __app_id : 'health-dashboard-v1';
        this.user = null;
        this.onAuthChange = onAuthChange;

        // --- 3. AUTH LISTENER ---
        this.initAuth();
    }

    async initAuth() {
        // ตรวจสอบ environment token (สำหรับ Canvas environment)
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try {
                await signInWithCustomToken(this.auth, __initial_auth_token);
            } catch (e) {
                console.error("Custom token login failed", e);
            }
        }

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
            await signInWithPopup(this.auth, this.provider);
        } catch (error) {
            console.error("Login failed:", error);
            alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            // Reload เพื่อเคลียร์ state
            window.location.reload();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }

    // --- 5. FIRESTORE ACTIONS ---
    // ใช้ Path ตามกฎ: artifacts/{appId}/users/{userId}/{collectionName}

    async saveData(collectionName, data) {
        if (!this.user) return; // ไม่บันทึกถ้าไม่ได้ login

        try {
            // ใช้ setDoc เพื่อบันทึกทับไฟล์เดิม (Single Document per user per feature)
            // หรือจะใช้ addDoc ถ้าต้องการหลายรายการ (แต่ในที่นี้เราเก็บ state รวม)
            const docRef = doc(this.db, 'artifacts', this.appId, 'users', this.user.uid, collectionName, 'main');
            await setDoc(docRef, { ...data, updatedAt: new Date() }, { merge: true });
            console.log(`Saved ${collectionName}`);
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
                console.log(`No data for ${collectionName}`);
                return null;
            }
        } catch (error) {
            console.error(`Error loading ${collectionName}:`, error);
            return null;
        }
    }
}