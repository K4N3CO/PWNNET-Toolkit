import React from 'react';

export type Tab = 'tools' | 'logbook' | 'resources' | 'settings';

export interface ToolDef {
  id: string;
  name: string;
  icon: any; // Lucide icon
  category: string;
  actionType: 'terminal' | 'modal' | 'external' | 'custom';
  requiresInput?: boolean;
  defaultPort?: string;
  description?: string;
}

export interface TerminalOutput {
  id: string;
  timestamp: number;
  type: 'system' | 'input' | 'success' | 'error' | 'info';
  content: React.ReactNode;
  rawContent?: string;
}
