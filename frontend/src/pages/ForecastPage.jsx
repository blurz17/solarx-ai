import React, { useState, useEffect } from 'react';
import { fetchLiveForecast } from '../services/solarApi';
import { useTheme } from '../context/ThemeContext';

const CITY_PRESETS = [
  { name: 'Bangalore', lat: 12.97, lon: 77.59 },
  { name: 'Cairo', lat: 30.04, lon: 31.24 },
  { name: 'Aswan', lat: 24.09, lon: 32.90 },
  { name: 'Riyadh', lat: 24.71, lon: 46.68 },
  { name: 'Dubai', lat: 25.20, lon: 55.27 },
  { name: 'Madrid', lat: 40.42, lon: -3.70 },
];

const ALGORITHMS = ['Gradient Boosting', 'XGBoost', 'Random Forest', 'Linear Regression'];

function HourlyForecastChart({ rows, colors, isDark }) {
  if (!rows || rows.length === 0) return null;
  const width = 780;
  const height = 235;
  const padL = 56;
  const padR = 20;
  const padT = 18;
  const padB = 32;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxPower = Math.max(100, ...rows.map((r) => r.predicted_station_total));

  const xFor = (i) => padL + (i / Math.max(1, rows.length - 1)) * plotW;
  const yFor = (val) => padT + plotH - (val / maxPower) * plotH;

  const linePoints = rows.map((r, i) => `${xFor(i)},${yFor(r.predicted_station_total)}`).join(' ');
  const areaPoints = `${padL},${padT + plotH} ${linePoints} ${xFor(rows.length - 1)},${padT + plotH}`;

  const yTicks = [0, 0.5, 1].map((t) => Math.round(maxPower * t));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="forecastArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {yTicks.map((tv, idx) => {
        const y = yFor(tv);
        return (
          <g key={idx}>
            <line
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke={isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}
              strokeDasharray="4 4"
            />
            <text
              x={padL - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
              fill={colors.textMuted}
            >
              {tv.toLocaleString()}
            </text>
          </g>
        );
      })}

      <polygon points={areaPoints} fill="url(#forecastArea)" />
      <polyline
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={linePoints}
      />

      {rows.map((r, i) => (
        <g key={i}>
          <circle
            cx={xFor(i)}
            cy={yFor(r.predicted_station_total)}
            r="3.5"
            fill={r.predicted_station_total > 0 ? '#f59e0b' : '#0ea5e9'}
          >
            <title>{`${String(r.hour).padStart(2, '0')}:00 — ${r.predicted_station_total.toLocaleString()} kW (${r.ambient_temp}°C, Clouds ${r.cloud_cover}%)`}</title>
          </circle>
          {i % 3 === 0 && (
            <text
              x={xFor(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fontFamily="JetBrains Mono, monospace"
              fill={colors.textSecondary}
            >
              {String(r.hour).padStart(2, '0')}:00
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function ForecastPage() {
  const { isDark, colors } = useTheme();

  const [lat, setLat] = useState(12.97);
  const [lon, setLon] = useState(77.59);
  const [cityLabel, setCityLabel] = useState('Bangalore');
  const [days, setDays] = useState(3);
  const [inverterCount, setInverterCount] = useState(22);
  const [algorithm, setAlgorithm] = useState('Gradient Boosting');

  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadForecast = async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLiveForecast({
        latitude: params.lat ?? lat,
        longitude: params.lon ?? lon,
        days: params.days ?? days,
        inverterCount: params.inverterCount ?? inverterCount,
        algorithm: params.algorithm ?? algorithm,
      });
      setData(res);
      if (res.daily_summaries && res.daily_summaries.length > 0) {
        setSelectedDate(res.daily_summaries[0].date);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, []);

  const handleUseMyGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const newLat = Number(pos.coords.latitude.toFixed(4));
      const newLon = Number(pos.coords.longitude.toFixed(4));
      setLat(newLat);
      setLon(newLon);
      setCityLabel('My GPS');
      loadForecast({ lat: newLat, lon: newLon });
    });
  };

  const activeDayRows = data?.hourly?.filter((r) => r.date === selectedDate) || [];
  const activeDaySummary =
    data?.daily_summaries?.find((d) => d.date === selectedDate) || data?.daily_summaries?.[0];

  const cardStyle = {
    backgroundColor: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    padding: '20px',
    boxShadow: colors.shadowCard,
  };

  const inputStyle = {
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.bgInput,
    color: colors.textPrimary,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Clean Header + City Pills */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Solar Forecast</h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '13.5px', color: colors.textSecondary }}>
            Live Open-Meteo weather forecast converted into hourly solar generation.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {CITY_PRESETS.map((c) => {
            const active = cityLabel === c.name;
            return (
              <button
                key={c.name}
                onClick={() => {
                  setLat(c.lat);
                  setLon(c.lon);
                  setCityLabel(c.name);
                  loadForecast({ lat: c.lat, lon: c.lon });
                }}
                className="sx-btn"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: `1px solid ${active ? colors.sky : colors.border}`,
                  backgroundColor: active ? colors.bgCard : 'transparent',
                  color: active ? colors.sky : colors.textSecondary,
                }}
              >
                {c.name}
              </button>
            );
          })}
          <button
            onClick={handleUseMyGps}
            className="sx-btn"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bgCard,
              color: colors.textPrimary,
            }}
          >
            My GPS
          </button>
        </div>
      </div>

      {/* Compact Parameter Row */}
      <div style={cardStyle}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ fontSize: '11.5px', color: colors.textSecondary }}>Latitude</label>
            <input
              type="number"
              step="0.01"
              className="sx-input"
              value={lat}
              onChange={(e) => {
                setLat(Number(e.target.value));
                setCityLabel('Custom');
              }}
              style={{ ...inputStyle, marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11.5px', color: colors.textSecondary }}>Longitude</label>
            <input
              type="number"
              step="0.01"
              className="sx-input"
              value={lon}
              onChange={(e) => {
                setLon(Number(e.target.value));
                setCityLabel('Custom');
              }}
              style={{ ...inputStyle, marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11.5px', color: colors.textSecondary }}>Inverters</label>
            <input
              type="number"
              min="1"
              max="500"
              className="sx-input"
              value={inverterCount}
              onChange={(e) => setInverterCount(Math.max(1, Number(e.target.value)))}
              style={{ ...inputStyle, marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11.5px', color: colors.textSecondary }}>Days</label>
            <select
              className="sx-input"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ ...inputStyle, marginTop: '4px' }}
            >
              <option value={1}>1 Day</option>
              <option value={3}>3 Days</option>
              <option value={5}>5 Days</option>
              <option value={7}>7 Days</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', color: colors.textSecondary }}>Model</label>
            <select
              className="sx-input"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              style={{ ...inputStyle, marginTop: '4px' }}
            >
              {ALGORITHMS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadForecast()}
            disabled={loading}
            className="sx-btn"
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: colors.gradSky,
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            {loading ? 'Loading...' : 'Update'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: colors.rose, fontSize: '13px', fontWeight: 600 }}>{error}</div>}

      {data && activeDaySummary && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            {data.daily_summaries.map((d) => {
              const isSelected = d.date === selectedDate;
              return (
                <div
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className="sx-card-hover"
                  style={{
                    ...cardStyle,
                    cursor: 'pointer',
                    border: `1.5px solid ${isSelected ? colors.sky : colors.border}`,
                  }}
                >
                  <div style={{ fontSize: '12px', color: colors.textSecondary }}>{d.date}</div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: isSelected ? colors.sky : colors.textPrimary,
                      marginTop: '6px',
                    }}
                  >
                    {d.total_daily_energy.toLocaleString()}{' '}
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>kWh</span>
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '4px' }}>
                    Peak {d.peak_station_power.toLocaleString()} kW ({d.peak_hour})
                  </div>
                </div>
              );
            })}
          </div>

          <div style={cardStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '12px',
                fontSize: '14.5px',
                fontWeight: 700,
              }}
            >
              <span>24-Hour Curve ({selectedDate})</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: colors.textSecondary }}>
                {cityLabel} &bull; {data.inverter_count}x inverters
              </span>
            </div>
            <HourlyForecastChart rows={activeDayRows} colors={colors} isDark={isDark} />
          </div>

          <div style={{ ...cardStyle, overflowX: 'auto' }}>
            <div style={{ fontSize: '14.5px', fontWeight: 700, marginBottom: '10px' }}>
              Daylight Schedule
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    textAlign: 'left',
                    color: colors.textSecondary,
                    fontSize: '11.5px',
                  }}
                >
                  <th style={{ padding: '9px' }}>Hour</th>
                  <th style={{ padding: '9px' }}>Radiation</th>
                  <th style={{ padding: '9px' }}>Temp</th>
                  <th style={{ padding: '9px' }}>Clouds</th>
                  <th style={{ padding: '9px' }}>Wind</th>
                  <th style={{ padding: '9px' }}>Per Inverter</th>
                  <th style={{ padding: '9px' }}>Plant Total</th>
                </tr>
              </thead>
              <tbody>
                {activeDayRows
                  .filter((r) => r.shortwave_radiation > 0)
                  .map((r) => (
                    <tr key={r.time} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                      <td className="font-mono" style={{ padding: '9px', fontWeight: 600 }}>
                        {String(r.hour).padStart(2, '0')}:00
                      </td>
                      <td className="font-mono" style={{ padding: '9px' }}>
                        {r.shortwave_radiation} W/m²
                      </td>
                      <td className="font-mono" style={{ padding: '9px' }}>
                        {r.ambient_temp}°C
                      </td>
                      <td className="font-mono" style={{ padding: '9px' }}>
                        {r.cloud_cover}%
                      </td>
                      <td className="font-mono" style={{ padding: '9px' }}>
                        {r.wind_speed} km/h
                      </td>
                      <td className="font-mono" style={{ padding: '9px' }}>
                        {r.predicted_per_inverter} kW
                      </td>
                      <td
                        className="font-mono"
                        style={{ padding: '9px', fontWeight: 700, color: colors.sky }}
                      >
                        {r.predicted_station_total.toLocaleString()} kW
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
