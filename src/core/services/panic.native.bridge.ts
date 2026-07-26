import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

interface IPanicNativeModule {
  startPanicService(): Promise<boolean>;
  stopPanicService(): Promise<boolean>;
  isServiceRunning(): Promise<boolean>;
  getPressState(): Promise<{
    pressCount: number;
    firstPressAt: number;
    windowExpired: boolean;
  }>;
  resetPressState(): Promise<boolean>;
}

const { PanicModule: NativePanicModule } = NativeModules as {
  PanicModule: IPanicNativeModule;
};

class PanicNativeBridge implements IPanicNativeModule {
  private available: boolean;
  private emitter: NativeEventEmitter | null = null;

  constructor() {
    this.available =
      Platform.OS === 'android' && NativePanicModule != null;
    if (this.available) {
      this.emitter = new NativeEventEmitter(
        NativeModules.PanicModule as any,
      );
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async startPanicService(): Promise<boolean> {
    if (!this.available) return false;
    return NativePanicModule.startPanicService();
  }

  async stopPanicService(): Promise<boolean> {
    if (!this.available) return false;
    return NativePanicModule.stopPanicService();
  }

  async isServiceRunning(): Promise<boolean> {
    if (!this.available) return false;
    return NativePanicModule.isServiceRunning();
  }

  async getPressState() {
    if (!this.available) {
      return { pressCount: 0, firstPressAt: 0, windowExpired: true };
    }
    return NativePanicModule.getPressState();
  }

  async resetPressState(): Promise<boolean> {
    if (!this.available) return false;
    return NativePanicModule.resetPressState();
  }

  onTriggered(callback: () => void): () => void {
    if (!this.emitter) return () => {};
    const subscription = this.emitter.addListener('PanicTriggered', () => {
      callback();
    });
    return () => subscription.remove();
  }
}

export const panicNativeBridge = new PanicNativeBridge();
