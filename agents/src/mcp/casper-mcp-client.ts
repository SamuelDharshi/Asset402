// ─────────────────────────────────────────────────────────────────────────────
//  Casper MCP Server Client
//  Wraps tool calls against the Casper MCP Server (docs.cspr.cloud/agentic-tools)
//  GitHub: https://github.com/msanlisavas/casper-mcp
// ─────────────────────────────────────────────────────────────────────────────

import axios, { AxiosInstance, AxiosError } from 'axios';
import { AccountHistoryResponse } from '../types';

export interface CasperMCPConfig {
  serverUrl:  string;
  apiKey?:    string;
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

const RETRY_DELAYS_MS = [500, 1_000, 2_000];
const RETRYABLE_ERROR_CODES = new Set([408, 429, 500, 502, 503, 504]);

export class CasperMCPClient {
  private readonly http: AxiosInstance;

  constructor(config: CasperMCPConfig) {
    this.http = axios.create({
      baseURL:        config.serverUrl,
      timeout:        config.timeoutMs ?? 15_000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
    });
  }

  // ── Generic Tool Call with Retry ─────────────────────────────────────────────

  async callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const body: MCPToolCall = {
      method: 'tools/call',
      params: { name, arguments: args },
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const { data } = await this.http.post<MCPResponse<T>>('/', body, {
          timeout: attempt === 0 ? (this.http.defaults.timeout ?? 15_000) : RETRY_DELAYS_MS[attempt - 1],
        });

        if (data.error) {
          throw new Error(`Casper MCP Error [${data.error.code}]: ${data.error.message}`);
        }
        return data.result;

      } catch (err) {
        lastError = err as Error;

        if (attempt < RETRY_DELAYS_MS.length) {
          const isRetryable = (err as AxiosError).response
            ? RETRYABLE_ERROR_CODES.has((err as AxiosError).response!.status)
            : (err as AxiosError).code === 'ECONNABORTED' || (err as AxiosError).code === 'ENOTFOUND';

          if (isRetryable) {
            console.warn(`[CasperMCP] ${name} failed (attempt ${attempt + 1}), retrying in ${RETRY_DELAYS_MS[attempt]}ms`);
            await new Promise(res => setTimeout(res, RETRY_DELAYS_MS[attempt]));
            continue;
          }
        }

        // Non-retryable or exhausted retries
        break;
      }
    }

    console.error(`[CasperMCP] ${name} failed after ${RETRY_DELAYS_MS.length + 1} attempts: ${lastError?.message}`);
    throw lastError ?? new Error('MCP call failed');
  }

  // ── Specific Tool Wrappers ──────────────────────────────────────────────────

  /**
   * GetAccountBalance — fetch current CSPR mote balance for a public key.
   */
  async getAccountBalance(publicKey: string): Promise<string> {
    const result = await this.callTool<{ balance: string }>('GetAccountBalance', {
      public_key: publicKey,
    });
    return result.balance;
  }

  /**
   * GetAccountHistory — retrieve deploy + transfer history for risk scoring.
   * Used by the Risk Agent to assess borrower credibility.
   */
  async getAccountHistory(publicKey: string, limit = 50): Promise<AccountHistoryResponse> {
    const raw = await this.callTool<{
      public_key:     string;
      deploy_count:   number;
      transfer_count: number;
      account_age:    number;
      first_activity: string;
      balance:        string;
    }>('GetAccountHistory', { public_key: publicKey, limit });

    return {
      publicKey:     raw.public_key,
      deployCount:   raw.deploy_count,
      transferCount: raw.transfer_count,
      accountAge:    raw.account_age,
      firstActivity: raw.first_activity,
      balance:       raw.balance,
    };
  }

  /**
   * SubmitDeploy — broadcast a signed Casper deploy to the network.
   * Used by the Collector Agent after computing the payment split.
   */
  async submitDeploy(signedDeployJson: Record<string, unknown>): Promise<string> {
    const result = await this.callTool<{ deploy_hash: string }>('SubmitDeploy', {
      deploy: signedDeployJson,
    });
    return result.deploy_hash;
  }

  /**
   * GetDeployStatus — poll a deploy hash for inclusion status.
   */
  async getDeployStatus(deployHash: string): Promise<{
    status: 'pending' | 'included' | 'failed';
    blockHash?: string;
  }> {
    return this.callTool('GetDeployStatus', { deploy_hash: deployHash });
  }
}
