import React from 'react';

/**
 * CircuitBoardBackground Component
 * 
 * Creates a premium cybersecurity/deep ocean aesthetic with:
 * - Radial gradient (deep teal center to dark navy edges)
 * - Subtle SVG circuit board pattern with thin cyan lines and nodes
 * - No external image dependencies
 */
export const CircuitBoardBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  // SVG pattern with circuit board "veins" - generated inline
  const circuitPatternSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="bgGradient" cx="50%" cy="30%" r="60%">
          <stop offset="0%" style="stop-color:#1e3a4c;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#020617;stop-opacity:1" />
        </radialGradient>
      </defs>
      
      <!-- Base gradient background -->
      <rect width="1200" height="800" fill="url(#bgGradient)"/>
      
      <!-- Circuit Board Lines - Horizontal streams -->
      <line x1="0" y1="200" x2="300" y2="200" stroke="#22d3ee" stroke-width="1" opacity="0.12"/>
      <line x1="350" y1="200" x2="600" y2="200" stroke="#22d3ee" stroke-width="1" opacity="0.15"/>
      <line x1="650" y1="200" x2="1000" y2="200" stroke="#22d3ee" stroke-width="1" opacity="0.12"/>
      <line x1="1050" y1="200" x2="1200" y2="200" stroke="#22d3ee" stroke-width="1" opacity="0.1"/>
      
      <!-- Vertical connection lines -->
      <line x1="300" y1="200" x2="300" y2="350" stroke="#22d3ee" stroke-width="0.5" opacity="0.1"/>
      <line x1="600" y1="200" x2="600" y2="400" stroke="#22d3ee" stroke-width="0.5" opacity="0.1"/>
      <line x1="1000" y1="200" x2="1000" y2="380" stroke="#22d3ee" stroke-width="0.5" opacity="0.1"/>
      
      <!-- Top-center branching lines -->
      <line x1="600" y1="100" x2="400" y2="250" stroke="#22d3ee" stroke-width="0.8" opacity="0.11"/>
      <line x1="600" y1="100" x2="800" y2="250" stroke="#22d3ee" stroke-width="0.8" opacity="0.11"/>
      <line x1="600" y1="100" x2="600" y2="200" stroke="#22d3ee" stroke-width="1" opacity="0.13"/>
      
      <!-- Lower horizontal streams -->
      <line x1="0" y1="450" x2="250" y2="450" stroke="#22d3ee" stroke-width="1" opacity="0.1"/>
      <line x1="300" y1="450" x2="700" y2="450" stroke="#22d3ee" stroke-width="1" opacity="0.12"/>
      <line x1="750" y1="450" x2="1200" y2="450" stroke="#22d3ee" stroke-width="1" opacity="0.1"/>
      
      <!-- Vertical feeds from lower lines -->
      <line x1="250" y1="450" x2="250" y2="600" stroke="#22d3ee" stroke-width="0.5" opacity="0.08"/>
      <line x1="700" y1="450" x2="700" y2="650" stroke="#22d3ee" stroke-width="0.5" opacity="0.08"/>
      
      <!-- Center-right diagonal connectors -->
      <line x1="900" y1="150" x2="1050" y2="320" stroke="#22d3ee" stroke-width="0.8" opacity="0.11"/>
      <line x1="1050" y1="320" x2="950" y2="480" stroke="#22d3ee" stroke-width="0.8" opacity="0.1"/>
      
      <!-- Left side vertical rail -->
      <line x1="150" y1="100" x2="150" y2="550" stroke="#22d3ee" stroke-width="0.8" opacity="0.09"/>
      
      <!-- Right side vertical rail -->
      <line x1="1050" y1="50" x2="1050" y2="500" stroke="#22d3ee" stroke-width="0.8" opacity="0.09"/>
      
      <!-- Bottom horizontal backbone -->
      <line x1="0" y1="680" x2="1200" y2="680" stroke="#22d3ee" stroke-width="1" opacity="0.1"/>
      
      <!-- Circular Nodes (circuit connection points) -->
      <!-- Top region nodes -->
      <circle cx="300" cy="200" r="1.5" fill="#22d3ee" opacity="0.14"/>
      <circle cx="600" cy="200" r="1.5" fill="#22d3ee" opacity="0.16"/>
      <circle cx="1000" cy="200" r="1.5" fill="#22d3ee" opacity="0.14"/>
      <circle cx="600" cy="100" r="2" fill="#22d3ee" opacity="0.13"/>
      
      <!-- Mid region nodes -->
      <circle cx="400" cy="250" r="1" fill="#22d3ee" opacity="0.12"/>
      <circle cx="800" cy="250" r="1" fill="#22d3ee" opacity="0.12"/>
      <circle cx="250" cy="450" r="1.5" fill="#22d3ee" opacity="0.12"/>
      <circle cx="700" cy="450" r="1.5" fill="#22d3ee" opacity="0.14"/>
      
      <!-- Right region nodes -->
      <circle cx="900" cy="150" r="1" fill="#22d3ee" opacity="0.11"/>
      <circle cx="1050" cy="320" r="1.2" fill="#22d3ee" opacity="0.12"/>
      <circle cx="950" cy="480" r="1" fill="#22d3ee" opacity="0.1"/>
      
      <!-- Left rail nodes -->
      <circle cx="150" cy="250" r="1" fill="#22d3ee" opacity="0.1"/>
      <circle cx="150" cy="400" r="1" fill="#22d3ee" opacity="0.1"/>
      
      <!-- Right rail nodes -->
      <circle cx="1050" cy="150" r="1" fill="#22d3ee" opacity="0.09"/>
      <circle cx="1050" cy="350" r="1" fill="#22d3ee" opacity="0.1"/>
      
      <!-- Bottom backbone nodes -->
      <circle cx="300" cy="680" r="1" fill="#22d3ee" opacity="0.1"/>
      <circle cx="600" cy="680" r="1.2" fill="#22d3ee" opacity="0.11"/>
      <circle cx="900" cy="680" r="1" fill="#22d3ee" opacity="0.1"/>
      
      <!-- Subtle lower vertical connectors -->
      <line x1="300" y1="350" x2="300" y2="680" stroke="#22d3ee" stroke-width="0.5" opacity="0.07"/>
      <line x1="600" y1="400" x2="600" y2="680" stroke="#22d3ee" stroke-width="0.5" opacity="0.07"/>
      <line x1="1000" y1="380" x2="1000" y2="680" stroke="#22d3ee" stroke-width="0.5" opacity="0.07"/>
    </svg>
  `;

  return (
    <div className="relative w-full min-h-screen">
      {/* Fixed Background Container */}

      {/* DEBUG: Extremely Obvious Background */}
      <div className="fixed inset-0 -z-50">
        {/* Bright test gradient for debug */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, #00ff00 0%, #ff0000 100%)', // bright green to red for debug
          }}
        />
      </div>

      {/* SVG Circuit Pattern Overlay - HIGH OPACITY for debug */}
      <div 
        className="fixed inset-0 -z-40 opacity-100"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,${encodeURIComponent(circuitPatternSVG)}')`,
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center',
          opacity: 1,
        }}
      />

      {/* Optional: Subtle animated glow orbs for added depth */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"
          style={{
            animation: 'float 20s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl"
          style={{
            animation: 'float 25s ease-in-out infinite 3s',
          }}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-0">
        {children}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-40px) translateX(-20px);
          }
          75% {
            transform: translateY(-20px) translateX(20px);
          }
        }
      `}</style>
    </div>
  );
};

export default CircuitBoardBackground;
