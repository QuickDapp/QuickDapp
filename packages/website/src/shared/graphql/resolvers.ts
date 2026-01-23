import "json-bigint-patch"

import {
  GraphQLBigInt,
  GraphQLDateTime,
  GraphQLJSON,
  GraphQLPositiveInt,
} from "graphql-scalars"

export const defaultResolvers = {
  BigInt: GraphQLBigInt,
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  PositiveInt: GraphQLPositiveInt,
}
