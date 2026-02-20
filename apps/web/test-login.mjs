import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBDQhLBufQnJJ5c23O4xhu5UjubqLpKFE8",
    authDomain: "greenfield-crm-system.firebaseapp.com",
    projectId: "greenfield-crm-system",
    storageBucket: "greenfield-crm-system.firebasestorage.app",
    messagingSenderId: "919913157679",
    appId: "1:919913157679:web:be6a4b5469013ff99062da"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function checkUserStatus() {
    try {
        console.log("Signing in...");
        const userCredential = await signInWithEmailAndPassword(
            auth,
            "greenfieldagricultureservices@gmail.com",
            "Greenfield@2026"
        );
        const user = userCredential.user;
        console.log("Logged in with UID:", user.uid);

        console.log("Fetching user doc from Firestore...");
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            console.log("User doc data:", docSnap.data());
        } else {
            console.log("No such user doc!");
        }
    } catch (error) {
        console.error("Error signing in:", error);
    }
}

checkUserStatus();
