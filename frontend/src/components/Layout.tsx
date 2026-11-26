import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { GAConfigModal } from './GAConfigModal';
import { PublishModal } from './PublishModal';
import { RoomReplacementModal } from './RoomReplacementModal';
import { RoomNavModal } from './RoomNavModal';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <GAConfigModal />
      <PublishModal />
      <RoomReplacementModal />
      <RoomNavModal />
    </div>
  );
};

