using Microsoft.EntityFrameworkCore;
using StanfordPatientPortal.Models;

namespace StanfordPatientPortal.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : DbContext(options)
{
    public DbSet<Patient> Patients => Set<Patient>();

    public DbSet<Allergy> Allergies => Set<Allergy>();

    public DbSet<PatientAlert> Alerts => Set<PatientAlert>();

    public DbSet<Medication> Medications => Set<Medication>();

    public DbSet<PatientDocument> Documents => Set<PatientDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Patient>()
            .HasIndex(p => p.MRN)
            .IsUnique();

        modelBuilder.Entity<Patient>()
            .Property(p => p.MRN)
            .HasMaxLength(20);

        modelBuilder.Entity<Patient>()
            .Property(p => p.FirstName)
            .HasMaxLength(50);

        modelBuilder.Entity<Patient>()
            .Property(p => p.LastName)
            .HasMaxLength(50);
    }
}