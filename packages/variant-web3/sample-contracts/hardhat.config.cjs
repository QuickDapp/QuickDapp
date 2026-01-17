require("@nomicfoundation/hardhat-toolbox");
const { readFileSync } = require("fs");
const { resolve } = require("path");

// Load mnemonic from file
const mnemonicPath = resolve(__dirname, "mnemonic.txt");
const mnemonic = readFileSync(mnemonicPath, "utf8").trim();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 31337,
      blockGasLimit: 0x1fffffffffffff,
      accounts: {
        mnemonic: mnemonic,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 10,
        accountsBalance: "10000000000000000000000", // 10000 ETH
      },
      mining: {
        auto: true,
        interval: 1000,
      }
    },
  },
};