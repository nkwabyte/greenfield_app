# **App Name**: GREENFIELD CRM

## Core Features:

- Excel Upload & Parse: Accepts Excel uploads, parses farmer records from each sheet (excluding the first summary sheet), and stores them locally.
- Excel Upload & Parse: Accepts Excel uploads, parses farmer records from each sheet (excluding the first summary sheet), and stores them locally. Includes error handling during the database registration process for individual records. The system continues processing other records and generates a report of failed registrations for manual review.
- Offline Sync Logic: Detects internet connectivity and automatically synchronizes local records with Firestore, resolving any data conflicts to maintain consistency with Firebase as the source of truth.

- Farmer Management: Supports full CRUD operations for farmer data, allowing users to view, create, edit, and delete farmer records, with changes reflected both locally and in the cloud based on connectivity.
- Interactive Analytics Dashboard: Features a dashboard with KPIs (total farmers, counts by region, gender ratios), interactive filters, and charts for visualizing farmer data.
- Authentication and Roles: Utilizes Firebase Authentication for user login, implementing role-based access control to restrict access based on user roles (Admin, Employee).
- Data Export: Allows users to export farmer and inventory data into Excel or CSV formats, respecting any applied filters to customize the exported data.
- AI Assistant & Insights: Includes an AI assistant tool that provides real-time business insights and analytics by accessing and analyzing platform data; the tool suggests business decisions for optimization.

## Style Guidelines:

- Primary color: Natural green (#77DD77), inspired by agriculture.
- Background color: Light, desaturated green (#E8F8E8) for a calming backdrop.
- Accent color: Golden yellow (#FFD700) to represent wealth and harvest, providing contrast to the green hues.
- Headline font: 'Poppins' (sans-serif) for a contemporary, precise feel.
- Body font: 'PT Sans' (sans-serif) for a humanist, warm feel. Paired with Poppins.
- Use nature-inspired icons relevant to agricultural activities.
- Responsive layout to ensure optimal viewing experience across various devices.