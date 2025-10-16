import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  writeBatch,
  runTransaction,
  documentId,
  deleteField,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable, // Add this line
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// --- FIREBASE CONFIGURATION ---
// IMPORTANT: Replace with your actual Firebase project configuration.
const firebaseConfig = {
  apiKey: "AIzaSyB2d8_d_xaobWfmNNSw2bx9RA5tYpVbKpU",
  authDomain: "arunami-brand-pipeline-9da20.firebaseapp.com",
  projectId: "arunami-brand-pipeline-9da20",
  storageBucket: "arunami-brand-pipeline-9da20.firebasestorage.app",
  messagingSenderId: "266344538248",
  appId: "1:266344538248:web:fb412f07da4151e0c47f3d"
};

// --- GLOBAL VARIABLES & INITIALIZATION ---
let app, auth, db, storage;
let currentUser = null;
let currentUserData = null;
let allAdminProjects = [];
let allUsers = [];
let projectsListenerUnsubscribe = null;
let userDocListenerUnsubscribe = null;
let reportData = { investments: [], prospects: [] };
let tempUserDataForDisclaimer = null;
let isResubmitFlowActive = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  showMessage(
    "Critical Error: Could not connect to the backend. Please check the Firebase configuration."
  );
}

// --- DOM ELEMENT REFERENCES ---
const loadingSpinner = document.getElementById("loading-spinner");
const authSection = document.getElementById("auth-section");
const mainContent = document.getElementById("main-content");
const navbar = document.getElementById("navbar");
const adminNavLinks = document.getElementById("admin-nav-links");
const projectDetailModal = document.getElementById("project-detail-modal");
const progressModal = document.getElementById("progress-modal");
const uploadGuideModal = document.getElementById('upload-guide-modal');

// Add these event listeners somewhere in your script
document.getElementById('show-upload-guide-btn').addEventListener('click', (e) => {
    e.preventDefault();
    uploadGuideModal.style.display = 'flex';
});

document.getElementById('close-upload-guide-modal').addEventListener('click', () => {
    uploadGuideModal.style.display = 'none';
});

document.getElementById("nav-business-profile").addEventListener("click", (e) => {
    e.preventDefault();
    renderBusinessProfile();
    showPage("business-profile-section");
});
document.getElementById("mobile-nav-business-profile").addEventListener("click", (e) => {
    e.preventDefault();
    mobileMenu.classList.add("hidden");
    renderBusinessProfile();
    showPage("business-profile-section");
});

// --- UI & NAVIGATION LOGIC ---

function showPage(pageId) {
  document.querySelectorAll(".page-section").forEach((section) => {
    section.style.display = "none";
  });
  if (pageId) {
    const page = document.getElementById(pageId);
    if (page) {
      // The auth section needs 'flex' to center its content.
      // Other sections can use 'block'. This fixes the centering issue.
      if (
        page.id === "auth-section" ||
        page.id === "force-change-password-section"
      ) {
        page.style.display = "flex";
      } else {
        page.style.display = "block";
      }
    }
  }
}

function showMessage(message) {
  document.getElementById("message-modal-text").textContent = message;
  document.getElementById("message-modal").style.display = "flex";
}

document.getElementById("message-modal-close").addEventListener("click", () => {
  document.getElementById("message-modal").style.display = "none";
});

document
  .getElementById("close-project-detail-modal")
  .addEventListener("click", () => {
    projectDetailModal.style.display = "none";
  });

document.getElementById("nav-dashboard").addEventListener("click", (e) => {
  e.preventDefault();
  showPage("projects-dashboard-section");
});
document.getElementById("nav-bookings").addEventListener("click", (e) => {
  e.preventDefault();
  showPage("booking-section");
});
document
  .getElementById("nav-verified-investments")
  .addEventListener("click", (e) => {
    e.preventDefault();
    showPage("verified-investments-section");
  });
document.getElementById("nav-profile").addEventListener("click", (e) => {
  e.preventDefault();
  showPage("profile-section");
});

document.getElementById("nav-admin-projects").addEventListener("click", (e) => {
  e.preventDefault();
  showPage("admin-projects-section");
});
document.getElementById("nav-admin-users").addEventListener("click", (e) => {
  e.preventDefault();
  showPage("admin-users-section");
});
document
  .getElementById("nav-investment-report")
  .addEventListener("click", (e) => {
    e.preventDefault();
    showPage("investment-report-section");
  });

// Click-based dropdown logic
const profileDropdownBtn = document.getElementById("profile-dropdown-btn");
const profileDropdownMenu = document.getElementById("profile-dropdown-menu");
profileDropdownBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  profileDropdownMenu.classList.toggle("hidden");
});
window.addEventListener("click", (e) => {
  if (
    !profileDropdownBtn.contains(e.target) &&
    !profileDropdownMenu.contains(e.target)
  ) {
    profileDropdownMenu.classList.add("hidden");
  }
});
document.getElementById("user-role-filter").addEventListener("change", (e) => {
  renderAdminUsersTable(e.target.value);
});
document.getElementById('bo-profile-status-filter').addEventListener('change', () => {
    renderAdminBusinessData();
});

// --- AUTHENTICATION LOGIC ---

// Replace this entire function in script.js
function initializeAppUI(userData) {
    document.getElementById('navbar-user-name').textContent = userData.fullName || 'Profile';
    document.getElementById('navbar-user-avatar').src = userData.profilePictureURL || `https://placehold.co/40x40/e2e8f0/4a5568?text=${(userData.fullName || 'A').charAt(0)}`;
    document.getElementById('profile-fullname').value = userData.fullName || '';
    document.getElementById('profile-phone').value = userData.phone || '';
    document.getElementById('profile-picture-url').value = userData.profilePictureURL || '';
    document.getElementById('profile-investor-type').textContent = userData.investorType || 'N/A';
    
    renderGeneralReportsTable(userData.generalReports || []);

    const allNavLinks = document.querySelectorAll('#admin-nav-links, #mobile-admin-nav-links, #business-owner-nav-links, #mobile-business-owner-nav-links, #analyst-nav-links, #mobile-analyst-nav-links');
    allNavLinks.forEach(links => links.style.display = 'none');

    const investorNavLinks = document.querySelectorAll('#nav-dashboard, #nav-bookings, #nav-verified-investments, #mobile-nav-dashboard, #mobile-nav-bookings, #mobile-nav-verified-investments');
    investorNavLinks.forEach(link => link.style.display = 'none');
    
    const navAdminLogs = document.getElementById('nav-admin-logs');
    const mobileNavAdminLogs = document.getElementById('mobile-nav-admin-logs');
    navAdminLogs.style.display = 'none';
    mobileNavAdminLogs.style.display = 'none';
    
    document.getElementById('incomplete-profile-banner').classList.add('hidden');


    let defaultPage = '';

    if (userData.role === 'admin') {
        document.getElementById('admin-nav-links').style.display = 'inline';
        document.getElementById('mobile-admin-nav-links').style.display = 'block';
        navAdminLogs.style.display = 'block';
        mobileNavAdminLogs.style.display = 'block';
        
        listenToAdminProjects();
        listenToUsers();
        listenToAllInvestments();
        listenToAdminLogs();
        listenToProposedProjects();
        defaultPage = 'admin-business-data-section';

    } else if (userData.role === 'business-owner') {
        document.getElementById('business-owner-nav-links').style.display = 'inline';
        document.getElementById('mobile-business-owner-nav-links').style.display = 'block';
        listenToMyProjects();
        defaultPage = 'business-owner-my-projects-section';

        

        const proposeBtn = document.getElementById('show-create-my-project-modal-btn');
        const proposeMsg = document.getElementById('propose-project-status-message');
        const proposeBtnCta = document.getElementById('show-create-my-project-modal-btn-cta');
        const proposeMsgCta = document.getElementById('propose-project-status-message-cta');

        const allProposeBtns = [proposeBtn, proposeBtnCta];
        const allProposeMsgs = [proposeMsg, proposeMsgCta];
        
        if (userData.isApprovedByAnalyst === true) {
            allProposeBtns.forEach(btn => btn.disabled = false);
            allProposeMsgs.forEach(msg => msg.classList.add('hidden'));
        } else {
            allProposeBtns.forEach(btn => btn.disabled = true);
            allProposeMsgs.forEach(msg => {
                msg.classList.remove('hidden');
            });
        }

    } else if (userData.role === 'analyst') {
        document.getElementById('analyst-nav-links').style.display = 'inline';
        document.getElementById('mobile-analyst-nav-links').style.display = 'block';

        listenToAdminProjects();
        listenToUsers();
        defaultPage = 'analyst-business-data-section';

    } else { // Investor role
        investorNavLinks.forEach(link => link.style.display = 'block');
        listenToProjects();
        listenToBookingsAndPortfolio();
        defaultPage = 'projects-dashboard-section';
    }
    
    authSection.style.display = 'none';
    mainContent.style.display = 'block';
    navbar.style.display = 'block';

    if (!document.querySelector('.page-section[style*="display: block"], .page-section[style*="display: flex"]')) {
        showPage(defaultPage);
    }
    
    loadingSpinner.style.display = 'none';
}

onAuthStateChanged(auth, (user) => {
    loadingSpinner.style.display = 'flex';

    if (userDocListenerUnsubscribe) {
        userDocListenerUnsubscribe();
        userDocListenerUnsubscribe = null;
    }

    if (user) {
        currentUser = user;
        const userDocRef = doc(db, "users", user.uid);
        
        userDocListenerUnsubscribe = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
                
                // Gate 1: Force investors to change their initial password
                if (currentUserData.role === 'investor' && currentUserData.hasChangedPassword === false) {
                    mainContent.style.display = 'block';
                    navbar.style.display = 'none'; // Hide navbar
                    showPage('force-change-password-section');
                    loadingSpinner.style.display = 'none';
                
                // REMOVED: The hard gate for business owners is gone.
                // Now, all users who pass the first gate will proceed.

                } else if (currentUserData.role === 'investor') {
                    tempUserDataForDisclaimer = currentUserData;
                    document.getElementById('disclaimer-modal').style.display = 'flex';
                    loadingSpinner.style.display = 'none';
                } else {
                    // All other roles (Admin, Analyst, Business Owner) go straight to the app UI.
                    initializeAppUI(currentUserData);
                }

            } else {
                console.error("User document not found in Firestore! Forcing logout.");
                signOut(auth);
                loadingSpinner.style.display = 'none';
            }
        });

    } else {
        currentUser = null;
        currentUserData = null;
        mainContent.style.display = 'none';
        navbar.style.display = 'none';
        showPage('auth-section');
        loadingSpinner.style.display = 'none';
    }
});



// --- NEW EVENT LISTENERS FOR BUSINESS OWNER & ADMIN ---

// --- NEW BUSINESS OWNER UPDATE MODAL LOGIC ---
const boUpdateModal = document.getElementById('business-owner-update-modal');

function openBusinessOwnerUpdateModal(projectId) {
    document.getElementById('bo-update-project-id').value = projectId;
    document.getElementById('bo-update-form').reset();
    boUpdateModal.style.display = 'flex';
}

document.getElementById('cancel-bo-update-form').addEventListener('click', () => {
    boUpdateModal.style.display = 'none';
});

document.getElementById('bo-edit-project-btn').addEventListener('click', () => {
    const projectId = document.getElementById('bo-update-project-id').value;
    const boUpdateModal = document.getElementById('business-owner-update-modal');
    
    // Set the flag and swap the modals
    isResubmitFlowActive = true;
    boUpdateModal.style.display = 'none'; 
    openProjectModal(projectId);
});

document.getElementById('bo-update-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingSpinner.style.display = 'flex';

    const projectId = document.getElementById('bo-update-project-id').value;
    const comment = document.getElementById('bo-update-comment').value;
    const projectRef = doc(db, "projects", projectId);

    try {
        await runTransaction(db, async (transaction) => {
            const projectDoc = await transaction.get(projectRef);
            if (!projectDoc.exists()) {
                throw "Project not found!";
            }
            const projectData = projectDoc.data();
            const newHistoryEntry = {
                status: 'Resubmitted for Review', // CORRECTED STATUS
                comments: comment,
                timestamp: Timestamp.now(),
                author: 'Business Owner'
            };
            const updatedHistory = [...(projectData.statusHistory || []), newHistoryEntry];
            
            transaction.update(projectRef, {
                status: 'Resubmitted for Review', // CORRECTED STATUS
                statusHistory: updatedHistory
            });
        });
        
        showMessage("Project has been updated and resubmitted for review.");
        boUpdateModal.style.display = 'none';
    } catch (error) {
        console.error("Error resubmitting project:", error);
        showMessage("Failed to resubmit project.");
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

// Business Owner View Toggles
const myProjectsGrid = document.getElementById("my-projects-grid");
const myProjectsListContainer = document.getElementById("my-projects-list-container");

// Admin Proposed Projects View Toggles
const proposedCardViewBtn = document.getElementById("proposed-card-view-btn");
const proposedListViewBtn = document.getElementById("proposed-list-view-btn");
const proposedGrid = document.getElementById("admin-proposed-projects-grid");
const proposedListContainer = document.getElementById("admin-proposed-projects-list-container");

// Business Owner Navigation
document.getElementById("nav-my-project").addEventListener("click", (e) => {
  e.preventDefault();
  showPage("business-owner-my-projects-section");
});
document.getElementById("mobile-nav-my-project").addEventListener("click", (e) => {
  e.preventDefault();
  mobileMenu.classList.add("hidden");
  showPage("business-owner-my-projects-section");
});
document.getElementById("nav-my-approved-project").addEventListener("click", (e) => {
    e.preventDefault();
    showPage("business-owner-approved-projects-section");
});
document.getElementById("mobile-nav-my-approved-project").addEventListener("click", (e) => {
    e.preventDefault();
    mobileMenu.classList.add("hidden");
    showPage("business-owner-approved-projects-section");
});

// Business Owner "Propose New Project" Button
document.getElementById("show-create-my-project-modal-btn").addEventListener("click", () => openProjectModal());


// Admin Navigation for Proposed Projects
document.getElementById("nav-admin-proposed-projects").addEventListener("click", (e) => {
  e.preventDefault();
  showPage("admin-proposed-projects-section");
});
document.getElementById("mobile-nav-admin-proposed-projects").addEventListener("click", (e) => {
  e.preventDefault();
  mobileMenu.classList.add("hidden");
  showPage("admin-proposed-projects-section");
});

// Admin Review Project Modal
const reviewProjectModal = document.getElementById("review-project-modal");
document.getElementById("cancel-review-project-form").addEventListener("click", () => {
    reviewProjectModal.style.display = "none";
});

document
  .getElementById("sign-in-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signin-email").value;
    const password = document.getElementById("signin-password").value;
    const errorDiv = document.getElementById("sign-in-error");

    loadingSpinner.style.display = "flex";
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove("hidden");
      loadingSpinner.style.display = "none";
    }
  });

document.getElementById("sign-out-btn").addEventListener("click", () => {
  signOut(auth);
});

// Add this listener for the new disclaimer modal
document.getElementById('disclaimer-modal-close').addEventListener('click', () => {
    document.getElementById('disclaimer-modal').style.display = 'none';
    
    // Initialize the main app after the user acknowledges the disclaimer
    if (tempUserDataForDisclaimer) {
        initializeAppUI(tempUserDataForDisclaimer);
        tempUserDataForDisclaimer = null; // Clean up the temporary variable
    }
});

document
  .getElementById("update-profile-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("profile-fullname").value;
    const phone = document.getElementById("profile-phone").value;
    const profilePictureURL = document.getElementById(
      "profile-picture-url"
    ).value;
    const successDiv = document.getElementById("update-profile-success");

    successDiv.classList.add("hidden");

    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        fullName: fullName,
        phone: phone,
        profilePictureURL: profilePictureURL,
      });
      successDiv.textContent = "Profile updated successfully!";
      successDiv.classList.remove("hidden");
    } catch (error) {
      console.error("Profile update error:", error);
      showMessage("Error updating profile.");
    }
  });

async function handleChangePassword(e) {
  e.preventDefault();
  const formId = e.target.id;
  let newPassword, confirmNewPassword, errorDiv, successDiv;

  if (formId === "force-change-password-form") {
    newPassword = document.getElementById("force-new-password").value;
    confirmNewPassword = document.getElementById(
      "force-confirm-new-password"
    ).value;
    errorDiv = document.getElementById("force-change-password-error");
    successDiv = document.getElementById("force-change-password-success");
  } else {
    newPassword = document.getElementById("new-password").value;
    confirmNewPassword = document.getElementById("confirm-new-password").value;
    errorDiv = document.getElementById("change-password-error");
    successDiv = document.getElementById("change-password-success");
  }

  errorDiv.classList.add("hidden");
  successDiv.classList.add("hidden");

  if (newPassword !== confirmNewPassword) {
    errorDiv.textContent = "Passwords do not match.";
    errorDiv.classList.remove("hidden");
    return;
  }

  try {
    await updatePassword(auth.currentUser, newPassword);

    if (currentUserData.hasChangedPassword === false) {
      await updateDoc(doc(db, "users", currentUser.uid), {
        hasChangedPassword: true,
      });
    }

    successDiv.textContent = "Password updated successfully!";
    successDiv.classList.remove("hidden");
    e.target.reset();
  } catch (error) {
    console.error("Password update error:", error);
    errorDiv.textContent = "Error updating password. (" + error.code + ")";
    errorDiv.classList.remove("hidden");
  }
}

document
  .getElementById("change-password-form")
  .addEventListener("submit", handleChangePassword);
document
  .getElementById("force-change-password-form")
  .addEventListener("submit", handleChangePassword);

// --- FIRESTORE DATA LOGIC & RENDERING ---

const formatRupiah = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const formatCountdown = (dueDate) => {
  const now = new Date();
  const end = dueDate.toDate();
  const diff = end - now;

  if (diff <= 0) {
    return '<span class="text-red-600 font-semibold">Closed</span>';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return `<span class="text-green-600 font-semibold">${days}d ${hours}h left</span>`;
};

const formatWhatsAppLink = (phone, message = "") => {
  if (!phone) return "#"; // Return a non-functional link if no phone number
  let cleaned = phone.replace(/\D/g, ""); // Remove all non-digit characters
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  } else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }
  const url = `https://wa.me/${cleaned}`;
  if (message) {
    return `${url}?text=${encodeURIComponent(message)}`;
  }
  return url;
};

const formatDetailedTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return "N/A";
  const date = timestamp.toDate();
  return date
    .toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");
};

// --- NEW UPLOAD PROGRESS FUNCTIONS ---

const uploadProgressModal = document.getElementById('upload-progress-modal');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const uploadPercentage = document.getElementById('upload-percentage');
const uploadStatusText = document.getElementById('upload-status-text');

function showUploadProgressModal() {
    uploadProgressBar.style.width = '0%';
    uploadPercentage.textContent = '0%';
    uploadStatusText.textContent = 'Initializing...';
    uploadProgressModal.style.display = 'flex';
}

function updateProgressBar(progress) {
    const percentage = Math.round(progress);
    uploadProgressBar.style.width = `${percentage}%`;
    uploadPercentage.textContent = `${percentage}%`;
}

function updateUploadStatus(status) {
    uploadStatusText.textContent = status;
}

function hideUploadProgressModal() {
    uploadProgressModal.style.display = 'none';
}

/**
 * Uploads a file to Firebase Storage with progress tracking.
 * @param {File} file The file to upload.
 * @param {string} path The folder path in storage.
 * @param {function(number): void} progressCallback A function to call with the upload percentage.
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
function uploadFileWithProgress(file, fullPath, progressCallback) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        const storageRef = ref(storage, fullPath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressCallback(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                showMessage(`Upload failed for ${file.name}. Please try again.`);
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
}

function listenToProjects() {
  if (!currentUser) return;

  const projectsRef = collection(db, "projects");

  onSnapshot(projectsRef, async (snapshot) => { // The callback is now async
    const allVisibleProjects = [];
    snapshot.forEach(doc => {
        const project = { id: doc.id, ...doc.data() };
        
        if (!project.isVisible || project.isFulfilled || project.isFailed || project.isExpired) {
            return;
        }

        const assignedIds = project.assignedInvestorIds;
        const isPublic = !assignedIds || assignedIds.length === 0;
        const isAssignedToMe = assignedIds && assignedIds.includes(currentUser.uid);

        if (isPublic || isAssignedToMe) {
            allVisibleProjects.push(project);
        }
    });

    const tableBody = document.getElementById("investor-projects-table-body");
    tableBody.innerHTML = ""; 

    if (allVisibleProjects.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No investment opportunities available at the moment.</td></tr>';
      return;
    }

    for (const project of allVisibleProjects) {
      let companyName = 'N/A';
      if (project.ownerId) {
          try {
              const ownerDoc = await getDoc(doc(db, "users", project.ownerId));
              if (ownerDoc.exists()) {
                  companyName = ownerDoc.data().companyName || 'N/A';
              }
          } catch (e) {
              // This error is expected if using restrictive rules. We can ignore it here.
          }
      }

      // --- NEW LOGIC START ---
      const hasShownInterest = project.prospects && project.prospects[currentUser.uid];
      let interestedButtonHTML = '';

      if (hasShownInterest) {
          interestedButtonHTML = `
              <button class="bg-gray-400 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-not-allowed" disabled>
                  Interest Expressed
              </button>
          `;
      } else {
          interestedButtonHTML = `
              <button data-id="${project.id}" class="interested-btn bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 text-xs">
                  Interested
              </button>
          `;
      }
      // --- NEW LOGIC END ---

      const rowHTML = `
        <tr class="hover:bg-gray-50">
            <td data-label="Title" class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">${project.title}</td>
            <td data-label="Company Name" class="py-4 px-6 text-gray-700 whitespace-nowrap">${project.companyName || companyName}</td>
            <td data-label="Investment Asked" class="py-4 px-6 text-gray-700 whitespace-nowrap">${formatRupiah(project.investmentAsk || 0)}</td>
            <td data-label="View Detail" class="py-4 px-6 text-center">
                <button data-id="${project.id}" class="view-details-btn bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-900 text-xs">View Detail</button>
            </td>
            <td data-label="Interested" class="py-4 px-6 text-center">
                ${interestedButtonHTML}
            </td>
        </tr>
      `;
      tableBody.innerHTML += rowHTML;
    }

    document.querySelectorAll(".view-details-btn").forEach((button) => {
      button.addEventListener("click", () =>
        viewProjectDetails(button.dataset.id)
      );
    });
    
    document.querySelectorAll(".interested-btn").forEach((button) => {
      button.addEventListener("click", () =>
        handleInterestedClick(button.dataset.id)
      );
    });
  });
}


function transformGoogleDriveLink(url) {
  if (!url) return "";
  const regex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return url; // Return original url if it doesn't match
}

async function viewProjectDetails(projectId, context = 'dashboard') {
    loadingSpinner.style.display = 'flex';
    try {
        const projectDocRef = doc(db, "projects", projectId);
        const projectDoc = await getDoc(projectDocRef);
        if (!projectDoc.exists()) {
            showMessage("Project not found.");
            return;
        }

        const project = projectDoc.data();
        const projectDetailModalContent = document.getElementById('project-detail-modal-content');
        const projectDetailModalHeaderTitle = document.getElementById('project-detail-modal-header-title');
        
        projectDetailModalHeaderTitle.textContent = project.title;
        
        const isClosed = project.dueDate.toDate() < new Date() || project.isFulfilled || project.isFailed || project.isExpired;
        const userSlots = project.investors?.[currentUser.uid] || 0;

        let bookingSectionHTML = '';
        if (context === 'portfolio') {
            bookingSectionHTML = ``;
        } else if (isClosed) {
            let reason = "This investment round is closed.";
            if(project.isFulfilled) reason = "This project has been fully funded.";
            if(project.isFailed) reason = "This project has been marked as failed.";
            if(project.isExpired) reason = "This project has expired.";
            bookingSectionHTML = `<p class="text-center text-red-600 font-bold text-lg">${reason}</p>`;
        } else {
            bookingSectionHTML = `
                <h3 class="text-xl font-semibold mb-4">Book Your Investment</h3>
                <p class="mb-2">You have currently booked for ${userSlots} slot(s).</p>
                <form id="booking-form" class="flex items-center gap-4">
                    <select id="booking-slots" class="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500">
                        ${Array.from({ length: 3 }, (_, i) => `<option value="${i + 1}">${i + 1} Slot(s)</option>`).join('')}
                    </select>
                    <button type="submit" data-id="${projectId}" class="book-now-btn bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg">Book Now</button>
                </form>
            `;
        }
        
        // --- MODIFICATION: Build document section with folder links ---
        let documentsSectionHTML = '<h3 class="text-2xl font-semibold mb-4 border-b pb-2">Project Documents</h3>';
        const docFolders = [];
        if (project.businessFolderURL) docFolders.push({ title: 'Business Folder', url: project.businessFolderURL });
        if (project.legalFolderURL) docFolders.push({ title: 'Legal Folder', url: project.legalFolderURL });
        if (project.financeFolderURL) docFolders.push({ title: 'Finance Folder', url: project.financeFolderURL });
        if (project.otherFolderURL) docFolders.push({ title: 'Other Folder', url: project.otherFolderURL });

        if (docFolders.length > 0) {
            documentsSectionHTML += docFolders.map(folder => `
                <div class="flex justify-between items-center mb-2 p-3 bg-gray-50 rounded-md">
                    <p class="font-semibold">${folder.title}</p>
                    <button 
                        data-folder-url="${folder.url}" 
                        data-folder-title="${folder.title}: ${project.title}" 
                        class="view-folder-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-lg text-xs">
                        View Folder
                    </button>
                </div>
            `).join('');
        } else {
            documentsSectionHTML += '<p class="text-gray-500">No document folders have been provided for this project yet.</p>';
        }

        // Add Due Diligence Reports section
        documentsSectionHTML += '<h3 class="text-2xl font-semibold mt-8 mb-4 border-b pb-2">Due Diligence Reports</h3>';
        if (project.dueDiligenceReports && project.dueDiligenceReports.length > 0) {
            documentsSectionHTML += project.dueDiligenceReports.map(report => `
                <div class="flex justify-between items-center mb-2 p-3 bg-gray-50 rounded-md">
                    <div>
                        <p class="font-semibold">${report.title}</p>
                        <p class="text-xs text-gray-500">Uploaded by ${report.authorName} on ${report.date.toDate().toLocaleDateString()}</p>
                    </div>
                    <button 
                        data-pdf-url="${report.pdfURL}" 
                        data-pdf-title="Due Diligence: ${report.title}" 
                        class="view-update-pdf-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-lg text-xs">
                        View
                    </button>
                </div>
            `).join('');
        } else {
            documentsSectionHTML += '<p class="text-gray-500">No due diligence reports are available yet.</p>';
        }

        projectDetailModalContent.innerHTML = `
            <button id="back-to-dashboard-btn" class="mb-6 text-blue-600 hover:underline">&larr; Back to Dashboard</button>
            <img src="${project.photoURL || 'https://placehold.co/800x400/e2e8f0/4a5568?text=Project+Image'}" 
                 alt="${project.title}" 
                 class="w-full max-h-[50vh] object-contain mx-auto rounded-lg mb-6"
                 onerror="this.onerror=null;this.src='https://placehold.co/800x400/e2e8f0/4a5568?text=Image+Not+Found';">
            <div class="flex justify-between items-start mb-2">
                 <h2 class="text-4xl font-bold">${project.title}</h2>
                 ${project.dueDate ? formatCountdown(project.dueDate) : ''}
            </div>
            <p class="text-gray-500 text-lg mb-6">${project.summary}</p>
            
            <div class="bg-gray-100 p-4 rounded-lg mb-8 text-center">
                <div class="text-sm font-medium text-gray-600">Investment Ask</div>
                <div class="text-3xl font-bold text-gray-900">${formatRupiah(project.investmentAsk || 0)}</div>
            </div>
            
            <h3 class="text-2xl font-semibold mb-4">About the Project</h3>
            <p class="text-gray-700 whitespace-pre-wrap mb-8">${project.description}</p>
            
            <div class="mt-8">${documentsSectionHTML}</div>

            <div class="bg-blue-50 p-6 rounded-lg mt-8">
                ${bookingSectionHTML}
            </div>
        `;
        
        projectDetailModal.style.display = 'flex';

        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
            projectDetailModal.style.display = 'none';
        });

        if (!isClosed && context !== 'portfolio') {
            document.getElementById('booking-form')?.addEventListener('submit', handleBooking);
        }
        
        projectDetailModalContent.querySelectorAll('.view-update-pdf-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const { pdfUrl, pdfTitle } = e.currentTarget.dataset;
                openPdfViewerModal(pdfUrl, pdfTitle);
            });
        });

        // New listener for folder buttons
        projectDetailModalContent.querySelectorAll('.view-folder-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const { folderUrl, folderTitle } = e.currentTarget.dataset;
                const embedUrl = transformGoogleDriveFolderLink(folderUrl);
                openPdfViewerModal(embedUrl, folderTitle); // Re-using the same modal
            });
        });

    } catch (error) {
        console.error("Error fetching project details:", error);
        showMessage("Could not load project details.");
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

async function handleBooking(e) {
    e.preventDefault();
    const projectId = e.target.querySelector('.book-now-btn').dataset.id;
    const slotsToBook = parseInt(document.getElementById('booking-slots').value, 10);

    if (isNaN(slotsToBook) || slotsToBook <= 0) {
        showMessage("Please select a valid number of slots.");
        return;
    }

    loadingSpinner.style.display = 'flex';
    const projectDocRef = doc(db, "projects", projectId);

    try {
        // The transaction will return a boolean indicating if the user is on the waiting list.
        const wasPlacedOnWaitingList = await runTransaction(db, async (transaction) => {
            const freshProjectDoc = await transaction.get(projectDocRef);
            if (!freshProjectDoc.exists()) {
                throw "Project does not exist!";
            }
            
            const freshProjectData = freshProjectDoc.data();
            if (freshProjectData.isFulfilled || freshProjectData.isFailed || freshProjectData.isExpired) {
                throw "This project is no longer accepting investments.";
            }

            const freshUserSlots = freshProjectData.investors?.[currentUser.uid] || 0;
            if (freshUserSlots + slotsToBook > 3) {
                throw "You cannot own more than 3 slots for this project.";
            }

            const freshSlotsTaken = Object.values(freshProjectData.investors || {}).reduce((sum, slots) => sum + slots, 0);
            
            // Determine if the user's booking will place them on the waiting list.
            // This happens if the slots are already full *before* this user's booking.
            const isOnWaitingList = freshSlotsTaken >= freshProjectData.totalSlots;

            // --- Perform the booking updates regardless ---
            const userBookingKey = `investors.${currentUser.uid}`;
            const newTotalUserSlots = freshUserSlots + slotsToBook;
            
            transaction.update(projectDocRef, {
                [userBookingKey]: newTotalUserSlots
            });
            
            const userPortfolioDocRef = doc(db, "users", currentUser.uid, "portfolio", projectId);
            transaction.set(userPortfolioDocRef, {
                projectId: projectId,
                bookedAt: Timestamp.now(),
                slots: newTotalUserSlots,
                amount: newTotalUserSlots * freshProjectData.slotPrice
            }, { merge: true });

            // Return the waiting list status.
            return isOnWaitingList;
        });

        // Show the appropriate message based on the transaction's result.
        if (wasPlacedOnWaitingList) {
            showMessage("All slots are currently filled. You've been added to our waiting list, and our investor relation will contact you in 1x24 hours.");
        } else {
            showMessage("Thank you for your interest! Our investor relation will contact you in 1x24 hours.");
        }
        
        viewProjectDetails(projectId); // Refresh the modal to show updated slot count.

    } catch (error) {
        console.error("Error processing booking:", error);
        // Display the specific error message thrown from the transaction.
        showMessage("Booking failed: " + error);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

function listenToBookingsAndPortfolio() {
    if (!currentUser) return;

    const portfolioCollectionRef = collection(db, "users", currentUser.uid, "portfolio");
    onSnapshot(portfolioCollectionRef, (portfolioSnapshot) => {
        const portfolioItems = portfolioSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const projectIds = portfolioItems.map(item => item.id);

        if (projectIds.length === 0) {
            document.getElementById('booking-list').innerHTML = '<p class="text-center text-gray-500">You have no pending bookings.</p>';
            document.getElementById('verified-investments-list').innerHTML = '<p class="text-center text-gray-500">You have no verified investments.</p>';
            document.getElementById('total-projects-booked').textContent = '0';
            document.getElementById('total-slots-booked').textContent = '0';
            document.getElementById('total-amount-booked').textContent = formatRupiah(0);
            document.getElementById('total-projects-verified').textContent = '0';
            document.getElementById('total-slots-verified').textContent = '0';
            document.getElementById('total-amount-verified').textContent = formatRupiah(0);
            
            if (projectsListenerUnsubscribe) {
                projectsListenerUnsubscribe();
                projectsListenerUnsubscribe = null;
            }
            return;
        }

        if (projectsListenerUnsubscribe) {
            projectsListenerUnsubscribe();
        }

        const projectsQuery = query(collection(db, "projects"), where(documentId(), 'in', projectIds));
        projectsListenerUnsubscribe = onSnapshot(projectsQuery, (projectsSnapshot) => {
            const portfolioDataMap = new Map(portfolioItems.map(item => [item.id, item]));
            const projectsDataMap = new Map(projectsSnapshot.docs.map(doc => [doc.id, doc.data()]));

            const bookingList = document.getElementById('booking-list');
            const verifiedList = document.getElementById('verified-investments-list');
            
            bookingList.innerHTML = '';
            verifiedList.innerHTML = '';

            let totalBookedProjects = 0, totalBookedAmount = 0, totalBookedSlots = 0;
            let totalVerifiedProjects = 0, totalVerifiedAmount = 0, totalVerifiedSlots = 0;

            portfolioDataMap.forEach((portfolioData, projectId) => {
                const project = projectsDataMap.get(projectId);
                if (project) {
                    const isVerified = project.investorStatus?.[currentUser.uid]?.paymentVerified === true;
                    
                    // --- START: New logic to filter progress updates ---
                    let progressUpdatesHTML = '<p class="text-sm text-gray-500 mt-2">No progress updates yet.</p>';
                    if (project.progressUpdates && project.progressUpdates.length > 0) {
                        // An investor sees an update if it's for 'all' or specifically for them.
                        // !update.visibleTo handles reports created before this feature was added.
                        const visibleUpdates = project.progressUpdates.filter(update => 
                            !update.visibleTo || update.visibleTo === 'all' || update.visibleTo === currentUser.uid
                        );

                        if (visibleUpdates.length > 0) {
                            const sortedUpdates = [...visibleUpdates].sort((a, b) => b.date.toMillis() - a.date.toMillis());
                            progressUpdatesHTML = sortedUpdates.map(update => `
                                <div class="pl-4 border-l-2 border-blue-500 mt-2">
                                    <p class="font-semibold">${update.date.toDate().toLocaleDateString()}</p>
                                    <button class="view-update-pdf-btn text-blue-600 hover:underline" data-pdf-url="${update.pdfURL}" data-pdf-title="${update.title}">
                                        ${update.title}
                                    </button>
                                </div>
                            `).join('');
                        }
                    }
                    // --- END: New logic ---

                    const cardHTML = `
                        <div class="bg-white rounded-lg shadow-md overflow-hidden">
                            <button data-target-id="project-content-${projectId}" class="project-report-toggle w-full flex justify-between items-center p-6 text-left focus:outline-none">
                                <h3 class="text-2xl font-bold">${project.title}</h3>
                                <svg class="w-6 h-6 transform transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            <div id="project-content-${projectId}" class="px-6 pb-6 hidden">
                                <p class="text-gray-600 mb-4">You own <span class="font-bold text-blue-600">${portfolioData.slots} slot(s)</span> valued at <span class="font-bold text-green-600">${formatRupiah(portfolioData.amount)}</span></p>
                                <h4 class="text-lg font-semibold mb-2">Progress Updates</h4>
                                <div class="space-y-4">${progressUpdatesHTML}</div>
                                <div class="mt-6 pt-4 border-t">
                                    <button data-id="${projectId}" class="view-portfolio-project-details-btn w-full bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">See Project Details</button>
                                </div>
                            </div>
                        </div>
                    `;

                    if (isVerified) {
                        totalVerifiedProjects++;
                        totalVerifiedSlots += portfolioData.slots;
                        totalVerifiedAmount += portfolioData.amount;
                        verifiedList.innerHTML += cardHTML;
                    } else {
                        totalBookedProjects++;
                        totalBookedSlots += portfolioData.slots;
                        totalBookedAmount += portfolioData.amount;
                        bookingList.innerHTML += cardHTML;
                    }
                }
            });

            document.getElementById('total-projects-booked').textContent = totalBookedProjects;
            document.getElementById('total-slots-booked').textContent = totalBookedSlots;
            document.getElementById('total-amount-booked').textContent = formatRupiah(totalBookedAmount);
            if (totalBookedProjects === 0) bookingList.innerHTML = '<p class="text-center text-gray-500">You have no pending bookings.</p>';

            document.getElementById('total-projects-verified').textContent = totalVerifiedProjects;
            document.getElementById('total-slots-verified').textContent = totalVerifiedSlots;
            document.getElementById('total-amount-verified').textContent = formatRupiah(totalVerifiedAmount);
            if (totalVerifiedProjects === 0) verifiedList.innerHTML = '<p class="text-center text-gray-500">You have no verified investments.</p>';
            
            document.querySelectorAll('.view-update-pdf-btn').forEach(button => button.addEventListener('click', (e) => openPdfViewerModal(e.currentTarget.dataset.pdfUrl, e.currentTarget.dataset.pdfTitle)));
            document.querySelectorAll('.view-portfolio-project-details-btn').forEach(button => button.addEventListener('click', (e) => viewProjectDetails(e.currentTarget.dataset.id, 'portfolio')));
        });
    });
}

function renderGeneralReportsTable(reports = []) {
  const container = document.getElementById("general-reports-section");
  const tableContainer = document.getElementById(
    "general-reports-table-container"
  );

  if (!reports || reports.length === 0) {
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");

  const sortedReports = reports.sort(
    (a, b) => b.date.toMillis() - a.date.toMillis()
  );

  tableContainer.innerHTML = `
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Sent</th>
                            <th class="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${sortedReports
                          .map(
                            (report) => `
                            <tr>
                                <td class="py-4 px-6 whitespace-nowrap font-medium text-gray-900">${
                                  report.title
                                }</td>
                                <td class="py-4 px-6 whitespace-nowrap">${report.date
                                  .toDate()
                                  .toLocaleDateString()}</td>
                                <td class="py-4 px-6 text-center">
                                    <button class="view-general-report-pdf-btn text-blue-600 hover:underline" data-pdf-url="${
                                      report.pdfURL
                                    }" data-pdf-title="${
                              report.title
                            }">View</button>
                                </td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            `;

  document
    .querySelectorAll(".view-general-report-pdf-btn")
    .forEach((button) => {
      button.addEventListener("click", (e) => {
        const { pdfUrl, pdfTitle } = e.currentTarget.dataset;
        openPdfViewerModal(pdfUrl, pdfTitle);
      });
    });
}

// --- ADMIN PANEL LOGIC ---

function renderAdminProjectsTable() {
    const underReviewBody = document.getElementById('admin-under-review-table-body');
    const needUpdateBody = document.getElementById('admin-need-update-table-body');
    const resubmittedBody = document.getElementById('admin-resubmitted-table-body');
    const assignedAnalystBody = document.getElementById('admin-assigned-analyst-table-body');
    const approvedBody = document.getElementById('admin-approved-table-body');
    const rejectedBody = document.getElementById('admin-rejected-table-body');

    // Clear all tables
    underReviewBody.innerHTML = '';
    needUpdateBody.innerHTML = '';
    resubmittedBody.innerHTML = '';
    assignedAnalystBody.innerHTML = '';
    approvedBody.innerHTML = '';
    rejectedBody.innerHTML = '';

    // Filter projects into their respective categories
    const underReviewProjects = allAdminProjects.filter(p => p.status === 'Under Review');
    const needUpdateProjects = allAdminProjects.filter(p => p.status === 'Need Update');
    const resubmittedProjects = allAdminProjects.filter(p => p.status === 'Resubmitted for Review');
    const assignedAnalystProjects = allAdminProjects.filter(p => p.status === 'Assigned to Analyst');
    const approvedProjects = allAdminProjects.filter(p => p.status === 'Approved');
    const rejectedProjects = allAdminProjects.filter(p => p.status === 'Rejected');
    
    // Render the first five tables which are the same for Admin and Analyst
    renderAdminProposalTable(underReviewProjects, underReviewBody, 'No new projects are awaiting review.');
    renderAdminProposalTable(needUpdateProjects, needUpdateBody, 'No projects currently need updates.');
    renderAdminProposalTable(resubmittedProjects, resubmittedBody, 'No projects have been resubmitted.');
    renderAdminProposalTable(assignedAnalystProjects, assignedAnalystBody, 'No projects are currently assigned to an analyst.');
    renderAdminProposalTable(rejectedProjects, rejectedBody, 'No projects have been rejected.');

    // Render the "Approved" table based on user role
    const approvedThead = approvedBody.parentElement.querySelector('thead');

    if (currentUserData.role === 'analyst') {
        // --- Analyst View for Approved Table ---
        approvedThead.innerHTML = `
            <tr class="bg-gray-50">
                <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title</th>
                <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Owner</th>
                <th class="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
        `;

        if (approvedProjects.length === 0) {
            approvedBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No projects have been approved.</td></tr>`;
            return;
        }

        approvedProjects.forEach(project => {
            const owner = allUsers.find(u => u.id === project.ownerId);
            const companyName = owner ? owner.companyName || 'N/A' : 'N/A';
            const ownerName = owner ? owner.fullName : 'N/A';

            const row = `
                <tr>
                    <td data-label="Project" class="py-4 px-6 font-medium">${project.title}</td>
                    <td data-label="Company Name" class="py-4 px-6">${companyName}</td>
                    <td data-label="Business Owner" class="py-4 px-6">${ownerName}</td>
                    <td class="py-4 px-6 whitespace-nowrap">
                        <div class="flex items-center justify-center space-x-4">
                             <button data-id="${project.id}" data-title="${project.title}" class="assign-investors-btn text-purple-600 hover:text-purple-900" title="Assign Investors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="m19 11-2-2-2 2"/></svg>
                             </button>
                             <button data-id="${project.id}" data-title="${project.title}" class="due-diligence-btn text-green-600 hover:text-green-900" title="Add Due Diligence Report">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                             </button>
                             <button data-id="${project.id}" class="view-investment-details-btn text-blue-600 hover:text-blue-900" title="View Investment Details">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                             </button>
                        </div>
                    </td>
                </tr>
            `;
            approvedBody.innerHTML += row;
        });

        approvedBody.querySelectorAll('.assign-investors-btn').forEach(btn => btn.addEventListener('click', e => openAssignInvestorModal(e.currentTarget.dataset.id, e.currentTarget.dataset.title)));
        approvedBody.querySelectorAll('.due-diligence-btn').forEach(btn => btn.addEventListener('click', e => openDueDiligenceModal(e.currentTarget.dataset.id, e.currentTarget.dataset.title)));
        approvedBody.querySelectorAll('.view-investment-details-btn').forEach(btn => btn.addEventListener('click', e => openInvestmentDetailsModal(e.currentTarget.dataset.id)));

    } else {
        // --- Admin View for Approved Table (Original Logic) ---
        approvedThead.innerHTML = `
             <tr class="bg-gray-50">
                <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title</th>
                <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked Slots</th>
                <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified Slots</th>
                <th class="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                <th class="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
        `;
        renderAdminApprovedTable(approvedProjects, approvedBody);
    }
}

function renderAdminProposalTable(projects, tableBody, emptyMessage) {
    if (projects.length === 0) {
        const colspan = tableBody.parentElement.querySelector('thead tr').childElementCount;
        tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-4 text-gray-500">${emptyMessage}</td></tr>`;
        return;
    }

    let allRowsHTML = '';
    projects.forEach(project => {
        const owner = allUsers.find(u => u.id === project.ownerId);
        const companyName = owner ? owner.companyName || 'N/A' : 'N/A';
        const history = project.statusHistory || [];
        const sortedHistory = [...history].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
        const latestComment = sortedHistory.length > 0 ? (sortedHistory[0].comments || 'N/A') : (project.adminComments || 'N/A');

        let customColumns = '';
        if (project.status === 'Need Update') {
            customColumns = `<td data-label="Admin Comment" class="py-4 px-6">${project.adminComments || 'N/A'}</td>`;
        } else if (project.status === 'Resubmitted for Review') {
            customColumns = `<td data-label="Latest Comment" class="py-4 px-6">${latestComment}</td>`;
        } else if (project.status === 'Assigned to Analyst') {
            customColumns = `<td data-label="Analyst In Charge" class="py-4 px-6 font-medium">${project.assignedAnalystName || 'N/A'}</td>`;
        }
        
        // --- LOGIC: Generate role-specific action buttons ---
        let actionsHTML = '';
        if (currentUserData.role === 'analyst' && project.status === 'Assigned to Analyst') {
            actionsHTML = `
                <div class="flex items-center justify-center space-x-2">
                    <button data-id="${project.id}" class="view-project-details-btn bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded-lg text-xs">View Details</button>
                    <button data-id="${project.id}" data-title="${project.title}" class="analyst-approve-btn bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg text-xs">Approve</button>
                    <button data-id="${project.id}" data-title="${project.title}" class="analyst-reject-btn bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg text-xs">Reject</button>
                    <button data-project-id="${project.id}" class="toggle-admin-history-btn text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-md">History</button>
                    <button data-id="${project.id}" data-title="${project.title}" class="due-diligence-btn bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded-lg text-xs">Due Diligence</button>
                </div>
            `;
        } else { // Admin view
            actionsHTML = `
                <div class="flex items-center justify-center space-x-2">
                    <button data-id="${project.id}" class="review-project-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg text-xs">Review</button>
                    <button data-project-id="${project.id}" class="toggle-admin-history-btn text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-md">History</button>
                    <button data-id="${project.id}" data-title="${project.title}" class="delete-project-btn text-red-600 hover:text-red-900" title="Delete Project">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
        }

        const rowHTML = `
            <tr class="project-main-row">
                <td data-label="Project" class="py-4 px-6 font-medium">${project.title}</td>
                <td data-label="Owner" class="py-4 px-6">${project.ownerName || 'Admin'}</td>
                <td data-label="Company Name" class="py-4 px-6">${companyName}</td>
                ${customColumns}
                <td class="py-4 px-6 text-center">${actionsHTML}</td>
            </tr>
            <tr id="admin-history-row-${project.id}" class="project-detail-row hidden">
                <td colspan="5" class="p-0">
                    <div class="p-4 bg-gray-50">
                        <h4 class="font-bold text-md mb-2">Review History</h4>
                        <table class="min-w-full text-sm">
                            <thead class="border-b">
                                <tr>
                                    <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Timestamp</th>
                                    <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Status</th>
                                    <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Author</th>
                                    <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Comment</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedHistory.map(entry => `
                                    <tr class="border-b">
                                        <td class="py-3 px-3 text-gray-600 whitespace-nowrap">${formatDetailedTimestamp(entry.timestamp)}</td>
                                        <td class="py-3 px-3 font-medium">${entry.status}</td>
                                        <td class="py-3 px-3 font-medium">${entry.author || 'Admin'}</td>
                                        <td class="py-3 px-3 text-gray-700 whitespace-pre-wrap">${entry.comments || 'N/A'}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" class="text-center py-4 text-gray-500">No review history.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </td>
            </tr>
        `;
        allRowsHTML += rowHTML;
    });

    tableBody.innerHTML = allRowsHTML;
    
    // Attach all event listeners
    tableBody.querySelectorAll('.review-project-btn').forEach(btn => btn.addEventListener('click', (e) => openReviewProjectModal(e.currentTarget.dataset.id)));
    tableBody.querySelectorAll('.delete-project-btn').forEach(btn => btn.addEventListener('click', (e) => deleteProject(e.currentTarget.dataset.id, e.currentTarget.dataset.title)));
    tableBody.querySelectorAll('.toggle-admin-history-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const projectId = e.currentTarget.dataset.projectId;
        const detailRow = document.getElementById(`admin-history-row-${projectId}`);
        detailRow.classList.toggle('hidden');
    }));
    tableBody.querySelectorAll('.due-diligence-btn').forEach(btn => btn.addEventListener('click', (e) => openDueDiligenceModal(e.currentTarget.dataset.id, e.currentTarget.dataset.title)));
    tableBody.querySelectorAll('.analyst-approve-btn').forEach(btn => btn.addEventListener('click', (e) => handleAnalystApprove(e.currentTarget.dataset.id, e.currentTarget.dataset.title)));
    tableBody.querySelectorAll('.analyst-reject-btn').forEach(btn => btn.addEventListener('click', (e) => handleAnalystReject(e.currentTarget.dataset.id, e.currentTarget.dataset.title)));
    
    // Add the new listener for the view details button
    tableBody.querySelectorAll('.view-project-details-btn').forEach(btn => btn.addEventListener('click', (e) => viewProjectDetails(e.currentTarget.dataset.id)));
}

// --- NEW ANALYST ACTION HANDLERS ---
function handleAnalystApprove(projectId, projectTitle) {
    if (confirm(`Are you sure you want to approve the project "${projectTitle}"?`)) {
        handleAdminReviewAction(projectId, 'Approved by Analyst.', 'Approved');
    }
}

function handleAnalystReject(projectId, projectTitle) {
    const reason = prompt(`Please provide a reason for rejecting the project "${projectTitle}":`);
    if (reason) { // Only proceed if the user provides a reason
        handleAdminReviewAction(projectId, reason, 'Rejected');
    }
}

function renderAdminApprovedTable(projects, tableBody) {
    if (projects.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No projects have been approved.</td></tr>`;
        return;
    }
    projects.forEach(project => {
        const investors = project.investors || {};
        const investorStatus = project.investorStatus || {};
        let bookedSlots = 0;
        let verifiedSlots = 0;

        Object.keys(investors).forEach(userId => {
            const slots = investors[userId];
            if (investorStatus[userId]?.paymentVerified) {
                verifiedSlots += slots;
            } else {
                bookedSlots += slots;
            }
        });
        
        const visibilityClass = project.isVisible ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 hover:bg-gray-600";
        const visibilityText = project.isVisible ? "Visible" : "Hidden";
        
        const row = `
            <tr class="${project.isFulfilled ? 'bg-green-50' : ''}">
                <td data-label="Project" class="py-4 px-6 font-medium">${project.title}</td>
                <td data-label="Booked" class="py-4 px-6">${bookedSlots} / ${project.totalSlots}</td>
                <td data-label="Verified" class="py-4 px-6 font-semibold text-green-600">${verifiedSlots} / ${project.totalSlots}</td>
                <td data-label="Visibility" class="py-4 px-6 text-center">
                    <button data-id="${project.id}" data-title="${project.title}" class="visibility-toggle-btn text-white font-bold py-1 px-3 rounded-lg text-xs ${visibilityClass}">${visibilityText}</button>
                </td>
                <td class="py-4 px-6 whitespace-nowrap">
                    <div class="flex items-center justify-center space-x-4">
                        <button data-id="${project.id}" data-title="${project.title}" class="fulfill-project-btn ${project.isFulfilled ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'} text-white font-bold py-1 px-3 rounded-lg text-xs">${project.isFulfilled ? 'Re-open' : 'Fulfill'}</button>
                        <button data-id="${project.id}" class="view-investment-details-btn text-blue-600 hover:text-blue-900" title="View Investors"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></button>
                        <button data-id="${project.id}" class="edit-project-btn text-indigo-600 hover:text-indigo-900" title="Edit Project"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                        <button data-id="${project.id}" class="add-progress-btn text-green-600 hover:text-green-900" title="Add Progress Update"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                        <button data-id="${project.id}" data-title="${project.title}" class="delete-project-btn text-red-600 hover:text-red-900" title="Delete Project"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    tableBody.querySelectorAll('.visibility-toggle-btn').forEach(btn => btn.addEventListener('click', e => handleVisibilityToggle(e.currentTarget.dataset.id, e.currentTarget.dataset.title)));
    tableBody.querySelectorAll('.view-investment-details-btn').forEach(btn => btn.addEventListener('click', e => openInvestmentDetailsModal(e.currentTarget.dataset.id)));
    tableBody.querySelectorAll('.edit-project-btn').forEach(btn => btn.addEventListener('click', e => openProjectModal(e.currentTarget.dataset.id)));
    tableBody.querySelectorAll('.add-progress-btn').forEach(btn => btn.addEventListener('click', e => openProgressModal(e.currentTarget.dataset.id)));
    tableBody.querySelectorAll('.delete-project-btn').forEach(btn => btn.addEventListener('click', e => deleteProject(e.currentTarget.dataset.id, e.currentTarget.dataset.title)));
    tableBody.querySelectorAll('.fulfill-project-btn').forEach(btn => btn.addEventListener('click', e => handleFulfillProject(e.currentTarget.dataset.id, e.currentTarget.dataset.title)));
}

async function handleFulfillProject(projectId, projectTitle) {
    const projectRef = doc(db, "projects", projectId);
    try {
        const projectDoc = await getDoc(projectRef);
        if (projectDoc.exists()) {
            const isCurrentlyFulfilled = projectDoc.data().isFulfilled;
            await updateDoc(projectRef, { isFulfilled: !isCurrentlyFulfilled });
            await logAdminAction(`${isCurrentlyFulfilled ? 'Re-opened' : 'Fulfilled'} project: "${projectTitle}"`);
        }
    } catch (error) {
        console.error("Error fulfilling project:", error);
        showMessage("Failed to update fulfillment status.");
    }
}

function renderAdminSimpleStatusTable(projects, tableBody, emptyMessage) {
    if (projects.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">${emptyMessage}</td></tr>`;
        return;
    }
    projects.forEach(project => {
        // Actions are now the same for Admin and Analyst in this table
        const actionsHTML = `<div class="flex items-center justify-center space-x-4">
                    <button data-id="${project.id}" class="review-project-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg text-xs">Review</button>
                    <button data-id="${project.id}" data-title="${project.title}" class="delete-project-btn text-red-600 hover:text-red-900" title="Delete Project">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>`;
        
        const row = `
            <tr>
                <td data-label="Project" class="py-4 px-6 font-medium">${project.title}</td>
                <td data-label="Owner" class="py-4 px-6">${project.ownerName || 'Admin'}</td>
                <td class="py-4 px-6 text-center">${actionsHTML}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
    
    tableBody.querySelectorAll('.review-project-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openReviewProjectModal(e.currentTarget.dataset.id));
    });

    tableBody.querySelectorAll('.delete-project-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteProject(e.currentTarget.dataset.id, e.currentTarget.dataset.title));
    });
}

function renderAdminStatusTableWithHistory(projects, tableBody, emptyMessage) {
    if (projects.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">${emptyMessage}</td></tr>`;
        return;
    }
    
    let allRowsHTML = '';
    projects.forEach(project => {
        const history = project.statusHistory || [];
        const sortedHistory = [...history].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
        const latestComment = sortedHistory.length > 0 ? (sortedHistory[0].comments || 'N/A') : 'N/A';

        const historyTableHTML = `
            <div class="p-4 bg-gray-50">
                <h4 class="font-bold text-md mb-2">Review History</h4>
                <table class="min-w-full text-sm">
                    <thead class="border-b">
                        <tr>
                            <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Timestamp</th>
                            <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Status</th>
                             <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Author</th>
                            <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedHistory.map(entry => `
                            <tr class="border-b">
                                <td class="py-3 px-3 text-gray-600 whitespace-nowrap">${formatDetailedTimestamp(entry.timestamp)}</td>
                                <td class="py-3 px-3 font-medium">${entry.status}</td>
                                <td class="py-3 px-3 font-medium">${entry.author || 'Admin'}</td>
                                <td class="py-3 px-3 text-gray-700 whitespace-pre-wrap">${entry.comments || 'N/A'}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" class="text-center py-4 text-gray-500">No review history.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
        
        // Actions are now the same for Admin and Analyst in this table
        const actionsHTML = `<div class="flex items-center justify-center space-x-2">
                    <button data-id="${project.id}" class="review-project-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg text-xs">Review</button>
                    <button data-project-id="${project.id}" class="toggle-admin-history-btn text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-md">History</button>
               </div>`;

        allRowsHTML += `
            <tr class="project-main-row">
                <td data-label="Project" class="py-4 px-6 font-medium">${project.title}</td>
                <td data-label="Owner" class="py-4 px-6">${project.ownerName || 'Admin'}</td>
                <td data-label="Latest Comment" class="py-4 px-6 text-sm italic text-gray-600">${latestComment}</td>
                <td class="py-4 px-6 text-center">${actionsHTML}</td>
            </tr>
            <tr id="admin-history-row-${project.id}" class="project-detail-row hidden">
                <td colspan="4" class="p-0">
                    ${historyTableHTML}
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = allRowsHTML;

    tableBody.querySelectorAll('.review-project-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openReviewProjectModal(e.currentTarget.dataset.id));
    });

    tableBody.querySelectorAll('.toggle-admin-history-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const projectId = e.currentTarget.dataset.projectId;
            const detailRow = document.getElementById(`admin-history-row-${projectId}`);
            detailRow.classList.toggle('hidden');
        });
    });
}


function renderAdminStatusTable(projects, tableBody, emptyMessage) {
    if (projects.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">${emptyMessage}</td></tr>`;
        return;
    }
    projects.forEach(project => {
        const row = `
            <tr>
                <td data-label="Project" class="py-4 px-6 font-medium">${project.title}</td>
                <td data-label="Owner" class="py-4 px-6">${project.ownerName || 'Admin'}</td>
                <td class="py-4 px-6 text-center">
                    <div class="flex items-center justify-center space-x-4">
                        <button data-id="${project.id}" class="review-project-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg text-xs">Review</button>
                        <button data-id="${project.id}" data-title="${project.title}" class="delete-project-btn text-red-600 hover:text-red-900" title="Delete Project">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
    
    tableBody.querySelectorAll('.review-project-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openReviewProjectModal(e.currentTarget.dataset.id));
    });

    tableBody.querySelectorAll('.delete-project-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteProject(e.currentTarget.dataset.id, e.currentTarget.dataset.title));
    });
}

function renderAdminUsersTable(roleFilter = 'all') {
    const tableBody = document.getElementById('admin-users-table-body');
    tableBody.innerHTML = '';
    
    let filteredUsers = allUsers;
    if (roleFilter !== 'all') {
        filteredUsers = allUsers.filter(user => user.role === roleFilter);
    }
    
    if (filteredUsers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No users found for this filter.</td></tr>`;
        return;
    }

    filteredUsers.forEach(user => {
        const isCurrentUser = user.id === currentUser.uid;
        const reports = user.generalReports || [];
        let latestReportTitle = "terbaru"; // Default title
        if (reports.length > 0) {
            const sortedReports = [...reports].sort((a, b) => b.date.toMillis() - a.date.toMillis());
            latestReportTitle = sortedReports[0].title;
        }

        const newEmailSubject = `Arunami - ${latestReportTitle}`;
        const newBodyMessage = `Yth. Bapak/Ibu ${user.fullName || 'Investor'},\n\nKami informasikan bahwa kami telah mengirim laporan: ${latestReportTitle}.\nBapak/Ibu dapat mengakses laporan tersebut melalui website Arunami Investor Club.\n\nJika Bapak/Ibu memiliki pertanyaan, jangan ragu untuk menghubungi kami.\n\nHormat kami,\nArunami.`;

        const mailtoLink = `mailto:${user.email}?subject=${encodeURIComponent(newEmailSubject)}&body=${encodeURIComponent(newBodyMessage)}`;
        const whatsappLink = formatWhatsAppLink(user.phone, newBodyMessage);

        const row = `
            <tr>
                <td data-label="Full Name" class="py-4 px-6 whitespace-nowrap">${user.fullName || 'N/A'}</td>
                <td data-label="Company Name" class="py-4 px-6 whitespace-nowrap">${user.role === 'business-owner' ? user.companyName || 'N/A' : 'N/A'}</td>
                <td data-label="Email" class="py-4 px-6 whitespace-nowrap">${user.email}</td>
                <td data-label="Phone" class="py-4 px-6 whitespace-nowrap">${user.phone || 'N/A'}</td>
                <td data-label="Role" class="py-4 px-6 whitespace-nowrap">${user.role}</td>
                <td class="py-4 px-6 whitespace-nowrap text-sm font-medium">
                     <div class="flex items-center justify-center space-x-2">
                        <a href="${mailtoLink}" target="_blank" class="p-2 text-gray-600 hover:text-blue-600" title="Send Email Notification">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        </a>
                        <a href="${whatsappLink}" target="_blank" class="p-2 text-gray-600 hover:text-green-600" title="Send WhatsApp Notification">
                             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="text-green-500"><path d="M16.75 13.96c.25.13.42.2.46.28.04.09.04.5-.02.95-.06.45-.33.85-.59.98-.26.13-.59.19-.89.13-.3-.06-1.98-.95-3.75-2.71-1.39-1.39-2.3-3.14-2.4-3.33-.1-.19-.52-1.09.1-2.04.57-.87.95-.95.95-.95.09,0,.23-.04.38.38.14.42.49,1.18.54,1.28.05.1.08.16.03.26-.05.1-.08.13-.16.23-.08.1-.16.19-.23.26-.08.08-.16.16-.16.23 0 .08.05.16.13.31.21.42.95,1.64,2.18,2.86,1.23,1.23,2.44,1.98,2.86,2.18.16.08.23.13.31.13.08,0,.16-.08.23-.16.08-.08.16-.16.26-.23.1-.08.13-.11.23-.16.1-.05.16-.03.26.03.1.05,1.28.49,1.28.54.1.05.16.08.16.16.03.11,0 .26-.11.38-.13.14-.31.23-.39.28zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path></svg>
                        </a>
                        <button data-user-id="${user.id}" data-user-name="${user.fullName}" class="view-user-portfolio-btn flex items-center text-gray-600 hover:text-blue-600 p-2 hidden" title="View User Portfolio">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        </button>
                        <button data-user-id="${user.id}" data-user-name="${user.fullName}" class="manage-reports-btn flex items-center text-gray-600 hover:text-green-600 p-2 hidden" title="Manage General Reports">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                        <button data-id="${user.id}" class="edit-user-btn flex items-center text-gray-600 hover:text-indigo-600 p-2" title="Edit User">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button data-id="${user.id}" data-name="${user.fullName}" class="delete-user-btn flex items-center text-gray-600 hover:text-red-600 p-2 disabled:opacity-50 disabled:cursor-not-allowed" ${isCurrentUser ? 'disabled' : ''} title="Delete User">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                     </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
    document.querySelectorAll('.view-user-portfolio-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const { userId, userName } = e.currentTarget.dataset;
        openUserPortfolioModal(userId, userName);
    }));
    document.querySelectorAll('.manage-reports-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const { userId, userName } = e.currentTarget.dataset;
        openManageReportsModal(userId, userName);
    }));
    document.querySelectorAll('.edit-user-btn').forEach(btn => btn.addEventListener('click', (e) => openUserModal(e.currentTarget.dataset.id)));
    document.querySelectorAll('.delete-user-btn').forEach(btn => btn.addEventListener('click', (e) => deleteUser(e.currentTarget.dataset.id, e.currentTarget.dataset.name)));
}

function renderInvestmentReportTable() {
    const { interested = [], contacted = [] } = reportData;

    const interestedBody = document.getElementById('interested-table-body');
    const contactedBody = document.getElementById('contacted-table-body');
    
    interestedBody.innerHTML = '';
    contactedBody.innerHTML = '';

    // Render Interested Table
    if (interested.length === 0) {
        interestedBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No investors have expressed interest yet.</td></tr>';
    } else {
        interested.forEach(item => {
            const row = `
                <tr>
                    <td data-label="Project" class="py-4 px-6 whitespace-nowrap">${item.projectName}</td>
                    <td data-label="Investor" class="py-4 px-6 whitespace-nowrap">${item.prospectName}</td>
                    <td data-label="Email" class="py-4 px-6 whitespace-nowrap"><a href="mailto:${item.prospectEmail}" class="text-blue-600 hover:underline">${item.prospectEmail}</a></td>
                    <td data-label="Phone" class="py-4 px-6 whitespace-nowrap"><a href="${formatWhatsAppLink(item.prospectPhone)}" target="_blank" class="text-blue-600 hover:underline">${item.prospectPhone}</a></td>
                    <td data-label="Date Interested" class="py-4 px-6 whitespace-nowrap">${formatDetailedTimestamp(item.interestedAt)}</td>
                    <td data-label="Contacted" class="py-4 px-6 text-center">
                        <input type="checkbox" class="contacted-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                               data-project-id="${item.projectId}" data-prospect-id="${item.prospectId}">
                    </td>
                    <td data-label="Actions" class="py-4 px-6 text-center">
                        <button data-project-id="${item.projectId}" data-prospect-id="${item.prospectId}" data-project-name="${item.projectName}" data-prospect-name="${item.prospectName}" class="delete-interest-btn p-1 text-red-600 hover:text-red-900" title="Delete Interest">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
            interestedBody.innerHTML += row;
        });
    }

    // Render Contacted Table
    if (contacted.length === 0) {
        contactedBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No investors have been contacted.</td></tr>';
    } else {
        contacted.forEach(item => {
            const row = `
                <tr class="bg-green-50">
                    <td data-label="Project" class="py-4 px-6 whitespace-nowrap">${item.projectName}</td>
                    <td data-label="Investor" class="py-4 px-6 whitespace-nowrap">${item.prospectName}</td>
                    <td data-label="Email" class="py-4 px-6 whitespace-nowrap"><a href="mailto:${item.prospectEmail}" class="text-blue-600 hover:underline">${item.prospectEmail}</a></td>
                    <td data-label="Phone" class="py-4 px-6 whitespace-nowrap"><a href="${formatWhatsAppLink(item.prospectPhone)}" target="_blank" class="text-blue-600 hover:underline">${item.prospectPhone}</a></td>
                    <td data-label="Date Contacted" class="py-4 px-6 whitespace-nowrap">${formatDetailedTimestamp(item.contactedAt)}</td>
                    <td data-label="Actions" class="py-4 px-6 text-center">
                        <button data-project-id="${item.projectId}" data-prospect-id="${item.prospectId}" data-project-name="${item.projectName}" data-prospect-name="${item.prospectName}" class="delete-interest-btn p-1 text-red-600 hover:text-red-900" title="Delete Record">
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
            contactedBody.innerHTML += row;
        });
    }

    // Attach Event Listeners
    document.querySelectorAll('.contacted-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const { projectId, prospectId } = e.target.dataset;
            handleMarkAsContacted(projectId, prospectId, e.target.checked);
        });
    });

    document.querySelectorAll('.delete-interest-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const { projectId, prospectId, prospectName, projectName } = e.currentTarget.dataset;
            handleDeleteInterest(projectId, prospectId, prospectName, projectName);
        });
    });
}

function listenToAdminProjects() {
  let projectsQuery;

  if (currentUserData.role === 'analyst') {
    // Analyst: only fetch projects assigned to them
    projectsQuery = query(collection(db, "projects"), where("assignedAnalystId", "==", currentUser.uid));
  } else {
    // Admin: fetch all projects
    projectsQuery = query(collection(db, "projects"));
  }

  onSnapshot(projectsQuery, (snapshot) => {
    allAdminProjects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    renderAdminProjectsTable();
  });
}

function listenToUsers() {
  const usersCollection = collection(db, "users");
  onSnapshot(usersCollection, (snapshot) => {
    allUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
    // --- THE FIX: Check which page is active and refresh it ---

    // 1. Refresh the Admin's main user list if it's visible
    if (document.getElementById('admin-users-section').style.display === 'block') {
        const currentFilter = document.getElementById("user-role-filter").value;
        renderAdminUsersTable(currentFilter);
    }
    
    // 2. Refresh the Admin's business data view if it's visible
    if (document.getElementById('admin-business-data-section').style.display === 'block') {
        renderAdminBusinessData();
    }

    // 3. Refresh the Analyst's business data view if it's visible
    if (document.getElementById('analyst-business-data-section').style.display === 'block') {
        renderAnalystBusinessData();
    }
    // -----------------------------------------------------------
  });
}

async function listenToAllInvestments() {
  const projectsQuery = query(collection(db, "projects"));

  onSnapshot(projectsQuery, async (projectsSnapshot) => {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersMap = new Map(
      usersSnapshot.docs.map((doc) => [doc.id, doc.data()])
    );

    let allInterested = [];
    let allContacted = [];

    projectsSnapshot.forEach((projectDoc) => {
      const project = projectDoc.data();
      const projectId = projectDoc.id;

      if (project.prospects) {
        Object.entries(project.prospects).forEach(([userId, prospectData]) => {
          const user = usersMap.get(userId);
          if (user) {
            const prospectEntry = {
              projectId: projectId,
              prospectId: userId,
              projectName: project.title,
              prospectName: user.fullName,
              prospectEmail: user.email,
              prospectPhone: user.phone || "N/A",
              interestedAt: prospectData.interestedAt,
              contactedAt: prospectData.contactedAt,
            };
            
            if (prospectData.contacted) {
                allContacted.push(prospectEntry);
            } else {
                allInterested.push(prospectEntry);
            }
          }
        });
      }
    });

    // Store the processed data in the global variable for rendering
    reportData = { interested: allInterested, contacted: allContacted };
    
    // Re-render the tables with the new data
    renderInvestmentReportTable();
  });
}

const projectModal = document.getElementById("project-modal");
const projectForm = document.getElementById("project-form");
document
  .getElementById("show-create-project-modal-btn")
  .addEventListener("click", () => openProjectModal());

 document.getElementById("cancel-project-form").addEventListener("click", () => {
    const projectModal = document.getElementById("project-modal");
    projectModal.style.display = "none";

    // If we were in the resubmit flow, show the feedback modal again
    if (isResubmitFlowActive) {
        document.getElementById('business-owner-update-modal').style.display = 'flex';
        isResubmitFlowActive = false; // Reset the flag
    }
});

document.getElementById("cancel-progress-form").addEventListener("click", () => {
    progressModal.style.display = "none";
});

async function openProjectModal(projectId = null) {
  projectForm.reset();
  document.getElementById("project-id").value = "";
  
  const allFormControls = projectForm.querySelectorAll('input, textarea, select');
  const saveButton = projectForm.querySelector('button[type="submit"]');
  const cancelButton = document.getElementById('cancel-project-form');

  allFormControls.forEach(control => control.disabled = false);
  saveButton.textContent = 'Save Project';
  saveButton.style.display = 'inline-flex';
  cancelButton.style.display = 'inline-flex';

  const imagePreview = document.getElementById("project-image-preview");
  imagePreview.src = "https://placehold.co/100x100/e2e8f0/4a5568?text=Preview";
  
  // Clear old PDF link containers if they exist from a previous version
  document.getElementById('company-profile-link-container')?.remove();
  document.getElementById('legal-doc-link-container')?.remove();
  document.getElementById('financial-doc-link-container')?.remove();

  const adminOnlyFields = document.getElementById('admin-only-project-fields');
  adminOnlyFields.style.display = (currentUserData.role === 'admin') ? 'block' : 'none';
  adminOnlyFields.querySelectorAll('input').forEach(input => input.required = (currentUserData.role === 'admin'));

  if (projectId) {
    const projectDoc = await getDoc(doc(db, "projects", projectId));
    if (projectDoc.exists()) {
      const data = projectDoc.data();
      document.getElementById("project-modal-title").textContent = (currentUserData.role === 'analyst') ? `Viewing Details for: ${data.title}` : `Edit Project`;
      
      document.getElementById("project-id").value = projectId;
      document.getElementById("project-title").value = data.title;
      document.getElementById("project-photo-url").value = data.photoURL || '';
      imagePreview.src = data.photoURL || "https://placehold.co/100x100/e2e8f0/4a5568?text=Preview";
      document.getElementById("project-summary").value = data.summary;
      document.getElementById("project-description").value = data.description;
      document.getElementById('project-investment-ask').value = data.investmentAsk ? data.investmentAsk.toLocaleString("id-ID") : '';

      // Populate new folder URL fields
      document.getElementById('project-legal-folder').value = data.legalFolderURL || '';
      document.getElementById('project-business-folder').value = data.businessFolderURL || '';
      document.getElementById('project-finance-folder').value = data.financeFolderURL || '';
      document.getElementById('project-other-folder').value = data.otherFolderURL || '';
      
      if (data.dueDate) {
          document.getElementById('project-due-date').value = data.dueDate.toDate().toISOString().split("T")[0];
      }
      if (data.totalSlots) {
          document.getElementById('project-total-slots').value = data.totalSlots;
      }
      if (data.slotPrice) {
          document.getElementById('project-slot-price').value = data.slotPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      }

      if (currentUserData.role === 'analyst') {
        allFormControls.forEach(control => control.disabled = true);
        saveButton.textContent = 'Close';
        cancelButton.style.display = 'none';
      }
    }
  } else {
    document.getElementById("project-modal-title").textContent = "Create Project";
  }
  projectModal.style.display = "flex";
}

projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const imageUploadInput = document.getElementById('project-photo-upload');
    let projectId = document.getElementById('project-id').value;
    
    if (imageUploadInput.files[0]) {
        showUploadProgressModal();
    } else {
        loadingSpinner.style.display = 'flex';
    }

    try {
        const projectData = {
            title: document.getElementById('project-title').value,
            summary: document.getElementById('project-summary').value,
            description: document.getElementById('project-description').value,
            investmentAsk: parseInt(document.getElementById('project-investment-ask').value.replace(/\./g, ''), 10),
            legalFolderURL: document.getElementById('project-legal-folder').value,
            businessFolderURL: document.getElementById('project-business-folder').value,
            financeFolderURL: document.getElementById('project-finance-folder').value,
            otherFolderURL: document.getElementById('project-other-folder').value,
        };

        let projectRef;
        if (projectId) {
            projectRef = doc(db, "projects", projectId);
        } else {
            if (currentUserData.role === 'business-owner') {
                projectData.ownerId = currentUser.uid;
                projectData.ownerName = currentUserData.fullName;
                projectData.companyName = currentUserData.companyName || 'N/A';
                projectData.status = 'Under Review';
                projectData.statusHistory = [{
                    status: 'Under Review',
                    comments: 'Project proposed by Business Owner.',
                    timestamp: Timestamp.now(),
                    author: 'Business Owner'
                }];
                projectData.isVisible = false;
                projectData.isFulfilled = false;
                projectData.isFailed = false;
                projectData.isExpired = false;
                projectData.totalSlots = 0; 
                projectData.slotPrice = 0;
                projectData.dueDate = Timestamp.now(); 
            } else if (currentUserData.role === 'admin') {
                projectData.status = 'Approved';
                projectData.dueDate = Timestamp.fromDate(new Date(document.getElementById('project-due-date').value));
                projectData.totalSlots = parseInt(document.getElementById('project-total-slots').value, 10);
                projectData.slotPrice = parseInt(document.getElementById('project-slot-price').value.replace(/\./g, ''), 10);
                projectData.investors = {};
                projectData.investorStatus = {};
                projectData.prospects = {};
                projectData.progressUpdates = [];
                projectData.isFulfilled = false;
                projectData.isVisible = true;
            }
            
            updateUploadStatus('Creating project record...');
            projectRef = await addDoc(collection(db, "projects"), projectData);
            projectId = projectRef.id;
        }

        const urlsToUpdate = {};
        if (imageUploadInput.files[0]) {
            updateUploadStatus('Uploading project image...');
            const fullPath = `project_images/${projectId}/${Date.now()}_${imageUploadInput.files[0].name}`;
            urlsToUpdate.photoURL = await uploadFileWithProgress(imageUploadInput.files[0], fullPath, updateProgressBar);
        }

        updateUploadStatus('Finalizing project details...');
        if (document.getElementById('project-id').value) { 
            Object.assign(urlsToUpdate, projectData);
            if (currentUserData.role === 'admin') {
                urlsToUpdate.dueDate = Timestamp.fromDate(new Date(document.getElementById('project-due-date').value));
                urlsToUpdate.totalSlots = parseInt(document.getElementById('project-total-slots').value, 10);
                urlsToUpdate.slotPrice = parseInt(document.getElementById('project-slot-price').value.replace(/\./g, ''), 10);
            }
        }
        
        await updateDoc(projectRef, urlsToUpdate);
        
        if (document.getElementById('project-id').value) {
             showMessage("Project updated successfully.");
        } else {
             showMessage("Project proposed successfully. It is now under review by an admin.");
        }
        
        projectModal.style.display = 'none';

        // If we were in the resubmit flow, show the feedback modal again
        if (isResubmitFlowActive) {
            document.getElementById('business-owner-update-modal').style.display = 'flex';
            isResubmitFlowActive = false; // Reset the flag
        }

    } catch (error) {
        console.error("Error saving project:", error);
        if (!imageUploadInput.files[0]) { 
             showMessage("An error occurred while saving the project.");
        }
    } finally {
        if (imageUploadInput.files[0]) {
            hideUploadProgressModal();
        } else {
            loadingSpinner.style.display = 'none';
        }
    }
});

projectModal.addEventListener("change", (e) => {
  if (e.target.id === "project-photo-upload") {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById("project-image-preview").src =
          event.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
});

document.getElementById("project-slot-price").addEventListener("input", (e) => {
  let value = e.target.value.replace(/\./g, "");
  if (isNaN(value) || value === "") {
    e.target.value = "";
  } else {
    e.target.value = parseInt(value, 10).toLocaleString("id-ID");
  }
});

document.getElementById("project-investment-ask").addEventListener("input", (e) => {
  let value = e.target.value.replace(/\./g, "");
  if (isNaN(value) || value === "") {
    e.target.value = "";
  } else {
    e.target.value = parseInt(value, 10).toLocaleString("id-ID");
  }
});

async function deleteProject(projectId, projectTitle) {
  if (
    window.confirm(
      `Are you sure you want to delete the project "${projectTitle}"? This action cannot be undone.`
    )
  ) {
    loadingSpinner.style.display = "flex";
    try {
      await deleteDoc(doc(db, "projects", projectId));
      await logAdminAction(
        `Deleted project: "${projectTitle}" (ID: ${projectId})`
      );
      showMessage("Project deleted successfully.");
    } catch (error) {
      console.error("Error deleting project:", error);
      showMessage("Failed to delete project.");
    } finally {
      loadingSpinner.style.display = "none";
    }
  }
}

async function openProgressModal(projectId) {
    const progressForm = document.getElementById('progress-form');
    progressForm.reset();
    document.getElementById('progress-update-index').value = '';
    document.getElementById('progress-project-id').value = projectId;
    document.getElementById('progress-form-title').textContent = 'Add New Update';
    document.getElementById('progress-form-submit-btn').textContent = 'Add Update';
    
    const userSelect = document.getElementById('progress-user-select');
    userSelect.innerHTML = '<option value="all">All Investors in this Project</option>'; // Default option

    const updatesContainer = document.getElementById('previous-updates-list');
    updatesContainer.innerHTML = 'Loading...';

    const projectRef = doc(db, "projects", projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
        updatesContainer.innerHTML = '<p class="text-red-500">Error: Project not found.</p>';
        return;
    }

    const project = projectDoc.data();
    
    // --- START: New logic to populate user dropdown ---
    const investorIds = Object.keys(project.investors || {});
    if (investorIds.length > 0) {
        // Find all users who are investors in this project
        const userDocs = await getDocs(query(collection(db, "users"), where(documentId(), 'in', investorIds)));
        userDocs.forEach(userDoc => {
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const option = document.createElement('option');
                option.value = userDoc.id;
                option.textContent = `${userData.fullName} (${userData.email})`;
                userSelect.appendChild(option);
            }
        });
    }
    // --- END: New logic ---

    if (project.progressUpdates && project.progressUpdates.length > 0) {
        const sortedUpdates = [...project.progressUpdates].sort((a, b) => b.date.toMillis() - a.date.toMillis());

        updatesContainer.innerHTML = sortedUpdates.map((update, index) => {
            const originalIndex = project.progressUpdates.findIndex(orig => orig.date.isEqual(update.date));
            // Find the name of the user this update is visible to, if applicable
            const targetUser = allUsers.find(u => u.id === update.visibleTo);
            const visibilityText = update.visibleTo === 'all' ? 'All Investors' : (targetUser ? targetUser.fullName : 'Specific User');

            return `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="font-semibold">${update.title}</p>
                        <p class="text-xs text-gray-500">Visible to: <span class="font-medium">${visibilityText}</span></p>
                        <p class="text-sm text-gray-500">Sent: ${update.date.toDate().toLocaleDateString()}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button data-pdf-url="${update.pdfURL}" data-pdf-title="${update.title}" class="view-update-pdf-btn p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="See Report">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button data-project-id="${projectId}" data-update-index="${originalIndex}" class="edit-progress-update-btn p-2 text-indigo-600 hover:bg-indigo-100 rounded-full" title="Edit Update">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button data-project-id="${projectId}" data-update-index="${originalIndex}" data-update-title="${update.title}" class="delete-progress-update-btn p-2 text-red-600 hover:bg-red-100 rounded-full" title="Delete Update">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.view-update-pdf-btn').forEach(btn => btn.addEventListener('click', (e) => openPdfViewerModal(e.currentTarget.dataset.pdfUrl, e.currentTarget.dataset.pdfTitle)));
        document.querySelectorAll('.edit-progress-update-btn').forEach(btn => btn.addEventListener('click', (e) => populateProgressFormForEdit(e.currentTarget.dataset.projectId, parseInt(e.currentTarget.dataset.updateIndex, 10))));
        document.querySelectorAll('.delete-progress-update-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteProgressUpdate(e.currentTarget.dataset.projectId, parseInt(e.currentTarget.dataset.updateIndex, 10), e.currentTarget.dataset.updateTitle)));

    } else {
        updatesContainer.innerHTML = '<p class="text-center text-gray-500">No previous updates for this project.</p>';
    }
    
    progressModal.style.display = 'flex';
}

async function populateProgressFormForEdit(projectId, updateIndex) {
  const projectRef = doc(db, "projects", projectId);
  const projectDoc = await getDoc(projectRef);

  if (projectDoc.exists()) {
    const project = projectDoc.data();
    const updateData = project.progressUpdates[updateIndex];

    if (updateData) {
      document.getElementById("progress-title").value = updateData.title;
      document.getElementById("progress-pdf-url").value = updateData.pdfURL;
      document.getElementById("progress-update-index").value = updateIndex;
      document.getElementById("progress-form-title").textContent =
        "Edit Update";
      document.getElementById("progress-form-submit-btn").textContent =
        "Save Changes";
      document
        .getElementById("progress-form")
        .scrollIntoView({ behavior: "smooth" });
    }
  }
}

async function handleDeleteProgressUpdate(projectId, updateIndex, updateTitle) {
  if (
    !window.confirm(
      `Are you sure you want to delete the progress update: "${updateTitle}"?`
    )
  )
    return;

  loadingSpinner.style.display = "flex";
  const projectRef = doc(db, "projects", projectId);
  try {
    const projectDoc = await getDoc(projectRef);
    if (projectDoc.exists()) {
      const currentUpdates = projectDoc.data().progressUpdates || [];
      currentUpdates.splice(updateIndex, 1);
      await updateDoc(projectRef, { progressUpdates: currentUpdates });
      const projectTitle = projectDoc.data().title;
      await logAdminAction(
        `Deleted progress update "${updateTitle}" from project "${projectTitle}"`
      );
      showMessage("Update deleted successfully.");
      openProgressModal(projectId);
    }
  } catch (error) {
    console.error("Error deleting progress update:", error);
    showMessage("Failed to delete update.");
  } finally {
    loadingSpinner.style.display = "none";
  }
}

async function handleDeleteProspect(
  projectId,
  prospectId,
  projectName,
  prospectName
) {
  if (
    !window.confirm(
      `Are you sure you want to delete the prospect "${prospectName}" from the project "${projectName}"? This action cannot be undone.`
    )
  ) {
    return;
  }

  loadingSpinner.style.display = "flex";
  const projectRef = doc(db, "projects", projectId);
  const fieldToDelete = `prospects.${prospectId}`;

  try {
    await updateDoc(projectRef, {
      [fieldToDelete]: deleteField(),
    });
    await logAdminAction(
      `Deleted prospect "${prospectName}" from project "${projectName}"`
    );
    showMessage("Prospect deleted successfully.");
    // The table will refresh automatically because of the real-time listener.
  } catch (error) {
    console.error("Error deleting prospect:", error);
    showMessage("Failed to delete prospect: " + error.message);
  } finally {
    loadingSpinner.style.display = "none";
  }
}

document.getElementById('progress-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectId = document.getElementById('progress-project-id').value;
    const updateIndex = document.getElementById('progress-update-index').value;
    const title = document.getElementById('progress-title').value;
    const pdfURL = document.getElementById('progress-pdf-url').value;
    const visibleTo = document.getElementById('progress-user-select').value; // Get value from dropdown
    
    if (!title || !pdfURL) return;

    loadingSpinner.style.display = 'flex';
    const projectDocRef = doc(db, "projects", projectId);

    try {
        const projectDoc = await getDoc(projectDocRef);
        if (projectDoc.exists()) {
            const projectData = projectDoc.data();
            const updates = projectData.progressUpdates || [];
            const projectTitle = projectData.title;

            if (updateIndex !== '') {
                // Logic for editing an existing update
                const indexToUpdate = parseInt(updateIndex, 10);
                const originalTitle = updates[indexToUpdate].title;
                updates[indexToUpdate] = { ...updates[indexToUpdate], title: title, pdfURL: pdfURL, visibleTo: visibleTo };
                await logAdminAction(`Edited progress update "${originalTitle}" to "${title}" on project "${projectTitle}"`);
                showMessage("Progress update modified successfully.");
            } else {
                // Logic for adding a new update
                updates.push({ title: title, pdfURL: pdfURL, date: Timestamp.now(), visibleTo: visibleTo });
                await logAdminAction(`Added progress update "${title}" to project "${projectTitle}"`);
                showMessage("Progress update added.");
            }
            
            await updateDoc(projectDocRef, { progressUpdates: updates });
            openProgressModal(projectId); // Refresh the modal
        }
    } catch (error) {
        console.error("Error saving progress update:", error);
        showMessage("Failed to save progress update.");
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

const userModal = document.getElementById("user-modal");
const userForm = document.getElementById("user-form");
document.getElementById("show-add-user-modal-btn").addEventListener("click", () => {
    document.getElementById('role-selection-modal').style.display = 'flex';
});
// --- NEW ROLE SELECTION MODAL LOGIC ---
const roleSelectionModal = document.getElementById('role-selection-modal');
document.getElementById('close-role-selection-modal').addEventListener('click', () => {
    roleSelectionModal.style.display = 'none';
});
document.getElementById('add-investor-btn').addEventListener('click', () => {
    roleSelectionModal.style.display = 'none';
    openUserModal(null, 'investor');
});
document.getElementById('add-business-owner-btn').addEventListener('click', () => {
    roleSelectionModal.style.display = 'none';
    openUserModal(null, 'business-owner');
});
document.getElementById('add-admin-btn').addEventListener('click', () => {
    roleSelectionModal.style.display = 'none';
    openUserModal(null, 'admin');
});
document.getElementById('add-analyst-btn').addEventListener('click', () => {
    roleSelectionModal.style.display = 'none';
    openUserModal(null, 'analyst');
});
document
  .getElementById("cancel-user-form")
  .addEventListener("click", () => (userModal.style.display = "none"));

async function openUserModal(userId = null, role = null) {
  userForm.reset();
  document.getElementById("user-id").value = "";
  document.getElementById("user-creation-role").value = "";

  const emailInput = document.getElementById("user-email");
  const passwordContainer = document.getElementById("password-field-container");
  const passwordInput = document.getElementById("user-password");
  const roleContainer = document.getElementById("role-field-container");
  const investorFields = document.getElementById("investor-fields");
  const businessOwnerFields = document.getElementById("business-owner-fields");

  // Hide all role-specific sections by default
  investorFields.style.display = 'none';
  businessOwnerFields.style.display = 'none';

  if (userId) { // --- EDITING A USER ---
    document.getElementById("user-modal-title").textContent = "Edit User";
    roleContainer.style.display = 'block';
    passwordContainer.style.display = 'none';
    passwordInput.required = false;
    emailInput.disabled = true;

    const userToEdit = allUsers.find((u) => u.id === userId);
    if (userToEdit) {
      document.getElementById("user-id").value = userToEdit.id;
      document.getElementById("user-fullname").value = userToEdit.fullName || "";
      document.getElementById("user-phone").value = userToEdit.phone || "";
      emailInput.value = userToEdit.email;
      document.getElementById("user-role").value = userToEdit.role;
      
      // Show specific fields based on the user's role
      if (userToEdit.role === 'investor') {
        investorFields.style.display = 'block';
        document.getElementById("user-investor-type").value = userToEdit.investorType || "Personal";
      } else if (userToEdit.role === 'business-owner') {
        businessOwnerFields.style.display = 'block';
        document.getElementById("user-company-name").value = userToEdit.companyName || "";
      }
    }
  } else if (role) { // --- CREATING A NEW USER ---
    document.getElementById("user-modal-title").textContent = `Add New ${role.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}`;
    document.getElementById("user-creation-role").value = role;

    roleContainer.style.display = 'none';
    passwordContainer.style.display = 'block';
    passwordInput.required = true;
    emailInput.disabled = false;
    
    // Show the form section for the selected role
    if (role === 'investor') {
        investorFields.style.display = 'block';
    } else if (role === 'business-owner') {
        businessOwnerFields.style.display = 'block';
    }
  }
  userModal.style.display = "flex";
}

userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = document.getElementById("user-id").value;
  const errorDiv = document.getElementById("user-error");
  errorDiv.classList.add("hidden");

  loadingSpinner.style.display = "flex";

  // --- LOGIC FOR EDITING A USER ---
  if (userId) {
    const dataToUpdate = {
      fullName: document.getElementById("user-fullname").value,
      phone: document.getElementById("user-phone").value,
      role: document.getElementById("user-role").value,
    };
    // Add role-specific fields to the update
    if (dataToUpdate.role === 'investor') {
        dataToUpdate.investorType = document.getElementById("user-investor-type").value;
    } else if (dataToUpdate.role === 'business-owner') {
        dataToUpdate.companyName = document.getElementById("user-company-name").value;
    }

    try {
      await updateDoc(doc(db, "users", userId), dataToUpdate);
      await logAdminAction(`Edited user: ${dataToUpdate.fullName} (ID: ${userId})`);
      showMessage("User updated successfully.");
      userModal.style.display = "none";
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove("hidden");
    } finally {
      loadingSpinner.style.display = "none";
    }
  } 
  // --- LOGIC FOR CREATING A NEW USER ---
  else { 
    const email = document.getElementById("user-email").value;
    const password = document.getElementById("user-password").value;
    const fullName = document.getElementById("user-fullname").value;
    const phone = document.getElementById("user-phone").value;
    const role = document.getElementById("user-creation-role").value;

    const userData = {
        email: email,
        fullName: fullName,
        phone: phone,
        profilePictureURL: "",
        generalReports: [],
        role: role,
        createdAt: Timestamp.now(),
        hasChangedPassword: false,
    };
    // Add role-specific fields to the new user data
    if (role === 'investor') {
        userData.investorType = document.getElementById("user-investor-type").value;
    } else if (role === 'business-owner') {
        userData.companyName = document.getElementById("user-company-name").value;
    }

    try {
      const tempApp = initializeApp(firebaseConfig, "tempAppForUserCreation" + Date.now());
      const tempAuth = getAuth(tempApp);
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      
      await setDoc(doc(db, "users", userCredential.user.uid), userData);

      await logAdminAction(`Created new ${role}: ${fullName} (${email})`);
      showMessage(`User ${email} created successfully.`);
      userModal.style.display = "none";
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove("hidden");
    } finally {
      loadingSpinner.style.display = "none";
    }
  }
});

async function deleteUser(userId, userName) {
  if (
    window.confirm(
      `Are you sure you want to delete user "${userName}"? This will not delete their Firebase Auth account, only their data in Firestore.`
    )
  ) {
    loadingSpinner.style.display = "flex";
    try {
      await deleteDoc(doc(db, "users", userId));
      await logAdminAction(
        `Deleted user data from Firestore for: "${userName}" (ID: ${userId})`
      );
      showMessage("User data deleted from Firestore.");
    } catch (error) {
      console.error("Error deleting user:", error);
      showMessage("Failed to delete user data.");
    } finally {
      loadingSpinner.style.display = "none";
    }
  }
}

async function handleContactedCheckboxChange(e) {
  const checkbox = e.target;
  const { projectId, userId, projectName, userName } = checkbox.dataset;
  const isChecked = checkbox.checked;

  const projectRef = doc(db, "projects", projectId);
  try {
    const statusUpdate = {
      [`investorStatus.${userId}.contacted`]: isChecked,
    };
    if (isChecked) {
      statusUpdate[`investorStatus.${userId}.contactedAt`] = Timestamp.now();
    }

    await updateDoc(projectRef, statusUpdate);
    await logAdminAction(
      `Set 'contacted' to ${isChecked} for investor "${userName}" on project "${projectName}"`
    );
  } catch (error) {
    console.error("Error updating contacted status:", error);
    showMessage("Failed to update status. Please try again.");
    checkbox.checked = !isChecked;
  }
}

async function handlePaymentVerifiedCheckboxChange(e) {
  const checkbox = e.target;
  const { projectId, userId, projectName, userName } = checkbox.dataset;
  const isChecked = checkbox.checked;

  const projectRef = doc(db, "projects", projectId);
  try {
    const fieldToUpdate = `investorStatus.${userId}.paymentVerified`;
    await updateDoc(projectRef, {
      [fieldToUpdate]: isChecked,
    });
    await logAdminAction(
      `Set 'payment verified' to ${isChecked} for investor "${userName}" on project "${projectName}"`
    );
  } catch (error) {
    console.error("Error updating payment status:", error);
    showMessage("Failed to update status. Please try again.");
    checkbox.checked = !isChecked;
  }
}

const ndaModal = document.getElementById("nda-modal");
const ndaCheckbox = document.getElementById("nda-checkbox");
const proceedNdaBtn = document.getElementById("proceed-nda");

function showNdaModal(projectId) {
  ndaCheckbox.checked = false;
  proceedNdaBtn.disabled = true;
  proceedNdaBtn.dataset.id = projectId;
  ndaModal.style.display = "flex";
}

document.getElementById("cancel-nda").addEventListener("click", () => {
  ndaModal.style.display = "none";
});

ndaCheckbox.addEventListener("change", () => {
  proceedNdaBtn.disabled = !ndaCheckbox.checked;
});

proceedNdaBtn.addEventListener("click", async (e) => {
  const projectId = e.target.dataset.id;
  const projectRef = doc(db, "projects", projectId);

  try {
    const fieldToUpdate = `prospects.${currentUser.uid}`;
    await updateDoc(projectRef, {
      [fieldToUpdate]: {
        requestedAt: Timestamp.now(),
      },
    });
    ndaModal.style.display = "none";
    viewProjectDetails(projectId);
  } catch (error) {
    console.error("Error updating prospect status:", error);
    showMessage("Failed to record your request. Please try again.");
  }
});

const investmentDetailsModal = document.getElementById(
  "investment-details-modal"
);
const editInvestmentModal = document.getElementById("edit-investment-modal");

document
  .getElementById("cancel-investment-details-modal")
  .addEventListener("click", () => {
    investmentDetailsModal.style.display = "none";
  });

document
  .getElementById("cancel-edit-investment-modal")
  .addEventListener("click", () => {
    editInvestmentModal.style.display = "none";
  });

async function openInvestmentDetailsModal(projectId) {
  investmentDetailsModal.style.display = "flex";
  document.getElementById("manual-investment-project-id").value = projectId;

  const bookedListContainer = document.getElementById(
    "investor-list-container"
  );
  const verifiedListContainer = document.getElementById(
    "verified-investor-list-container"
  );
  bookedListContainer.innerHTML =
    '<div class="text-center text-gray-500">Loading...</div>';
  verifiedListContainer.innerHTML =
    '<div class="text-center text-gray-500">Loading...</div>';

  const projectRef = doc(db, "projects", projectId);
  const projectDoc = await getDoc(projectRef);

  if (!projectDoc.exists()) {
    showMessage("Error: Could not find project data.");
    investmentDetailsModal.style.display = "none";
    return;
  }
  const project = projectDoc.data();

  document.getElementById(
    "investment-details-modal-title"
  ).textContent = `Investors for: ${project.title}`;

  const investors = project.investors || {};
  const investorStatus = project.investorStatus || {};
  const investorIds = Object.keys(investors);

  if (investorIds.length === 0) {
    bookedListContainer.innerHTML =
      '<div class="text-center text-gray-500">No investors have booked a slot.</div>';
    verifiedListContainer.innerHTML =
      '<div class="text-center text-gray-500">No verified investors.</div>';
  } else {
    const investorDetails = await Promise.all(
      investorIds.map(async (id) => {
        const userDoc = await getDoc(doc(db, "users", id));
        return userDoc.exists()
          ? {
              id: userDoc.id,
              ...userDoc.data(),
              isVerified: investorStatus[id]?.paymentVerified === true,
            }
          : null;
      })
    );

    const bookedInvestors = investorDetails.filter(
      (user) => user && !user.isVerified
    );
    const verifiedInvestors = investorDetails.filter(
      (user) => user && user.isVerified
    );

    if (bookedInvestors.length > 0) {
      bookedListContainer.innerHTML = bookedInvestors
        .map((user) => {
          const slots = investors[user.id];
          const amount = slots * project.slotPrice;
          return `
                            <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                <div>
                                    <p class="font-semibold">${
                                      user.fullName
                                    }</p>
                                    <p class="text-sm text-gray-500">${
                                      user.email
                                    }</p>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <div class="text-right">
                                        <p class="font-semibold">${slots} Slot(s)</p>
                                        <p class="text-sm text-green-600">${formatRupiah(
                                          amount
                                        )}</p>
                                    </div>
                                    <div class="flex flex-col">
                                        <button data-project-id="${projectId}" data-user-id="${
            user.id
          }" data-user-name="${
            user.fullName
          }" data-slots="${slots}" class="edit-investment-btn p-1 text-indigo-600 hover:text-indigo-900" title="Edit Investment">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                        </button>
                                        <button data-project-id="${projectId}" data-user-id="${
            user.id
          }" data-user-name="${user.fullName}" data-project-name="${
            project.title
          }" class="delete-investment-btn p-1 text-red-600 hover:text-red-900" title="Delete Investment">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
        })
        .join("");
    } else {
      bookedListContainer.innerHTML =
        '<div class="text-center text-gray-500">No investors awaiting verification.</div>';
    }

    if (verifiedInvestors.length > 0) {
      verifiedListContainer.innerHTML = verifiedInvestors
        .map((user) => {
          const slots = investors[user.id];
          const amount = slots * project.slotPrice;
          return `
                            <div class="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                                <div>
                                    <p class="font-semibold">${
                                      user.fullName
                                    }</p>
                                    <p class="text-sm text-gray-500">${
                                      user.email
                                    }</p>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <div class="text-right">
                                        <p class="font-semibold">${slots} Slot(s)</p>
                                        <p class="text-sm text-green-600">${formatRupiah(
                                          amount
                                        )}</p>
                                    </div>
                                    <button data-project-id="${projectId}" data-user-id="${
            user.id
          }" data-user-name="${
            user.fullName
          }" data-slots="${slots}" class="edit-investment-btn p-1 text-indigo-600 hover:text-indigo-900" title="Edit Investment">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>
                                </div>
                            </div>
                        `;
        })
        .join("");
    } else {
      verifiedListContainer.innerHTML =
        '<div class="text-center text-gray-500">No verified investors for this project.</div>';
    }

    document
      .querySelectorAll(
        "#investor-list-container .edit-investment-btn, #verified-investor-list-container .edit-investment-btn"
      )
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const { projectId, userId, userName, slots } =
            e.currentTarget.dataset;
          openEditInvestmentModal(projectId, userId, userName, slots);
        });
      });

    document.querySelectorAll(".delete-investment-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const { projectId, userId, userName, projectName } =
          e.currentTarget.dataset;
        handleDeleteInvestment(projectId, userId, userName, projectName);
      });
    });
  }

  const manualInvestorSelect = document.getElementById(
    "manual-investor-select"
  );
  manualInvestorSelect.innerHTML = '<option value="">Select a user...</option>';
  allUsers.forEach((user) => {
    if (!investorIds.includes(user.id)) {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = `${user.fullName} (${user.email})`;
      manualInvestorSelect.appendChild(option);
    }
  });
}

function openEditInvestmentModal(projectId, userId, userName, currentSlots) {
  document.getElementById(
    "edit-investment-modal-title"
  ).textContent = `Edit Investment for ${userName}`;
  document.getElementById("edit-investment-project-id").value = projectId;
  document.getElementById("edit-investment-user-id").value = userId;
  document.getElementById("edit-slots-input").value = currentSlots;
  editInvestmentModal.style.display = "flex";
}

document
  .getElementById("edit-investment-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const projectId = document.getElementById(
      "edit-investment-project-id"
    ).value;
    const userId = document.getElementById("edit-investment-user-id").value;
    const newSlots = parseInt(
      document.getElementById("edit-slots-input").value,
      10
    );

    if (!newSlots || newSlots <= 0) {
      showMessage(
        "Please enter a valid number of slots (must be greater than 0)."
      );
      return;
    }

    loadingSpinner.style.display = "flex";
    const projectDocRef = doc(db, "projects", projectId);
    const userPortfolioDocRef = doc(
      db,
      "users",
      userId,
      "portfolio",
      projectId
    );

    try {
      await runTransaction(db, async (transaction) => {
        const projectDoc = await transaction.get(projectDocRef);
        if (!projectDoc.exists()) throw "Project does not exist!";

        const projectData = projectDoc.data();
        const investorKey = `investors.${userId}`;
        const newAmount = newSlots * projectData.slotPrice;
        transaction.update(projectDocRef, { [investorKey]: newSlots });
        transaction.update(userPortfolioDocRef, {
          slots: newSlots,
          amount: newAmount,
        });
      });

      const projectTitle = allAdminProjects.find(
        (p) => p.id === projectId
      )?.title;
      const userName = allUsers.find((u) => u.id === userId)?.fullName;
      await logAdminAction(
        `Edited investment for "${userName}" on project "${projectTitle}" to ${newSlots} slots.`
      );
      showMessage("Investment updated successfully.");
      editInvestmentModal.style.display = "none";
      openInvestmentDetailsModal(projectId);
    } catch (error) {
      console.error("Error updating investment:", error);
      showMessage("Failed to update investment: " + error.message);
    } finally {
      loadingSpinner.style.display = "none";
    }
  });

async function handleDeleteInvestment(
  projectId,
  userId,
  userName,
  projectName
) {
  if (
    !window.confirm(
      `Are you sure you want to delete the investment record for "${userName}" on project "${projectName}"? This action cannot be undone.`
    )
  ) {
    return;
  }

  loadingSpinner.style.display = "flex";
  const projectDocRef = doc(db, "projects", projectId);
  const userPortfolioDocRef = doc(db, "users", userId, "portfolio", projectId);

  try {
    await runTransaction(db, async (transaction) => {
      const projectDoc = await transaction.get(projectDocRef);
      if (!projectDoc.exists()) throw "Project not found!";
      const projectData = projectDoc.data();
      delete projectData.investors[userId];
      transaction.update(projectDocRef, { investors: projectData.investors });
      transaction.delete(userPortfolioDocRef);
    });

    await logAdminAction(
      `Deleted investment for "${userName}" from project "${projectName}".`
    );
    showMessage("Investment record deleted successfully.");
    openInvestmentDetailsModal(projectId);
  } catch (error) {
    console.error("Error deleting investment:", error);
    showMessage("Failed to delete investment: " + error.message);
  } finally {
    loadingSpinner.style.display = "none";
  }
}

document
  .getElementById("manual-investment-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const projectId = document.getElementById(
      "manual-investment-project-id"
    ).value;
    const userId = document.getElementById("manual-investor-select").value;
    const slots = parseInt(
      document.getElementById("manual-slots-input").value,
      10
    );

    if (!projectId || !userId || !slots || slots <= 0) {
      showMessage(
        "Please select an investor and enter a valid number of slots."
      );
      return;
    }

    loadingSpinner.style.display = "flex";
    const projectDocRef = doc(db, "projects", projectId);

    try {
      await runTransaction(db, async (transaction) => {
        const projectDoc = await transaction.get(projectDocRef);
        if (!projectDoc.exists()) throw "Project does not exist!";

        const projectData = projectDoc.data();
        const investorKey = `investors.${userId}`;
        const newTotalUserSlots =
          (projectData.investors?.[userId] || 0) + slots;

        const updateData = {
          [investorKey]: newTotalUserSlots,
          [`investorStatus.${userId}.paymentVerified`]: true,
        };
        transaction.update(projectDocRef, updateData);

        const userPortfolioDocRef = doc(
          db,
          "users",
          userId,
          "portfolio",
          projectId
        );
        transaction.set(
          userPortfolioDocRef,
          {
            projectId: projectId,
            bookedAt: Timestamp.now(),
            slots: newTotalUserSlots,
            amount: newTotalUserSlots * projectData.slotPrice,
          },
          { merge: true }
        );
      });

      const projectTitle = allAdminProjects.find(
        (p) => p.id === projectId
      )?.title;
      const userName = allUsers.find((u) => u.id === userId)?.fullName;
      await logAdminAction(
        `Manually added and verified ${slots} slots for "${userName}" to project "${projectTitle}".`
      );
      showMessage("Manual investment added and verified successfully.");
      openInvestmentDetailsModal(projectId);
      document.getElementById("manual-investment-form").reset();
    } catch (error) {
      console.error("Error adding manual investment:", error);
      showMessage("Failed to add manual investment: " + error.message);
    } finally {
      loadingSpinner.style.display = "none";
    }
  });

const pdfViewerModal = document.getElementById("pdf-viewer-modal");
document
  .getElementById("close-pdf-viewer-modal")
  .addEventListener("click", () => {
    pdfViewerModal.style.display = "none";
    document.getElementById("pdf-iframe").src = "about:blank";
  });
  
function openPdfViewerModal(pdfUrl, pdfTitle) {
    const iframe = document.getElementById('pdf-iframe');
    const titleEl = document.getElementById('pdf-viewer-title');
    
    titleEl.textContent = pdfTitle;

    // Check if the URL is from Firebase Storage. If so, use it directly.
    // Otherwise, assume it's a Google Drive link and transform it.
    if (pdfUrl && pdfUrl.includes('firebasestorage.googleapis.com')) {
        iframe.src = pdfUrl;
    } else {
        iframe.src = transformGoogleDriveLink(pdfUrl);
    }
    
    pdfViewerModal.style.display = 'flex';
}

const manageReportsModal = document.getElementById("manage-reports-modal");
document
  .getElementById("cancel-manage-reports-modal")
  .addEventListener("click", () => {
    manageReportsModal.style.display = "none";
  });

async function openManageReportsModal(userId, userName) {
  manageReportsModal.style.display = "flex";
  document.getElementById(
    "manage-reports-modal-title"
  ).textContent = `Manage Reports for ${userName}`;
  document.getElementById("add-report-form").reset();
  document.getElementById("add-report-user-id").value = userId;
  document.getElementById("add-report-index").value = "";
  document.getElementById("add-report-submit-btn").textContent = "Add Report";

  const userDoc = await getDoc(doc(db, "users", userId));
  const reports = userDoc.exists() ? userDoc.data().generalReports || [] : [];
  const container = document.getElementById("user-reports-list-container");

  if (reports.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No reports have been sent to this user.</p>';
    return;
  }

  container.innerHTML = reports
    .map(
      (report, index) => `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="font-semibold">${report.title}</p>
                        <p class="text-sm text-gray-500">Sent: ${report.date
                          .toDate()
                          .toLocaleDateString()}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                         <button data-pdf-url="${
                           report.pdfURL
                         }" data-pdf-title="${
        report.title
      }" class="view-general-report-pdf-btn p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="See Report">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button data-user-id="${userId}" data-report-index="${index}" class="edit-report-btn p-2 text-indigo-600 hover:bg-indigo-100 rounded-full" title="Edit Report">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button data-user-id="${userId}" data-report-index="${index}" data-user-name="${userName}" data-report-title="${
        report.title
      }" class="delete-report-btn p-2 text-red-600 hover:bg-red-100 rounded-full" title="Delete Report">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            `
    )
    .join("");

  document.querySelectorAll(".view-general-report-pdf-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const { pdfUrl, pdfTitle } = e.currentTarget.dataset;
      openPdfViewerModal(pdfUrl, pdfTitle);
    });
  });
  document.querySelectorAll(".edit-report-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const { userId, reportIndex } = e.currentTarget.dataset;
      populateReportFormForEdit(userId, parseInt(reportIndex, 10));
    });
  });
  document.querySelectorAll(".delete-report-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const { userId, reportIndex, userName, reportTitle } =
        e.currentTarget.dataset;
      handleDeleteReport(
        userId,
        parseInt(reportIndex, 10),
        userName,
        reportTitle
      );
    });
  });
}

async function populateReportFormForEdit(userId, reportIndex) {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    const user = userDoc.data();
    const reportData = user.generalReports[reportIndex];

    if (reportData) {
      document.getElementById("add-report-title").value = reportData.title;
      document.getElementById("add-report-pdf-url").value = reportData.pdfURL;
      document.getElementById("add-report-index").value = reportIndex;
      document.getElementById("add-report-submit-btn").textContent =
        "Save Changes";
      document
        .getElementById("add-report-form")
        .scrollIntoView({ behavior: "smooth" });
    }
  }
}

document
  .getElementById("add-report-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = document.getElementById("add-report-user-id").value;
    const reportIndex = document.getElementById("add-report-index").value;
    const title = document.getElementById("add-report-title").value;
    const pdfURL = document.getElementById("add-report-pdf-url").value;
    const userName = allUsers.find((u) => u.id === userId)?.fullName;

    loadingSpinner.style.display = "flex";
    const userDocRef = doc(db, "users", userId);
    try {
      const userDoc = await getDoc(userDocRef);
      const existingReports = userDoc.exists()
        ? userDoc.data().generalReports || []
        : [];

      if (reportIndex !== "") {
        const indexToUpdate = parseInt(reportIndex, 10);
        const originalTitle = existingReports[indexToUpdate].title;
        existingReports[indexToUpdate] = {
          ...existingReports[indexToUpdate],
          title: title,
          pdfURL: pdfURL,
        };
        await logAdminAction(
          `Edited general report "${originalTitle}" to "${title}" for user "${userName}"`
        );
        showMessage("Report updated successfully.");
      } else {
        const newReport = {
          title: title,
          pdfURL: pdfURL,
          date: Timestamp.now(),
        };
        existingReports.push(newReport);
        await logAdminAction(
          `Added general report "${title}" for user "${userName}"`
        );
        showMessage("Report added successfully.");
      }

      await updateDoc(userDocRef, { generalReports: existingReports });
      openManageReportsModal(userId, userName);
    } catch (error) {
      console.error("Error adding/updating report:", error);
      showMessage("Failed to save report.");
    } finally {
      loadingSpinner.style.display = "none";
    }
  });

async function handleDeleteReport(userId, reportIndex, userName, reportTitle) {
  if (
    !window.confirm(
      `Are you sure you want to delete the report "${reportTitle}" for user "${userName}"?`
    )
  )
    return;

  loadingSpinner.style.display = "flex";
  const userDocRef = doc(db, "users", userId);
  try {
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const reports = userDoc.data().generalReports || [];
      reports.splice(reportIndex, 1);
      await updateDoc(userDocRef, { generalReports: reports });
      await logAdminAction(
        `Deleted general report "${reportTitle}" for user "${userName}"`
      );
      showMessage("Report deleted successfully.");
      openManageReportsModal(userId, userName);
    }
  } catch (error) {
    console.error("Error deleting report:", error);
    showMessage("Failed to delete report.");
  } finally {
    loadingSpinner.style.display = "none";
  }
}

const userPortfolioModal = document.getElementById("user-portfolio-modal");
document
  .getElementById("cancel-user-portfolio-modal")
  .addEventListener("click", () => {
    userPortfolioModal.style.display = "none";
  });

async function openUserPortfolioModal(userId, userName) {
  userPortfolioModal.style.display = "flex";
  document.getElementById(
    "user-portfolio-modal-title"
  ).textContent = `Portfolio for: ${userName}`;
  const container = document.getElementById("user-portfolio-list-container");
  container.innerHTML =
    '<div class="text-center text-gray-500">Loading portfolio...</div>';

  const portfolioCollectionRef = collection(db, "users", userId, "portfolio");
  const portfolioSnapshot = await getDocs(portfolioCollectionRef);

  if (portfolioSnapshot.empty) {
    container.innerHTML =
      '<p class="text-center text-gray-500">This user has not invested in any projects.</p>';
    return;
  }

  const portfolioItems = await Promise.all(
    portfolioSnapshot.docs.map(async (pDoc) => {
      const investmentData = pDoc.data();
      const projectDoc = await getDoc(
        doc(db, "projects", investmentData.projectId)
      );
      if (projectDoc.exists()) {
        const projectData = projectDoc.data();
        return `
                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <div>
                                <p class="font-semibold">${
                                  projectData.title
                                }</p>
                            </div>
                            <div class="text-right">
                                <p class="font-semibold">${
                                  investmentData.slots
                                } Slot(s)</p>
                                <p class="text-sm text-green-600">${formatRupiah(
                                  investmentData.amount
                                )}</p>
                            </div>
                        </div>
                    `;
      }
      return "";
    })
  );

  container.innerHTML = portfolioItems.join("");
}

async function handleFailedCheckboxChange(e) {
  const checkbox = e.target;
  const { id: projectId, title: projectTitle } = checkbox.dataset;
  const isChecked = checkbox.checked;

  if (isChecked) {
    const projectRef = doc(db, "projects", projectId);
    try {
      await updateDoc(projectRef, { isFailed: true, isVisible: false });
      await logAdminAction(`Marked project as failed: "${projectTitle}"`);
    } catch (error) {
      console.error("Error updating failed status:", error);
      showMessage("Failed to update status.");
      checkbox.checked = !isChecked;
    }
  }
}

async function handleExpiredCheckboxChange(e) {
  const checkbox = e.target;
  const { id: projectId, title: projectTitle } = checkbox.dataset;
  const isChecked = checkbox.checked;

  if (isChecked) {
    const projectRef = doc(db, "projects", projectId);
    try {
      await updateDoc(projectRef, { isExpired: true, isVisible: false });
      await logAdminAction(`Marked project as expired: "${projectTitle}"`);
    } catch (error) {
      console.error("Error updating expired status:", error);
      showMessage("Failed to update status.");
      checkbox.checked = !isChecked;
    }
  }
}

async function handleReopenProject(projectId, projectTitle) {
  const projectRef = doc(db, "projects", projectId);
  try {
    await updateDoc(projectRef, { isFulfilled: false, isVisible: true });
    await logAdminAction(`Re-opened (un-fulfilled) project: "${projectTitle}"`);
  } catch (error) {
    console.error("Error re-opening project:", error);
    showMessage("Failed to re-open project.");
  }
}

async function handleMoveToShowcase(projectId, projectTitle) {
  const projectRef = doc(db, "projects", projectId);
  try {
    await updateDoc(projectRef, { isFailed: false, isVisible: true });
    await logAdminAction(
      `Moved failed project back to showcase: "${projectTitle}"`
    );
  } catch (error) {
    console.error("Error moving project to showcase:", error);
    showMessage("Failed to move project.");
  }
}

async function handleReactivateProject(projectId, projectTitle) {
  const projectRef = doc(db, "projects", projectId);
  try {
    await updateDoc(projectRef, {
      isExpired: false,
      isFulfilled: false,
      isVisible: true,
    });
    await logAdminAction(`Reactivated expired project: "${projectTitle}"`);
  } catch (error) {
    console.error("Error reactivating project:", error);
    showMessage("Failed to reactivate project.");
  }
}

async function handleVisibilityToggle(projectId, projectTitle) {
  const projectRef = doc(db, "projects", projectId);
  try {
    const projectDoc = await getDoc(projectRef);
    if (projectDoc.exists()) {
      const currentVisibility = projectDoc.data().isVisible;
      await updateDoc(projectRef, { isVisible: !currentVisibility });
      await logAdminAction(
        `Set visibility for project "${projectTitle}" to ${!currentVisibility}`
      );
      showMessage(
        `Project visibility set to ${
          !currentVisibility ? "Visible" : "Hidden"
        }.`
      );
    }
  } catch (error) {
    console.error("Error toggling visibility:", error);
    showMessage("Failed to toggle project visibility.");
  }
}

async function handleCancelBooking(e) {
  const checkbox = e.target;
  const { projectId, userId, slots, projectName, userName } = checkbox.dataset;
  const isChecked = checkbox.checked;

  if (isChecked) {
    if (
      !window.confirm(
        `Are you sure you want to cancel this booking for "${userName}"? This will remove the booking and cannot be undone.`
      )
    ) {
      checkbox.checked = false;
      return;
    }

    loadingSpinner.style.display = "flex";
    const projectRef = doc(db, "projects", projectId);
    const userPortfolioDocRef = doc(
      db,
      "users",
      userId,
      "portfolio",
      projectId
    );

    try {
      await runTransaction(db, async (transaction) => {
        const projectDoc = await transaction.get(projectRef);
        if (!projectDoc.exists()) throw "Project not found!";

        const projectData = projectDoc.data();
        if (projectData.investors && projectData.investors[userId]) {
          delete projectData.investors[userId];
        }

        const statusUpdate = {
          investors: projectData.investors,
          [`investorStatus.${userId}.cancelled`]: true,
          [`investorStatus.${userId}.cancelledAt`]: Timestamp.now(),
          [`investorStatus.${userId}.slots`]: parseInt(slots, 10),
        };

        transaction.update(projectRef, statusUpdate);
        transaction.delete(userPortfolioDocRef);
      });

      await logAdminAction(
        `Cancelled booking of ${slots} slots for "${userName}" on project "${projectName}"`
      );
      showMessage("Booking has been successfully cancelled.");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      showMessage("Failed to cancel booking: " + error.message);
      checkbox.checked = false;
    } finally {
      loadingSpinner.style.display = "none";
    }
  }
}

async function handleDeleteCancellation(
  e,
  projectId,
  userId,
  projectName,
  userName
) {
  const row = e.currentTarget.closest("tr");
  if (
    !window.confirm(
      `Are you sure you want to permanently delete the cancellation record for "${userName}" on project "${projectName}"? This action cannot be undone.`
    )
  ) {
    return;
  }

  loadingSpinner.style.display = "flex";
  const projectRef = doc(db, "projects", projectId);

  try {
    await runTransaction(db, async (transaction) => {
      const projectDoc = await transaction.get(projectRef);
      if (!projectDoc.exists()) throw "Project not found!";

      const projectData = projectDoc.data();
      if (projectData.investorStatus && projectData.investorStatus[userId]) {
        delete projectData.investorStatus[userId];
      }
      transaction.update(projectRef, {
        investorStatus: projectData.investorStatus,
      });
    });

    await logAdminAction(
      `Deleted cancellation record for "${userName}" on project "${projectName}"`
    );
    showMessage("Cancellation record deleted successfully.");
    if (row) {
      row.remove();
    }
  } catch (error) {
    console.error("Error deleting cancellation record:", error);
    showMessage("Failed to delete record: " + error.message);
  } finally {
    loadingSpinner.style.display = "none";
  }
}

const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");

mobileMenuButton.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

document
  .getElementById("mobile-nav-dashboard")
  .addEventListener("click", (e) => {
    e.preventDefault();
    showPage("projects-dashboard-section");
  });
document
  .getElementById("mobile-nav-bookings")
  .addEventListener("click", (e) => {
    e.preventDefault();
    showPage("booking-section");
  });
document
  .getElementById("mobile-nav-verified-investments")
  .addEventListener("click", (e) => {
    e.preventDefault();
    showPage("verified-investments-section");
  });
document.getElementById("mobile-nav-profile").addEventListener("click", (e) => {
  e.preventDefault();
  showPage("profile-section");
});
document
  .getElementById("mobile-sign-out-btn")
  .addEventListener("click", () => signOut(auth));

document
  .getElementById("mobile-nav-admin-projects")
  .addEventListener("click", (e) => {
    e.preventDefault();
    showPage("admin-projects-section");
  });
document
  .getElementById("mobile-nav-admin-users")
  .addEventListener("click", (e) => {
    e.preventDefault();
    showPage("admin-users-section");
  });
document
  .getElementById("mobile-nav-investment-report")
  .addEventListener("click", (e) => {
    e.preventDefault();
    showPage("investment-report-section");
  });

document.querySelectorAll("#mobile-menu a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileMenu.classList.add("hidden");
  });
});

async function logAdminAction(action) {
  if (!currentUserData || currentUserData.role !== "admin") return;
  try {
    await addDoc(collection(db, "admin_logs"), {
      adminName: currentUserData.fullName || "Unknown Admin",
      adminId: currentUser.uid,
      action: action,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
}

function listenToAdminLogs() {
  const logsCollection = query(collection(db, "admin_logs"));
  onSnapshot(logsCollection, (snapshot) => {
    const tableBody = document.getElementById("admin-logs-table-body");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const logs = snapshot.docs
      .map((doc) => doc.data())
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

    if (logs.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="3" class="text-center py-4 text-gray-500">No admin activity recorded yet.</td></tr>';
      return;
    }

    logs.forEach((log) => {
      const row = `
                <tr class="hover:bg-gray-50">
                    <td data-label="Timestamp" class="py-4 px-6 whitespace-nowrap">${formatDetailedTimestamp(
                      log.timestamp
                    )}</td>
                    <td data-label="Admin" class="py-4 px-6 whitespace-nowrap font-medium text-gray-900">${
                      log.adminName
                    }</td>
                    <td data-label="Action" class="py-4 px-6">${log.action}</td>
                </tr>
            `;
      tableBody.innerHTML += row;
    });
  });
}

document.getElementById("nav-admin-logs").addEventListener("click", (e) => {
  e.preventDefault();
  showPage("admin-logs-section");
});
document
  .getElementById("mobile-nav-admin-logs")
  .addEventListener("click", (e) => {
    e.preventDefault();
    showPage("admin-logs-section");
  });

// --- DROPDOWN/COLLAPSIBLE LOGIC ---

// Handles the General Reports section
document
  .getElementById("toggle-general-reports")
  .addEventListener("click", (e) => {
    const button = e.currentTarget;
    const content = document.getElementById("general-reports-content");
    const icon = button.querySelector("svg");

    content.classList.toggle("hidden");
    icon.classList.toggle("rotate-180");
  });

// Function to handle clicks on the dynamically created project report cards
function handleProjectToggle(e) {
  const button = e.target.closest(".project-report-toggle");
  if (!button) return; // Exit if the click was not on a toggle button

  const contentId = button.dataset.targetId;
  const content = document.getElementById(contentId);
  const icon = button.querySelector("svg");

  if (content) {
    content.classList.toggle("hidden");
  }
  if (icon) {
    icon.classList.toggle("rotate-180");
  }
}

// Add event listeners to the parent containers for the project cards
document
  .getElementById("booking-list")
  .addEventListener("click", handleProjectToggle);
document
  .getElementById("verified-investments-list")
  .addEventListener("click", handleProjectToggle);

// ADD THIS ENTIRE NEW FUNCTION
function transformGoogleDriveFolderLink(url) {
  if (!url) return "";
  // Regex for a standard folder share link
  const regex =
    /https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    // Use the embeddedfolderview URL format
    return `https://drive.google.com/embeddedfolderview?id=${match[1]}#list`;
  }
  return url; // Return original if it doesn't match
}


// =======================================================================
// =================== NEW FUNCTIONS FOR BUSINESS OWNER ==================
// =======================================================================

// GANTI SELURUH FUNGSI INI
// GANTI SELURUH FUNGSI INI
function listenToMyProjects() {
    if (!currentUser) return;
    const projectsQuery = query(collection(db, "projects"), where("ownerId", "==", currentUser.uid));

    onSnapshot(projectsQuery, (snapshot) => {
        const ctaContainer = document.getElementById('no-projects-cta');
        const projectsContainer = document.getElementById('projects-view-container');
        
        const allMyProjects = [];
        snapshot.forEach(doc => {
            allMyProjects.push({ id: doc.id, ...doc.data() });
        });

        if (allMyProjects.length === 0) {
    // Jika tidak ada proyek, tampilkan Call to Action
    ctaContainer.style.display = 'block';
    projectsContainer.style.display = 'none';

    // Ambil referensi ke elemen CTA untuk diubah teksnya
    const ctaTitle = ctaContainer.querySelector('h2');
    const ctaParagraph = ctaContainer.querySelector('p');
    const completeProfileBtn = document.getElementById('cta-complete-profile-btn');
    const proposeProjectBtn = document.getElementById('show-create-my-project-modal-btn-cta');

    // Sembunyikan semua tombol terlebih dahulu
    completeProfileBtn.classList.add('hidden');
    proposeProjectBtn.classList.add('hidden');

    // Logika baru untuk menampilkan pesan dan tombol yang tepat
    if (currentUserData.isProfileComplete === false) {
        // STATE 1: Profil BELUM LENGKAP
        ctaTitle.textContent = "Terima kasih telah mendaftar program ACCES";
        ctaParagraph.textContent = "Langkah selanjutnya, anda perlu mengisi data mengenai kondisi bisnis dan rencana pengajuan pembiayaan anda dengan klik tombol ini";
        completeProfileBtn.classList.remove('hidden');

    } else if (currentUserData.isProfileComplete === true && currentUserData.isApprovedByAnalyst === false) {
        // STATE 2: Profil SUDAH LENGKAP, TAPI MENUNGGU PERSETUJUAN
        ctaTitle.textContent = "Selamat Datang!";
        ctaParagraph.innerHTML = `Pendaftaran usaha Anda sudah kami terima. Jika usaha Anda lolos ke tahap selanjutnya, tim kami akan menginfokan kepada Anda. Untuk melihat data Anda, bisa klik tombol "Profil Bisnis Saya" di menu navigasi.<br><br>Jika usaha Anda lolos, Anda akan diminta melengkapi data usaha dan rencana pembiayaan Anda melalui fitur "Ajukan Proyek Baru"`;
        // Tidak ada tombol yang ditampilkan di state ini

    } else {
        // STATE 3: Profil SUDAH LENGKAP DAN SUDAH DISETUJUI
        ctaTitle.textContent = "Anda Siap Mengajukan Proyek!";
        ctaParagraph.textContent = "Profil bisnis Anda telah disetujui oleh tim analis kami. Anda sekarang dapat mengajukan proyek baru untuk mendapatkan pendanaan.";
        proposeProjectBtn.classList.remove('hidden');
    }

        } else {
            // Jika ada proyek, tampilkan daftar proyek
            ctaContainer.style.display = 'none';
            projectsContainer.style.display = 'block';

            const proposedProjects = allMyProjects.filter(p => p.status !== 'Approved');
            const approvedProjects = allMyProjects.filter(p => p.status === 'Approved');
            
            const myProjectsTableBody = document.getElementById('my-projects-table-body');
            const myApprovedProjectsTableBody = document.getElementById('my-approved-projects-table-body');
            renderMyProjectsTable(proposedProjects, myProjectsTableBody);
            renderMyApprovedProjectsTable(approvedProjects, myApprovedProjectsTableBody);
            renderMyProjectProgress(allMyProjects);
        }
    });
}

document.getElementById('cta-complete-profile-btn').addEventListener('click', () => {
    showPage('complete-profile-section');
    document.getElementById('complete-profile-submit-btn').disabled = false;
    loadBusinessProfileDraft();
});

  // --- NEW EVENT LISTENERS AND RENDERER FOR PROJECT PROGRESS ---

document.getElementById("nav-project-progress").addEventListener("click", (e) => {
  e.preventDefault();
  showPage("business-owner-project-progress-section");
});
document.getElementById("mobile-nav-project-progress").addEventListener("click", (e) => {
  e.preventDefault();
  mobileMenu.classList.add("hidden");
  showPage("business-owner-project-progress-section");
});

function renderMyProjectProgress(projects) {
    const container = document.getElementById('project-progress-tbody');
    container.innerHTML = '';

    if (projects.length === 0) {
        container.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">You have no projects to track.</td></tr>';
        return;
    }

    projects.forEach(project => {
        const history = project.statusHistory || [];
        const sortedHistory = [...history].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
        
        const latestStatus = project.status || 'N/A';
        let statusClass = 'bg-gray-100 text-gray-800';
        
        const viewHistoryButton = `<button data-project-id="${project.id}" class="toggle-history-btn text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-md">View History</button>`;
        let updateButton = '';

        if (latestStatus === 'Need Update') {
            statusClass = 'bg-blue-100 text-blue-800';
            updateButton = `<button data-id="${project.id}" class="update-project-btn bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 text-sm rounded-md">Update & Resubmit</button>`;
        } else if (latestStatus === 'Under Review') {
            statusClass = 'bg-yellow-100 text-yellow-800';
        } else if (latestStatus === 'Approved') {
            statusClass = 'bg-green-100 text-green-800';
        } else if (latestStatus === 'Rejected') {
            statusClass = 'bg-red-100 text-red-800';
        }

        const actionButtonHTML = `<div class="flex items-center justify-center space-x-2">${updateButton}${viewHistoryButton}</div>`;

        const historyTableHTML = `
            <div class="p-4 bg-gray-50">
                <h4 class="font-bold text-md mb-2">Review History</h4>
                <table class="min-w-full text-sm">
                    <thead class="border-b">
                        <tr>
                            <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Timestamp</th>
                            <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Status</th>
                            <th class="py-2 px-3 text-left font-medium text-gray-500 uppercase">Review/Comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedHistory.map(entry => {
                            const authorLabel = entry.author === 'Business Owner' 
                                ? 'Your Comment:' 
                                : `${entry.author || 'Admin'} Review:`;

                            return `
                                <tr class="border-b">
                                    <td class="py-3 px-3 text-gray-600 whitespace-nowrap">${formatDetailedTimestamp(entry.timestamp)}</td>
                                    <td class="py-3 px-3 font-medium">${entry.status}</td>
                                    <td class="py-3 px-3 text-gray-700">
                                        <div class="font-bold">${authorLabel}</div>
                                        <div class="whitespace-pre-wrap">${entry.comments || 'N/A'}</div>
                                    </td>
                                </tr>
                            `;
                        }).join('') || '<tr><td colspan="3" class="text-center py-4 text-gray-500">No review history yet.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        const rowHTML = `
            <tr class="project-main-row">
                <td class="py-4 px-6 font-medium">${project.title}</td>
                <td class="py-4 px-6">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${latestStatus}
                    </span>
                </td>
                <td class="py-4 px-6 text-center">
                    ${actionButtonHTML}
                </td>
            </tr>
            <tr id="history-row-${project.id}" class="project-detail-row hidden">
                <td colspan="3" class="p-0">
                    ${historyTableHTML}
                </td>
            </tr>
        `;
        container.innerHTML += rowHTML;
    });

    container.querySelectorAll('.update-project-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            openBusinessOwnerUpdateModal(e.currentTarget.dataset.id);
        });
    });

    container.querySelectorAll('.toggle-history-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const projectId = e.currentTarget.dataset.projectId;
            const detailRow = document.getElementById(`history-row-${projectId}`);
            detailRow.classList.toggle('hidden');
        });
    });
}

function renderMyProjectsTable(projects, tableBody) {
    const gridContainer = document.getElementById('my-projects-grid');
    gridContainer.innerHTML = '';
    tableBody.innerHTML = '';

    if (projects.length === 0) {
        const emptyMessage = '<p class="col-span-full text-center text-gray-500">You have not proposed any projects.</p>';
        gridContainer.innerHTML = emptyMessage;
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">You have not proposed any projects.</td></tr>`;
        return;
    }

    projects.forEach(project => {
        let statusClass = '';
        let statusBorderClass = '';
        switch(project.status) {
            case 'Under Review': 
                statusClass = 'bg-yellow-100 text-yellow-800';
                statusBorderClass = 'border-yellow-500';
                break;
            case 'Need Update':
                statusClass = 'bg-blue-100 text-blue-800';
                statusBorderClass = 'border-blue-500';
                break;
            case 'Rejected': 
                statusClass = 'bg-red-100 text-red-800'; 
                statusBorderClass = 'border-red-500';
                break;
            default: 
                statusClass = 'bg-gray-100 text-gray-800';
                statusBorderClass = 'border-gray-500';
        }

        // --- Card HTML ---
        const cardHTML = `
            <div class="bg-white rounded-lg shadow-md overflow-hidden flex flex-col border-t-4 ${statusBorderClass}">
                <img src="${project.photoURL || 'https://placehold.co/600x400/e2e8f0/4a5568?text=Project+Image'}" 
                     alt="${project.title}" class="project-card-image"
                     onerror="this.onerror=null;this.src='https://placehold.co/600x400/e2e8f0/4a5568?text=Image+Not+Found';">
                <div class="p-6 flex-grow flex flex-col">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="text-xl font-bold truncate" title="${project.title}">${project.title}</h3>
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${project.status}</span>
                    </div>
                    <p class="text-gray-600 mb-4 h-12 overflow-hidden">${project.summary}</p>
                    <div class="mt-auto">
                        <h4 class="text-sm font-bold text-gray-700">Admin Feedback</h4>
                        <p class="text-sm text-gray-600 whitespace-pre-wrap h-16 overflow-y-auto bg-gray-50 p-2 rounded">${project.adminComments || 'No comments yet.'}</p>
                    </div>
                </div>
                <div class="p-6 pt-0 mt-4">
                    <button data-id="${project.id}" class="edit-project-btn w-full bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-900">Edit Proposal</button>
                </div>
            </div>
        `;
        gridContainer.innerHTML += cardHTML;

        // --- List Row HTML ---
        const rowHTML = `
            <tr>
                <td data-label="Project Title" class="py-4 px-6 font-medium">${project.title}</td>
                <td data-label="Status" class="py-4 px-6">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${project.status}</span>
                </td>
                <td data-label="Admin Comments" class="py-4 px-6 text-sm text-gray-600 whitespace-pre-wrap">${project.adminComments || 'No comments yet.'}</td>
                <td class="py-4 px-6 text-center">
                    <button data-id="${project.id}" class="edit-project-btn text-indigo-600 hover:text-indigo-900" title="Edit Project">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += rowHTML;
    });

    document.querySelectorAll('.edit-project-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openProjectModal(e.currentTarget.dataset.id));
    });
}

function renderMyApprovedProjectsTable(projects, tableBody) {
    if (projects.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">You have no approved projects.</td></tr>';
        return;
    }
    
    projects.forEach(project => {
        const verifiedSlots = Object.values(project.investorStatus || {}).filter(status => status.paymentVerified).reduce((sum, status) => sum + (project.investors[status.userId] || 0), 0);
        const totalValue = project.totalSlots * project.slotPrice;

        const row = `
            <tr>
                <td data-label="Project Title" class="py-4 px-6 font-medium">${project.title}</td>
                <td data-label="Total Value" class="py-4 px-6">${formatRupiah(totalValue)}</td>
                <td data-label="Verified Slots" class="py-4 px-6 font-semibold text-green-600">${verifiedSlots} / ${project.totalSlots}</td>
                <td class="py-4 px-6 text-center">
                     <button data-id="${project.id}" class="add-progress-btn text-green-600 hover:text-green-900" title="Manage Progress Updates">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7h14"></path></svg>
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    document.querySelectorAll('#my-approved-projects-table-body .add-progress-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openProgressModal(e.currentTarget.dataset.id));
    });
}


// ===================================================================
// =================== NEW FUNCTIONS FOR ADMIN =======================
// ===================================================================

function listenToProposedProjects() {
    const projectsQuery = query(collection(db, "projects"), where("ownerId", "!=", null));
    onSnapshot(projectsQuery, (snapshot) => {
        const gridContainer = document.getElementById('admin-proposed-projects-grid');
        const tableBody = document.getElementById('admin-proposed-projects-table-body');
        gridContainer.innerHTML = '';
        tableBody.innerHTML = '';

        if (snapshot.empty) {
            const emptyMessage = '<p class="col-span-full text-center text-gray-500">No projects have been proposed by Business Owners.</p>';
            gridContainer.innerHTML = emptyMessage;
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No projects have been proposed by Business Owners.</td></tr>`;
            return;
        }

        snapshot.forEach(doc => {
            const project = { id: doc.id, ...doc.data() };
            let statusClass = '';
            let statusBorderClass = '';
            switch(project.status) {
                case 'Under Review': 
                    statusClass = 'bg-yellow-100 text-yellow-800';
                    statusBorderClass = 'border-yellow-500';
                    break;
                case 'Need Update':
                    statusClass = 'bg-blue-100 text-blue-800';
                    statusBorderClass = 'border-blue-500';
                    break;
                case 'Approved':
                    statusClass = 'bg-green-100 text-green-800';
                    statusBorderClass = 'border-green-500';
                    break;
                case 'Rejected': 
                    statusClass = 'bg-red-100 text-red-800'; 
                    statusBorderClass = 'border-red-500';
                    break;
                default: 
                    statusClass = 'bg-gray-100 text-gray-800';
                    statusBorderClass = 'border-gray-500';
            }

            // --- Card HTML (Updated to match Business Owner view) ---
            const cardHTML = `
                <div class="bg-white rounded-lg shadow-md overflow-hidden flex flex-col border-t-4 ${statusBorderClass}">
                    <img src="${project.photoURL || 'https://placehold.co/600x400/e2e8f0/4a5568?text=Project+Image'}" 
                         alt="${project.title}" class="project-card-image"
                         onerror="this.onerror=null;this.src='https://placehold.co/600x400/e2e8f0/4a5568?text=Image+Not+Found';">
                    <div class="p-6 flex-grow flex flex-col">
                        <div class="flex justify-between items-start mb-1">
                            <h3 class="text-xl font-bold truncate" title="${project.title}">${project.title}</h3>
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${project.status}</span>
                        </div>
                        <p class="text-sm text-gray-500 mb-2">By: ${project.ownerName || 'Unknown'}</p>
                        <p class="text-gray-600 mb-4 h-12 overflow-hidden">${project.summary}</p>
                        <div class="mt-auto">
                            <h4 class="text-sm font-bold text-gray-700">Admin Feedback</h4>
                            <p class="text-sm text-gray-600 whitespace-pre-wrap h-16 overflow-y-auto bg-gray-50 p-2 rounded">${project.adminComments || 'No comments yet.'}</p>
                        </div>
                    </div>
                    <div class="p-6 pt-0 mt-4">
                        <button data-id="${project.id}" class="review-project-btn w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Review</button>
                    </div>
                </div>
            `;
            gridContainer.innerHTML += cardHTML;

            // --- List Row HTML ---
            const rowHTML = `
                <tr>
                    <td data-label="Project" class="py-4 px-6 font-medium">${project.title}</td>
                    <td data-label="Owner" class="py-4 px-6">${project.ownerName}</td>
                    <td data-label="Status" class="py-4 px-6">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${project.status}</span>
                    </td>
                    <td class="py-4 px-6 text-center">
                        <button data-id="${project.id}" class="review-project-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg text-xs">Review</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += rowHTML;
        });

        document.querySelectorAll('.review-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openReviewProjectModal(e.currentTarget.dataset.id));
        });
    });
}

async function openReviewProjectModal(projectId) {
    const projectDoc = await getDoc(doc(db, "projects", projectId));
    if (!projectDoc.exists()) {
        showMessage("Project not found.");
        return;
    }
    const project = projectDoc.data();
    
    document.getElementById('review-project-id').value = projectId;
    document.getElementById('review-project-modal-title').textContent = `Review: ${project.title}`;
    document.getElementById('review-project-owner').textContent = `Proposed by: ${project.ownerName}`;
    document.getElementById('review-project-comments').value = project.adminComments || '';

    const detailsContainer = document.getElementById('review-project-details');
    let detailsHTML = `
        <p class="mb-2"><strong>Summary:</strong> ${project.summary}</p>
        <p><strong>Investment Ask:</strong> <span class="font-semibold">${formatRupiah(project.investmentAsk || 0)}</span></p>
    `;
    
    const docButtons = [];
    const folders = [
        { title: 'Business Folder', url: project.businessFolderURL },
        { title: 'Legal Folder', url: project.legalFolderURL },
        { title: 'Finance Folder', url: project.financeFolderURL },
        { title: 'Other Folder', url: project.otherFolderURL },
    ];

    folders.forEach(folder => {
        if (folder.url) {
            docButtons.push(`<button type="button" class="view-review-folder-btn text-white bg-gray-700 hover:bg-gray-800 font-medium rounded-lg text-sm px-4 py-2 mr-2 mb-2" data-folder-url="${folder.url}" data-folder-title="${folder.title}: ${project.title}">View ${folder.title}</button>`);
        }
    });

    if (docButtons.length > 0) {
        detailsHTML += `<div class="mt-4 border-t pt-4">${docButtons.join('')}</div>`;
    }
    
    detailsContainer.innerHTML = detailsHTML;
    
    detailsContainer.querySelectorAll('.view-review-folder-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const { folderUrl, folderTitle } = e.currentTarget.dataset;
            const embedUrl = transformGoogleDriveFolderLink(folderUrl);
            openPdfViewerModal(embedUrl, folderTitle); // Re-using the same modal
        });
    });
    
    reviewProjectModal.style.display = 'flex';
}

document.getElementById('request-update-btn').addEventListener('click', () => {
    const projectId = document.getElementById('review-project-id').value;
    const comments = document.getElementById('review-project-comments').value;
    if (!comments) {
        showMessage("Please provide a comment when requesting an update.");
        return;
    }
    handleAdminReviewAction(projectId, comments, 'Need Update');
});

document.getElementById('approve-project-btn').addEventListener('click', () => {
    const projectId = document.getElementById('review-project-id').value;
    const comments = document.getElementById('review-project-comments').value || "Project approved.";
    handleAdminReviewAction(projectId, comments, 'Approved');
});

document.getElementById('reject-project-btn').addEventListener('click', () => {
    const projectId = document.getElementById('review-project-id').value;
    const comments = document.getElementById('review-project-comments').value;
     if (!comments) {
        showMessage("Please provide a reason for rejecting the project.");
        return;
    }
    handleAdminReviewAction(projectId, comments, 'Rejected');
});

document.getElementById('assign-analyst-btn').addEventListener('click', () => {
    const projectId = document.getElementById('review-project-id').value;
    reviewProjectModal.style.display = 'none'; // Close the current modal
    openAssignAnalystModal(projectId); // Open the new assignment modal
});

// This new reusable function handles all review actions
async function handleAdminReviewAction(projectId, comments, newStatus) {
    loadingSpinner.style.display = 'flex';
    const reviewProjectModal = document.getElementById("review-project-modal");

    const projectRef = doc(db, "projects", projectId);
    try {
        const projectDoc = await getDoc(projectRef);
        const projectTitle = projectDoc.exists() ? projectDoc.data().title : 'Unknown Project';

        const updateData = {
            status: newStatus,
            adminComments: comments,
        };

        if (newStatus === 'Approved') {
            updateData.isVisible = true; 
        } else {
            updateData.isVisible = false;
        }
        
        await runTransaction(db, async (transaction) => {
            const freshProjectDoc = await transaction.get(projectRef);
            if (!freshProjectDoc.exists()) {
                throw "Project does not exist!";
            }
            const existingHistory = freshProjectDoc.data().statusHistory || [];
            
            const authorRole = currentUserData.role === 'analyst' ? 'Analyst' : 'Admin';

            const newHistoryEntry = {
                status: newStatus,
                comments: comments,
                timestamp: Timestamp.now(),
                author: authorRole 
            };
            updateData.statusHistory = [...existingHistory, newHistoryEntry];
            transaction.update(projectRef, updateData);
        });

        await logAdminAction(`Reviewed project "${projectTitle}". Set status to ${newStatus}.`);
        showMessage("Project review saved successfully.");
        reviewProjectModal.style.display = 'none';

        if (newStatus === 'Approved' && currentUserData.role === 'analyst') {
            openAssignInvestorModal(projectId, projectTitle);
        }

    } catch (error) {
        console.error("Error saving review:", error);
        showMessage("Failed to save project review.");
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

async function openDueDiligenceModal(projectId, projectTitle) {
    const diligenceModal = document.getElementById('due-diligence-modal');
    const diligenceForm = document.getElementById('due-diligence-form');
    diligenceForm.reset();
    document.getElementById('diligence-project-id').value = projectId;
    document.getElementById('due-diligence-modal-title').textContent = `Due Diligence for: ${projectTitle}`;

    const reportsContainer = document.getElementById('previous-diligence-list');
    reportsContainer.innerHTML = 'Loading...';
    
    const projectRef = doc(db, "projects", projectId);
    const projectDoc = await getDoc(projectRef);

    if (projectDoc.exists() && projectDoc.data().dueDiligenceReports) {
        const reports = projectDoc.data().dueDiligenceReports;
        if (reports.length > 0) {
            reportsContainer.innerHTML = reports.map(report => `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="font-semibold">${report.title}</p>
                        <p class="text-sm text-gray-500">Added by ${report.authorName} on ${report.date.toDate().toLocaleDateString()}</p>
                    </div>
                    <a href="${report.pdfURL}" target="_blank" class="text-blue-600 hover:underline">View</a>
                </div>
            `).join('');
        } else {
            reportsContainer.innerHTML = '<p class="text-center text-gray-500">No due diligence reports added yet.</p>';
        }
    } else {
        reportsContainer.innerHTML = '<p class="text-center text-gray-500">No due diligence reports added yet.</p>';
    }

    diligenceModal.style.display = 'flex';
}

document.getElementById('cancel-diligence-form').addEventListener('click', () => {
    document.getElementById('due-diligence-modal').style.display = 'none';
});

document.getElementById('due-diligence-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectId = document.getElementById('diligence-project-id').value;
    const title = document.getElementById('diligence-title').value;
    const fileInput = document.getElementById('diligence-pdf-upload');
    const file = fileInput.files[0];

    if (!title || !file) {
        showMessage("Please provide a title and select a PDF file.");
        return;
    }

    showUploadProgressModal();
    const projectRef = doc(db, "projects", projectId);

    try {
        updateUploadStatus('Uploading PDF...');
        const downloadURL = await uploadFileWithProgress(file, `due_diligence_reports/${projectId}`, updateProgressBar);
        
        updateUploadStatus('Saving report details...');
        await runTransaction(db, async (transaction) => {
            const projectDoc = await transaction.get(projectRef);
            if (!projectDoc.exists()) {
                throw "Project not found!";
            }
            const existingReports = projectDoc.data().dueDiligenceReports || [];
            const newReport = {
                title: title,
                pdfURL: downloadURL,
                date: Timestamp.now(),
                authorId: currentUser.uid,
                authorName: currentUserData.fullName
            };
            transaction.update(projectRef, { dueDiligenceReports: [...existingReports, newReport] });
        });

        showMessage("Due diligence report added successfully.");
        document.getElementById('due-diligence-modal').style.display = 'none';
        
    } catch (error) {
        console.error("Error adding due diligence report:", error);
        showMessage("Failed to add report.");
    } finally {
        hideUploadProgressModal();
        fileInput.value = ''; // Clear file input
    }
});

async function openAssignAnalystModal(projectId) {
    const modal = document.getElementById('assign-analyst-modal');
    const select = document.getElementById('assign-analyst-select');
    document.getElementById('assign-project-id').value = projectId;
    select.innerHTML = '<option value="">Unassigned</option>'; // Default option

    const projectDoc = await getDoc(doc(db, "projects", projectId));
    if (!projectDoc.exists()) {
        showMessage("Project not found.");
        return;
    }
    const project = projectDoc.data();

    // Filter allUsers to find only analysts
    const analysts = allUsers.filter(user => user.role === 'analyst');
    analysts.forEach(analyst => {
        const option = document.createElement('option');
        option.value = analyst.id;
        option.textContent = `${analyst.fullName} (${analyst.email})`;
        if (project.assignedAnalystId === analyst.id) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    modal.style.display = 'flex';
}

document.getElementById('cancel-assign-analyst-form').addEventListener('click', () => {
    document.getElementById('assign-analyst-modal').style.display = 'none';
});

document.getElementById('assign-analyst-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectId = document.getElementById('assign-project-id').value;
    const analystSelect = document.getElementById('assign-analyst-select');
    const analystId = analystSelect.value;
    
    if (!analystId) {
        showMessage("Please select an analyst to assign the project to.");
        return;
    }
    const analystName = analystSelect.options[analystSelect.selectedIndex].textContent;
    
    loadingSpinner.style.display = 'flex';
    const projectRef = doc(db, "projects", projectId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const projectDoc = await transaction.get(projectRef);
            if (!projectDoc.exists()) throw "Project not found!";

            const updateData = {
                status: 'Assigned to Analyst',
                assignedAnalystId: analystId,
                assignedAnalystName: analystName
            };

            const existingHistory = projectDoc.data().statusHistory || [];
            const newHistoryEntry = {
                status: 'Assigned to Analyst',
                comments: `Assigned to ${analystName}`,
                timestamp: Timestamp.now(),
                author: 'Admin'
            };
            updateData.statusHistory = [...existingHistory, newHistoryEntry];
            transaction.update(projectRef, updateData);
        });

        showMessage("Project successfully assigned to analyst.");
        document.getElementById('assign-analyst-modal').style.display = 'none';

    } catch (error) {
        console.error("Error updating assignment:", error);
        showMessage("Failed to update assignment.");
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

async function openAssignInvestorModal(projectId, projectTitle) {
    const modal = document.getElementById('assign-investor-modal');
    document.getElementById('assign-investor-project-id').value = projectId;
    document.getElementById('assign-investor-modal-title').textContent = `Assign Investors for: ${projectTitle}`;
    
    const investorListDiv = document.getElementById('assign-investor-list');
    investorListDiv.innerHTML = '<p>Loading investors...</p>';
    modal.style.display = 'flex'; // Show modal early to display loading state

    try {
        // Fetch the project document to see who is already assigned
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        const assignedInvestors = projectDoc.exists() ? projectDoc.data().assignedInvestorIds || [] : [];

        // Directly query Firestore for all users with the 'investor' role
        const investorsQuery = query(collection(db, "users"), where("role", "==", "investor"));
        const investorsSnapshot = await getDocs(investorsQuery);
        const investors = investorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (investors.length > 0) {
            investorListDiv.innerHTML = investors.map(investor => `
                <div class="flex items-center">
                    <input id="investor-${investor.id}" type="checkbox" value="${investor.id}" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" ${assignedInvestors.includes(investor.id) ? 'checked' : ''}>
                    <label for="investor-${investor.id}" class="ml-3 block text-sm font-medium text-gray-700">${investor.fullName} (${investor.email})</label>
                </div>
            `).join('');
        } else {
            investorListDiv.innerHTML = '<p class="text-center text-gray-500">No investors found.</p>';
        }
    } catch (error) {
        console.error("Error fetching investors:", error);
        investorListDiv.innerHTML = '<p class="text-center text-red-500">Could not load investor list.</p>';
    }
}

document.getElementById('cancel-assign-investor-form').addEventListener('click', () => {
    document.getElementById('assign-investor-modal').style.display = 'none';
});

document.getElementById('assign-investor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectId = document.getElementById('assign-investor-project-id').value;
    const checkedBoxes = document.querySelectorAll('#assign-investor-list input[type="checkbox"]:checked');
    
    const assignedInvestorIds = Array.from(checkedBoxes).map(box => box.value);

    loadingSpinner.style.display = 'flex';
    const projectRef = doc(db, "projects", projectId);

    try {
        await updateDoc(projectRef, { assignedInvestorIds: assignedInvestorIds });
        showMessage("Investor assignment saved successfully.");
        document.getElementById('assign-investor-modal').style.display = 'none';
    } catch (error)
    {
        console.error("Error saving investor assignment:", error);
        showMessage("Failed to save assignment.");
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

// ADD THIS NEW FUNCTION
async function handleInterestedClick(projectId) {
    if (!currentUser) return;
    const projectRef = doc(db, "projects", projectId);
    try {
        const fieldToUpdate = `prospects.${currentUser.uid}`;
        await updateDoc(projectRef, {
            [fieldToUpdate]: {
                interestedAt: Timestamp.now(),
                contacted: false // Initialize contacted status
            }
        });
        showMessage("Your interest has been noted. Our team will be in touch with you shortly.");
    } catch (error) {
        console.error("Error marking interest:", error);
        showMessage("An error occurred. Please try again.");
    }
}

// ADD THIS NEW FUNCTION
async function handleMarkAsContacted(projectId, prospectId, isContacted) {
    const projectRef = doc(db, "projects", projectId);
    try {
        const fieldPath = `prospects.${prospectId}`;
        const updateData = {
            [`${fieldPath}.contacted`]: isContacted,
            [`${fieldPath}.contactedAt`]: Timestamp.now()
        };
        await updateDoc(projectRef, updateData);
    } catch (error) {
        console.error("Error updating contacted status:", error);
        showMessage("Failed to update status. The page will refresh.");
    }
}

// ADD THIS NEW FUNCTION
async function handleDeleteInterest(projectId, prospectId, prospectName, projectName) {
    if (!window.confirm(`Are you sure you want to delete the interest record for "${prospectName}" on project "${projectName}"?`)) {
        return;
    }
    loadingSpinner.style.display = 'flex';
    const projectRef = doc(db, "projects", projectId);
    try {
        const fieldToDelete = `prospects.${prospectId}`;
        await updateDoc(projectRef, {
            [fieldToDelete]: deleteField()
        });
        await logAdminAction(`Deleted interest record for "${prospectName}" on project "${projectName}"`);
        showMessage("Interest record deleted successfully.");
    } catch (error) {
        console.error("Error deleting interest record:", error);
        showMessage("Failed to delete record: " + error.message);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// --- NEW: Auth Form Toggling ---
const signInContainer = document.getElementById("sign-in-form-container");
const signUpContainer = document.getElementById("sign-up-form-container");
const showSignUpLink = document.getElementById("show-signup-link");
const showSignInLink = document.getElementById("show-signin-link");

showSignUpLink.addEventListener('click', (e) => {
    e.preventDefault();
    signInContainer.style.display = 'none';
    signUpContainer.style.display = 'block';
});

showSignInLink.addEventListener('click', (e) => {
    e.preventDefault();
    signInContainer.style.display = 'block';
    signUpContainer.style.display = 'none';
});

// --- NEW: Business Owner Sign-Up Form Handler ---
document.getElementById('sign-up-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('sign-up-error');
    errorDiv.classList.add('hidden');

    // --- Mengambil semua nilai dari formulir ---
    const fullName = document.getElementById('signup-fullname').value;
    const email = document.getElementById('signup-email').value;
    let rawPhone = document.getElementById('signup-phone').value;
    const companyName = document.getElementById('signup-company-name').value;
    const link1 = document.getElementById('signup-link1').value;
    const link2 = document.getElementById('signup-link2').value;
    const link3 = document.getElementById('signup-link3').value;
    const establishmentDate = document.getElementById('signup-establishment-date').value;
    const location = document.getElementById('signup-location').value;
    const industry = document.getElementById('signup-industry').value;
    const fundingNeeded = document.getElementById('signup-funding-needed').value;
    const employeeCount = document.getElementById('signup-employee-count').value;
    const tradeActivity = document.getElementById('signup-trade-activity').value;
    const checkedFundingNodes = document.querySelectorAll('input[name="funding-source"]:checked');
    const externalFundingSources = Array.from(checkedFundingNodes).map(node => node.value);
    const discoverySource = document.querySelector('input[name="discovery-source"]:checked').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
        errorDiv.textContent = 'Kata sandi tidak cocok.';
        errorDiv.classList.remove('hidden');
        return;
    }

    loadingSpinner.style.display = 'flex';

    try {
        // Langkah 1: Buat pengguna di Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // --- Logika pemformatan nomor telepon ---
        let finalPhone = rawPhone.replace(/\D/g, ''); // Hapus semua karakter non-angka
        if (finalPhone.startsWith('0')) {
            finalPhone = finalPhone.substring(1); // Hapus '0' di depan jika ada
        }
        if (!finalPhone.startsWith('62')) {
            finalPhone = '62' + finalPhone; // Tambahkan '62' jika belum ada
        }
        finalPhone = '+' + finalPhone; // Tambahkan '+' di awal
        // --- Akhir logika pemformatan ---

        // Langkah 2: Siapkan dokumen profil pengguna untuk Firestore
        const userData = {
            fullName,
            email,
            phone: finalPhone, // Simpan nomor telepon yang sudah diformat
            companyName,
            links: [link1, link2, link3].filter(link => link),
            establishmentDate,
            location,
            industry,
            fundingNeeded,
            employeeCount,
            tradeActivity,
            externalFundingSources,
            discoverySource: discoverySource,
            role: 'business-owner',
            profilePictureURL: "",
            createdAt: Timestamp.now(),
            hasChangedPassword: false, 
            isProfileComplete: false,
            isApprovedByAnalyst: false,
        };

        await setDoc(doc(db, "users", user.uid), userData);
        
    } catch (error) {
        console.error("Sign up error:", error);
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

// Add this entire new function to script.js
// Add this entire new function to handle the Step 2 form
document.getElementById('complete-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('complete-profile-error');
    const loadingSpinner = document.getElementById('loading-spinner'); // Make sure you have this defined
    errorDiv.classList.add('hidden');

    // --- ADD THIS VALIDATION BLOCK ---
    const fundPurposeCheckboxes = document.querySelectorAll('input[name="fund-purpose"]:checked');
    if (fundPurposeCheckboxes.length === 0) {
       alert("Gagal. Harap pilih setidaknya satu 'Rencana Penggunaan Dana'.");
    return; // Stop the function if validation fails
    }

    try {
        // --- Get all form values ---
        const companyProfileLink = document.getElementById('profile-company-profile-link').value;
        const financingProposalLink = document.getElementById('profile-financing-proposal-link').value;
        const lastYearRevenue = document.getElementById('profile-last-year-revenue').value;
        const previousFunding = document.getElementById('profile-previous-funding').value;
        const gpm = parseFloat(document.getElementById('profile-gpm').value);
        const npm = parseFloat(document.getElementById('profile-npm').value);
        const monthlyOcf = document.getElementById('profile-monthly-ocf').value;
        
        // --- Get checked radio buttons ---
        const activeDebtNode = document.querySelector('input[name="active-debt"]:checked');
        const financingTypeNode = document.querySelector('input[name="financing-type"]:checked');
        const financingPreferenceNode = document.querySelector('input[name="financing-preference"]:checked');

        // ==================== VALIDATION START ====================
        // Check if all required radio buttons and selects are chosen.
        if (!activeDebtNode || !financingTypeNode || !financingPreferenceNode || !lastYearRevenue || !previousFunding) {
            errorDiv.textContent = "Gagal. Harap pastikan semua kolom telah diisi dengan benar.";
            errorDiv.classList.remove('hidden');
            loadingSpinner.style.display = 'none';
            return; // Stop the execution if validation fails
        }
        // ===================== VALIDATION END =====================

        // --- Collect values from nodes and checkboxes ---
        const activeDebt = activeDebtNode.value;
        const financingType = financingTypeNode.value;
        const financingPreference = financingPreferenceNode.value;
        const fundPurpose = Array.from(document.querySelectorAll('input[name="fund-purpose"]:checked')).map(node => node.value);
        const collateral = Array.from(document.querySelectorAll('input[name="collateral"]:checked')).map(node => node.value);

        // --- Prepare data for Firestore ---
        const userDocRef = doc(db, "users", currentUser.uid);
        const dataToUpdate = {
            step2Details: {
                companyProfileLink, financingProposalLink, lastYearRevenue,
                previousFunding, gpm, npm, activeDebt, monthlyOcf, financingType,
                financingPreference, fundPurpose, collateral,
            },
            isProfileComplete: true,
        };

        // --- Update Firestore and reload on success ---
        await updateDoc(userDocRef, dataToUpdate);
        localStorage.removeItem(`businessProfileDraft_${currentUser.uid}`);
        
        // On success, simply reload the page.
        // The app's main logic will now see the profile is complete and show the correct view.
        window.location.reload();

    } catch (error) {
        console.error("Error completing profile:", error);
        errorDiv.textContent = "Terjadi kesalahan saat menyimpan profil. Silakan coba lagi.";
        errorDiv.classList.remove('hidden');
    } finally {
        // The spinner will be hidden by the page reload, but we keep this as a fallback for errors.
        loadingSpinner.style.display = 'none';
    }
});

document.getElementById('profile-cta-complete-btn').addEventListener('click', () => {
    showPage('complete-profile-section');
    document.getElementById('complete-profile-submit-btn').disabled = false;
    loadBusinessProfileDraft();
});

function renderBusinessProfile() {
    if (!currentUserData) return;

    const populateSelect = (elementId, optionsSourceId, selectedValue) => {
        const select = document.getElementById(elementId);
        const sourceSelect = document.getElementById(optionsSourceId);
        if (select && sourceSelect) {
            select.innerHTML = sourceSelect.innerHTML;
            select.value = selectedValue || '';
        }
    };

    const populateCheckboxes = (containerId, optionsSourceSelector, checkedValues) => {
        const container = document.getElementById(containerId);
        const sourceCheckboxes = document.querySelectorAll(optionsSourceSelector);
        if (!container || !sourceCheckboxes) return;
        container.innerHTML = '';
        sourceCheckboxes.forEach(sourceCb => {
            const label = sourceCb.parentElement.cloneNode(true);
            const newCb = label.querySelector('input');
            newCb.name = 'bp-edit-' + sourceCb.name;
            if (checkedValues && checkedValues.includes(sourceCb.value)) {
                newCb.checked = true;
            } else {
                newCb.checked = false;
            }
            container.appendChild(label);
        });
    };
    
    document.getElementById('bp-edit-fullname').value = currentUserData.fullName || '';
    document.getElementById('bp-edit-email').value = currentUserData.email || '';
    document.getElementById('bp-edit-company-name').value = currentUserData.companyName || '';
    document.getElementById('bp-edit-phone').value = (currentUserData.phone || '').replace('+62', '');
    
    // --- FIX FOR ESTABLISHMENT DATE ---
    let establishmentDateStr = '';
    const establishmentDate = currentUserData.establishmentDate;
    if (establishmentDate) {
        if (typeof establishmentDate === 'string') {
            // If it's already a string like "2025-07", use it directly
            establishmentDateStr = establishmentDate;
        } else if (establishmentDate.toDate) { 
            // If it's a Firestore Timestamp, convert it
            const dateObj = establishmentDate.toDate();
            const year = dateObj.getFullYear();
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0'); // +1 because months are 0-indexed
            establishmentDateStr = `${year}-${month}`;
        }
    }
    document.getElementById('bp-edit-establishment-date').value = establishmentDateStr;
    // --- END OF FIX ---

    populateSelect('bp-edit-location', 'signup-location', currentUserData.location);
    populateSelect('bp-edit-industry', 'signup-industry', currentUserData.industry);
    populateSelect('bp-edit-employee-count', 'signup-employee-count', currentUserData.employeeCount);
    populateSelect('bp-edit-funding-needed', 'signup-funding-needed', currentUserData.fundingNeeded);
    populateSelect('bp-edit-trade-activity', 'signup-trade-activity', currentUserData.tradeActivity);
    
    document.getElementById('bp-edit-link1').value = currentUserData.links?.[0] || '';
    document.getElementById('bp-edit-link2').value = currentUserData.links?.[1] || '';
    document.getElementById('bp-edit-link3').value = currentUserData.links?.[2] || '';
    
    populateCheckboxes('bp-edit-funding-source-container', 'input[name="funding-source"]', currentUserData.externalFundingSources);
    
    const details = currentUserData.step2Details || {};
    populateSelect('bp-edit-last-year-revenue', 'profile-last-year-revenue', details.lastYearRevenue);
    populateSelect('bp-edit-monthly-ocf', 'profile-monthly-ocf', details.monthlyOcf);
    document.getElementById('bp-edit-gpm').value = details.gpm || '';
    document.getElementById('bp-edit-npm').value = details.npm || '';
    document.getElementById('bp-edit-company-profile-link').value = details.companyProfileLink || '';
    document.getElementById('bp-edit-financing-proposal-link').value = details.financingProposalLink || '';
    
    const setRadio = (name, value) => {
        if (value) {
            const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (radio) radio.checked = true;
        } else {
            document.querySelectorAll(`input[name="${name}"]`).forEach(r => r.checked = false);
        }
    };
    setRadio('bp-edit-active-debt', details.activeDebt);
    setRadio('bp-edit-financing-type', details.financingType);
    setRadio('bp-edit-financing-preference', details.financingPreference);

    populateCheckboxes('bp-edit-fund-purpose-container', 'input[name="fund-purpose"]', details.fundPurpose);
    populateCheckboxes('bp-edit-collateral-container', 'input[name="collateral"]', details.collateral);

    const step2Fields = document.getElementById('profile-step2-fields');
const step2Cta = document.getElementById('profile-step2-cta');

if (currentUserData.isProfileComplete === true) {
    // If profile is complete, show the detailed fields
    step2Fields.classList.remove('hidden');
    step2Cta.classList.add('hidden');
} else {
    // If profile is incomplete, hide the fields and show the call-to-action
    step2Fields.classList.add('hidden');
    step2Cta.classList.remove('hidden');
    
    // --- ADD THIS NEW CODE ---
    // Remove the 'required' attribute from all inputs within the hidden section
    step2Fields.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
}


  }

document.getElementById('business-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingSpinner.style.display = 'flex';
    const saveButton = document.getElementById('save-business-profile-btn');

    try {
        const userDocRef = doc(db, "users", currentUser.uid);

        const getCheckedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
        
        const dataToUpdate = {
            fullName: document.getElementById('bp-edit-fullname').value,
            companyName: document.getElementById('bp-edit-company-name').value,
            phone: formatPhoneNumber(document.getElementById('bp-edit-phone').value),
            establishmentDate: document.getElementById('bp-edit-establishment-date').value,
            location: document.getElementById('bp-edit-location').value,
            industry: document.getElementById('bp-edit-industry').value,
            fundingNeeded: document.getElementById('bp-edit-funding-needed').value,
            employeeCount: document.getElementById('bp-edit-employee-count').value,
            tradeActivity: document.getElementById('bp-edit-trade-activity').value,
            links: [
                document.getElementById('bp-edit-link1').value,
                document.getElementById('bp-edit-link2').value,
                document.getElementById('bp-edit-link3').value
            ].filter(link => link),
            externalFundingSources: getCheckedValues('bp-edit-funding-source'),
            step2Details: {
                ...(currentUserData.step2Details || {}), 
                 lastYearRevenue: document.getElementById('bp-edit-last-year-revenue').value,
    monthlyOcf: document.getElementById('bp-edit-monthly-ocf').value,
    gpm: parseFloat(document.getElementById('bp-edit-gpm').value),
    npm: parseFloat(document.getElementById('bp-edit-npm').value),
    activeDebt: document.querySelector('input[name="bp-edit-active-debt"]:checked')?.value ?? null,
    financingType: document.querySelector('input[name="bp-edit-financing-type"]:checked')?.value ?? null,
    financingPreference: document.querySelector('input[name="bp-edit-financing-preference"]:checked')?.value ?? null,
    fundPurpose: getCheckedValues('bp-edit-fund-purpose'),
    collateral: getCheckedValues('bp-edit-collateral'),
    companyProfileLink: document.getElementById('bp-edit-company-profile-link').value,
    financingProposalLink: document.getElementById('bp-edit-financing-proposal-link').value,
}
        };

        await updateDoc(userDocRef, dataToUpdate);
        
        Object.assign(currentUserData, dataToUpdate);
        
        showMessage("Profil berhasil diperbarui.");

    } catch (error) {
        console.error("Error updating profile:", error);
        showMessage("Gagal memperbarui profil. Silakan coba lagi.");
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

// --- Add these new event listeners for the admin menu ---
document.getElementById('nav-admin-business-data').addEventListener('click', (e) => {
    e.preventDefault();
    renderAdminBusinessData();
    showPage('admin-business-data-section');
});
document.getElementById('mobile-nav-admin-business-data').addEventListener('click', (e) => {
    e.preventDefault();
    mobileMenu.classList.add('hidden');
    renderAdminBusinessData();
    showPage('admin-business-data-section');
});

// --- Add this listener for the new modal's close button ---
document.getElementById('close-business-detail-modal').addEventListener('click', () => {
    document.getElementById('business-detail-modal').style.display = 'none';
});

// Replace this entire function in script.js
function renderAdminBusinessData(searchTerm = '', statusFilter = 'all') {
    const tableBody = document.getElementById('admin-business-data-tbody');
    tableBody.innerHTML = '';

    // --- FIX 1: CALCULATE AND DISPLAY SUMMARY COUNTS ---
    // First, get all business owners from the global list
    const allBusinessOwners = allUsers.filter(user => user.role === 'business-owner');
    
    // Calculate the totals
    const totalBO = allBusinessOwners.length;
    const totalCompleted = allBusinessOwners.filter(user => user.isProfileComplete === true).length;
    
    // Update the HTML elements for the summary cards
    document.getElementById('total-bo-count').textContent = totalBO;
    document.getElementById('total-bo-completed-count').textContent = totalCompleted;
    // --- END OF FIX 1 ---

    // --- FILTERING LOGIC (This part remains the same) ---
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    let filteredBusinessOwners = allBusinessOwners.filter(user => {
        // Apply status filter
        if (statusFilter === 'completed' && user.isProfileComplete !== true) {
            return false;
        }
        if (statusFilter === 'incomplete' && user.isProfileComplete === true) { // Corrected this line
            return false;
        }

        // Apply search filter
        if (searchTerm) {
            const inName = user.fullName?.toLowerCase().includes(lowerCaseSearchTerm);
            const inCompany = user.companyName?.toLowerCase().includes(lowerCaseSearchTerm);
            if (!inName && !inCompany) {
                return false;
            }
        }
        
        return true;
    });
    // --- END OF FILTERING LOGIC ---

    if (filteredBusinessOwners.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No business owners match the current filters.</td></tr>`;
        return;
    }

    filteredBusinessOwners.forEach(user => {
        const assignedAnalyst = user.assignedAnalystId ? allUsers.find(u => u.id === user.assignedAnalystId) : null;
        const assignedAnalystName = assignedAnalyst ? assignedAnalyst.fullName : '<span class="text-gray-400">Unassigned</span>';
        
        // --- FIX 2: ADD WHATSAPP BUTTON ---
        const whatsappLink = formatWhatsAppLink(user.phone); // Generate the WhatsApp link

        const row = `
    <tr class="hover:bg-gray-50">
        <td data-label="Company Name" class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">${user.companyName || 'N/A'}</td>
        <td data-label="Owner Name" class="py-4 px-6 text-gray-700 whitespace-nowrap">${user.fullName || 'N/A'}</td>
        <td data-label="Assigned To" class="py-4 px-6 text-gray-700 whitespace-nowrap">${assignedAnalystName}</td>
        <td data-label="Actions" class="py-4 px-6 text-center">
            <div class="flex items-center justify-center space-x-2">
                <a href="${whatsappLink}" target="_blank" class="p-2 text-gray-600 hover:text-green-600" title="Send WhatsApp">
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="text-green-500"><path d="M16.75 13.96c.25.13.42.2.46.28.04.09.04.5-.02.95-.06.45-.33.85-.59.98-.26.13-.59.19-.89.13-.3-.06-1.98-.95-3.75-2.71-1.39-1.39-2.3-3.14-2.4-3.33-.1-.19-.52-1.09.1-2.04.57-.87.95-.95.95-.95.09,0,.23-.04.38.38.14.42.49,1.18.54,1.28.05.1.08.16.03.26-.05.1-.08.13-.16.23-.08.1-.16.19-.23.26-.08.08-.16.16-.16.23 0 .08.05.16.13.31.21.42.95,1.64,2.18,2.86,1.23,1.23,2.44,1.98,2.86,2.18.16.08.23.13.31.13.08,0,.16-.08.23-.16.08-.08.16-.16.26-.23.1-.08.13-.11.23-.16.1-.05.16-.03.26.03.1.05,1.28.49,1.28.54.1.05.16.08.16.16.03.11,0 .26-.11.38-.13.14-.31.23-.39.28zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path></svg>
                </a>
                <button data-user-id="${user.id}" class="view-business-details-btn bg-blue-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-blue-700 text-xs">View Details</button>
                <button data-user-id="${user.id}" data-company-name="${user.companyName}" class="assign-analyst-business-btn bg-green-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-green-700 text-xs">Assign</button>
            </div>
        </td>
    </tr>
`;
        tableBody.innerHTML += row;
    });

    // Re-attach event listeners for the newly created buttons
    tableBody.querySelectorAll('.view-business-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openBusinessDetailModal(e.currentTarget.dataset.userId));
    });
    tableBody.querySelectorAll('.assign-analyst-business-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const { userId, companyName } = e.currentTarget.dataset;
            openAssignAnalystForBusinessDataModal(userId, companyName);
        });
    });
}

// --- Add this new function to open and populate the detail modal ---
function openBusinessDetailModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showMessage("Could not find business owner data.");
        return;
    }

    // Helper function to safely display data in the modal
    const displayModal = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value || 'N/A';
        }
    };

    // Set modal title
    document.getElementById('modal-bd-company-name').textContent = user.companyName || 'Business Details';

    // Populate Owner & Business Info
    displayModal('modal-bd-fullname', user.fullName);
    displayModal('modal-bd-email', user.email);
    displayModal('modal-bd-phone', user.phone);
    displayModal('modal-bd-establishment-date', user.establishmentDate);
    displayModal('modal-bd-location', user.location);
    displayModal('modal-bd-industry', user.industry);
    displayModal('modal-bd-funding-needed', user.fundingNeeded);
    displayModal('modal-bd-employee-count', user.employeeCount);
    displayModal('modal-bd-trade-activity', user.tradeActivity);

    // Populate array data
    const linksEl = document.getElementById('modal-bd-links');
    if (linksEl) {
        linksEl.innerHTML = user.links?.map(link => 
            `<a href="${link}" target="_blank" class="text-blue-600 hover:underline">${link}</a>`
        ).join('') || 'N/A';
    }
    displayModal('modal-bd-external-funding', user.externalFundingSources?.join(', '));
    displayModal('modal-bd-discovery-source', user.discoverySource);


    // Populate Financials
    const details = user.step2Details || {};
    displayModal('modal-bd-last-year-revenue', details.lastYearRevenue);
    displayModal('modal-bd-monthly-ocf', details.monthlyOcf);
    displayModal('modal-bd-gpm', details.gpm);
    displayModal('modal-bd-npm', details.npm);
    displayModal('modal-bd-active-debt', details.activeDebt);

    // Populate Funding Details
    displayModal('modal-bd-financing-type', details.financingType);
    displayModal('modal-bd-financing-preference', details.financingPreference);
    displayModal('modal-bd-fund-purpose', details.fundPurpose?.join(', '));
    displayModal('modal-bd-collateral', details.collateral?.join(', '));
    
    // Populate Document Links
    const profileLinkEl = document.getElementById('modal-bd-company-profile-link');
    if (profileLinkEl && details.companyProfileLink) {
        profileLinkEl.innerHTML = `<strong>Company Profile:</strong> <a href="${details.companyProfileLink}" target="_blank" class="text-blue-600 hover:underline">View Document</a>`;
    } else if (profileLinkEl) {
        profileLinkEl.innerHTML = '<strong>Company Profile:</strong> N/A';
    }

    const proposalLinkEl = document.getElementById('modal-bd-financing-proposal-link');
    if (proposalLinkEl && details.financingProposalLink) {
        proposalLinkEl.innerHTML = `<strong>Financing Proposal:</strong> <a href="${details.financingProposalLink}" target="_blank" class="text-blue-600 hover:underline">View Document</a>`;
    } else if (proposalLinkEl) {
        proposalLinkEl.innerHTML = '<strong>Financing Proposal:</strong> Not Provided';
    }

    // Show the modal
    document.getElementById('business-detail-modal').style.display = 'flex';
}

// Add these two new functions to script.js

function openAssignAnalystForBusinessDataModal(businessOwnerId, companyName) {
    const modal = document.getElementById('assign-analyst-business-data-modal');
    const select = document.getElementById('assign-analyst-business-data-select');
    document.getElementById('assign-business-owner-id').value = businessOwnerId;
    document.getElementById('assign-analyst-business-data-modal-title').textContent = `Assign "${companyName}" to an Analyst`;
    
    // Find the currently assigned analyst to pre-select them
    const businessOwner = allUsers.find(u => u.id === businessOwnerId);
    
    // Populate the dropdown with all available analysts
    select.innerHTML = '<option value="">Unassign</option>'; // Option to unassign
    const analysts = allUsers.filter(user => user.role === 'analyst');
    analysts.forEach(analyst => {
        const option = document.createElement('option');
        option.value = analyst.id;
        option.textContent = `${analyst.fullName} (${analyst.email})`;
        // If this analyst is already assigned, select them
        if (businessOwner && businessOwner.assignedAnalystId === analyst.id) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    modal.style.display = 'flex';
}

document.getElementById('cancel-assign-analyst-business-data-form').addEventListener('click', () => {
    document.getElementById('assign-analyst-business-data-modal').style.display = 'none';
});

document.getElementById('assign-analyst-business-data-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const businessOwnerId = document.getElementById('assign-business-owner-id').value;
    const analystId = document.getElementById('assign-analyst-business-data-select').value;
    const businessOwnerDocRef = doc(db, "users", businessOwnerId);

    loadingSpinner.style.display = 'flex';
    try {
        // If analystId is empty, it means we are unassigning.
        // We use deleteField() to completely remove the field from the document.
        const dataToUpdate = {
            assignedAnalystId: analystId ? analystId : deleteField()
        };
        await updateDoc(businessOwnerDocRef, dataToUpdate);

        showMessage("Assignment updated successfully.");
        document.getElementById('assign-analyst-business-data-modal').style.display = 'none';
        renderAdminBusinessData(); // Refresh the admin table to show the change
    } catch (error) {
        console.error("Error updating assignment:", error);
        showMessage("Failed to update assignment.");
    } finally {
        loadingSpinner.style.display = 'none';
    }
});

// --- Add these new functions for the analyst view to script.js ---

document.getElementById('nav-analyst-business-data').addEventListener('click', (e) => {
    e.preventDefault();
    renderAnalystBusinessData();
    showPage('analyst-business-data-section');
});
document.getElementById('mobile-nav-analyst-business-data').addEventListener('click', (e) => {
    e.preventDefault();
    mobileMenu.classList.add('hidden');
    renderAnalystBusinessData();
    showPage('analyst-business-data-section');
});

// Replace this entire function in script.js
function renderAnalystBusinessData() {
    const tableBody = document.getElementById('analyst-business-data-tbody');
    tableBody.innerHTML = '';

    const assignedBusinesses = allUsers.filter(user => 
        user.role === 'business-owner' && user.assignedAnalystId === currentUser.uid
    );

    if (assignedBusinesses.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No business data has been assigned to you for review.</td></tr>`;
        return;
    }

    assignedBusinesses.forEach(user => {
        // Determine the status and button state
        const isApproved = user.isApprovedByAnalyst === true;
        const statusHTML = isApproved
            ? `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Approved</span>`
            : `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>`;

        const approveButtonHTML = isApproved
            ? `<button class="bg-gray-400 text-white font-bold py-1 px-3 rounded-lg text-xs cursor-not-allowed" disabled>Approved</button>`
            : `<button data-user-id="${user.id}" data-company-name="${user.companyName}" class="approve-business-btn bg-green-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-green-700 text-xs">Approve</button>`;

        const row = `
            <tr class="hover:bg-gray-50">
                <td data-label="Company Name" class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">${user.companyName || 'N/A'}</td>
                <td data-label="Owner Name" class="py-4 px-6 text-gray-700 whitespace-nowrap">${user.fullName || 'N/A'}</td>
                <td data-label="+62
                 Status" class="py-4 px-6 text-gray-700 whitespace-nowrap">${statusHTML}</td>
                <td data-label="Actions" class="py-4 px-6 text-center">
                    <div class="flex items-center justify-center space-x-2">
                        <button data-user-id="${user.id}" class="view-business-details-btn bg-blue-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-blue-700 text-xs">View Details</button>
                        ${approveButtonHTML}
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    tableBody.querySelectorAll('.view-business-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openBusinessDetailModal(e.currentTarget.dataset.userId));
    });
    
    // Add event listener for the new approve button
    tableBody.querySelectorAll('.approve-business-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const { userId, companyName } = e.currentTarget.dataset;
            handleAnalystApproveBusinessData(userId, companyName);
        });
    });
}

// Add this new function to script.js
async function handleAnalystApproveBusinessData(businessOwnerId, companyName) {
    if (!window.confirm(`Are you sure you want to approve the business "${companyName}"? This will allow them to propose new projects.`)) {
        return;
    }

    loadingSpinner.style.display = 'flex';
    const businessOwnerDocRef = doc(db, "users", businessOwnerId);

    try {
        await updateDoc(businessOwnerDocRef, {
            isApprovedByAnalyst: true
        });
        showMessage(`Successfully approved ${companyName}.`);
        // The table will automatically refresh due to the onSnapshot listener.
    } catch (error) {
        console.error("Error approving business data:", error);
        showMessage("Failed to approve business data.");
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

document.getElementById('go-to-complete-profile-btn').addEventListener('click', () => {
    // First, show the correct page
    showPage('complete-profile-section');
    
    // THEN, enable the submit button on that page
    document.getElementById('complete-profile-submit-btn').disabled = false;
    loadBusinessProfileDraft(); 
});

// Add these two new functions to script.js

/**
 * Saves the current state of the Step 2 form to the browser's localStorage.
 */
function saveBusinessProfileDraft() {
    if (!currentUser) return; // Only save if a user is logged in

    const form = document.getElementById('complete-profile-form');
    const formData = {
        companyProfileLink: form.querySelector('#profile-company-profile-link').value,
        financingProposalLink: form.querySelector('#profile-financing-proposal-link').value,
        lastYearRevenue: form.querySelector('#profile-last-year-revenue').value,
        monthlyOcf: form.querySelector('#profile-monthly-ocf').value,
        gpm: form.querySelector('#profile-gpm').value,
        npm: form.querySelector('#profile-npm').value,
        activeDebt: form.querySelector('input[name="active-debt"]:checked')?.value,
        previousFunding: form.querySelector('#profile-previous-funding').value,
        financingType: form.querySelector('input[name="financing-type"]:checked')?.value,
        fundPurpose: Array.from(form.querySelectorAll('input[name="fund-purpose"]:checked')).map(cb => cb.value),
        collateral: Array.from(form.querySelectorAll('input[name="collateral"]:checked')).map(cb => cb.value),
        financingPreference: form.querySelector('input[name="financing-preference"]:checked')?.value,
    };

    // Save the data as a JSON string, unique to the current user
    localStorage.setItem(`businessProfileDraft_${currentUser.uid}`, JSON.stringify(formData));
}

/**
 * Loads a saved draft from localStorage and populates the Step 2 form.
 */
function loadBusinessProfileDraft() {
    if (!currentUser) return;

    const savedDraft = localStorage.getItem(`businessProfileDraft_${currentUser.uid}`);
    if (savedDraft) {
        const formData = JSON.parse(savedDraft);
        const form = document.getElementById('complete-profile-form');

        // Populate all text and select fields
        form.querySelector('#profile-company-profile-link').value = formData.companyProfileLink || '';
        form.querySelector('#profile-financing-proposal-link').value = formData.financingProposalLink || '';
        form.querySelector('#profile-last-year-revenue').value = formData.lastYearRevenue || '';
        form.querySelector('#profile-monthly-ocf').value = formData.monthlyOcf || '';
        form.querySelector('#profile-gpm').value = formData.gpm || '';
        form.querySelector('#profile-npm').value = formData.npm || '';
        form.querySelector('#profile-previous-funding').value = formData.previousFunding || '';

        // Populate radio buttons
        if (formData.activeDebt) {
            form.querySelector(`input[name="active-debt"][value="${formData.activeDebt}"]`).checked = true;
        }
        if (formData.financingType) {
            form.querySelector(`input[name="financing-type"][value="${formData.financingType}"]`).checked = true;
        }
        if (formData.financingPreference) {
            form.querySelector(`input[name="financing-preference"][value="${formData.financingPreference}"]`).checked = true;
        }

        // Populate checkboxes
        form.querySelectorAll('input[name="fund-purpose"]').forEach(cb => {
            if (formData.fundPurpose?.includes(cb.value)) {
                cb.checked = true;
            }
        });
        form.querySelectorAll('input[name="collateral"]').forEach(cb => {
            if (formData.collateral?.includes(cb.value)) {
                cb.checked = true;
            }
        });
    }
}

const profileFormInputs = document.querySelectorAll('#complete-profile-form input, #complete-profile-form select, #complete-profile-form textarea');
profileFormInputs.forEach(input => {
    // Save whenever the user clicks out of a field
    input.addEventListener('blur', saveBusinessProfileDraft);
});



/**
 * Populates the edit form with the current business owner's data.
 */
function openEditBusinessProfile() {
    if (!currentUserData) return;

    // Helper to populate a select dropdown and set its value
    const populateSelect = (elementId, options, selectedValue) => {
        const select = document.getElementById(elementId);
        select.innerHTML = '';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            select.appendChild(option);
        });
        select.value = selectedValue;
    };
    
    // --- Populate top-level user data ---
    document.getElementById('edit-bp-fullname').value = currentUserData.fullName || '';
    document.getElementById('edit-bp-company-name').value = currentUserData.companyName || '';
    let phoneForInput = (currentUserData.phone || '').replace(/\D/g, ''); // Hapus semua yang bukan angka
    if (phoneForInput.startsWith('62')) {
        phoneForInput = phoneForInput.substring(2); // Hapus '62'
    }
    document.getElementById('edit-bp-phone').value = phoneForInput;
    document.getElementById('edit-bp-establishment-date').value = currentUserData.establishmentDate || '';

    // Populate dropdowns from the signup form options
    populateSelect('edit-bp-location', Array.from(document.getElementById('signup-location').options).map(o => ({value: o.value, text: o.text})), currentUserData.location);
    populateSelect('edit-bp-industry', Array.from(document.getElementById('signup-industry').options).map(o => ({value: o.value, text: o.text})), currentUserData.industry);
    populateSelect('edit-bp-employee-count', Array.from(document.getElementById('signup-employee-count').options).map(o => ({value: o.value, text: o.text})), currentUserData.employeeCount);

    // --- Populate nested step2Details data ---
    const details = currentUserData.step2Details || {};
    populateSelect('edit-bp-last-year-revenue', Array.from(document.getElementById('profile-last-year-revenue').options).map(o => ({value: o.value, text: o.text})), details.lastYearRevenue);
    populateSelect('edit-bp-monthly-ocf', Array.from(document.getElementById('profile-monthly-ocf').options).map(o => ({value: o.value, text: o.text})), details.monthlyOcf);
    document.getElementById('edit-bp-gpm').value = details.gpm || '';
    document.getElementById('edit-bp-npm').value = details.npm || '';

    // Populate radio buttons
    if (details.financingPreference) {
        document.querySelector(`input[name="edit-financing-preference"][value="${details.financingPreference}"]`).checked = true;
    }
}


function formatPhoneNumber(rawPhone) {
    let finalPhone = (rawPhone || '').replace(/\D/g, ''); // Remove all non-numeric characters
    if (finalPhone.startsWith('0')) {
        finalPhone = finalPhone.substring(1);
    }
    if (finalPhone && !finalPhone.startsWith('62')) { // Check if finalPhone is not empty
        finalPhone = '62' + finalPhone;
    }
    return finalPhone ? '+' + finalPhone : ''; // Return formatted number or empty string
}

document.getElementById('show-create-my-project-modal-btn-cta').addEventListener('click', () => {
    openProjectModal();
});

// --- ADD THIS ENTIRE NEW FUNCTION TO SCRIPT.JS ---

async function exportBusinessOwnerDataToCSV() {
    // 1. Start with all business owners
    const allBusinessOwners = allUsers.filter(user => user.role === 'business-owner');

    // --- ADD THIS FILTERING LOGIC ---
    // Get the selected value from the filter dropdown
    const filterValue = document.getElementById('bo-profile-status-filter').value;
    let businessOwnersToExport = allBusinessOwners; // This is the list we will export

    // Apply the filter based on the dropdown's value
    if (filterValue === 'completed') {
        businessOwnersToExport = allBusinessOwners.filter(user => user.isProfileComplete === true);
    } else if (filterValue === 'incomplete') {
        businessOwnersToExport = allBusinessOwners.filter(user => !user.isProfileComplete);
    }
    // --- END OF FILTERING LOGIC ---

    if (businessOwnersToExport.length === 0) {
        alert('No data to export for the current filter.');
        return;
    }

    // Define the headers for your CSV file.
    const headers = [
        'Full Name', 'Email', 'Phone', 'Company Name', 'Establishment Date',
        'Location', 'Industry', 'Employee Count', 'Links',
        'External Funding Sources', 'Discovery Source', 'Company Profile Link', 'Financing Proposal Link',
        'Last Year Revenue', 'Monthly OCF', 'GPM (%)', 'NPM (%)', 'Has Active Debt',
        'Previous Funding', 'Financing Type', 'Financing Preference', 'Fund Purpose',
        'Collateral'
    ];

    // Helper function to handle commas and quotes in data
    const escapeCSV = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
        let str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Map each user object from the FILTERED LIST to a row in the CSV
    const rows = businessOwnersToExport.map(user => {
        const details = user.step2Details || {};
        
        return [
            user.fullName, user.email, user.phone ? `="${String(user.phone).startsWith('+') ? user.phone : '+' + user.phone}"` : '', user.companyName, user.establishmentDate,
            user.location, user.industry, user.employeeCount, (user.links || []).join('; '),
            (user.externalFundingSources || []).join('; '), user.discoverySource, details.companyProfileLink,
            details.financingProposalLink, details.lastYearRevenue, details.monthlyOcf,
            details.gpm, details.npm, details.activeDebt, details.previousFunding,
            details.financingType, details.financingPreference, (details.fundPurpose || []).join('; '),
            details.collateral
        ].map(escapeCSV);
    });

    // Combine headers and rows into a single CSV string
    let csvContent = headers.join(',') + '\r\n';
    rows.forEach(rowArray => {
        let row = rowArray.join(',');
        csvContent += row + '\r\n';
    });

    // Create a Blob and trigger the download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `acces_business_owner_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add this event listener for the new export button
document.getElementById('export-bo-data-btn').addEventListener('click', exportBusinessOwnerDataToCSV);
// Add this line with the other const declarations

// Add this new block of code to script.js

const boSearchInput = document.getElementById('bo-search-input');
const boStatusFilter = document.getElementById('bo-profile-status-filter');

function applyBusinessDataFilters() {
    const searchTerm = boSearchInput.value;
    const statusFilter = boStatusFilter.value;
    renderAdminBusinessData(searchTerm, statusFilter);
}

// Trigger the filter function whenever the user types in the search bar
boSearchInput.addEventListener('input', applyBusinessDataFilters);

// Trigger the filter function whenever the user changes the dropdown selection
boStatusFilter.addEventListener('change', applyBusinessDataFilters);