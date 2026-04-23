import { useState } from 'react';
import Scanner from './components/Scanner';
import Results from './components/Results';
import ApiKeySettings, { loadApiKey } from './components/ApiKeySettings';

export default function App() {
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleScan = async ({ imageBase64, barcode }) => {
    const apiKey = loadApiKey();
    setIsAnalyzing(true);
    setError(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-api-key'] = apiKey;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageBase64, barcode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app">
      <header>
        <div className="header-row">
          <div>
            <h1>Food Label Scanner</h1>
            <p className="subtitle">Point at a label to check for harmful ingredients</p>
          </div>
          <button className="settings-btn" onClick={() => setShowSettings(true)} title="API Key Settings">
            ⚙
          </button>
        </div>
      </header>

      <main>
        {error && (
          <div className="error-banner">
            {error}
            {error.includes('API key') && (
              <button className="inline-link" onClick={() => setShowSettings(true)}>
                Open Settings
              </button>
            )}
          </div>
        )}

        {!results ? (
          <Scanner onScan={handleScan} isAnalyzing={isAnalyzing} />
        ) : (
          <Results data={results} onReset={() => { setResults(null); setError(null); }} />
        )}
      </main>

      {showSettings && <ApiKeySettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
