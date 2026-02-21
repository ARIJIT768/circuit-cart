import type { Metadata } from "next";
import { ThemeProvider } from "./context/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Circuit Cart - Electronics Store",
  description: "Premium electronics and Arduino kits",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 min-h-screen transition-colors duration-500">
        <ThemeProvider>
          {/* The Circuit Background is now part of the global layout */}
          <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.05] dark:opacity-[0.1]">
            <svg width="100%" height="100%">
              <pattern id="circuit-pattern" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0 10 H20 V30 M30 0 V20 H50" fill="none" stroke="#f59e0b" strokeWidth="1"/>
                <circle cx="20" cy="30" r="2" fill="#f59e0b"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#circuit-pattern)" />
            </svg>
          </div>
          
          <div className="relative z-10">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}