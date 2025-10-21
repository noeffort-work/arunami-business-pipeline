import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
const db = getFirestore(app);

// --- DOM ELEMENT REFERENCES ---
const loadingSpinner = document.getElementById("loading-spinner");
const commitmentForm = document.getElementById('commitment-form');
const phoneInput = document.getElementById('commitment-phone');

// --- HELPER FUNCTION ---
function formatPhoneNumber(rawPhone) {
    let finalPhone = (rawPhone || '').replace(/\D/g, '');
    if (finalPhone.startsWith('0')) finalPhone = finalPhone.substring(1);
    if (finalPhone && !finalPhone.startsWith('62')) finalPhone = '62' + finalPhone;
    return finalPhone ? '+' + finalPhone : '';
}

// --- MAIN LOGIC ---

// --- NEW: Phone Number Validation ---
// This listener automatically removes any non-numeric characters as the user types.
phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// Event listener for checkbox logic
document.getElementById('commitment-checkboxes').addEventListener('change', () => {
    const checkboxes = document.querySelectorAll('input[name="commitment-check"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    document.getElementById('submit-commitment-btn').disabled = !allChecked;
});

// Event listener for form submission
commitmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingSpinner.style.display = 'flex';

    try {
        const fullName = document.getElementById('commitment-name').value;
        const companyName = document.getElementById('commitment-company-name').value;
        const phone = formatPhoneNumber(phoneInput.value);

        const commitmentData = {
            fullName: fullName,
            companyName: companyName,
            phone: phone,
            committedAt: Timestamp.now(),
        };

        await addDoc(collection(db, "commitments"), commitmentData);

        loadingSpinner.style.display = 'none';
        
        // --- UPDATED: Show pop-up and then redirect ---
        alert("Terima kasih telah mengisi formulir komitmen partisipasi program ACCES, jika ada pertanyaan harap hubungi Tim ACCES 0851-2332-0408");
        
        // Redirect to the homepage after the user clicks "OK" on the alert
        window.location.href = 'https://accescapital.id';

    } catch (error) {
        console.error("Error submitting commitment:", error);
        alert("Gagal mengirim komitmen. Silakan coba lagi.");
        loadingSpinner.style.display = 'none';
    }
});