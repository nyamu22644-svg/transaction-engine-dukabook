import './globals.css';

export const metadata = {
  title: 'DukaBook',
  description: 'Deep Ocean Circuit Background',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen w-full overflow-x-hidden">
        {/* Deep Ocean Circuit Background */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 h-full w-full"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, #1e3a4c 30%, #020617 100%)',
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1920 1080"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 w-full h-full"
            style={{ opacity: 0.10 }}
            preserveAspectRatio="none"
          >
            <g stroke="#22d3ee" strokeWidth="2">
              <path d="M100 200 L400 200 Q420 200 420 220 L420 400" />
              <path d="M300 100 L300 400 Q300 420 320 420 L600 420" />
              <circle cx="420" cy="220" r="8" fill="#22d3ee" opacity="0.5" />
              <circle cx="300" cy="400" r="8" fill="#22d3ee" opacity="0.5" />
              {/* Add more lines/nodes for a richer effect */}
            </g>
          </svg>
        </div>
        {/* Main content */}
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
