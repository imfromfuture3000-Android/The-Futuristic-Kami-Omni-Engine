require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { PRIVATE_KEY, SCALE_RPC_URL, CHAIN_ID } = process.env;

module.exports = {
  solidity: "0.8.20",
  networks: {
    skale: {
      url: SCALE_RPC_URL || "",
      chainId: Number(CHAIN_ID) || 2046399126,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: 1000000000, // 1 gwei - SKALE minimum gas price
    },
  },
  etherscan: {
    apiKey: {
      skale: "not-needed", // SKALE explorer doesn't require API key
    },
    customChains: [
      {
        network: "skale",
        chainId: 2046399126,
        urls: {
          apiURL: "https://elated-tan-skale.explorer.mainnet.skalenodes.com/api",
          browserURL: "https://elated-tan-skale.explorer.mainnet.skalenodes.com",
        },
      },
    ],
  },
};
