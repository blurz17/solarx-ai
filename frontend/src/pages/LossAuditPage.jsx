import React, { useState, useEffect, useRef } from 'react';
import { fetchDemoAudit, uploadCsvAudit, quickLossCheck } from '../services/solarApi';
import { useTheme } from '../context/ThemeContext';
import { UploadIcon } from '../components/Icons';

const ALGORITHMS = ['Gradient Boosting', 'XGBoost', 'Random Forest', 'Linear Regression'];

function StatusText({ status }) {
  const s = (status || '').toUpperCase();
  let color = '#10b981';
  if (s.includes('CRITICAL') || s.includes('OUTAGE')) color = '#e11d48';
  else if (s.includes('WARN')) color = '#d97706';
  else if (s.includes('STANDBY')) color = '#64748b';
  return <span style={{ fontSize: '12px', fontWeight: 700, color }}>{status}</span>;
}

export default function LossAuditPage() {
  const { colors } = useTheme();
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState('batch');
  const [algorithm, setAlgorithm] = useState('Gradient Boosting');
  const [plantFilter, setPlantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [actualPower, setActualPower] = useState(560);
  const [quickWeather, setQuickWeather] = useState({
    irradiation: 0.85,
    ambient_temperature: 32.0,
    module_temperature: 53.0,
    relative_humidity: 35.0,
    cloud_cover: 20.0,
    wind_speed: 10.0,
    hour: 12,
  });
  const [quickResult, setQuickResult] = useState(null);

  const loadDemo = async (algo = algorithm, pFilter = plantFilter) => {
    setLoading(true);
    setError(null);
    try {
      const pid = pFilter === 'all' ? null : Number(pFilter);
      const res = await fetchDemoAudit(algo, pid);
      setAuditData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemo();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await uploadCsvAudit(file, algorithm);
      setAuditData(res);
      setPlantFilter('custom');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const runQuickCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await quickLossCheck(actualPower, quickWeather, algorithm);
      setQuickResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredInverters =
    auditData?.inverters?.filter((inv) =>
      statusFilter === 'ALL' ? true : inv.status === statusFilter
    ) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Clean Header + Mode Switch */}
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
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Loss & Health Audit</h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '13.5px', color: colors.textSecondary }}>
            Compare actual output against ML-expected power to spot soiling, shading, or faults.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            backgroundColor: colors.bgElevated,
            padding: '3px',
            borderRadius: '10px',
            gap: '2px',
          }}
        >
          <button
            onClick={() => setMode('batch')}
            className="sx-btn"
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: mode === 'batch' ? 700 : 500,
              backgroundColor: mode === 'batch' ? colors.bgCard : 'transparent',
              color: mode === 'batch' ? colors.textPrimary : colors.textSecondary,
            }}
          >
            Plant Fleet
          </button>
          <button
            onClick={() => {
              setMode('quick');
              if (!quickResult) runQuickCheck();
            }}
            className="sx-btn"
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: mode === 'quick' ? 700 : 500,
              backgroundColor: mode === 'quick' ? colors.bgCard : 'transparent',
              color: mode === 'quick' ? colors.textPrimary : colors.textSecondary,
            }}
          >
            Single Check
          </button>
        </div>
      </div>

      {error && <div style={{ color: colors.rose, fontSize: '13px', fontWeight: 600 }}>{error}</div>}

      {/* ================= FLEET MODE ================= */}
      {mode === 'batch' && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Plants' },
                { id: '4135001', label: 'Plant 1' },
                { id: '4136001', label: 'Plant 2' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => {
                    setPlantFilter(btn.id);
                    loadDemo(algorithm, btn.id);
                  }}
                  className="sx-btn"
                  style={{
                    padding: '7px 13px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    border: `1px solid ${plantFilter === btn.id ? colors.sky : colors.border}`,
                    backgroundColor: plantFilter === btn.id ? colors.bgCard : 'transparent',
                    color: plantFilter === btn.id ? colors.sky : colors.textSecondary,
                  }}
                >
                  {btn.label}
                </button>
              ))}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="sx-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bgCard,
                  color: colors.textPrimary,
                }}
              >
                <UploadIcon size={15} />
                <span>Upload CSV</span>
              </button>
            </div>

            <select
              className="sx-input"
              value={algorithm}
              onChange={(e) => {
                setAlgorithm(e.target.value);
                if (plantFilter !== 'custom') loadDemo(e.target.value, plantFilter);
              }}
              style={{ ...inputStyle, width: '185px', padding: '7px 11px' }}
            >
              {ALGORITHMS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {auditData && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                }}
              >
                <div style={cardStyle}>
                  <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                    Performance Ratio
                  </div>
                  <div
                    className="font-mono"
                    style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px' }}
                  >
                    {(auditData.summary.fleet_performance_ratio * 100).toFixed(1)}%
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ fontSize: '12px', color: colors.textSecondary }}>Inverters</div>
                  <div
                    className="font-mono"
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '8px',
                      fontSize: '16px',
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: colors.emerald }}>
                      {auditData.summary.healthy_inverters} OK
                    </span>
                    <span style={{ color: colors.amber }}>
                      {auditData.summary.warning_inverters} Warn
                    </span>
                    <span style={{ color: colors.rose }}>
                      {auditData.summary.critical_inverters} Crit
                    </span>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                    Actual / Expected
                  </div>
                  <div
                    className="font-mono"
                    style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px' }}
                  >
                    {auditData.summary.avg_actual_power}{' '}
                    <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                      / {auditData.summary.avg_expected_power} kW
                    </span>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                    Daytime Outages
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '26px',
                      fontWeight: 800,
                      color:
                        auditData.summary.daytime_outage_readings > 0
                          ? colors.rose
                          : colors.emerald,
                      marginTop: '6px',
                    }}
                  >
                    {auditData.summary.daytime_outage_readings}
                  </div>
                </div>
              </div>

              <div style={{ ...cardStyle, overflowX: 'auto' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '14.5px', fontWeight: 700 }}>Inverter Diagnostics</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['ALL', 'CRITICAL', 'WARNING', 'HEALTHY'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className="sx-btn"
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          border: 'none',
                          backgroundColor:
                            statusFilter === st ? colors.bgElevated : 'transparent',
                          color: statusFilter === st ? colors.textPrimary : colors.textSecondary,
                        }}
                      >
                        {st.charAt(0) + st.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
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
                      <th style={{ padding: '9px' }}>Plant</th>
                      <th style={{ padding: '9px' }}>Inverter</th>
                      <th style={{ padding: '9px' }}>Actual</th>
                      <th style={{ padding: '9px' }}>Expected</th>
                      <th style={{ padding: '9px' }}>Gap</th>
                      <th style={{ padding: '9px' }}>Ratio</th>
                      <th style={{ padding: '9px' }}>Status</th>
                      <th style={{ padding: '9px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInverters.map((inv) => (
                      <tr
                        key={`${inv.plant_id}-${inv.source_key}`}
                        style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
                      >
                        <td style={{ padding: '9px' }}>{inv.plant_id}</td>
                        <td className="font-mono" style={{ padding: '9px', fontWeight: 600 }}>
                          {inv.source_key}
                        </td>
                        <td className="font-mono" style={{ padding: '9px' }}>
                          {inv.actual_power}
                        </td>
                        <td className="font-mono" style={{ padding: '9px' }}>
                          {inv.expected_power}
                        </td>
                        <td
                          className="font-mono"
                          style={{
                            padding: '9px',
                            fontWeight: 600,
                            color: inv.loss > 25 ? colors.rose : colors.textSecondary,
                          }}
                        >
                          {inv.loss > 0 ? `-${inv.loss}` : `+${Math.abs(inv.loss).toFixed(1)}`}
                        </td>
                        <td className="font-mono" style={{ padding: '9px' }}>
                          {(inv.performance_ratio * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: '9px' }}>
                          <StatusText status={inv.status} />
                        </td>
                        <td style={{ padding: '9px', color: colors.textSecondary, fontSize: '12px' }}>
                          {inv.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ================= SINGLE CHECK MODE ================= */}
      {mode === 'quick' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          <div style={cardStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textPrimary }}>
                  Measured Actual Power (kW)
                </label>
                <input
                  type="number"
                  className="sx-input"
                  value={actualPower}
                  onChange={(e) => setActualPower(Number(e.target.value))}
                  style={{ ...inputStyle, marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  ['irradiation', 'Irradiation (kW/m²)', 0.05],
                  ['hour', 'Hour (5–19)', 1],
                  ['ambient_temperature', 'Air Temp (°C)', 1],
                  ['module_temperature', 'Panel Temp (°C)', 1],
                  ['cloud_cover', 'Clouds (%)', 5],
                  ['relative_humidity', 'Humidity (%)', 5],
                ].map(([key, lbl, stp]) => (
                  <div key={key}>
                    <label style={{ fontSize: '11.5px', color: colors.textSecondary }}>{lbl}</label>
                    <input
                      type="number"
                      step={stp}
                      className="sx-input"
                      value={quickWeather[key]}
                      onChange={(e) =>
                        setQuickWeather({ ...quickWeather, [key]: Number(e.target.value) })
                      }
                      style={{ ...inputStyle, marginTop: '4px' }}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={runQuickCheck}
                className="sx-btn"
                style={{
                  marginTop: '4px',
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: colors.gradSky,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                Check Health
              </button>
            </div>
          </div>

          {quickResult && (
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: colors.textSecondary }}>Status</span>
                <StatusText status={quickResult.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11.5px', color: colors.textSecondary }}>Actual</div>
                  <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>
                    {quickResult.actual_ac_power} kW
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: colors.textSecondary }}>Expected</div>
                  <div
                    className="font-mono"
                    style={{ fontSize: '20px', fontWeight: 800, color: colors.amber, marginTop: '4px' }}
                  >
                    {quickResult.expected_ac_power} kW
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', color: colors.textSecondary }}>Ratio</div>
                  <div className="font-mono" style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>
                    {(quickResult.performance_ratio * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '12px', borderTop: `1px solid ${colors.borderSubtle}`, fontSize: '13px' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{quickResult.diagnosis}</div>
                <div style={{ color: colors.textSecondary }}>{quickResult.recommendation}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
