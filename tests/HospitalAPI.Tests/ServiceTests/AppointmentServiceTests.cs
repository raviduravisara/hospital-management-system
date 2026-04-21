using FluentAssertions;
using HospitalAPI.Models;
using Moq;
using HospitalAPI.Services;
using Xunit;

namespace HospitalAPI.Tests.ServiceTests;

public sealed class AppointmentServiceTests
{
    [Fact]
    public void AppointmentCreateRequest_HasExpectedValues()
    {
        var request = new AppointmentCreateRequest(1, 2, new DateOnly(2026, 4, 10), new TimeOnly(10, 0), "Checkup");
        request.PatientId.Should().Be(1);
        request.DoctorId.Should().Be(2);
        request.Reason.Should().Be("Checkup");
    }

    [Fact]
    public void AppointmentStatusUpdateRequest_HasExpectedValues()
    {
        var request = new AppointmentStatusUpdateRequest("Accepted");
        request.Status.Should().Be("Accepted");
    }

    [Fact]
    public async Task MockAppointmentService_CanReturnAvailableSlots()
    {
        var mockService = new Mock<IAppointmentService>();
        mockService.Setup(s => s.GetAvailableSlotsAsync(It.IsAny<int>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new TimeOnly(10, 0) });

        var result = await mockService.Object.GetAvailableSlotsAsync(2, new DateOnly(2026, 4, 10));
        
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
    }
}
