import { network, artifacts } from "hardhat";
import { writeFileSync } from "node:fs";

const { ethers } = await network.getOrCreate();

const store = await ethers.deployContract("MediaStore");
await store.waitForDeployment();

const address = await store.getAddress();
const artifact = await artifacts.readArtifact("MediaStore");

const output = { address, abi: artifact.abi };
writeFileSync("frontend/src/contract.json", JSON.stringify(output, null, 2) + "\n");

console.log("MediaStore deployed to", address);
