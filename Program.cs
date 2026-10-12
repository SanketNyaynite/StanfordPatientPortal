using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using StanfordPatientPortal.Data;
using StanfordPatientPortal.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("Default")
        ?? "Data Source=patients.db"
    )
);

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/";
        options.Cookie.Name = "StanfordDemo.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.SlidingExpiration = true;

        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode =
                        StatusCodes.Status401Unauthorized;

                    return Task.CompletedTask;
                }

                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            },

            OnRedirectToAccessDenied = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode =
                        StatusCodes.Status403Forbidden;

                    return Task.CompletedTask;
                }

                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddAntiforgery();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// Initialize the database and seed demo data.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    db.Database.EnsureCreated();

    if (!db.Patients.Any())
    {
        var p1 = new Patient
        {
            MRN = "MRN100245",
            FirstName = "Jordan",
            LastName = "Lee",
            DOB = new DateTime(1985, 4, 12),
            Gender = "Female",
            PhoneNumber = "555-0101",
            AddressLine1 = "100 Oak Street",
            City = "Palo Alto",
            State = "CA",
            ZipCode = "94301"
        };

        var p2 = new Patient
        {
            MRN = "MRN100389",
            FirstName = "Michael",
            LastName = "Rivera",
            DOB = new DateTime(1972, 9, 3),
            Gender = "Male",
            PhoneNumber = "555-0102",
            AddressLine1 = "25 Pine Avenue",
            City = "Stanford",
            State = "CA",
            ZipCode = "94305"
        };

        var p3 = new Patient
        {
            MRN = "MRN100517",
            FirstName = "Avery",
            LastName = "Patel",
            DOB = new DateTime(1996, 1, 27),
            Gender = "Nonbinary",
            PhoneNumber = "555-0103",
            AddressLine1 = "8 Garden Lane",
            City = "Menlo Park",
            State = "CA",
            ZipCode = "94025"
        };

        db.Patients.AddRange(p1, p2, p3);
        db.SaveChanges();

        db.Allergies.AddRange(
            new Allergy
            {
                PatientId = p1.PatientId,
                AllergyName = "Penicillin",
                Severity = "High",
                Status = "Active",
                RecordedDate = DateTime.Today.AddDays(-120)
            },
            new Allergy
            {
                PatientId = p2.PatientId,
                AllergyName = "Latex",
                Severity = "Moderate",
                Status = "Active",
                RecordedDate = DateTime.Today.AddDays(-80)
            }
        );

        db.Alerts.AddRange(
            new PatientAlert
            {
                PatientId = p1.PatientId,
                Title = "Fall risk",
                Severity = "High",
                Status = "Active",
                Message = "Use fall-prevention precautions."
            },
            new PatientAlert
            {
                PatientId = p2.PatientId,
                Title = "Interpreter requested",
                Severity = "Info",
                Status = "Active",
                Message = "Confirm preferred language at check-in."
            }
        );

        db.Medications.AddRange(
            new Medication
            {
                PatientId = p1.PatientId,
                MedicationName = "Lisinopril",
                Strength = "10 mg",
                DosageInstructions = "Take one tablet by mouth",
                Frequency = "Daily",
                Route = "Oral",
                StartDate = DateTime.Today.AddMonths(-4),
                PrescribingProvider = "Demo Provider",
                Status = "Active"
            },
            new Medication
            {
                PatientId = p2.PatientId,
                MedicationName = "Metformin",
                Strength = "500 mg",
                DosageInstructions = "Take one tablet with food",
                Frequency = "Twice daily",
                Route = "Oral",
                StartDate = DateTime.Today.AddMonths(-2),
                PrescribingProvider = "Demo Provider",
                Status = "Active"
            }
        );

        db.Documents.AddRange(
            new PatientDocument
            {
                PatientId = p1.PatientId,
                DocumentName = "Visit Summary.txt",
                DocumentType = "Text",
                DocumentDate = DateTime.Today.AddDays(-12),
                FilePath = "/documents/visit-summary.txt",
                UploadedDate = DateTime.Today.AddDays(-12)
            },
            new PatientDocument
            {
                PatientId = p1.PatientId,
                DocumentName = "Patient Information.svg",
                DocumentType = "Image",
                DocumentDate = DateTime.Today.AddDays(-30),
                FilePath = "/documents/patient-info.svg",
                UploadedDate = DateTime.Today.AddDays(-30)
            },
            new PatientDocument
            {
                PatientId = p2.PatientId,
                DocumentName = "Medication Notes.txt",
                DocumentType = "Text",
                DocumentDate = DateTime.Today.AddDays(-7),
                FilePath = "/documents/medication-notes.txt",
                UploadedDate = DateTime.Today.AddDays(-7)
            }
        );

        db.SaveChanges();
    }
}

// Authentication endpoints.
app.MapPost(
    "/api/auth/login",
    async (HttpContext context, LoginRequest request) =>
    {
        // Assessment demo only: replace with ASP.NET Core Identity
        // or enterprise SSO before production.
        var configuredUser =
            app.Configuration["DemoAuth:Username"]
            ?? "demo@stanford.test";

        var configuredPassword =
            app.Configuration["DemoAuth:Password"]
            ?? "StanfordDemo!2026";

        if (request.Username != configuredUser ||
            request.Password != configuredPassword)
        {
            return Results.Unauthorized();
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, configuredUser),
            new Claim(ClaimTypes.Role, "ClinicalViewer")
        };

        var identity = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        await context.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity)
        );

        return Results.Ok(new { user = configuredUser });
    }
).AllowAnonymous();

app.MapPost(
    "/api/auth/logout",
    async (HttpContext context) =>
    {
        await context.SignOutAsync(
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        return Results.Ok();
    }
).RequireAuthorization();

app.MapGet(
    "/api/auth/me",
    (ClaimsPrincipal user) =>
        Results.Ok(new { user = user.Identity?.Name })
).RequireAuthorization();

// Patient search endpoint.
app.MapGet(
    "/api/patients/search",
    async (
        string? mrn,
        string? dob,
        string? firstName,
        string? lastName,
        AppDbContext db
    ) =>
    {
        var q = db.Patients
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(mrn))
        {
            q = q.Where(p => p.MRN.Contains(mrn));
        }

        if (!string.IsNullOrWhiteSpace(firstName))
        {
            q = q.Where(p => p.FirstName.Contains(firstName));
        }

        if (!string.IsNullOrWhiteSpace(lastName))
        {
            q = q.Where(p => p.LastName.Contains(lastName));
        }

        if (!string.IsNullOrWhiteSpace(dob) &&
            DateTime.TryParse(dob, out var parsed))
        {
            q = q.Where(p => p.DOB.Date == parsed.Date);
        }

        var patients = await q
            .OrderBy(p => p.LastName)
            .ThenBy(p => p.FirstName)
            .Take(50)
            .Select(p => new
            {
                p.PatientId,
                p.MRN,
                p.FirstName,
                p.LastName,
                DOB = p.DOB.ToString("yyyy-MM-dd"),
                p.Gender
            })
            .ToListAsync();

        return Results.Ok(patients);
    }
).RequireAuthorization();

// Individual patient endpoint.
app.MapGet(
    "/api/patients/{id:int}",
    async (int id, AppDbContext db) =>
    {
        var p = await db.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.PatientId == id);

        return p is null
            ? Results.NotFound()
            : Results.Ok(p);
    }
).RequireAuthorization();

// Allergy endpoint.
app.MapGet(
    "/api/patients/{id:int}/allergies",
    async (int id, AppDbContext db) =>
        Results.Ok(
            await db.Allergies
                .AsNoTracking()
                .Where(x => x.PatientId == id)
                .OrderBy(x => x.AllergyName)
                .ToListAsync()
        )
).RequireAuthorization();

// Patient alerts endpoint.
app.MapGet(
    "/api/patients/{id:int}/alerts",
    async (int id, AppDbContext db) =>
        Results.Ok(
            await db.Alerts
                .AsNoTracking()
                .Where(x => x.PatientId == id)
                .OrderBy(x => x.Severity)
                .ToListAsync()
        )
).RequireAuthorization();

// Medication endpoint.
app.MapGet(
    "/api/patients/{id:int}/medications",
    async (int id, AppDbContext db) =>
        Results.Ok(
            await db.Medications
                .AsNoTracking()
                .Where(x => x.PatientId == id)
                .OrderBy(x => x.MedicationName)
                .ToListAsync()
        )
).RequireAuthorization();

// Patient documents endpoint.
app.MapGet(
    "/api/patients/{id:int}/documents",
    async (int id, AppDbContext db) =>
        Results.Ok(
            await db.Documents
                .AsNoTracking()
                .Where(x => x.PatientId == id)
                .OrderByDescending(x => x.DocumentDate)
                .ToListAsync()
        )
).RequireAuthorization();

app.MapFallbackToFile("index.html");

app.Run();

record LoginRequest(string Username, string Password);