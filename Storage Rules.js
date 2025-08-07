rules_version = '2';

service firebase.storage {
  
  match /b/{bucket}/o {

    // --- PROJECT IMAGES ---
    match /project_images/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // --- GENERAL PROJECT PDFS ---
    // This new block grants permission for the 'project_pdfs' folder.
    match /project_pdfs/{pdfId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // --- DETAILED & CONFIDENTIAL PDFS ---
    // This new block grants permission for the 'project_detailed_pdfs' folder.
    match /project_detailed_pdfs/{pdfId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // --- OTHER PDFS (e.g., Reports) ---
    // This covers the default path in the upload function for other PDF types.
    match /pdf_files/{pdfId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}