interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, handler: (arg: unknown) => void): void;
  removeListener(event: string, handler: (arg: unknown) => void): void;
}

interface Window {
  ethereum?: EthereumProvider;
}
