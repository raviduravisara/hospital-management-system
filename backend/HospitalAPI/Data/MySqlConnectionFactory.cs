using MySql.Data.MySqlClient;

namespace HospitalAPI.Data;

public sealed class MySqlConnectionFactory(IConfiguration configuration)
{
    private readonly string _connectionString =
        configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");

    public MySqlConnection CreateConnection() => new(_connectionString);
}
