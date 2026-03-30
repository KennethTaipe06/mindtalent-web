import api from "./api";

export interface AntiFraudAlert {
  type: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

type AlertCallback = (alert: AntiFraudAlert) => void;

export class AntiFraudService {
  private sessionId: string;
  private callbacks: AlertCallback[] = [];
  private cleanupFns: (() => void)[] = [];
  private alertCount = 0;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  onAlert(callback: AlertCallback) {
    this.callbacks.push(callback);
  }

  private emit(alert: AntiFraudAlert) {
    this.alertCount++;
    this.callbacks.forEach((cb) => cb(alert));
    // Enviar al backend
    api.post("/proctoring/alert", {
      sessionId: this.sessionId,
      type: alert.type,
      data: alert.data || {},
    }).catch(() => {}); // No bloquear si falla
  }

  /** Inicia todos los controles anti-fraude */
  start() {
    this.detectTabSwitch();
    this.detectWindowBlur();
    this.enforceFullscreen();
    this.blockClipboard();
    this.detectMultipleScreens();
    // DevTools detection removed - no matching AlertType enum
  }

  /** Limpia todos los listeners */
  stop() {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  getAlertCount() {
    return this.alertCount;
  }

  // ---- Tab/visibility change ----
  private detectTabSwitch() {
    const handler = () => {
      if (document.hidden) {
        this.emit({
          type: "TAB_SWITCH",
          timestamp: new Date().toISOString(),
          data: { hidden: true },
        });
      }
    };
    document.addEventListener("visibilitychange", handler);
    this.cleanupFns.push(() => document.removeEventListener("visibilitychange", handler));
  }

  // ---- Window blur (alt-tab, click outside) ----
  private detectWindowBlur() {
    const handler = () => {
      this.emit({
        type: "WINDOW_BLUR",
        timestamp: new Date().toISOString(),
      });
    };
    window.addEventListener("blur", handler);
    this.cleanupFns.push(() => window.removeEventListener("blur", handler));
  }

  // ---- Fullscreen enforcement ----
  private enforceFullscreen() {
    const handler = () => {
      if (!document.fullscreenElement) {
        this.emit({
          type: "FULLSCREEN_EXIT",
          timestamp: new Date().toISOString(),
        });
        // Intentar re-entrar a fullscreen despues de un breve delay
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {});
        }, 1000);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    this.cleanupFns.push(() => document.removeEventListener("fullscreenchange", handler));
  }

  // ---- Clipboard blocking ----
  private blockClipboard() {
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      this.emit({
        type: "COPY_PASTE_ATTEMPT",
        timestamp: new Date().toISOString(),
        data: { action: e.type },
      });
    };
    document.addEventListener("copy", preventCopy);
    document.addEventListener("paste", preventCopy);
    document.addEventListener("cut", preventCopy);
    this.cleanupFns.push(() => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("paste", preventCopy);
      document.removeEventListener("cut", preventCopy);
    });

    // Block right-click
    const preventContext = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", preventContext);
    this.cleanupFns.push(() => document.removeEventListener("contextmenu", preventContext));
  }

  // ---- Multiple screens detection ----
  private detectMultipleScreens() {
    if (window.screen && window.screen.width !== window.screen.availWidth) {
      this.emit({
        type: "SECOND_SCREEN",
        timestamp: new Date().toISOString(),
        data: {
          screenWidth: window.screen.width,
          availWidth: window.screen.availWidth,
        },
      });
    }
  }

  /** Entrar a fullscreen */
  async requestFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }

  /** Salir de fullscreen */
  async exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  }
}
