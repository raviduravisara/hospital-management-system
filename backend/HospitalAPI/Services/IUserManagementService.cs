using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IUserManagementService
{
    Task<AdminUserOperationResult> CreateAsync(AdminUserCreateRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<AdminUserResponse>> GetAllAsync(string? role, bool? isActive, string? search, CancellationToken cancellationToken);

    Task<AdminUserResponse?> GetByIdAsync(int userId, CancellationToken cancellationToken);

    Task<AdminUserOperationResult> UpdateAsync(int userId, AdminUserUpdateRequest request, CancellationToken cancellationToken);

    Task<AdminUserOperationResult> UpdateStatusAsync(int userId, bool isActive, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(int userId, CancellationToken cancellationToken);
}
