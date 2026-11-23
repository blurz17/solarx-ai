import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function SolarVisualTwin({ features, powerKw = 0, totalKw = 0, inverterCount = 1 }) {
  const { colors } = useTheme();
  const irr = Number(features.irradiation || 0);
  const clouds = Number(features.cloud_cover || 0);
  const hour = Number(features.hour || 12);

  const clampedHr = Math.max(5, Math.min(19, hour));
  const t = (clampedHr - 5) / 14;
  const sunX = 65 + t * 390;
  const sunY = 145 - Math.sin(t * Math.PI) * 105;

  const skyOpacity = Math.max(0.18, Math.min(1, irr / 1.0));
  const cloudOpacity = Math.min(0.88, clouds / 110);

  return (
    <div
      style={{
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '14px',
        boxShadow: colors.shadowCard,
      }}
    >
      <svg
        viewBox="0 0 520 195"
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '12px',
          display: 'block',
        }}
      >
        <defs>
          <linearGradient id="twinSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={irr > 0.15 ? '#0284c7' : '#0f172a'} />
            <stop offset="65%" stopColor={irr > 0.15 ? '#38bdf8' : '#1e293b'} stopOpacity={skyOpacity} />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="1" />
            <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pvCell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="520" height="195" fill="url(#twinSky)" />

        <path
          d="M 65 135 Q 260 -45 455 135"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />

        {irr > 0.02 && (
          <g>
            <line
              x1={sunX}
              y1={sunY - 8}
              x2="205"
              y2="140"
              stroke="#fde047"
              strokeWidth={1 + irr * 2.2}
              strokeOpacity={Math.max(0.12, 0.5 - cloudOpacity * 0.4)}
              strokeDasharray="6 4"
            />
            <circle cx={sunX} cy={sunY - 8} r={20 + irr * 14} fill="url(#sunGlow)" />
            <circle cx={sunX} cy={sunY - 8} r="11" fill="#fef08a" />
          </g>
        )}

        {clouds > 5 && (
          <g opacity={cloudOpacity}>
            <ellipse cx="170" cy="54" rx="44" ry="15" fill="#e2e8f0" />
            <ellipse cx="195" cy="48" rx="32" ry="16" fill="#f8fafc" />
            <ellipse cx="340" cy="64" rx="48" ry="15" fill="#cbd5e1" />
          </g>
        )}

        <rect x="0" y="160" width="520" height="35" fill="#0b1324" />

        <g transform="translate(95, 104)">
          <line x1="45" y1="44" x2="45" y2="56" stroke="#94a3b8" strokeWidth="4" />
          <line x1="155" y1="26" x2="155" y2="56" stroke="#94a3b8" strokeWidth="4" />
          <polygon
            points="10,48 190,16 205,34 25,66"
            fill="url(#pvCell)"
            stroke={irr > 0.4 ? '#f59e0b' : '#38bdf8'}
            strokeWidth="2"
          />
        </g>

        <path
          d="M 295 148 L 360 148"
          stroke={powerKw > 0 ? '#f59e0b' : '#475569'}
          strokeWidth="2.5"
          strokeDasharray={powerKw > 0 ? '6 3' : 'none'}
        />

        <rect
          x="360"
          y="120"
          width="138"
          height="56"
          rx="10"
          fill="#0f172a"
          stroke={powerKw > 0 ? '#10b981' : '#334155'}
          strokeWidth="1.8"
        />
        <text x="373" y="138" fontSize="9.5" fontWeight="600" fill="#94a3b8">
          EXPECTED OUTPUT
        </text>
        <text x="373" y="158" fontSize="16" fontWeight="800" fill="#f59e0b" fontFamily="monospace">
          {powerKw} kW
        </text>
        <text x="373" y="170" fontSize="9.5" fill="#cbd5e1">
          {inverterCount}x Fleet: {Number(totalKw).toLocaleString()} kW
        </text>
      </svg>
    </div>
  );
}
