const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying with account:", deployer.address);

  // --- 1. Deploy OPT Token (500,000 supply) ---
  const OPTToken = await ethers.getContractFactory("OPTToken");
  const opt = await OPTToken.deploy();
  await opt.deployed();
  console.log("✅ OPTToken deployed at:", opt.address);

  // --- 2. Deploy Treasury ---
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.deployed();
  console.log("✅ Treasury deployed at:", treasury.address);

  // --- 3. Deploy DAO (linked to OPT token) ---
  const OmegaDAO = await ethers.getContractFactory("OmegaDAO");
  const dao = await OmegaDAO.deploy(opt.address);
  await dao.deployed();
  console.log("✅ OmegaDAO deployed at:", dao.address);

  // --- 4. Transfer treasury ownership to DAO (so DAO controls funds later) ---
  const tx = await treasury.transferOwnership(dao.address);
  await tx.wait();
  console.log("🔑 Treasury ownership transferred to DAO");

  console.log("\n🚀 Deployment finished!");
  console.log("OPT:", opt.address);
  console.log("Treasury:", treasury.address);
  console.log("DAO:", dao.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
