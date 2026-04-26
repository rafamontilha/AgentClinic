"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentClinicClient = exports.AgentClinicError = void 0;
class AgentClinicError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = "AgentClinicError";
        this.status = status;
        this.code = code;
    }
}
exports.AgentClinicError = AgentClinicError;
class AgentClinicClient {
    constructor({ baseUrl, apiKey }) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.apiKey = apiKey;
    }
    async request(path, method, body) {
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
        };
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const errorCode = data.error ?? "unknown";
            throw new AgentClinicError(res.status, errorCode, JSON.stringify(data));
        }
        return data;
    }
    register(params) {
        return this.request("/api/patients", "POST", params);
    }
    getPatient(id) {
        return this.request(`/api/patients/${id}`, "GET");
    }
    submitVisit(params) {
        return this.request("/api/visits", "POST", params);
    }
    getVisit(id) {
        return this.request(`/api/visits/${id}`, "GET");
    }
    submitFollowup(visitId, outcome) {
        return this.request(`/api/visits/${visitId}/followup`, "POST", { outcome });
    }
}
exports.AgentClinicClient = AgentClinicClient;
