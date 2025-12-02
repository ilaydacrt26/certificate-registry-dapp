require('dotenv').config();
const { ethers } = require('ethers');

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = process.env.CHAIN_ID;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

async function main() {
  console.log("Client started");
  console.log("RPC URL:", RPC_URL);
  console.log("Chain ID:", CHAIN_ID);
  console.log("Contract Address:", CONTRACT_ADDRESS);

  // Örnek: provider oluştur
  const provider = new ethers.JsonRpcProvider(RPC_URL, Number(CHAIN_ID));
  const balance = await provider.getBalance("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  console.log("Example account balance:", ethers.formatEther(balance), "ETH");
}

main().catch(console.error);
