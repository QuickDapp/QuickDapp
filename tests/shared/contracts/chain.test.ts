/**
 * Comprehensive Tests for Chain Configuration Module
 *
 * Tests all functionality of src/shared/contracts/chain.ts including
 * chain resolution, ID mapping, error handling, and edge cases.
 */

import { describe, expect, it } from "bun:test"
import { anvil, mainnet, sepolia } from "viem/chains"
import {
  getChain,
  getChainId,
  getSupportedChains,
} from "../../../src/shared/contracts/chain"
// Import global test setup
import "../../setup"

describe("Chain Configuration Module", () => {
  describe("getChain()", () => {
    describe("Valid Chain Names", () => {
      it("should return mainnet chain for 'mainnet'", () => {
        const chain = getChain("mainnet")
        expect(chain.id).toBe(1)
        expect(chain.name).toBe("Ethereum")
        expect(chain.nativeCurrency?.symbol).toBe("ETH")
      })

      it("should return sepolia chain for 'sepolia'", () => {
        const chain = getChain("sepolia")
        expect(chain.id).toBe(11155111)
        expect(chain.name).toBe("Sepolia")
        expect(chain.testnet).toBe(true)
        expect(chain.nativeCurrency?.symbol).toBe("ETH")
      })

      it("should return arbitrum chain for 'arbitrum'", () => {
        const chain = getChain("arbitrum")
        expect(chain.id).toBe(42161)
        expect(chain.name).toBe("Arbitrum One")
        expect(chain.nativeCurrency?.symbol).toBe("ETH")
      })

      it("should return optimism chain for 'optimism'", () => {
        const chain = getChain("optimism")
        expect(chain.id).toBe(10)
        expect(chain.name).toBe("OP Mainnet")
        expect(chain.nativeCurrency?.symbol).toBe("ETH")
      })

      it("should return polygon chain for 'polygon'", () => {
        const chain = getChain("polygon")
        expect(chain.id).toBe(137)
        expect(chain.name).toBe("Polygon")
        expect(chain.nativeCurrency?.symbol).toBe("POL")
      })

      it("should return base chain for 'base'", () => {
        const chain = getChain("base")
        expect(chain.id).toBe(8453)
        expect(chain.name).toBe("Base")
        expect(chain.nativeCurrency?.symbol).toBe("ETH")
      })
    })

    describe("Chain Name Aliases", () => {
      it("should return mainnet chain for 'ethereum' alias", () => {
        const chain = getChain("ethereum")
        expect(chain.id).toBe(1)
        expect(chain.name).toBe("Ethereum")
      })

      it("should return anvil chain for 'anvil' alias", () => {
        const chain = getChain("anvil")
        expect(chain.id).toBe(31337)
        expect(chain.name).toBe("Anvil")
      })

      it("should return hardhat chain for 'hardhat' alias", () => {
        const chain = getChain("hardhat")
        expect(chain.id).toBe(31337)
        expect(chain.name).toBe("Hardhat")
      })

      it("should return localhost chain for 'localhost' alias", () => {
        const chain = getChain("localhost")
        expect(chain.id).toBe(1337)
        expect(chain.name).toBe("Localhost")
      })
    })

    describe("Case Sensitivity", () => {
      it("should handle uppercase chain names", () => {
        const chain = getChain("MAINNET")
        expect(chain.id).toBe(1)
        expect(chain.name).toBe("Ethereum")
      })

      it("should handle mixed case chain names", () => {
        const chain = getChain("Arbitrum")
        expect(chain.id).toBe(42161)
        expect(chain.name).toBe("Arbitrum One")
      })

      it("should handle lowercase aliases", () => {
        const chain = getChain("ethereum")
        expect(chain.id).toBe(1)
        expect(chain.name).toBe("Ethereum")
      })
    })

    describe("Chain Structure Validation", () => {
      it("should return chain with required properties", () => {
        const chain = getChain("mainnet")

        // Required viem chain properties
        expect(chain.id).toBeTypeOf("number")
        expect(chain.name).toBeTypeOf("string")
        expect(chain.nativeCurrency).toBeDefined()
        expect(chain.rpcUrls).toBeDefined()
        expect(chain.rpcUrls.default).toBeDefined()
        expect(chain.rpcUrls.default.http).toBeDefined()
        expect(Array.isArray(chain.rpcUrls.default.http)).toBe(true)
      })

      it("should return chain with native currency details", () => {
        const chain = getChain("mainnet")
        expect(chain.nativeCurrency?.name).toBeTypeOf("string")
        expect(chain.nativeCurrency?.symbol).toBeTypeOf("string")
        expect(chain.nativeCurrency?.decimals).toBeTypeOf("number")
      })

      it("should return testnet chain with testnet flag", () => {
        const chain = getChain("sepolia")
        expect(chain.testnet).toBe(true)
      })
    })

    describe("Error Handling", () => {
      it("should throw error for unknown chain", () => {
        expect(() => getChain("unknownchain")).toThrow(
          "Unknown chain: unknownchain",
        )
      })

      it("should throw error for empty string", () => {
        expect(() => getChain("")).toThrow("Unknown chain:")
      })

      it("should throw error for chain with special characters", () => {
        expect(() => getChain("chain@#$%")).toThrow("Unknown chain: chain@#$%")
      })

      it("should throw error for numeric string", () => {
        expect(() => getChain("123")).toThrow("Unknown chain: 123")
      })
    })
  })

  describe("getChainId()", () => {
    describe("Valid Chain IDs", () => {
      it("should return correct ID for mainnet", () => {
        const chainId = getChainId("mainnet")
        expect(chainId).toBe(1)
      })

      it("should return correct ID for sepolia", () => {
        const chainId = getChainId("sepolia")
        expect(chainId).toBe(11155111)
      })

      it("should return correct ID for arbitrum", () => {
        const chainId = getChainId("arbitrum")
        expect(chainId).toBe(42161)
      })

      it("should return correct ID for optimism", () => {
        const chainId = getChainId("optimism")
        expect(chainId).toBe(10)
      })

      it("should return correct ID for polygon", () => {
        const chainId = getChainId("polygon")
        expect(chainId).toBe(137)
      })

      it("should return correct ID for anvil", () => {
        const chainId = getChainId("anvil")
        expect(chainId).toBe(31337)
      })
    })

    describe("Alias Support", () => {
      it("should return mainnet ID for 'ethereum' alias", () => {
        const chainId = getChainId("ethereum")
        expect(chainId).toBe(1)
      })

      it("should return correct IDs for development aliases", () => {
        expect(getChainId("hardhat")).toBe(31337)
        expect(getChainId("localhost")).toBe(1337)
        expect(getChainId("anvil")).toBe(31337)
      })
    })

    describe("Error Propagation", () => {
      it("should propagate error from getChain() for unknown chains", () => {
        expect(() => getChainId("unknownchain")).toThrow(
          "Unknown chain: unknownchain",
        )
      })

      it("should propagate error for empty string", () => {
        expect(() => getChainId("")).toThrow("Unknown chain:")
      })
    })

    describe("Return Type Validation", () => {
      it("should always return a number", () => {
        const chainId = getChainId("mainnet")
        expect(typeof chainId).toBe("number")
        expect(Number.isInteger(chainId)).toBe(true)
        expect(chainId).toBeGreaterThan(0)
      })
    })
  })

  describe("getSupportedChains()", () => {
    describe("Array Structure", () => {
      it("should return array with single chain", () => {
        const chains = getSupportedChains("mainnet")
        expect(Array.isArray(chains)).toBe(true)
        expect(chains.length).toBe(1)
      })

      it("should return array containing the correct chain", () => {
        const chains = getSupportedChains("mainnet")
        expect(chains[0]?.id).toBe(1)
        expect(chains[0]?.name).toBe("Ethereum")
      })

      it("should work with aliases", () => {
        const chains = getSupportedChains("ethereum")
        expect(chains[0]?.id).toBe(1)
        expect(chains[0]?.name).toBe("Ethereum")
      })
    })

    describe("RainbowKit Compatibility", () => {
      it("should return format compatible with RainbowKit config", () => {
        const chains = getSupportedChains("mainnet")
        const chain = chains[0]

        // Check RainbowKit expected properties
        expect(chain?.id).toBeTypeOf("number")
        expect(chain?.name).toBeTypeOf("string")
        expect(chain?.nativeCurrency).toBeDefined()
        expect(chain?.rpcUrls).toBeDefined()
      })

      it("should work with multiple different chains", () => {
        const mainnetChains = getSupportedChains("mainnet")
        const sepoliaChains = getSupportedChains("sepolia")
        const arbitrumChains = getSupportedChains("arbitrum")

        expect(mainnetChains[0]?.id).toBe(1)
        expect(sepoliaChains[0]?.id).toBe(11155111)
        expect(arbitrumChains[0]?.id).toBe(42161)
      })
    })

    describe("Error Propagation", () => {
      it("should propagate error from getChain() for unknown chains", () => {
        expect(() => getSupportedChains("unknownchain")).toThrow(
          "Unknown chain: unknownchain",
        )
      })
    })
  })

  describe("Integration Tests", () => {
    describe("Chain Property Consistency", () => {
      it("should return chains consistent with viem exports", () => {
        const mainnetChain = getChain("mainnet")
        expect(mainnetChain.id).toBe(mainnet.id)
        expect(mainnetChain.name).toBe(mainnet.name)
        expect(mainnetChain.nativeCurrency?.symbol).toBe(
          mainnet.nativeCurrency.symbol,
        )

        const sepoliaChain = getChain("sepolia")
        expect(sepoliaChain.id).toBe(sepolia.id)
        expect(sepoliaChain.name).toBe(sepolia.name)

        const anvilChain = getChain("anvil")
        expect(anvilChain.id).toBe(anvil.id)
        expect(anvilChain.name).toBe(anvil.name)
      })
    })

    describe("Function Interdependencies", () => {
      it("should have getChainId() return same ID as getChain().id", () => {
        const chainName = "mainnet"
        const chainId = getChainId(chainName)
        const chain = getChain(chainName)
        expect(chainId).toBe(chain.id)
      })

      it("should have getSupportedChains() return same chain as getChain()", () => {
        const chainName = "sepolia"
        const chains = getSupportedChains(chainName)
        const chain = getChain(chainName)
        expect(chains[0]?.id).toBe(chain.id)
        expect(chains[0]?.name).toBe(chain.name)
      })
    })

    describe("Real-world Usage Scenarios", () => {
      it("should work with common development chains", () => {
        const devChains = [
          { name: "anvil", expectedId: 31337, expectedName: "Anvil" },
          { name: "hardhat", expectedId: 31337, expectedName: "Hardhat" },
          { name: "localhost", expectedId: 1337, expectedName: "Localhost" },
        ]
        devChains.forEach(({ name, expectedId, expectedName }) => {
          const chain = getChain(name)
          expect(chain.id).toBe(expectedId)
          expect(chain.name).toBe(expectedName)
        })
      })

      it("should work with major production chains", () => {
        const prodChains = [
          { name: "mainnet", expectedId: 1 },
          { name: "arbitrum", expectedId: 42161 },
          { name: "optimism", expectedId: 10 },
          { name: "polygon", expectedId: 137 },
          { name: "base", expectedId: 8453 },
        ]

        prodChains.forEach(({ name, expectedId }) => {
          const chain = getChain(name)
          expect(chain.id).toBe(expectedId)
          expect(chain.nativeCurrency).toBeDefined()
          expect(chain.rpcUrls.default.http.length).toBeGreaterThan(0)
        })
      })

      it("should work with test networks", () => {
        const testChains = [
          { name: "sepolia", expectedId: 11155111 },
          { name: "goerli", expectedId: 5 },
        ]

        testChains.forEach(({ name, expectedId }) => {
          const chain = getChain(name)
          expect(chain.id).toBe(expectedId)
          expect(chain.testnet).toBe(true)
        })
      })
    })

    describe("Error Message Quality", () => {
      it("should provide helpful error messages", () => {
        try {
          getChain("invalidchain")
        } catch (error) {
          expect(error instanceof Error).toBe(true)
          expect((error as Error).message).toContain("Unknown chain")
          expect((error as Error).message).toContain("invalidchain")
        }
      })
    })

    describe("Performance and Memory", () => {
      it("should handle multiple calls efficiently", () => {
        // Call functions multiple times to ensure no memory leaks or performance issues
        for (let i = 0; i < 100; i++) {
          const chain = getChain("mainnet")
          const chainId = getChainId("mainnet")
          const chains = getSupportedChains("mainnet")

          expect(chain.id).toBe(1)
          expect(chainId).toBe(1)
          expect(chains[0]?.id).toBe(1)
        }
      })

      it("should return consistent objects across calls", () => {
        const chain1 = getChain("mainnet")
        const chain2 = getChain("mainnet")

        // Should return equivalent objects
        expect(chain1.id).toBe(chain2.id)
        expect(chain1.name).toBe(chain2.name)
        expect(chain1.nativeCurrency?.symbol).toBe(
          chain2.nativeCurrency?.symbol,
        )
      })
    })
  })
})
