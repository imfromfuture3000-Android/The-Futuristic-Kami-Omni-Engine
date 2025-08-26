require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    skale: {
      url: process.env.RPC_URL,       // SKALE RPC endpoint
      accounts: [process.env.PRIVATE_KEY] // Wallet private key
    }
  }
};
