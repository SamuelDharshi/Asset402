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
    hash:        'hash-77de8632404b808a26bdc8752411842704605af0db2b09628f93b234d51ef5a3',
    deployHash:  'ece020fd29788916cd07a38a1428c8dfb170248b7a52c1e4126992f645dc544f',
    explorerUrl: 'https://testnet.cspr.live/deploy/ece020fd29788916cd07a38a1428c8dfb170248b7a52c1e4126992f645dc544f',
  },
  fractionalRegistry: {
    hash:        'hash-09b361855b80935e46c94caf71eb7ee4f6dd678be712d21bb61c507bdce367c1',
    deployHash:  'c57734aa220967b69a7b0eb6439681abd29142838f6b5564b78cdfa3cb8bea9c',
    explorerUrl: 'https://testnet.cspr.live/deploy/c57734aa220967b69a7b0eb6439681abd29142838f6b5564b78cdfa3cb8bea9c',
  },
  rentalEscrow: {
    hash:        'hash-d30c450cd71a08ae87fe20d29797ed9ad46e33f3bf967621a329b800ee0f039e',
    deployHash:  '24f8c1007a2d33915205e35d21c0274422c25758915ccb7843c76a420ba3f061',
    explorerUrl: 'https://testnet.cspr.live/deploy/24f8c1007a2d33915205e35d21c0274422c25758915ccb7843c76a420ba3f061',
  },
  network: 'casper-test',
  deployer: '020394CCdB983b7B2a88486448E5d170F737A80264d32CaB99A3e2a3e01f33D6CEa1',
};
export { CONTRACTS };

// NOTE: this is a direct `window.CasperWallet` browser-extension integration,
// not the official CSPR.click SDK package (not a dependency here). That's a
// real, honest signature source when the extension is installed — what was
// NOT honest, and has been removed, was silently falling back to a fake
// `demo_sig_...` string and a hardcoded deployer address when the extension
// was absent. A flow could previously "complete" (rental booking, share
// purchase) with a signature nobody actually produced. Now, if the
// extension isn't present, connect()/signMessage() throw a clear error so
// the UI can prompt the user to install it instead of faking success.
interface ClickContextType {
  isConnected:        boolean;
  isExtensionAvailable: boolean;
  activeAccount:      string | null;
  publicKeyHex:       string | null;
  connect:            () => Promise<void>;
  disconnect:         () => void;
  signMessage:        (message: string) => Promise<{ signature: string; publicKey: string }>;
  signTypedData:      (domain: string, types: Record<string,unknown>, data: Record<string, unknown>) => Promise<{ signature: string; publicKey: string }>;
}

const ClickContext = createContext<ClickContextType | null>(null);

export function ClickProvider({ children }: { children: React.ReactNode }) {
  const [isConnected,    setIsConnected]    = useState(false);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [publicKeyHex,   setPublicKeyHex]   = useState<string | null>(null);
  const [isExtensionAvailable, setIsExtensionAvailable] = useState(false);

  useEffect(() => {
    const checkWallet = () => {
      const win = window as any;
      setIsExtensionAvailable(!!win.CasperWallet);
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

    if (!win.CasperWallet?.connect) {
      throw new Error(
        'Casper Wallet extension not found. Install it from the Chrome Web Store to connect a real wallet.'
      );
    }

    await win.CasperWallet.connect();
    const account = await win.CasperWallet.getActiveAccount();
    setActiveAccount(account.accountHex);
    setPublicKeyHex(account.accountHex);
    setIsConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    const win = window as any;
    win.CasperWallet?.disconnect?.();
    setActiveAccount(null);
    setPublicKeyHex(null);
    setIsConnected(false);
  }, []);

  const signMessage = useCallback(async (message: string): Promise<{ signature: string; publicKey: string }> => {
    const win = window as any;

    if (!win.CasperWallet?.signMessage) {
      throw new Error(
        'Casper Wallet extension not found — cannot sign. Install the extension to sign real transactions.'
      );
    }

    return win.CasperWallet.signMessage(message) as Promise<{ signature: string; publicKey: string }>;
  }, []);

  const signTypedData = useCallback(async (
    _domain: string,
    _types: Record<string, unknown>,
    _data: Record<string, unknown>,
  ): Promise<{ signature: string; publicKey: string }> => {
    const payloadHex = '01';
    return signMessage(payloadHex);
  }, [signMessage]);

  return (
    <ClickContext.Provider value={{ isConnected, isExtensionAvailable, activeAccount, publicKeyHex, connect, disconnect, signMessage, signTypedData }}>
      {children}
    </ClickContext.Provider>
  );
}

export function useClick() {
  const ctx = useContext(ClickContext);
  if (!ctx) throw new Error('useClick must be used within a ClickProvider');
  return ctx;
}
