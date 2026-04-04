using HospitalAPI.Models;

namespace HospitalAPI.Services;

public static class ConsultationNoteRules
{
    public static string? ValidateCreateRequest(ConsultationNoteCreateRequest request)
    {
        if (request.PatientId <= 0)
        {
            return "Patient is required.";
        }

        return ValidateCommon(
            request.ChiefComplaint,
            request.Diagnosis,
            request.TreatmentPlan,
            request.Notes);
    }

    public static string? ValidateUpdateRequest(ConsultationNoteUpdateRequest request)
    {
        if (request.PatientId <= 0)
        {
            return "Patient is required.";
        }

        return ValidateCommon(
            request.ChiefComplaint,
            request.Diagnosis,
            request.TreatmentPlan,
            request.Notes);
    }

    public static string? NormalizeNullable(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
        {
            return null;
        }

        return trimmed;
    }

    private static string? ValidateCommon(string? chiefComplaint, string? diagnosis, string? treatmentPlan, string? notes)
    {
        if (!string.IsNullOrWhiteSpace(chiefComplaint) && chiefComplaint.Trim().Length > 500)
        {
            return "Chief complaint cannot exceed 500 characters.";
        }

        if (!string.IsNullOrWhiteSpace(diagnosis) && diagnosis.Trim().Length > 1000)
        {
            return "Diagnosis cannot exceed 1000 characters.";
        }

        if (!string.IsNullOrWhiteSpace(treatmentPlan) && treatmentPlan.Trim().Length > 1000)
        {
            return "Treatment plan cannot exceed 1000 characters.";
        }

        if (!string.IsNullOrWhiteSpace(notes) && notes.Trim().Length > 2000)
        {
            return "Notes cannot exceed 2000 characters.";
        }

        return null;
    }
}
