// src/app/layout.tsx
import { ReactNode } from "react";
import "@/app/globals.css";
import { GoalProvider } from '@/lib/GoalContext';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
       <GoalProvider>{children}</GoalProvider>
      </body>
    </html>
  );
}
