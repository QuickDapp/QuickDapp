We are going to implement the GraphQL server and querying ability from v2 (quickdapp/) into v3 (quickdapp-v3/).

v3 needs to support all the same queries and mutations. But v3 uses GraphQL Yoga and not Apollo.

Comprehensive integration tests should be added to test the graphql queries and mutations work as expected. This includes testing for error responses.

Note that in v2 we do a number of things:

- use graphql-code-generator and a codegen.ts script to generate graphql types, fragments, etc 
- use a custom directives plugin to support GraphQL directives - the @auth directive, for example
- have the graphql code gen be run in both dev and prod scripts, so we'll need these scripts to be created for v3 in the scripts/ folder, similar to what's in v2
- we have a graphql api route which enforces the auth directive, dispatches the request to the right resolver, and handles errors and responses well. This will all need implementing and testing.
- graphql core definitions are in the shared/ folder as the client also relies on them.

There may be some improvements we can do in v3 to the GraphQL architecture. Have a think about this.

Think a lot for this plan.