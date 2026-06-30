declare module '@casper/x402' {
  export class X402Client {
    constructor(config: any);
    fetch(url: string, init?: RequestInit): Promise<Response>;
  }
}
