using HospitalAPI.Models;

namespace HospitalAPI.Services;

public interface IAuthService
{
    Task<RegisterResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthResult> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken);
    Task LogoutAsync(int userId, LogoutRequest request, CancellationToken cancellationToken);
    Task<UserProfileResponse?> GetProfileAsync(int userId, CancellationToken cancellationToken);
}
