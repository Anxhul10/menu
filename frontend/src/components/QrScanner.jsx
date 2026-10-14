import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

export default function QrScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (result) onScan(result.getText());
    }).then((controls) => {
      controlsRef.current = controls;
    }).catch(() => {
      setError("We could not access your camera. Check browser permissions or enter the table code instead.");
    });

    return () => {
      controlsRef.current?.stop();
      reader.reset();
    };
  }, [onScan]);

  return <div className="scanner-panel">
    <div className="scanner-video-wrap"><video ref={videoRef} muted playsInline aria-label="Camera view for scanning a table QR code" /></div>
    {error && <div className="form-error">{error}</div>}
    <p className="form-hint">Point your camera at the Menu table QR code.</p>
    <button className="button ghost full" onClick={onClose}>Cancel scan</button>
  </div>;
}
