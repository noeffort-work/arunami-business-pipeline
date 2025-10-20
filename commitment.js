import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, writeBatch, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIGURATION HERE ---
const firebaseConfig = {
  apiKey: "AIzaSyB2d8_d_xaobWfmNNSw2bx9RA5tYpVbKpU",
  authDomain: "arunami-brand-pipeline-9da20.firebaseapp.com",
  projectId: "arunami-brand-pipeline-9da20",
  storageBucket: "arunami-brand-pipeline-9da20.firebasestorage.app",
  messagingSenderId: "266344538248",
  appId: "1:266344538248:web:fb412f07da4151e0c47f3d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM ELEMENT REFERENCES ---
const loadingSpinner = document.getElementById("loading-spinner");
const formSection = document.getElementById("commitment-form-section");
const unauthorizedMessage = document.getElementById("unauthorized-message");
const commitmentForm = document.getElementById('commitment-form');

// --- HELPER FUNCTION ---
function formatPhoneNumber(rawPhone) {
    let finalPhone = (rawPhone || '').replace(/\D/g, '');
    if (finalPhone.startsWith('0')) finalPhone = finalPhone.substring(1);
    if (finalPhone && !finalPhone.startsWith('62')) finalPhone = '62' + finalPhone;
    return finalPhone ? '+' + finalPhone : '';
}

// --- CORRECTED AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is confirmed to be signed in. Now, check if they are qualified.
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();

            // The user must be a business owner, approved by an analyst, and not yet committed.
            const isQualified = 
                userData.role === 'business-owner' &&
                userData.isApprovedByAnalyst === true &&
                userData.hasCommitted !== true;

            if (isQualified) {
                // User is qualified: show and populate the form
                document.getElementById('commitment-name').textContent = userData.fullName || 'Data not found';
                document.getElementById('commitment-company-name').textContent = userData.companyName || 'Data not found';
                document.getElementById('commitment-phone').value = (userData.phone || '').replace('+62', '');
                
                formSection.style.display = 'flex';
            } else {
                // User is logged in but NOT qualified: show the "Access Denied" message
                unauthorizedMessage.style.display = 'flex';
            }
        } else {
            // User document doesn't exist in Firestore: show "Access Denied"
            unauthorizedMessage.style.display = 'flex';
        }
    } else {
        // User is definitively not signed in: show the "Access Denied" message
        // This will now wait for Firebase to be sure before running.
        unauthorizedMessage.style.display = 'flex';
    }

    // Hide the loading spinner after all checks are complete
    loadingSpinner.style.display = 'none';
});

// Event listener for checkbox logic (remains the same)
document.getElementById('commitment-checkboxes').addEventListener('change', () => {
    const checkboxes = document.querySelectorAll('input[name="commitment-check"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    document.getElementById('submit-commitment-btn').disabled = !allChecked;
});

// Event listener for form submission (remains the same)
commitmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingSpinner.style.display = 'flex';
    const user = auth.currentUser;

    try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        
        const updatedPhone = formatPhoneNumber(document.getElementById('commitment-phone').value);

        const commitmentData = {
            userId: user.uid,
            fullName: userData.fullName,
            companyName: userData.companyName,
            phone: updatedPhone,
            committedAt: Timestamp.now(),
        };

        const batch = writeBatch(db);
        batch.set(doc(db, "commitments", user.uid), commitmentData);
        batch.update(userDocRef, { phone: updatedPhone, hasCommitted: true });
        await batch.commit();

        alert("Thank you! Your commitment has been received.");
        window.location.href = 'index.html';

    } catch (error) {
        console.error("Error submitting commitment:", error);
        alert("Failed to submit commitment. Please try again.");
    } finally {
        loadingSpinner.style.display = 'none';
    }
});