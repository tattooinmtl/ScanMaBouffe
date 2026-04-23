import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function Scanner({ onScan, isAnalyzing }) {
  const webcamRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);
  const [barcodeHint, setBarcodeHint] = useState(null);

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot({ width: 1024, height: 768 });
    if (!screenshot) return;

    let barcode = null;
    try {
      const reader = new BrowserMultiFormatReader();
      const img = document.createElement('img');
      img.src = screenshot;
      await new Promise(r => { img.onload = r; });
      const result = await reader.decodeFromImageElement(img);
      barcode = result.getText();
      setBarcodeHint(barcode);
    } catch {
      setBarcodeHint(null);
    }

    const base64 = screenshot.replace(/^data:image\/\w+;base64,/, '');
    onScan({ imageBase64: base64, barcode });
  }, [onScan]);

  return (
    <div className="scanner">
      <div className="webcam-container">
        {!cameraError ? (
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.85}
            videoConstraints={{ facingMode: 'environment' }}
            onUserMediaError={() => setCameraError(true)}
            className="webcam"
          />
        ) : (
          <div className="camera-placeholder">
            <p>Camera unavailable.<br />Please allow camera access and refresh.</p>
          </div>
        )}
        {barcodeHint && !isAnalyzing && (
          <div className="barcode-badge">Barcode: {barcodeHint}</div>
        )}
      </div>

      <p className="hint">Point at the ingredients list on the label, then tap Scan.</p>

      <button
        className="scan-btn"
        onClick={handleCapture}
        disabled={isAnalyzing || cameraError}
      >
        {isAnalyzing ? (
          <span className="btn-loading"><span className="spinner" />Analyzing…</span>
        ) : (
          'Scan Label'
        )}
      </button>
    </div>
  );
}
