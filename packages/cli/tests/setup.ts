import { afterAll } from "bun:test"
import { cleanupAllTempDirs } from "./helpers/temp-dir"

process.env.NODE_ENV = "test"

afterAll(() => {
  cleanupAllTempDirs()
})
