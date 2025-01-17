import _ from 'lodash'
import { ErrorCode } from "../errors"

export const createErrorResponse = (message: string, code = ErrorCode.INTERNAL) => {
  return {
    error: {
      __typename: 'ErrorDetails',
      code,
      message,
    },
  }
}
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "files": {
    "ignore": [
      "node_modules",
      "**/node_modules",
      "**/dist",
      "**/dist-bin",
      "**/public",
      "**/*.generated.ts"
    ]
  },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "semicolons": "asNeeded"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": false,
      "complexity": {
        "noBannedTypes": "error",
        "noExtraBooleanCast": "error",
        "noMultipleSpacesInRegularExpressionLiterals": "error",
        "noUselessCatch": "error",
        "noUselessThisAlias": "error",
        "noUselessTypeConstraint": "error",
        "noWith": "error"        
      },
      "correctness": {
        "noConstAssign": "error",
        "noConstantCondition": "error",
        "noEmptyCharacterClassInRegex": "error",
        "noEmptyPattern": "error",
        "noGlobalObjectCalls": "error",
        "noInnerDeclarations": "error",
        "noInvalidConstructorSuper": "error",
        "noNewSymbol": "error",
        "noNonoctalDecimalEscape": "error",
        "noPrecisionLoss": "error",
        "noSelfAssign": "error",
        "noSetterReturn": "error",
        "noSwitchDeclarations": "error",
        "noUndeclaredVariables": "error",
        "noUnreachable": "error",
        "noUnreachableSuper": "error",
        "noUnsafeFinally": "error",
        "noUnsafeOptionalChaining": "error",
        "noUnusedLabels": "error",
        "noUnusedImports": "error",
        "noUnusedVariables": "error",
        "useArrayLiterals": "off",
        "useExhaustiveDependencies": "error",
        "useHookAtTopLevel": "error",
        "useIsNan": "error",
        "useValidForDirection": "error",
        "useYield": "error"
      },
      "style": { "noNamespace": "error", "useAsConstAssertion": "error" },
      "suspicious": {
        "noAssignInExpressions": "error",
        "noAsyncPromiseExecutor": "error",
        "noCatchAssign": "error",
        "noClassAssign": "error",
        "noCompareNegZero": "error",
        "noControlCharactersInRegex": "error",
        "noDebugger": "error",
        "noDuplicateCase": "error",
        "noDuplicateClassMembers": "error",
        "noDuplicateObjectKeys": "error",
        "noDuplicateParameters": "error",
        "noEmptyBlockStatements": "error",
        "noExplicitAny": "off",
        "noExtraNonNullAssertion": "error",
        "noFallthroughSwitchClause": "error",
        "noFunctionAssign": "error",
        "noGlobalAssign": "error",
        "noImportAssign": "error",
        "noMisleadingCharacterClass": "error",
        "noMisleadingInstantiator": "error",
        "noPrototypeBuiltins": "error",
        "noRedeclare": "error",
        "noShadowRestrictedNames": "error",
        "noUnsafeDeclarationMerging": "error",
        "noUnsafeNegation": "error",
        "useGetterReturn": "error",
        "useValidTypeof": "error"
      }
    },
    "ignore": ["**/dist"]
  },
  "json": {
    "parser": {
      "allowComments": true
    }
  }
}


export const resolveErrorFromResponse = (result: any) => {
  if (result instanceof Error) {
    return result.message
  }

  const { data, errors } = result
  if (errors?.length) {
    return stringifyError(errors)
  }
  const dataError = _.get(data, `${Object.keys(data || {})[0]}.error`)
  if (dataError) {
    return `${dataError.code}: ${dataError.message}`
  }

  return "Unknown error"
}



/**
 * Stringify given GraphQL request error.
 *
 * @param  {*} errInput Error(s) from GraphQL call.
 * @return {String}
 */
export const stringifyError = (errInput: any) => {
  const err = Array.isArray(errInput) ? errInput[0] : errInput

  const code = err.code || _.get(err, 'extensions.code')

  const str = [
    code ? `${err.message} (code: ${code})` : err.message
  ]

  const stackTrace = _.get(err, 'extensions.exception.stacktrace')
  if (stackTrace) {
    str.push(stackTrace[0])
  }

  const networkErrors = _.get(err, 'networkError.result.errors', [])
  for (const e of networkErrors) {
    str.push(stringifyError(e))
  }

  return str.join('\n')
}