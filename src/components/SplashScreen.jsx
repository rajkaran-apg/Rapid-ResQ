
import { useEffect } from 'react';

export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish?.();
    }, 2800);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-screen">
      <div className="splash-orbit orbit-one" />
      <div className="splash-orbit orbit-two" />

      <div className="splash-content">
        <div className="splash-logo-wrap">
          <div className="splash-glow" />
          <img
            src="/rapidresq-logo.png"
            alt="RapidResQ"
            className="splash-logo"
          />
        </div>

        <h1 className="splash-title">
          Rapid<span>ResQ</span>
        </h1>

        <p className="splash-tagline">
          EVERY SECOND MATTERS
        </p>

        <div className="splash-status">
          <span className="splash-dot" />
          SYSTEM INITIALIZING
        </div>

        <div className="splash-progress">
          <div className="splash-progress-fill" />
        </div>

        <p className="splash-footer">
          REPORT · RESPOND · RESOLVE
        </p>
      </div>
    </div>
  );
}
