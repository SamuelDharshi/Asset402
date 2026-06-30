// ─────────────────────────────────────────────────────────────────────────────
//  CSPR.trade MCP Client
//  Wraps tool calls against the CSPR.trade MCP server (https://mcp.cspr.trade)
//  Used by the Risk Agent for real-time CSPR/USD price feeds and LTV calculations
// ─────────────────────────────────────────────────────────────────────────────

import axios, { AxiosInstance } from 'axios';
import { CsprPriceResponse } from '../types';

export interface CsprTradeMCPConfig {
  serverUrl:  string;    // default: https://mcp.cspr.trade
  timeoutMs?: number;
}

interface MCPToolCall {
  method:  'tools/call';
  params: {
    name:      string;
    arguments: Record<string, unknown>;
  };
}

interface MCPResponse<T> {
  result: T;
  error?: { code: number; message: string };
}

export class CsprTradeMCPClient {
  private readonly http: AxiosInstance;

  constructor(config: CsprTradeMCPConfig) {
    this.http = axios.create({
      baseURL: config.serverUrl,
      timeout: config.timeoutMs ?? 10_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const body: MCPToolCall = {
      method: 'tools/call',
      params: { name, arguments: args },
    };
    const { data } = await this.http.post<MCPResponse<T>>('/', body);
    if (data.error) {
      throw new Error(`CSPR.trade MCP Error [${data.error.code}]: ${data.error.message}`);
    }
    return data.result;
  }

  /**
   * get_token_price — fetch spot price and 24h change for any token.
   * Used by the Risk Agent to convert USD valuations into CSPR loan amounts.
   *
   * Example response:
   * { cspr_usd: 0.0234, "24h_change": "+3.2%" }
   */
  async getTokenPrice(token = 'CSPR', quote = 'USD'): Promise<CsprPriceResponse> {
    const raw = await this.callTool<{
      symbol:     string;
      price_usd:  number;
      change_24h: number;
      updated_at: string;
    }>('get_token_price', { token, quote });

    return {
      symbol:    raw.symbol,
      priceUsd:  raw.price_usd,
      change24h: raw.change_24h,
      updatedAt: raw.updated_at,
    };
  }

  /**
   * get_quote — get a swap quote between two tokens.
   * Used by the Listing Agent to compute CSPR/min rental rates.
   */
  async getQuote(fromToken: string, toToken: string, amount: string): Promise<{
    fromAmount: string;
    toAmount:   string;
    priceImpact: number;
    route:       string[];
  }> {
    const raw = await this.callTool<{
      from_amount:  string;
      to_amount:    string;
      price_impact: number;
      route:        string[];
    }>('get_quote', { from_token: fromToken, to_token: toToken, amount });

    return {
      fromAmount:  raw.from_amount,
      toAmount:    raw.to_amount,
      priceImpact: raw.price_impact,
      route:       raw.route,
    };
  }

  /**
   * get_liquidity_pools — fetch active liquidity pool data.
   * Optional enrichment for Risk Agent market context.
   */
  async getLiquidityPools(): Promise<Array<{
    pair: string;
    tvl:  number;
    apy:  number;
  }>> {
    return this.callTool('get_liquidity_pools', {});
  }
}
