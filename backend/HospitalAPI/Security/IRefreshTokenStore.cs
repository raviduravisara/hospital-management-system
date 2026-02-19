namespace HospitalAPI.Security;

public interface IRefreshTokenStore
{
    string Issue(int userId, string username, string role, DateTime expiresAtUtc);
    bool TryValidate(string refreshToken, out int userId);
    bool Revoke(string refreshToken);
    void RevokeAllForUser(int userId);
}
