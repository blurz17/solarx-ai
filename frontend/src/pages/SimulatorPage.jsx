import React, { useState, useEffect } from 'react';
import { predictPower } from '../services/solarApi';
import { useTheme } from '../context/ThemeContext';
import SolarVisualTwin from '../components/SolarVisualTwin';

const PRESETS = [
  {
    name: 'Clear Noon',
    values: {
      irradiation: 0.95,
      ambient_temperature: 32,
      module_temperature: 54,
      relative_humidity: 30,
      cloud_cover: 10,
      wind_speed: 12,
      hour: 12,
    },
  },
  {
    name: 'Hot Afternoon',
    values: {
      irradiation: 0.78,
      ambient_temperature: 38,
      module_temperature: 63,
      relative_humidity: 24,
      cloud_cover: 15,
      wind_speed: 6,
      hour: 14,
    },
  },
  {
    name: 'Cloudy',
    values: {
      irradiation: 0.45,
      ambient_temperature: 28,
      module_temperature: 39,
      relative_humidity: 62,
      cloud_cover: 70,
      wind_speed: 15,
      hour: 11,
    },
  },
  {
    name: 'Morning',
    values: {
      irradiation: 0.28,
      ambient_temperature: 23,
      module_temperature: 29,
      relative_humidity: 74,
      cloud_cover: 25,
      wind_speed: 8,
      hour: 8,
    },
  },
];

const ALGORITHMS = ['Gradient Boosting', 'XGBoost', 'Random Forest', 'Linear Regression'];

export default function SimulatorPage() {
  const { colors } = useTheme();

  const [features, setFeatures] = useState(PRESETS[0].values);
  const [activePreset, setActivePreset] = useState(PRESETS[0].name);
  const [algorithm, setAlgorithm] = useState('Gradient Boosting');
  const [inverterCount, setInverterCount] = useState(22);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    predictPower(features, algorithm, inverterCount)
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [features, algorithm, inverterCount]);

  const cardStyle = {
    backgroundColor: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    padding: '22px',
    boxShadow: colors.shadowCard,
  };

  const sliders = [
    { key: 'irradiation', label: 'Irradiation', min: 0, max: 1.25, step: 0.01, unit: ' kW/m²' },
    { key: 'ambient_temperature', label: 'Air Temp', min: 15, max: 45, step: 0.5, unit: '°C' },
    { key: 'module_temperature', label: 'Panel Temp', min: 15, max: 75, step: 0.5, unit: '°C' },
    { key: 'cloud_cover', label: 'Cloud Cover', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'relative_humidity', label: 'Humidity', min: 10, max: 100, step: 1, unit: '%' },
    { key: 'wind_speed', label: 'Wind Speed', min: 0, max: 35, step: 0.5, unit: ' km/h' },
    { key: 'hour', label: 'Hour', min: 5, max: 19, step: 1, unit: ':00' },
  ];

  const allPreds = result?.all_algorithms || {};
  const maxAlgoVal = Math.max(100, ...Object.values(allPreds));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Clean Single Header */}
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
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Power Simulator</h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '13.5px', color: colors.textSecondary }}>
            Adjust weather conditions to estimate expected solar output.
          </p>
        </div>

        {/* Clean Preset Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PRESETS.map((p) => {
            const active = activePreset === p.name;
            return (
              <button
                key={p.name}
                onClick={() => {
                  setActivePreset(p.name);
                  setFeatures(p.values);
                }}
                className="sx-btn"
                style={{
                  padding: '6px 13px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: `1px solid ${active ? colors.sky : colors.border}`,
                  backgroundColor: active ? colors.bgCard : 'transparent',
                  color: active ? colors.sky : colors.textSecondary,
                }}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ color: colors.rose, fontSize: '13px', fontWeight: 600 }}>{error}</div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left: Compact Sliders */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {sliders.map((s) => (
              <div key={s.key}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ color: colors.textSecondary }}>{s.label}</span>
                  <span className="font-mono" style={{ fontWeight: 700, color: colors.textPrimary }}>
                    {features[s.key]}
                    {s.unit}
                  </span>
                </div>
                <input
                  type="range"
                  className="sx-slider"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={features[s.key]}
                  onChange={(e) => {
                    setActivePreset('Custom');
                    setFeatures({ ...features, [s.key]: Number(e.target.value) });
                  }}
                />
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '18px',
              paddingTop: '16px',
              borderTop: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: colors.textSecondary }}>
                Inverters
              </label>
              <input
                type="number"
                min="1"
                max="500"
                className="sx-input"
                value={inverterCount}
                onChange={(e) => setInverterCount(Math.max(1, Number(e.target.value)))}
                style={{
                  marginTop: '4px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bgInput,
                  color: colors.textPrimary,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: colors.textSecondary }}>
                Model
              </label>
              <select
                className="sx-input"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                style={{
                  marginTop: '4px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bgInput,
                  color: colors.textPrimary,
                }}
              >
                {ALGORITHMS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right: Visual Twin + Clean Numbers + Model Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <SolarVisualTwin
            features={features}
            powerKw={result ? result.expected_ac_power_per_inverter : 0}
            totalKw={result ? result.total_station_ac_power : 0}
            inverterCount={inverterCount}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>
                Per Inverter
              </div>
              <div
                className="font-mono"
                style={{ fontSize: '28px', fontWeight: 800, color: colors.amber, marginTop: '6px' }}
              >
                {result ? result.expected_ac_power_per_inverter.toLocaleString() : '—'}{' '}
                <span style={{ fontSize: '14px', fontWeight: 600 }}>kW</span>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>
                Plant Total ({inverterCount}x)
              </div>
              <div
                className="font-mono"
                style={{ fontSize: '28px', fontWeight: 800, color: colors.sky, marginTop: '6px' }}
              >
                {result ? result.total_station_ac_power.toLocaleString() : '—'}{' '}
                <span style={{ fontSize: '14px', fontWeight: 600 }}>kW</span>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '12px' }}>
              Model Comparison
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ALGORITHMS.map((algoName) => {
                const val = allPreds[algoName] ?? 0;
                const widthPct = Math.min(100, (val / maxAlgoVal) * 100);
                const selected = algoName === algorithm;
                return (
                  <div
                    key={algoName}
                    onClick={() => setAlgorithm(algoName)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12.5px',
                        fontWeight: selected ? 700 : 500,
                        color: selected ? colors.textPrimary : colors.textSecondary,
                        marginBottom: '4px',
                      }}
                    >
                      <span>{algoName}</span>
                      <span className="font-mono">{val} kW</span>
                    </div>
                    <div
                      style={{
                        height: '7px',
                        borderRadius: '999px',
                        backgroundColor: colors.bgElevated,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${widthPct}%`,
                          height: '100%',
                          background: selected ? colors.gradSolar : colors.gradSky,
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
