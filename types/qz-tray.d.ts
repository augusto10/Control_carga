declare module 'qz-tray' {
  export interface QzPrintData {
    type: 'raw';
    format: 'command';
    flavor: 'plain';
    data: string;
  }

  const qz: {
    websocket: {
      isActive(): boolean;
      connect(options?: {
        host?: string | string[];
        port?: {
          secure?: number[];
          insecure?: number[];
        };
        usingSecure?: boolean;
        keepAlive?: number;
        retries?: number;
        delay?: number;
      }): Promise<void>;
      disconnect(): Promise<void>;
      getConnectionInfo?(): { socket: string; host: string; port: number };
    };
    security: {
      setCertificatePromise(fn: () => Promise<string>): void;
      setSignatureAlgorithm(algorithm: string): void;
      setSignaturePromise(fn: (toSign: string) => Promise<string>): void;
    };
    printers: {
      find(): Promise<string[]>;
      details(): Promise<Array<{ name?: string }> | { name?: string }>;
      getDefault(): Promise<string>;
    };
    configs: {
      create(printer: string): unknown;
    };
    print(config: unknown, data: QzPrintData[]): Promise<void>;
  };

  export default qz;
}
