import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function DocsPage() {
  const { colors } = useTheme();

  const cardStyle = {
    backgroundColor: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: colors.shadowCard,
    lineHeight: 1.65,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Guide</h2>
        <p style={{ margin: '3px 0 0 0', fontSize: '13.5px', color: colors.textSecondary }}>
          Quick overview of the three tools in SolarX.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '14px' }}>
          <div>
            <strong>1. Simulator</strong> — Drag weather sliders (sunlight, temperature, clouds,
            humidity, wind, hour) to see how much power a healthy inverter should produce and
            compare all 4 ML models.
          </div>
          <div>
            <strong>2. Loss Audit</strong> — Compare actual inverter output against ML-expected
            output. Large negative gaps indicate dirty panels (dust/soiling), shading, or inverter
            faults. Upload a CSV with columns{' '}
            <code className="font-mono" style={{ fontSize: '12.5px', color: colors.sky }}>
              DATE_TIME, PLANT_ID, SOURCE_KEY, IRRADIATION, AC_POWER
            </code>{' '}
            to audit your own plant.
          </div>
          <div>
            <strong>3. Forecast</strong> — Select any city or GPS coordinates to fetch live hourly
            weather forecasts from Open-Meteo and predict next-day solar generation.
          </div>
        </div>
      </div>
    </div>
  );
}
