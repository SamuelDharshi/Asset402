'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CONTRACTS = {
  assetRegistry: {
    hash:        'hash-1120c2a6308ee3e60bcbc17771ec018f5ef9ba7d0322c55747d341ad752d50ec',
    deployHash:  'e69b9da937de5ea373274a1e982cfc047818e8a8774bb2899f1e758e76e47e40',
    blockHeight: 8330843,
    explorerUrl: 'https://testnet.cspr.live/deploy/e69b9da937de5ea373274a1e982cfc047818e8a8774bb2899f1e758e76e47e40',
  },
  mintTx: {
    deployHash:  '327382489325d57605753e406cf41cc1fa5cb3bd7bf9c32b5b8d0c077f9cbfcd',
    blockHeight: 8330846,
    explorerUrl: 'https://testnet.cspr.live/deploy/327382489325d57605753e406cf41cc1fa5cb3bd7bf9c32b5b8d0c077f9cbfcd',
  },
  carbonCredit: {
    hash:        'hash-95dfa71608ce06624e791543fafb6e5cc5924b1928e2414ae83edb08659cb686',
    deployHash:  '1099eed33b0bd0db0062152a7026f670f73f26edea4427c115f8b341debe13cb',
    explorerUrl: 'https://testnet.cspr.live/deploy/1099eed33b0bd0db0062152a7026f670f73f26edea4427c115f8b341debe13cb',
  },
  fractionalRegistry: {
    hash:        'hash-420db8acf6991ae16515426d43f50a4215f58fa400724c9ffe4b61d04375271b',
    deployHash:  'c2fe89ca4e5623d83cb51e704466f0ee65c9af4ecfbc0159f75900ca6c64eee5',
    explorerUrl: 'https://testnet.cspr.live/deploy/c2fe89ca4e5623d83cb51e704466f0ee65c9af4ecfbc0159f75900ca6c64eee5',
  },
  network: 'casper-test',
  deployer: '020394CCdB983b7B2a88486448E5d170F737A80264d32CaB99A3e2a3e01f33D6CEa1',
};
export { CONTRACTS };

interface ClickContextType {
  isConnected:    boolean;
  activeAccount: string | null;
  publicKeyHex:   string | null;
  connect:        () => Promise<void>;
  disconnect:     () => void;
  signMessage:    (message: string) => Promise<{ signature: string; publicKey: string }>;
  signTypedData:  (domain: string, types: Record<string,unknown>, data: Record<string, unknown>) => Promise<{ signature: string; publicKey: string }>;
}

const ClickContext = createContext<ClickContextType | null>(null);

export function ClickProvider({ children }: { children: React.ReactNode }) {
  const [isConnected,    setIsConnected]    = useState(false);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [publicKeyHex,   setPublicKeyHex]   = useState<string | null>(null);

  useEffect(() => {
    const checkWallet = () => {
      const win = window as any;
      if (win.CasperWallet?.isConnected?.()) {
        win.CasperWallet.getActiveAccount().then((acc: { accountHex: string }) => {
          setActiveAccount(acc.accountHex);
          setPublicKeyHex(acc.accountHex);
          setIsConnected(true);
        });
      }
    };
    checkWallet();
    const win = window as any;
    if (win.CasperWallet) {
      win.CasperWallet.addEventListener?.('accountChanged', checkWallet);
    }
  }, []);

  const connect = useCallback(async () => {
    const win = window as any;

    if (win.CasperWallet?.connect) {
      try {
        await win.CasperWallet.connect();
        const account = await win.CasperWallet.getActiveAccount();
        setActiveAccount(account.accountHex);
        setPublicKeyHex(account.accountHex);
        setIsConnected(true);
        return;
      } catch (err) {
        printWarning(err);
      }
    }

    setActiveAccount(CONTRACTS.deployer);
    setPublicKeyHex(CONTRACTS.deployer);
    setIsConnected(true);
  }, []);

  const printWarning = (err: any) => {
    console.warn('[CSPR.click] Connect fallback used:', err);
  }

  const disconnect = useCallback(() => {
    const win = window as any;
    win.CasperWallet?.disconnect?.();
    setActiveAccount(null);
    setPublicKeyHex(null);
    setIsConnected(false);
  }, []);

  const signMessage = useCallback(async (message: string): Promise<{ signature: string; publicKey: string }> => {
    const win = window as any;

    if (win.CasperWallet?.signMessage) {
      return win.CasperWallet.signMessage(message) as Promise<{ signature: string; publicKey: string }>;
    }

    return {
      signature: `demo_sig_${Buffer.from(message).toString('hex').slice(0, 64)}`,
      publicKey:  activeAccount ?? CONTRACTS.deployer,
    };
  }, [activeAccount]);

  const signTypedData = useCallback(async (
    _domain: string,
    _types: Record<string, unknown>,
    _data: Record<string, unknown>,
  ): Promise<{ signature: string; publicKey: string }> => {
    const payloadHex = '01'; 
    return signMessage(payloadHex);
  }, [signMessage]);

  return (
    <ClickContext.Provider value={{ isConnected, activeAccount, publicKeyHex, connect, disconnect, signMessage, signTypedData }}>
      {children}
    </ClickContext.Provider>
  );
}

export function useClick() {
  const ctx = useContext(ClickContext);
  if (!ctx) throw new Error('useClick must be used within a ClickProvider');
  return ctx;
}
