import React, { Suspense, lazy } from 'react';

// Lazy load the Spline component
const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineSceneProps {
  sceneUrl: string; // The URL of the Spline scene
  className?: string;
  style?: React.CSSProperties;
}

const SplineScene: React.FC<SplineSceneProps> = ({ sceneUrl, className, style }) => {
  return (
    <Suspense 
      fallback={
        <div className={`w-full h-full flex items-center justify-center bg-theme-surface/50 ${className || ''}`} style={style}>
          {/* Simple CSS Loader */}
          <div style={{
            border: '4px solid rgba(var(--color-theme-accent-cyan-rgb, 100, 255, 218), 0.2)', // Use theme color if possible
            borderTop: '4px solid rgb(var(--color-theme-accent-cyan-rgb, 100, 255, 218))', // Use theme color
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            :root { /* Define CSS variables for theme colors to be used in JS/CSS */
              --color-theme-accent-cyan-rgb: 100, 255, 218; /* Example RGB for #64FFDA */
            }
          `}</style>
        </div>
      }
    >
      <Spline
        scene={sceneUrl}
        className={className}
        style={style}
        // You can pass other Spline props here if needed
        // e.g., onLoad, onMouseDown, etc.
      />
    </Suspense>
  );
};

export default SplineScene;
