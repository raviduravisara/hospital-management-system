using FluentAssertions;
using HospitalAPI.Models;
using HospitalAPI.Services;
using Moq;

namespace HospitalAPI.Tests.ServiceTests;

/// <summary>
/// Unit tests for IUserManagementService.
/// Uses Moq to isolate the service from the database.
/// Pattern: Arrange → Act → Assert
/// </summary>
public sealed class UserManagementServiceTests
{
    private readonly Mock<IUserManagementService> _serviceMock;

    public UserManagementServiceTests()
    {
        _serviceMock = new Mock<IUserManagementService>();
    }

    // ─────────────────────────────────────────────
    // GetByIdAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ExistingUser_ReturnsUserResponse()
    {
        // Arrange
        var expected = new AdminUserResponse(
            UserId: 1,
            Username: "john_doe",
            Email: "john@hospital.com",
            Role: "Doctor",
            IsActive: true,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow);

        _serviceMock
            .Setup(s => s.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _serviceMock.Object.GetByIdAsync(1, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.UserId.Should().Be(1);
        result.Username.Should().Be("john_doe");
        result.Role.Should().Be("Doctor");
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentUser_ReturnsNull()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AdminUserResponse?)null);

        // Act
        var result = await _serviceMock.Object.GetByIdAsync(999, CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_ServiceThrows_PropagatesException()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetByIdAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Database connection failed."));

        // Act
        var act = async () => await _serviceMock.Object.GetByIdAsync(1, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database connection failed.");
    }

    // ─────────────────────────────────────────────
    // CreateAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_ReturnsSuccessResult()
    {
        // Arrange
        var request = new AdminUserCreateRequest(
            Username: "newdoctor",
            Email: "newdoctor@hospital.com",
            Password: "Doc@1234",
            Role: "Doctor",
            IsActive: true);

        var expected = new AdminUserOperationResult(
            Success: true,
            Message: "User created successfully.",
            User: new AdminUserResponse(5, "newdoctor", "newdoctor@hospital.com", "Doctor", true, DateTime.UtcNow, DateTime.UtcNow));

        _serviceMock
            .Setup(s => s.CreateAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _serviceMock.Object.CreateAsync(request, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.User.Should().NotBeNull();
        result.User!.Username.Should().Be("newdoctor");
    }

    [Fact]
    public async Task CreateAsync_DuplicateUsername_ReturnsFailureResult()
    {
        // Arrange
        var request = new AdminUserCreateRequest(
            Username: "existinguser",
            Email: "e@hospital.com",
            Password: "Pass@1234",
            Role: "Patient",
            IsActive: true);

        var expected = new AdminUserOperationResult(
            Success: false,
            Message: "Username already exists.",
            User: null);

        _serviceMock
            .Setup(s => s.CreateAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _serviceMock.Object.CreateAsync(request, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.User.Should().BeNull();
        result.Message.Should().Contain("already exists");
    }

    [Fact]
    public async Task CreateAsync_ServiceThrows_PropagatesException()
    {
        // Arrange
        var request = new AdminUserCreateRequest("u", "u@h.com", "p", "Admin", true);

        _serviceMock
            .Setup(s => s.CreateAsync(It.IsAny<AdminUserCreateRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("DB timeout."));

        // Act
        var act = async () => await _serviceMock.Object.CreateAsync(request, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<TimeoutException>();
    }

    // ─────────────────────────────────────────────
    // UpdateStatusAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatusAsync_ExistingUser_ReturnsSuccessResult()
    {
        // Arrange
        var expected = new AdminUserOperationResult(
            Success: true,
            Message: "Status updated.",
            User: new AdminUserResponse(3, "patient1", "p@h.com", "Patient", false, DateTime.UtcNow, DateTime.UtcNow));

        _serviceMock
            .Setup(s => s.UpdateStatusAsync(3, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _serviceMock.Object.UpdateStatusAsync(3, false, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.User!.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateStatusAsync_NonExistentUser_ReturnsFailure()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.UpdateStatusAsync(999, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminUserOperationResult(false, "User not found.", null));

        // Act
        var result = await _serviceMock.Object.UpdateStatusAsync(999, true, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("not found");
    }

    // ─────────────────────────────────────────────
    // DeleteAsync
    // ─────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_ExistingUser_ReturnsTrue()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.DeleteAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _serviceMock.Object.DeleteAsync(2, CancellationToken.None);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteAsync_NonExistentUser_ReturnsFalse()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.DeleteAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _serviceMock.Object.DeleteAsync(999, CancellationToken.None);

        // Assert
        result.Should().BeFalse();
    }

    // ─────────────────────────────────────────────
    // GetAllAsync (filtering)
    // ─────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_FilterByRole_ReturnsDoctorsOnly()
    {
        // Arrange
        var doctors = new List<AdminUserResponse>
        {
            new(1, "doc1", "doc1@h.com", "Doctor", true, DateTime.UtcNow, DateTime.UtcNow),
            new(2, "doc2", "doc2@h.com", "Doctor", true, DateTime.UtcNow, DateTime.UtcNow),
        };

        _serviceMock
            .Setup(s => s.GetAllAsync("Doctor", null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(doctors);

        // Act
        var result = await _serviceMock.Object.GetAllAsync("Doctor", null, null, CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(u => u.Role.Should().Be("Doctor"));
    }

    [Fact]
    public async Task GetAllAsync_NoUsers_ReturnsEmptyList()
    {
        // Arrange
        _serviceMock
            .Setup(s => s.GetAllAsync(null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AdminUserResponse>());

        // Act
        var result = await _serviceMock.Object.GetAllAsync(null, null, null, CancellationToken.None);

        // Assert
        result.Should().BeEmpty();
    }
}
