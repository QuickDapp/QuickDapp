import type { CodegenConfig } from "@graphql-codegen/cli"
import path from "path"

const schema = path.join(__dirname, "schema.ts")
const queries = path.join(__dirname, "queries.ts")
const types = path.join(__dirname, "generated", "types.ts")

const config: CodegenConfig = {
  schema,
  documents: [queries],
  generates: {
    [types]: {
      config: {
        useIndexSignature: true,
        allowEnumStringTypes: true,
        printFieldsOnNewLines: true,
        useTypeImports: true,
        contextType: "any",
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false,
        },
      },
      plugins: ["typescript", "typescript-resolvers"],
    },
  },
}

export default config
