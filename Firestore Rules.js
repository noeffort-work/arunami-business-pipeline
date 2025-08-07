rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if the requesting user has the 'admin' role.
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

       // Helper function to check if the requesting user has the 'business-owner' role.
    function isBusinessOwner() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'business-owner';
    }

    // Helper function to check if the user is the owner of the project.
    function isOwner() {
      return resource.data.ownerId == request.auth.uid;
    }

    // Rules for the 'users' collection
    match /users/{userId} {
      // ... (existing user rules)
      allow create: if request.auth.uid == userId || isAdmin();
      allow read: if request.auth.uid == userId || isAdmin();
      allow update: if request.auth.uid == userId || isAdmin();
      allow delete: if isAdmin() && request.auth.uid != userId;
    }

 // Rules for the 'projects' collection
    match /projects/{projectId} {
      allow read: if request.auth != null;
      // Allow create if user is an Admin OR a Business Owner
      allow create: if isAdmin() || isBusinessOwner();
      allow delete: if isAdmin();
      // Allow update if user is an Admin, an Investor pledging, OR the Business Owner who owns the project
      allow update: if isAdmin() || isPledging() || (isBusinessOwner() && isOwner());
    }
    
    // ** NEW RULE FOR ADMIN LOGS **
    // Only admins can read or write to the logs collection.
    match /admin_logs/{logId} {
        allow read, write: if isAdmin();
    }

    // ... (rest of the rules)
    function isPledging() {
      let incoming = request.resource.data;
      let existing = resource.data;
      let uid = request.auth.uid;

      return (
        request.auth != null &&
        existing.isFulfilled == false &&
        incoming.title == existing.title &&
        incoming.summary == existing.summary &&
        incoming.description == existing.description &&
        incoming.dueDate == existing.dueDate &&
        incoming.totalSlots == existing.totalSlots &&
        incoming.slotPrice == existing.slotPrice &&
        incoming.isFulfilled == existing.isFulfilled &&
        incoming.isVisible == existing.isVisible &&
        (
          (incoming.investors.diff(existing.investors).affectedKeys().hasOnly([uid])) ||
          (incoming.prospects.diff(existing.prospects).affectedKeys().hasOnly([uid]))
        )
      );
    }

    match /users/{userId}/portfolio/{portfolioId} {
      allow read, write: if request.auth.uid == userId || isAdmin();
    }
  }
}
