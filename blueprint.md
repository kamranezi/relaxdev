# Project Blueprint

## Overview

This application is a Vercel-like dashboard that allows users to connect their GitHub accounts, view their repositories, and deploy them as projects. The application is built with Next.js and utilizes Firebase for authentication and data storage. The UI is designed to be modern, intuitive, and responsive, with a focus on a clean aesthetic and a great user experience.

## Features & Design

### Core Functionality

- **GitHub Authentication:** Uses Firebase Authentication with `signInWithRedirect`. This full-page redirect method is robust and avoids popup-blocker issues. Upon first sign-in, the user's GitHub access token is stored in the Firebase database, which is crucial for subsequent API interactions.

- **Project & Repository Listing:** Authenticated users can view a list of their GitHub repositories and create projects.

- **Project Deployment:** Users can deploy projects. The backend verifies the user's `githubAccessToken` from the database before triggering a deployment workflow on GitHub Actions.

- **Real-time Updates:** The application uses real-time listeners to update project statuses.

### Styling & UI Components

- **Visual Design:** Modern, clean, dark theme with a focus on typography, iconography, and responsive layout using Tailwind CSS.

- **UI Components:** Leverages `shadcn/ui` for high-quality components like `Card`, `Button`, `Dialog`, etc.

### Technical Implementation

- **Framework:** Next.js (App Router)
- **Authentication:** Firebase Authentication
- **Database:** Firebase Realtime Database (for user data/tokens) & Firestore (implicitly by some libraries, but main DB is Realtime DB).
- **Styling:** Tailwind CSS
- **UI:** shadcn/ui, Radix UI
- **Icons:** lucide-react

## Current Development Plan

**Status: Completed**

1.  **Fix Critical Rendering Error:**
    - **Issue:** A `ReferenceError: statusCode is not defined` in `src/components/ProjectCard.tsx` caused the application to crash.
    - **Fix:** Corrected a typo in the component's JSX, changing the incorrect variable `statusCode` to the correct `statusConfig`. The fix was applied directly to the file.

2.  **Diagnose and Document Deployment Failure for Existing Users:**
    - **Issue:** Users who created their accounts *before* the logic for saving GitHub tokens was implemented are unable to deploy projects. The backend returns a `403 Forbidden: User GitHub token not found` error.
    - **Root Cause:** The `api/deploy` endpoint requires a `githubAccessToken` for the user, which is missing from their record in the Firebase database.
    - **Solution:** Affected users must **sign out and sign back in**. This action triggers the `postAuthData` function in the `AuthProvider`, which fetches a new token from GitHub and saves it to the user's record in the database, resolving the issue for all future deployments.

### Next Steps

- **Critical:** The user still needs to fix the `FIREBASE_PRIVATE_KEY` environment variable. The current key is malformed, which prevents server-side Firebase Admin SDK initialization and is a likely cause of many backend issues.
- **Deployment:** The user needs to set up **Firebase App Hosting** for deploying this Next.js server application, as Firebase Hosting Classic is not suitable.
