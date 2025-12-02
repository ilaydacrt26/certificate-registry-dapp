import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { CONTRACT_ABI } from './utils.js';

dotenv.config();

/**
 * Provider ve Contract instance'ı oluşturur
 */
export function getContract(needsSigner = false) {
  const rpcUrl = process.env.RPC_URL || 'http://ganache:8545';
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS bulunamadı! Lütfen .env dosyasını kontrol edin.');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  if (needsSigner) {
    const privateKey = process.env.OWNER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('OWNER_PRIVATE_KEY bulunamadı! Sertifika vermek için gerekli.');
    }
    const wallet = new ethers.Wallet(privateKey, provider);
    return new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
  }

  return new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
}

/**
 * Sertifika verir (Issue)
 */
export async function issueCertificate(certId, holderHash, title, issuer, expiresAt) {
  const contract = getContract(true);
  
  const tx = await contract.issue(certId, holderHash, title, issuer, expiresAt);
  const receipt = await tx.wait();
  
  return receipt;
}

/**
 * Sertifikayı doğrular (Verify)
 */
export async function verifyCertificate(certId, holderHash) {
  const contract = getContract(false);
  
  const result = await contract.verify(certId, holderHash);
  
  return {
    valid: result[0],
    isRevoked: result[1],
    issuedAt: result[2],
    expiresAt: result[3],
    title: result[4],
    issuer: result[5]
  };
}

/**
 * Sertifikayı iptal eder (Revoke)
 */
export async function revokeCertificate(certId) {
  const contract = getContract(true);
  
  const tx = await contract.revoke(certId);
  const receipt = await tx.wait();
  
  return receipt;
}

/**
 * Sertifika bilgilerini getirir
 */
export async function getCertificateInfo(certId) {
  const contract = getContract(false);
  
  try {
    const result = await contract.getCertificate(certId);
    
    return {
      certificateId: result[0],
      title: result[1],
      issuer: result[2],
      issuedAt: result[3],
      expiresAt: result[4],
      revoked: result[5]
    };
  } catch (error) {
    if (error.message.includes('Certificate not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * Contract owner'ını döndürür
 */
export async function getOwner() {
  const contract = getContract(false);
  return await contract.owner();
}

/**
 * Blockchain bağlantısını test eder
 */
export async function testConnection() {
  try {
    const rpcUrl = process.env.RPC_URL || 'http://ganache:8545';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    
    return {
      connected: true,
      blockNumber,
      chainId: network.chainId.toString()
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}
