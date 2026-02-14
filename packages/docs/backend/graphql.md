---
order: 60
---

# GraphQL

The frontend speaks to the backend via a [GraphQL API](https://graphql.org). 

Nearly all backend execution will take place within the context of an incoming GraphQL request. Errors thrown and database changes made will be the same. The only time this isn't the case is for work done as part of a [background worker](../worker/index.md).

Because GraphQL is an established, open standard it makes it easy for any app to speak to the backend, and the API is self-documenting.

For example, the `me` query is used to fetch the logged-in user's profile:

```graphql
type UserProfile {
  id: PositiveInt!
  email: String
  createdAt: DateTime!
}

type Query {
  me: UserProfile! @auth
}
```

Since GraphQL configuration is needed both client- and server-side the various configuration files are stored in `src/shared/graphql`. The full schema is defined in [`src/shared/graphql/schema.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/shared/graphql/schema.ts). 

In addition to the schema, the folder also contains other files worth knowing about:

* `fragments.ts` - query response fragments, for use in `queries.ts` and `mutations.ts`
* `queries.ts` - read-only queries which are intended to only fetch data from the backend, e.g fetcing a user's profile.
* `mutations.ts` - read-write queries which are intended to update data on the backend, e.g signing up a new user.
* `errors.ts` - errors definitions and error generation and parsing code.
* `resolvers.ts` - resolvers for scalar types such as `JSON` and `BigInt`, etc.
* `client.ts` - GraphQL client config for use in the frontend.

You may extend the schema with additional operations. For example, the [Web3 variant](../variants/web3/index.md) adds its own mutations.

## The @auth Directive

Operations marked with `@auth` require the user to be authenticated in order for the given query/mutation to succeed. 

When an unauthenticated request tries to access a protected operation, it returns an `UNAUTHORIZED` GraphQL error.

## Resolver implementation

Resolvers are defined in [`src/server/graphql/resolvers.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/package/base/src/server/graphql/resolvers.ts). Each resolver receives the context the authenticated user (if any):

```typescript
const resolvers = {
  Query: {
    getMyNotifications: async (_, { pageParam }, context) => {
      const user = getAuthenticatedUser(context)
      return await getNotifications(context.serverApp.db, user.id, pageParam)
    }
  }
}
```

## No Field Resolvers

QuickDapp deliberately avoids GraphQL field resolvers. All data is fetched in the parent resolver using SQL joins, which prevents [N+1 query problems](https://medium.com/databases-in-simple-words/the-n-1-database-query-problem-a-simple-explanation-and-solutions-ef11751aef8a) and keeps performance reasonable.

!!!
GraphQL [subscriptions](https://graphql.org/learn/subscriptions/) are not supported at this time. Use [real-time notifications](./realtime-notifications.md) instead.
!!!
