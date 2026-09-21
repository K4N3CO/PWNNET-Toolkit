import { registerPlugin, PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

export interface NativeShellPlugin {
  execute(options: { command: string }): Promise<{ exitCode: number }>;
  scanLAN(options: { subnet: string }): Promise<{ status: string }>;
  crackHash(options: { hash: string, type: string, wordlistContent: string, useMutations: boolean }): Promise<void>;
  addListener(eventName: 'stdout', listenerFunc: (data: { line: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'stderr', listenerFunc: (data: { line: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'completed', listenerFunc: (data: { exitCode: number, success?: boolean, plaintext?: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'hostFound', listenerFunc: (data: { ip: string, status: string }) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

export const NativeShell = registerPlugin<NativeShellPlugin>('NativeShell');

export const isNative = Capacitor.isNativePlatform();
