import lighthouse from "@lighthouse-web3/sdk";

const API_KEY = (import.meta.env.VITE_LIGHTHOUSE_API_KEY as string | undefined)?.trim() ?? "";

const CUSTOM_GATEWAY = (import.meta.env.VITE_IPFS_GATEWAY as string | undefined)?.trim() ?? "";

export const GATEWAY =
  CUSTOM_GATEWAY === "" ? "https://gateway.lighthouse.storage/ipfs/" : CUSTOM_GATEWAY.replace(/\/*$/, "/");
export const HAS_API_KEY = API_KEY !== "";
export const NO_API_KEY = "Не задан ключ Lighthouse. Укажите VITE_LIGHTHOUSE_API_KEY в frontend/.env и перезапустите dev-сервер";

export function imageUrl(cid: string): string {
  return GATEWAY + cid;
}

export async function uploadToIpfs(file: File): Promise<string> {
  if (!HAS_API_KEY) {
    throw new Error(NO_API_KEY);
  }
  const response = await lighthouse.upload([file], API_KEY);
  const cid = response.data.Hash;
  if (!cid) {
    throw new Error("Lighthouse не вернул CID");
  }
  return cid;
}
