using FluentAssertions;
using HospitalAPI.Models;
using HospitalAPI.Services;
using Moq;

namespace HospitalAPI.Tests.ServiceTests;

/// <summary>
/// Unit tests for IDoctorService.
/// </summary>
public sealed class DoctorServiceTests
{
    private readonly Mock<IDoctorService> _serviceMock;

    public DoctorServiceTests()
    {
        _serviceMock = new Mock<IDoctorService>();
    }

    private static DoctorProfileResponse BuildProfile(
        int doctorId = 1,
        int? userId = 10,
        string license = "LIC-001") =>
        new(
            DoctorId: doctorId,
            FormattedId: $"DOC-{doctorId:D4}",
            UserId: userId,
            FirstName: "Ali",
            LastName: "Hassan",
            Specialization: "Cardiology",
            LicenseNumber: license,
            Phone: "0771234567",
            ConsultationFee: 1500m,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow);

    // ─────────────────────────────────────────────
    // CreateAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_ReturnsCreatedProfile()
    {
        // Arrange
        var request = new DoctorUpsertRequest(
            UserId: null,
            FirstName: "Ali",
            LastName: "Hassan",
            Specialization: "Cardiology",
            LicenseNumber: "LIC-001",
            Phone: "0771234567",
            ConsultationFee: 1500m);

        var expected = new DoctorOperationResult(true, "Doctor created.", BuildProfile());

        _serviceMock
            .Setup(s => s.CreateAsync(request, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _serviceMock.Object.CreateAsync(request, 10, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Doctor.Should().NotBeNull();
        result.Doctor!.LicenseNumber.Should().Be("LIC-001");
        result.Doctor.ConsultationFee.Should().Be(1500m);
    }

    [Fact]
    public async Task CreateAsync_DuplicateLicenseNumber_ReturnsFailure()
    {
        // Arrange
        var request = new DoctorUpsertRequest(null, "B", "B", null, "LIC-001", null, 0);

        _serviceMock
            .Setup(s => s.CreateAsync(request, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DoctorOperationResult(false, "License number already registered.", null));

        // Act
        var result = await _serviceMock.Object.CreateAsync(request, 1, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("License number");
    }

    [Fact]
    public async Task CreateAsync_ServiceThrows_PropagatesException()
    {
        // Arrange
        var request = new DoctorUpsertRequest(null, "C", "C", null, "LIC-99", null, 0);

        _serviceMock
            .Setup(s => s.CreateAsync(It.IsAny<DoctorUpsertRequest>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("DB error"));

        // Act
        var act = async () => await _serviceMock.Object.CreateAsync(request, 1, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<Exception>();
    }

    // ─────────────────────────────────────────────
    // GetByIdAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ExistingDoctor_ReturnsDoctorProfile()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildProfile());

        // Act
        var result = await _serviceMock.Object.GetByIdAsync(1, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.DoctorId.Should().Be(1);
        result.FirstName.Should().Be("Ali");
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentDoctor_ReturnsNull()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((DoctorProfileResponse?)null);

        // Act
        var result = await _serviceMock.Object.GetByIdAsync(999, CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    // ─────────────────────────────────────────────
    // GetByUserIdAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task GetByUserIdAsync_LinkedUser_ReturnsProfile()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetByUserIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildProfile(userId: 10));

        // Act
        var result = await _serviceMock.Object.GetByUserIdAsync(10, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.UserId.Should().Be(10);
    }

    [Fact]
    public async Task GetByUserIdAsync_UnlinkedUser_ReturnsNull()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetByUserIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((DoctorProfileResponse?)null);

        // Act
        var result = await _serviceMock.Object.GetByUserIdAsync(999, CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    // ─────────────────────────────────────────────
    // GetAllAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_WithDoctors_ReturnsAllProfiles()
    {
        // Arrange
        var doctors = new List<DoctorProfileResponse>
        {
            BuildProfile(1, 10, "LIC-001"),
            BuildProfile(2, 11, "LIC-002"),
        };

        _serviceMock
            .Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(doctors);

        // Act
        var result = await _serviceMock.Object.GetAllAsync(CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAllAsync_NoDoctors_ReturnsEmptyList()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DoctorProfileResponse>());

        // Act
        var result = await _serviceMock.Object.GetAllAsync(CancellationToken.None);

        // Assert
        result.Should().BeEmpty();
    }

    // ─────────────────────────────────────────────
    // DeleteAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_ExistingDoctor_ReturnsSuccess()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.DeleteAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DoctorDeleteResult(true, "Doctor deleted successfully."));

        // Act
        var result = await _serviceMock.Object.DeleteAsync(1, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.NotFound.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_NonExistentDoctor_ReturnsNotFound()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.DeleteAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DoctorDeleteResult(false, "Doctor profile not found.", NotFound: true));

        // Act
        var result = await _serviceMock.Object.DeleteAsync(999, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.NotFound.Should().BeTrue();
    }
}
