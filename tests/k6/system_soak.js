import http from 'k6/http';
import { check, sleep } from 'k6';

// Sprint 4: Database Steadiness Soak Test
export const options = {
    stages: [
        { duration: '30s', target: 50 }, // Ramp up to 50 users
        { duration: '3m', target: 50 },  // Stay at 50 users for 3 minutes (Soak)
        { duration: '30s', target: 0 },  // Ramp down
    ],
};

const BASE_URL = 'http://localhost:5041/api/doctors/search'; // Example heavy fetch endpoint

export default function () {
    const res = http.get(`${BASE_URL}?is_active=true`);

    // Objective: Ensure 100% success rate under continuous steady load, finding memory leaks.
    check(res, {
        'Status is 200': (r) => r.status === 200,
        'Response time < 400ms (P95 Goal)': (r) => r.timings.duration < 400,
    });

    sleep(1); // Simulate user think-time between clicks
}
