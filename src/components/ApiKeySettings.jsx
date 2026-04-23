import { useState } from 'react';

const STORAGE_KEY = 'fls_anthropic_api_key';

export function loadApiKey() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export default function ApiKeySettings({ onClose }) {
  const [key, setKey] = useState(loadApiKey);
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setKey('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>API Key Settings</h2>
        <p className="modal-desc">
          Your Anthropic API key is stored only in your browser's local storage and sent
          directly to the analysis endpoint over HTTPS. It is never stored on any server.
        </p>

        <label className="field-label">Anthropic API Key</label>
        <div className="key-input-row">
          <input
            type={visible ? 'text' : 'password'}
            className="key-input"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-ant-..."
            spellCheck={false}
            autoComplete="off"
          />
          <button className="btn-icon" onClick={() => setVisible(v => !v)} title={visible ? 'Hide' : 'Show'}>
            {visible ? '🙈' : '👁'}
          </button>
        </div>

        <div className="modal-notice">
          <span className="notice-icon">🔒</span>
          Stored locally in <code>localStorage</code> — cleared when you clear browser data.
          Get a key at <span className="link-text">console.anthropic.com</span>.
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={handleClear}>Clear Key</button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>
            {saved ? 'Saved!' : 'Save Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
