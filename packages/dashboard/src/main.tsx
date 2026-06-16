import React from 'react';
import { createRoot } from 'react-dom/client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3141/api/v1';

function App() {
  const [health, setHealth] = React.useState<string>('Checking...');

  React.useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(data => setHealth(data.status))
      .catch(() => setHealth('Unreachable'));
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>SoroPreFlight Dashboard</h1>
      <p>API Status: <strong>{health}</strong></p>
      <section>
        <h2>Quick Actions</h2>
        <ul>
          <li><a href="/simulate">Simulate Transaction</a></li>
          <li><a href="/deploy">Deploy Contract</a></li>
          <li><a href="/reports">View Reports</a></li>
        </ul>
      </section>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
