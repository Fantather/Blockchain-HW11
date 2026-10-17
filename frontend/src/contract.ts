import { BrowserProvider, Contract, JsonRpcProvider, Network } from "ethers";
import deployment from "./contract.json";

export const RPC_URL = "http://127.0.0.1:8545";
export const CHAIN_ID = 31337;

export interface Media {
  id: bigint;
  owner: string;
  cid: string;
  name: string;
  createdAt: bigint;
  deleted: boolean;
}

const provider = new JsonRpcProvider(RPC_URL, Network.from(CHAIN_ID), { staticNetwork: true });
provider.pollingInterval = 1000;

const reader = new Contract(deployment.address, deployment.abi, provider);

function toMedia(list: Media[]): Media[] {
  return list
    .map((m) => ({ id: m.id, owner: m.owner, cid: m.cid, name: m.name, createdAt: m.createdAt, deleted: m.deleted }))
    .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}

export async function fetchMedia(): Promise<Media[]> {
  return toMedia(await reader.getMedia());
}

export function subscribeToChanges(onChange: () => void): () => void {
  const filter = { address: deployment.address };
  provider.on(filter, onChange);
  return () => {
    provider.off(filter, onChange);
  };
}

async function writer(): Promise<Contract> {
  if (!window.ethereum) {
    throw new Error("MetaMask не установлен");
  }
  const browserProvider = new BrowserProvider(window.ethereum);
  const signer = await browserProvider.getSigner();
  return new Contract(deployment.address, deployment.abi, signer);
}

export async function addMedia(cid: string, name: string): Promise<void> {
  const tx = await (await writer()).addMedia(cid, name);
  await tx.wait();
}

export async function deleteMedia(id: bigint): Promise<void> {
  const tx = await (await writer()).deleteMedia(id);
  await tx.wait();
}
