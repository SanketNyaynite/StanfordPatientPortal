# CarePoint

An ASP.NET Core 8 + C# + EF Core + SQLite patient-search demo with a responsive HTML/CSS/JavaScript interface and REST API.

> **Important:** All seeded patient records are fictional. This is an assessment prototype, not a production clinical system. Do not enter real patient information.

## Requirements
- .NET 8 SDK
- Visual Studio 2022 (ASP.NET and web development workload) or .NET CLI

## Run in Visual Studio 2022
1. Extract the ZIP.
2. Open `StanfordPatientPortal.csproj` in Visual Studio 2022.
3. Allow NuGet package restore.
4. Select the project as startup project and press **F5**.
5. Sign in with the demo credentials below.

## Run with the CLI
From this folder:
```bash
dotnet restore
dotnet run
```
Open the localhost URL shown in the terminal.

## Demo sign-in
- Email: `demo@stanford.test`
- Password: `StanfordDemo!2026`

You can override `DemoAuth:Username` and `DemoAuth:Password` using .NET configuration/environment variables. This simple fixed-credential login is only for demonstrating the workflow. For production, replace it with ASP.NET Core Identity or an approved enterprise identity provider (Google/Microsoft/SSO), add CSRF protections and security review, audit access, and enforce least privilege.

## Features implemented
- Login/logout using an HTTP-only authentication cookie
- Search by MRN, first name, last name, and date of birth
- Patient demographics, allergies, alerts, medications, and document list
- Open sample text and SVG documents
- Print patient demographics, allergies, alerts, and medications; browser print dialog lets the user save as PDF
- REST endpoints protected by authorization
- SQLite database initialized and seeded with fictional data on first run
- Responsive UI, basic validation, error messages, and empty states

## API routes
All routes except login require an authenticated session.
- `POST /api/auth/login` — JSON body `{ "username": "...", "password": "..." }`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/patients/search?mrn=&firstName=&lastName=&dob=`
- `GET /api/patients/{id}`
- `GET /api/patients/{id}/allergies`
- `GET /api/patients/{id}/alerts`
- `GET /api/patients/{id}/medications`
- `GET /api/patients/{id}/documents`

## Suggested improvements before submission
1. Replace the fixed demo login with ASP.NET Core Identity or OAuth/enterprise SSO.
2. Add automated tests for search filters, authorization, and API responses.
3. Add server-side validation and structured exception handling.
4. Add audit logging, rate limiting, and role-based access.
5. Add database migrations instead of `EnsureCreated`.
6. If time permits, add sample PDF/DOCX files and validate document file types and access controls.
7. Include a short architecture overview and screenshots in your submission notes.

## Architecture
- `Program.cs`: app configuration, cookie authentication, seed data, REST APIs
- `Models/Entities.cs`: patient and related data entities
- `Data/AppDbContext.cs`: EF Core SQLite context
- `wwwroot/index.html`: UI layout
- `wwwroot/css/site.css`: responsive styling
- `wwwroot/js/app.js`: login, patient search, tabs, API calls, print-to-PDF
- `wwwroot/documents/`: fictional sample documents
