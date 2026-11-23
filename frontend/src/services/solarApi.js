/**
 * API client service for SolarX AI FastAPI Backend.
 */

const rawUrl = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE = rawUrl
  ? rawUrl.replace(/\/+$/, '').endsWith('/api')
    ? rawUrl.replace(/\/+$/, '')
    : `${rawUrl.replace(/\/+$/, '')}/api`
  : '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend unreachable');
  return res.json();
}

export async function predictPower(features, algorithm = 'Gradient Boosting', inverterCount = 1) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      features,
      algorithm,
      inverter_count: Number(inverterCount),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Prediction request failed');
  }
  return res.json();
}

export async function quickLossCheck(actualAcPower, features, algorithm = 'Gradient Boosting') {
  const res = await fetch(`${API_BASE}/loss-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actual_ac_power: Number(actualAcPower),
      features,
      algorithm,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Loss check failed');
  }
  return res.json();
}

export async function fetchDemoAudit(algorithm = 'Gradient Boosting', plantId = null) {
  const params = new URLSearchParams({ algorithm });
  if (plantId) params.set('plant_id', String(plantId));
  const res = await fetch(`${API_BASE}/demo-audit?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Demo audit failed');
  }
  return res.json();
}

export async function uploadCsvAudit(file, algorithm = 'Gradient Boosting') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('algorithm', algorithm);
  const res = await fetch(`${API_BASE}/loss-audit-csv`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'CSV upload audit failed');
  }
  return res.json();
}

export async function fetchLiveForecast({
  latitude = 12.97,
  longitude = 77.59,
  days = 3,
  inverterCount = 1,
  algorithm = 'Gradient Boosting',
}) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    days: String(days),
    inverter_count: String(inverterCount),
    algorithm,
  });
  const res = await fetch(`${API_BASE}/forecast?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Forecast request failed');
  }
  return res.json();
}

export async function fetchModelsMetadata() {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error('Failed to load model metadata');
  return res.json();
}
