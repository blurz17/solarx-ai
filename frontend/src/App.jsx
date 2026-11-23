import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SimulatorPage from './pages/SimulatorPage';
import LossAuditPage from './pages/LossAuditPage';
import ForecastPage from './pages/ForecastPage';
import BenchmarksPage from './pages/BenchmarksPage';
import DocsPage from './pages/DocsPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { checkHealth } from './services/solarApi';

function MainApp() {
  const [activeTab, setActiveTab] = useState('simulator');
  const [backendOnline, setBackendOnline] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, [activeTab]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bgPage,
        color: colors.textPrimary,
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      <Header activeTab={activeTab} setActiveTab={setActiveTab} backendOnline={backendOnline} />

      <main
        style={{
          flex: 1,
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: '28px 24px 48px 24px',
        }}
      >
        {activeTab === 'simulator' && <SimulatorPage />}
        {activeTab === 'audit' && <LossAuditPage />}
        {activeTab === 'forecast' && <ForecastPage />}
        {activeTab === 'benchmarks' && <BenchmarksPage />}
        {activeTab === 'guide' && <DocsPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
