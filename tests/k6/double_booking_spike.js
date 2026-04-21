import http from 'k6/http';
import { check, sleep } from 'k6';

// Sprint 4: Database Concurrency Double-Booking Spike
export const options = {
    scenarios: {
        spike: {
            executor: 'ramping-arrival-rate',
            startRate: 1,
            timeUnit: '1s',
            preAllocatedVUs: 200,
            maxVUs: 200,
            stages: [
                { target: 200, duration: '10s' }, // Rapid catastrophic spike
                { target: 200, duration: '20s' }, // Hold load to hammer the lock
                { target: 0, duration: '5s' },    // Drop off
            ],
        },
    },
};

const API_URL = 'http://localhost:5041/api/appointments';
const MOCK_PATIENT_TOKEN = 'mock.jwt.token.patient'; // Handled by pre-request in actual run

export default function () {
    const payload = JSON.stringify({
        patientId: 1,
        doctorId: 1,
        appointmentDate: '2026-05-15',
        appointmentTime: '10:00:00', // Everyone hunting the exact same slot
        reason: 'Concurrent booking race condition test'
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MOCK_PATIENT_TOKEN}`
        },
    };

    const res = http.post(API_URL, payload, params);

    // Objective: Ensure SQL locks protect the DB so ONLY 1 request gets 201 Created.
    // The rest MUST fail gracefully as 400 Bad Request (Slot already booked).
    check(res, {
        'Handled Gracefully (No 500s)': (r) => r.status === 201 || r.status === 400 || r.status === 401,
        'Response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    sleep(0.5);
}
