import React from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  SunIcon,
  MoonIcon,
  ZapIcon,
  ActivityIcon,
  CloudSunIcon,
  BarChartIcon,
  BookIcon,
} from './Icons';

export default function Header({ activeTab, setActiveTab, backendOnline }) {
  const { isDark, toggleTheme, colors } = useTheme();

  const tabs = [
    { id: 'simulator', label: 'Simulator', icon: ZapIcon },
    { id: 'audit', label: 'Loss Audit', icon: ActivityIcon },
    { id: 'forecast', label: 'Forecast', icon: CloudSunIcon },
    { id: 'benchmarks', label: 'Benchmarks', icon: BarChartIcon },
    { id: 'guide', label: 'Guide', icon: BookIcon },
  ];

  return (
    <header
      style={{
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${colors.border}`,
        padding: '12px 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      {/* Minimal Brand */}
      <div
        onClick={() => setActiveTab('simulator')}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: colors.gradSolar,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SunIcon size={19} color="#ffffff" />
        </div>
        <span
          className="font-display"
          style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}
        >
          SolarX
        </span>
        <span
          title={backendOnline ? 'API Connected' : 'API Offline'}
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: backendOnline ? '#10b981' : '#e11d48',
          }}
        />
      </div>

      {/* Clean Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <nav
          style={{
            display: 'flex',
            backgroundColor: isDark ? '#090f1d' : '#f1f5f9',
            padding: '3px',
            borderRadius: '10px',
            gap: '2px',
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="sx-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 13px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  background: active ? colors.bgCard : 'transparent',
                  color: active ? colors.textPrimary : colors.textSecondary,
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon size={15} color={active ? colors.sky : 'currentColor'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={toggleTheme}
          className="sx-btn"
          title={isDark ? 'Light mode' : 'Dark mode'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCard,
            color: isDark ? '#fde047' : '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isDark ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>
      </div>
    </header>
  );
}
