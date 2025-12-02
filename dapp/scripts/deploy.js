async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Kontrat fabrikasını al
  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");

  // Deploy et
  const contract = await CertificateRegistry.deploy();

  // await contract.deployed();  <-- eski kullanım, artık gerek yok
  await contract.waitForDeployment();  // yeni kullanım

  console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
