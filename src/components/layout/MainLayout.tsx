import { ReactNode } from "react";
import { TopNavbar } from "./TopNavbar";
import { PushPermissionPrompt } from "@/components/pwa/PushPermissionPrompt";

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TopNavbar title={title} subtitle={subtitle} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-grid-pattern">
        {children}
      </main>
      <PushPermissionPrompt />
    </div>
  );
}