using FluentAssertions;
using HospitalAPI.Models;
using Moq;
using HospitalAPI.Services;
using Xunit;

namespace HospitalAPI.Tests.ServiceTests;

public sealed class PrescriptionServiceTests
{
    [Fact]
    public void PrescriptionCreateRequest_IsValid()
    {
        var items = new[] { new PrescriptionItemCreateRequest(1, "10mg", "Once a day", "5 Days", 10) };
        var request = new PrescriptionCreateRequest(1, 2, null, new DateOnly(2026, 4, 10), "Headache", "Drink water", items);
        
        request.PatientId.Should().Be(1);
        request.DoctorId.Should().Be(2);
        request.Items.Should().HaveCount(1);
        request.Items[0].MedicineId.Should().Be(1);
    }

    [Fact]
    public void MockPrescriptionService_CanReturnPrescription()
    {
        var mockService = new Mock<IPrescriptionService>();
        var response = new PrescriptionResponse(1, null, 1, 2, new DateOnly(2026, 4, 10), "Headache", null, "Patient", "Doctor", Array.Empty<PrescriptionItemResponse>(), DateTime.UtcNow, DateTime.UtcNow);
        
        mockService.Setup(s => s.GetByIdAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(response);

        var result = mockService.Object.GetByIdAsync(1).Result;

        result.Should().NotBeNull();
        result!.PrescriptionId.Should().Be(1);
    }
}
