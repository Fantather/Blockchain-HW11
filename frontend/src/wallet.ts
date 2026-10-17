import { CHAIN_ID } from "./contract";

const CHAIN_HEX = "0x" + CHAIN_ID.toString(16);

export async function requestAccounts(): Promise<string[]> {
  const accounts = await window.ethereum!.request({ method: "eth_requestAccounts" });
  return accounts as string[];
}

export async function getAccounts(): Promise<string[]> {
  const accounts = await window.ethereum!.request({ method: "eth_accounts" });
  return accounts as string[];
}

export async function getChainId(): Promise<number> {
  const id = await window.ethereum!.request({ method: "eth_chainId" });
  return parseInt(id as string, 16);
}

function isUnknownChain(err: unknown): boolean {
  const e = err as { code?: number; data?: { originalError?: { code?: number } } };
  return e.code === 4902 || e.data?.originalError?.code === 4902;
}

export async function switchToLocalNetwork(): Promise<void> {
  try {
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_HEX }],
    });
  } catch (err) {
    if (!isUnknownChain(err)) {
      throw err;
    }
    await window.ethereum!.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: CHAIN_HEX,
          chainName: "Hardhat Local",
          rpcUrls: ["http://127.0.0.1:8545"],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        },
      ],
    });
  }
}

export function errorMessage(err: unknown): string {
  const e = err as { code?: string | number; reason?: string; shortMessage?: string; message?: string };
  if (e.code === "ACTION_REJECTED" || e.code === 4001) {
    return "Вы отклонили запрос в MetaMask";
  }
  return e.reason ?? e.shortMessage ?? e.message ?? "Неизвестная ошибка";
}
