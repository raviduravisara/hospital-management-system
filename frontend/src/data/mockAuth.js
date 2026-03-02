/**
 * Mock authentication credentials for development/testing.
 * Isolated here to keep component code clean.
 * Remove or replace with real API calls in production.
 */
export const MOCK_USERS = [
    {
        email: 'doctor@hospital.com',
        password: 'password123',
        role: 'doctor',
        name: 'Dr. Sarah Johnson',
        token: 'mock-jwt-token-doctor-001',
    },
    {
        email: 'admin@hospital.com',
        password: 'admin123',
        role: 'admin',
        name: 'Admin User',
        token: 'mock-jwt-token-admin-002',
    },
];

/**
 * Simulates an async login API call using mock data.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export async function mockLogin(email, password) {
    // Simulate network latency
    await new Promise((res) => setTimeout(res, 800));

    const user = MOCK_USERS.find(
        (u) => u.email === email && u.password === password
    );

    if (!user) {
        throw new Error('Invalid email or password.');
    }

    const { token, ...userData } = user;
    return { token, user: userData };
}
