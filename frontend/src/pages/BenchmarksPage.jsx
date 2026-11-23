import React, { useState, useEffect } from 'react';
import { fetchModelsMetadata } from '../services/solarApi';
import { useTheme } from '../context/ThemeContext';

export default function BenchmarksPage() {
  const { colors } = useTheme();
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    fetchModelsMetadata()
      .then(setMeta)
      .catch(() => {});
  }, []);

  const cardStyle = {
    backgroundColor: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    padding: '22px',
    boxShadow: colors.shadowCard,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Model Benchmarks</h2>
        <p style={{ margin: '3px 0 0 0', fontSize: '13.5px', color: colors.textSecondary }}>
          Chronological Train / Validation / Test evaluation across 77,098 daytime readings.
        </p>
      </div>

      {meta && (
        <>
          <div style={{ ...cardStyle, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    textAlign: 'left',
                    color: colors.textSecondary,
                    fontSize: '11.5px',
                  }}
                >
                  <th style={{ padding: '10px' }}>Algorithm</th>
                  <th style={{ padding: '10px' }}>Train MAE</th>
                  <th style={{ padding: '10px' }}>Val MAE</th>
                  <th style={{ padding: '10px' }}>Test MAE</th>
                  <th style={{ padding: '10px' }}>Train RMSE</th>
                  <th style={{ padding: '10px' }}>Val RMSE</th>
                  <th style={{ padding: '10px' }}>Test RMSE</th>
                  <th style={{ padding: '10px' }}>Test R²</th>
                </tr>
              </thead>
              <tbody>
                {meta.benchmarks.map((b) => (
                  <tr key={b.name} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: '10px', fontWeight: b.is_winner ? 800 : 600 }}>
                      {b.name}
                    </td>
                    <td className="font-mono" style={{ padding: '10px' }}>
                      {b.train_mae}
                    </td>
                    <td className="font-mono" style={{ padding: '10px' }}>
                      {b.val_mae}
                    </td>
                    <td
                      className="font-mono"
                      style={{ padding: '10px', fontWeight: 700, color: colors.amber }}
                    >
                      {b.test_mae}
                    </td>
                    <td className="font-mono" style={{ padding: '10px' }}>
                      {b.train_rmse}
                    </td>
                    <td className="font-mono" style={{ padding: '10px' }}>
                      {b.val_rmse}
                    </td>
                    <td className="font-mono" style={{ padding: '10px' }}>
                      {b.test_rmse}
                    </td>
                    <td
                      className="font-mono"
                      style={{ padding: '10px', fontWeight: 700, color: colors.emerald }}
                    >
                      {b.test_r2}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '14.5px', fontWeight: 700, marginBottom: '14px' }}>
              Feature Importance
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {meta.feature_importances.map((f) => (
                <div key={f.feature}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12.5px',
                      marginBottom: '4px',
                    }}
                  >
                    <span>{f.label}</span>
                    <span className="font-mono">{(f.importance * 100).toFixed(1)}%</span>
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
                        width: `${Math.max(2, f.importance * 100)}%`,
                        height: '100%',
                        background: colors.gradSolar,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
