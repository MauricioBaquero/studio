# Project Blueprint

This document outlines the file structure of the FacilityFlow application, providing a description for each key file and directory.

## Root Directory

-   `README.md`: Basic introductory information about the Next.js starter project.
-   `apphosting.yaml`: Configuration file for Firebase App Hosting, defining runtime settings and secret environment variables.
-   `components.json`: Configuration for `shadcn/ui`, specifying component paths, styling, and other settings.
-   `firestore.rules`: Security rules for Cloud Firestore, defining access control for the database.
-   `next.config.ts`: Configuration file for Next.js, including settings for TypeScript, ESLint, and image optimization.
-   `package.json`: Lists the project's dependencies and scripts for development, building, and linting.
-   `tailwind.config.ts`: Configuration for Tailwind CSS, defining the theme, custom fonts, colors, and plugins.
-   `tsconfig.json`: TypeScript compiler options for the project.

## `/docs`

-   `backend.json`: A JSON-based schema that defines the data entities, authentication providers, and Firestore database structure for the application.

## `/src/ai`

-   `dev.ts`: Development entry point for Genkit flows.
-   `genkit.ts`: Initializes and configures the Genkit AI instance with necessary plugins.

## `/src/app`

This directory uses the Next.js App Router.

-   `globals.css`: Global stylesheet for the application, including Tailwind CSS imports and `shadcn/ui` theme variables.
-   `layout.tsx`: The root layout for the entire application, wrapping all pages with necessary providers like `ThemeProvider` and `FirebaseClientProvider`.
-   `page.tsx`: The main landing page of the application, which displays the task board.
-   `login/page.tsx`: The user authentication page, handling user sign-in.

### `/src/app/dashboard`

-   `page.tsx`: The main dashboard page, displaying various charts and summaries of task data.

### `/src/app/recurring-tasks`

-   `page.tsx`: Displays scheduled recurring tasks and a log of recently completed ones.

### `/src/app/settings`

-   `layout.tsx`: A nested layout for all settings pages, providing tabbed navigation for different settings sections.
-   `page.tsx`: Redirects to the default general settings page.
-   `categories/page.tsx`: Allows users to manage task categories and subcategories.
-   `categories/category-form.tsx`: A dialog form for creating and editing categories.
-   `general/page.tsx`: A page for managing general application settings, like task completion date ranges.
-   `locations/page.tsx`: Allows users to manage facility locations.
-   `locations/location-form.tsx`: A dialog form for creating and editing locations.
-   `scheduled-maintenance/page.tsx`: Allows users to manage recurring maintenance tasks.
-   `scheduled-maintenance/add-task-form.tsx`: A dialog form for creating and editing recurring tasks.
-   `teams/page.tsx`: Allows admins to manage teams within the organization.
-   `teams/team-form.tsx`: A dialog form for creating and editing teams.
-   `users/page.tsx`: A user management interface for admins.
-   `users/add-user-form.tsx`: A dialog form for creating new users.
-   `users/user-form.tsx`: A dialog form for editing existing user roles and team assignments.

### `/src/app/tickets/new`

-   `page.tsx`: The page for creating a new maintenance ticket.
-   `ticket-form.tsx`: The form component used for submitting new tickets.

## `/src/components`

-   `FirebaseErrorListener.tsx`: A client-side component that listens for and handles global Firebase permission errors.
-   `approval-status-summary.tsx`: A dashboard card summarizing tasks pending review and recently approved.
-   `approvals-by-user-chart.tsx`: A dashboard chart showing the number of tasks approved by each user.
-   `image-viewer-dialog.tsx`: A dialog for displaying an enlarged view of a photo.
-   `open-tasks-by-location-chart.tsx`: A dashboard chart showing the distribution of open tasks across different locations.
-   `recurring-task-filters.tsx`: A component providing filter controls for the recurring tasks page.
-   `recurring-tasks-summary-chart.tsx`: A dashboard card summarizing the status of recurring tasks (overdue, due today, completed).
-   `task-status-chart.tsx`: A dashboard pie chart visualizing the status distribution of all tasks.
-   `task-type-chart.tsx`: A dashboard bar chart showing the breakdown of tasks by sub-category.
-   `tasks-by-assignee-chart.tsx`: A dashboard chart showing the number of tasks assigned to each user.
-   `team-switcher.tsx`: A popover component in the sidebar that allows admins and coordinators to switch between different teams.
-   `theme-provider.tsx`: Manages the application's light/dark theme using `next-themes`.
-   `theme-toggle.tsx`: A button for switching between light and dark themes.
-   `ticket-board.tsx`: The main component that organizes and displays tickets in columns based on their status.
-   `ticket-board-column.tsx`: Renders a single column on the task board for a specific status.
-   `ticket-card.tsx`: Renders a single ticket card with key details and actions.
-   `ticket-details-dialog.tsx`: A dialog for viewing and editing the full details of a ticket.
-   `ticket-filters.tsx`: A component providing filter controls for the main task board.
-   `user-nav.tsx`: A component in the sidebar that displays the current user's information and a logout option.

### `/src/components/layout`

-   `app-layout.tsx`: The main layout component that wraps authenticated pages, handling routing logic and sidebar integration.
-   `header.tsx`: The top header component, primarily for mobile view, containing the sidebar trigger.
-   `sidebar.tsx`: The main application sidebar, containing navigation links, the theme toggle, and user information.

### `/src/components/ui`

This directory contains reusable UI components from `shadcn/ui`, such as `Button`, `Card`, `Dialog`, `Input`, `Select`, etc. These are the building blocks of the application's interface.

## `/src/firebase`

-   `config.ts`: Contains the Firebase project configuration object.
-   `client-provider.tsx`: A client-side provider that initializes Firebase services and seeds initial data if necessary.
-   `provider.tsx`: The core Firebase React provider that manages and distributes Firebase services (`Auth`, `Firestore`, `Storage`) and user state throughout the app.
-   `index.ts`: A barrel file that exports all necessary Firebase hooks, providers, and utility functions for easy importing.
-   `errors.ts`: Defines a custom `FirestorePermissionError` class for creating detailed, contextual error messages for security rule violations.
-   `error-emitter.ts`: Implements a type-safe event emitter for globally handling specific errors, like permission denials.
-   `non-blocking-login.tsx`: Contains functions for initiating Firebase authentication operations in a non-blocking manner.
-   `non-blocking-updates.tsx`: Contains functions for performing Firestore write operations (`setDoc`, `addDoc`, etc.) with non-blocking error handling.

### `/src/firebase/firestore`

-   `use-collection.tsx`: A React hook for subscribing to a Firestore collection in real-time.
-   `use-doc.tsx`: A React hook for subscribing to a single Firestore document in real-time.

## `/src/hooks`

-   `use-mobile.tsx`: A React hook to detect if the application is being viewed on a mobile-sized screen.
-   `use-toast.ts`: A hook for displaying toast notifications.

## `/src/lib`

-   `actions.ts`: Contains Next.js server actions, which are server-side functions that can be called from client components. (Currently contains an older implementation for ticket creation).
-   `data.ts`: Defines the core data schemas (using `zod`) and TypeScript types for the application's entities (User, Ticket, Category, etc.). It also includes helper functions related to data manipulation.
-   `placeholder-images.json`: A JSON file containing data for placeholder images used throughout the application.
-   `placeholder-images.ts`: Exports the placeholder image data as a typed array.
-   `utils.ts`: Utility functions, including `cn` for merging Tailwind CSS classes.
