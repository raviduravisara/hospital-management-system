using HospitalAPI.Models;
using HospitalAPI.Services;

namespace HospitalAPI.Tests;

public sealed class ConsultationServiceTests
{
    [Fact]
    public void ValidateCreateRequest_RequiresPatientId()
    {
        var request = new ConsultationNoteCreateRequest(
            PatientId: 0,
            AppointmentId: null,
            ConsultationDate: new DateOnly(2026, 4, 3),
            ChiefComplaint: null,
            Diagnosis: null,
            TreatmentPlan: null,
            Notes: null);

        var result = ConsultationNoteRules.ValidateCreateRequest(request);

        result.Should().Be("Patient is required.");
    }

    [Fact]
    public void ValidateCreateRequest_RejectsTooLongChiefComplaint()
    {
        var request = new ConsultationNoteCreateRequest(
            PatientId: 1,
            AppointmentId: null,
            ConsultationDate: new DateOnly(2026, 4, 3),
            ChiefComplaint: new string('a', 501),
            Diagnosis: null,
            TreatmentPlan: null,
            Notes: null);

        var result = ConsultationNoteRules.ValidateCreateRequest(request);

        result.Should().Be("Chief complaint cannot exceed 500 characters.");
    }

    [Fact]
    public void ValidateUpdateRequest_RejectsTooLongDiagnosis()
    {
        var request = new ConsultationNoteUpdateRequest(
            PatientId: 10,
            AppointmentId: null,
            ConsultationDate: new DateOnly(2026, 4, 3),
            ChiefComplaint: null,
            Diagnosis: new string('d', 1001),
            TreatmentPlan: null,
            Notes: null);

        var result = ConsultationNoteRules.ValidateUpdateRequest(request);

        result.Should().Be("Diagnosis cannot exceed 1000 characters.");
    }

    [Fact]
    public void ValidateUpdateRequest_RejectsTooLongTreatmentPlan()
    {
        var request = new ConsultationNoteUpdateRequest(
            PatientId: 10,
            AppointmentId: null,
            ConsultationDate: new DateOnly(2026, 4, 3),
            ChiefComplaint: null,
            Diagnosis: null,
            TreatmentPlan: new string('t', 1001),
            Notes: null);

        var result = ConsultationNoteRules.ValidateUpdateRequest(request);

        result.Should().Be("Treatment plan cannot exceed 1000 characters.");
    }

    [Fact]
    public void ValidateUpdateRequest_RejectsTooLongNotes()
    {
        var request = new ConsultationNoteUpdateRequest(
            PatientId: 10,
            AppointmentId: null,
            ConsultationDate: new DateOnly(2026, 4, 3),
            ChiefComplaint: null,
            Diagnosis: null,
            TreatmentPlan: null,
            Notes: new string('n', 2001));

        var result = ConsultationNoteRules.ValidateUpdateRequest(request);

        result.Should().Be("Notes cannot exceed 2000 characters.");
    }

    [Fact]
    public void ValidateCreateRequest_ReturnsNullForValidPayload()
    {
        var request = new ConsultationNoteCreateRequest(
            PatientId: 10,
            AppointmentId: 2,
            ConsultationDate: new DateOnly(2026, 4, 3),
            ChiefComplaint: "Headache",
            Diagnosis: "Migraine",
            TreatmentPlan: "Hydration and rest",
            Notes: "Follow-up in one week");

        var result = ConsultationNoteRules.ValidateCreateRequest(request);

        result.Should().BeNull();
    }

    [Fact]
    public void NormalizeNullable_TrimsAndNormalizesCorrectly()
    {
        ConsultationNoteRules.NormalizeNullable("  hello ", 10).Should().Be("hello");
        ConsultationNoteRules.NormalizeNullable("   ", 10).Should().BeNull();
        ConsultationNoteRules.NormalizeNullable(new string('x', 11), 10).Should().BeNull();
    }
}
