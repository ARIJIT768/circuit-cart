import type { Metadata } from "next";
import "./globals.css";

// 1. Define Metadata (Title & Description)
export const metadata: Metadata = {
  title: "Circuit Cart - Electronics Store",
  description: "Premium electronics and Arduino kits",
};

// 2. The Main Layout Component (MUST BE DEFAULT EXPORT)
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Load Icons */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 min-h-screen relative">
        {/* The Circuit Background Element */}
        <div className="circuit-bg"></div>
        
        {/* The Page Content */}
        {children}
      </body>
    </html>
  );
}