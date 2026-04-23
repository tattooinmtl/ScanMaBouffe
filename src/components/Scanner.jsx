import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

export default function Scanner({ onScan, isAnalyzing }) {
  const webcamRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);

  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot({ width: 1280, height: 960 });
    if (!screenshot) return;
    const base64 = screenshot.replace(/^data:image\/\w+;base64,/, '');
    onScan(base64);
  }, [onScan]);

  return (
    <div className="scanner">
      <div className="webcam-container">
        {!cameraError ? (
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.9}
            videoConstraints={{ facingMode: 'environment' }}
            onUserMediaError={() => setCameraError(true)}
            className="webcam"
          />
        ) : (
          <div className="camera-placeholder">
            <p>Camera unavailable.<br />Please allow camera access and refresh.</p>
          </div>
        )}
      </div>

      <p className="hint">Point the camera at the ingredients list on the package, then tap Scan.</p>

      <button
        className="scan-btn"
        onClick={handleCapture}
        disabled={isAnalyzing || cameraError}
      >
        {isAnalyzing ? (
          <span className="btn-loading"><span className="spinner" />Analyzing…</span>
        ) : (
          'Scan Ingredients'
        )}
      </button>
    </div>
  );
}
