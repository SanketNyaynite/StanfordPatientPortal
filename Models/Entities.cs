using System.ComponentModel.DataAnnotations;

namespace StanfordPatientPortal.Models;

public class Patient
{
    public int PatientId { get; set; }
    public string MRN { get; set; } = "";
    public string FirstName { get; set; } = ""; 
    public string LastName { get; set; } = ""; 
    public DateTime DOB { get; set; }
    public string Gender { get; set; } = ""; 
    public string PhoneNumber { get; set; } = ""; 
    public string AddressLine1 { get; set; } = ""; 
    public string City { get; set; } = ""; 
    public string State { get; set; } = ""; 
    public string ZipCode { get; set; } = "";
}

public class Allergy
{
    public int AllergyId { get; set; }
    public int PatientId { get; set; }
    public string AllergyName { get; set; } = "";
    public string Severity { get; set; } = "";
    public string Status { get; set; } = "";
    public DateTime RecordedDate { get; set; }
}

public class PatientAlert
{
    public int PatientAlertId { get; set; }
    public int PatientId { get; set; }
    public string Title { get; set; } = "";
    public string Severity { get; set; } = "";
    public string Status { get; set; } = "";
    public string Message { get; set; } = "";
}

public class Medication
{
    public int MedicationId { get; set; }
    public int PatientId { get; set; }
    public string MedicationName { get; set; } = "";
    public string Strength { get; set; } = "";
    public string DosageInstructions { get; set; } = "";
    public string Frequency { get; set; } = "";
    public string Route { get; set; } = "";
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string PrescribingProvider { get; set; } = "";
    public string Status { get; set; } = "";
}

public class PatientDocument
{
    [Key]
    public int DocumentId { get; set; }
    public int PatientId { get; set; }
    public string DocumentName { get; set; } = ""; 
    public string DocumentType { get; set; } = ""; 
    public DateTime DocumentDate { get; set; }
    public string FilePath { get; set; } = ""; 
    public DateTime UploadedDate { get; set; }
}
