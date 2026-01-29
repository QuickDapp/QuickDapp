---
order: 98
icon: Rocket
---

# Getting started

## Step 0 - Pre-requisites

Ensure you have the following pre-requisites installed and ready:

* [Bun](https://bun.sh/)
* [Docker](http://docker.com/)
* [Git](https://git-scm.com/)

This guide assumes you have some knowledge of the basics of web application development (e.g backend, frontend, database, CLI, etc). However, if you follow the instructions properly you should still be able to get things up and running even if you don't understand everything immediately.

## Step 1 - Create a new project

Open a terminal window and type in:

```shell
bunx @quickdapp/cli create my-project
```

The above command will get the QuickDapp CLI and use it to create a new project in a folder called `my-project`. 

You can now enter the `my-project` folder using:

```shell
cd my-project
```

_Note: The following steps must be be executed within the `my-project` project folder._

## Step 2 - Run the database server

Now we'll use [Docker compose]() to install and run a temporary Postgres database. This will be the database that QuickDapp will use when run locally:

```shell
docker compose up -d
```

You should see output which looks like this:

```
[+] up 2/2
 ✔ Network my-project_default   Created                                               0.0s 
 ✔ Container quickdapp-postgres Created                                               0.1s 
```

From this point on the database is running in the background. To shutdown the database at any time run:

```shell
docker compose down
```

You can now connect to the database yourself through a third-party client (e.g [DBeaver](https://dbeaver.io/)). 

You can see the full database connection parameters by looking at the [`.env`](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/.env) file in the project. This file defines the [environment variables](./environment-variables.md) used by the web app._

## Step 3 - Setup database tables

With the database server running we need to create our database tables, ready for use by the QuickDapp backend. Run:

```shell
bun run db push
```

You may be prompted to confirm the execution of SQL statements against the database.

## Step 4 - Run dev server

Now we're ready to run the dev server and see the demo web page in a browser. Run:

```shell
bun run dev
```

You will see output like the following:

```
VITE v6.4.1  ready in 1803 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose

2026-01-29T05:08:33.934Z [info] <server> 🚀 QuickDapp server v3.4.0 started in 50.77ms
2026-01-29T05:08:33.934Z [info] <server> ➜ Running at: http://localhost:3000/
2026-01-29T05:08:33.934Z [info] <server> ➜ GraphQL endpoint: http://localhost:3000/graphql
2026-01-29T05:08:33.934Z [info] <server> ➜ Environment: development
```

You can now access the server in your browser at two URLs:

* [http://localhost:5173/](http://localhost:5173/)
  * This is a server which bundles and serves up your frontend code as a web app.
* [http://localhost:3000/](http://localhost:3000/)
  * This is the backend server which the above web app talks to.

If you access [http://localhost:5173/](http://localhost:5173/) you will see something which looks like this:

![](/images/demopage.png)

Whereas if you access [http://localhost:3000/](http://localhost:3000/) you will see:

![](/images/serverpage.png)

The two links shown on this page are:

* `/graphql` - A web interface for accessing and querying the backend [GraphQL API](./backend/graphql.md).
* `/health` - A simple API which returns a basic health-check for the server.

!!!
If you want to monitor your QuickDapp app's uptime you would typically monitor the `/health` endpoint.
!!!

## Step 5 - Hot reloading

You can now edit the code of your app and immediately see the changes reflected in the browser.

Go ahead and change the text in `HomePage.tsx` to be something different and you should see the page in the browser immediately update.

The same goes for if you change any of the backend server code - you will see the dev server running in the terminal auto-reload any code changes.

It is only if you change the `.env` file settings that you will need to manually restart the dev server. 

## Step 6 - Ready!

At this point everything is ready for you to actually develop your app. You may wish to follow one of our [tutorials](./tutorials/index.md).

The remainder of this guide helps you get this basic app deployed to production in the cloud.

## Step 7 - Setup Github

QuickDapp comes with [Github workflows](./deployment/github-workflows.md) that make it easy to test your web app as well as build it as a Docker container for easy cloud deployment.

Let's get this setup:

First, get a [Github.com](https://github.com) account (it's free!).

Once you're logged in, create a new repository on Github called `my-project`:

![](/images/github-new-repo.png)

You can set its visibility to _Private_:

![](/images/github-repo-private.png)

Now copy the SSH repository URL for your repo:

![](/images/github-ssh-url.png)

Now run the following locally in your project folder (replace `<...>` with the right values):

```shell
git add .
git commit -am "chore: initial version"
git remote add origin <the github ssh url you copied>
git push --set-upstream origin main
```

Now you should see the QuickDapp code show up in your new Github repository:

![](/images/github-initial-commit.png)

## Step 9 - Run Github workflow

Now we're ready to run the Github workflow to build the production-ready version of our web app.

Goto your Github repository's _Actions_ tab and select the _Docker Build and Push_ worfklow from the left. 

Then choose to run the workflow against the `main` branch:

![](/images/github-run-docker-workflow.png)

Refresh the page and you should see the workflow running.

Once it has completed successfully a Docker image should have been created. To see this package goto your Github's repository homepage and look at the right-hand side:

![](/images/github-package-list.png)

If you click into the package generated in the previous step you will see something like this, with the package marked as _Private_:

![](/images/github-package-overview.png)

## Step 10 - Generate Github access token

In order to deploy your newly built Docker image you will need to authenticate access to it. 

To do this goto https://github.com/settings/tokens/new. Create a new token with the `read:packages` permission set:

![](/images/github-new-pat.png)

Copy and paste the generated token value somewhere (you will only be shown in once!).

## Step 11 - Setup production database

TODO

## Step 12 - Deploy the production app

Although we can technically deploy the built Docker image to any cloud, for the purposes of this guide we will opt for [DigitalOcean](https://digitalocean.com/) as it's cheap and quite simple to use.

First, sign up for [DigitalOcean](https://digitalocean.com/).

Next, got the _App Platform_ menu item and you should see the _Apps_ page:

![](/images/do-apps-page.png)

Add a new app and select _Container Image_ as the source, and then select _Github Container Registry_ and enter the details of your Docker image _(replace `<...>` with the right values)_:

* _Repository_: `<github username>/<github repository name>`
* _Image Tag_: `latest` along with your username and the token you created earlier
  * _Note: using `latest` ensures that DigitalOcean will automatically re-deploy your app when the Docker image gets rebuilt on Github!_
* _Credentials_: `<github username>:<previously created access token>`

It will look something like this:

![](/images/do-create-app.png)

Now goto the next page. we need to fill in some _Environment Variables_ before we can finish the deployment.

We are going to deploy the built web app to DigitalOcean, though you 

## Step 9 - Setup production database

We will setup a PostgreSQL database for production use. You can use any PostgreSQL hosting service such as:

* [DigitalOcean Managed Databases](https://www.digitalocean.com/products/managed-databases)
* [AWS RDS](https://aws.amazon.com/rds/)
* [Railway](https://railway.app/)
* [Supabase](https://supabase.com/)

Once you have your production database connection string, add it to your `.env.production` file (or create a production environment file):

```ini
DATABASE_URL="postgresql://user:password@host:5432/database"
```

Now setup the production database schema:

```shell
bun run db migrate
```

## Step 10 - Test-run production build locally

_Note: This step is optional, and is useful if you want to debug some production issues locally_

In the project folder, build the production apps:

```shell
bun run build
# Optionally bundle client into server static assets so server serves the SPA:
# bun run build --bundle
```

Now, run the production apps:

```shell
bun run prod
```

Open http://localhost:3000 in your browser to test the production build locally.

## Step 11 - Deploy to production

QuickDapp supports several deployment options:

**Option A: Binary deployment**
Build a self-contained binary with embedded assets:

```shell
bun run build
# Binaries are created automatically in dist/binaries/
```

**Option B: Docker deployment**
Build and run as Docker containers:

```shell
docker build -t quickdapp .
docker run -p 3000:3000 quickdapp
```

See the [deployment documentation](./deployment/) for detailed guides on various deployment strategies.

## Step 11 - Hurrah!

**Congratulations! Your application is now available on the web in production mode.**

## Optional: Web3 Setup

If building a Web3 application, you can enable blockchain features:

### Local Development

1. Install Foundry if not already installed:
```shell
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Start local blockchain:
```shell
cd sample-contracts
bun devnet.ts
```

3. Deploy sample contracts:
```shell
cd sample-contracts
bun deploy.ts
```

4. Import the test mnemonic into your wallet (e.g., MetaMask):
```
test test test test test test test test test test test junk
```

5. Add local network to wallet: Chain ID 31337, RPC http://localhost:8545

### Production Web3 Deployment

To deploy contracts to Sepolia testnet:

1. Get Sepolia ETH from a faucet and an RPC endpoint
2. Set environment variables in `.env.production`:
```bash
WEB3_SUPPORTED_CHAINS=sepolia
WEB3_SEPOLIA_RPC="https://sepolia.infura.io/v3/your-api-key"
WEB3_SERVER_WALLET_PRIVATE_KEY="0x..."
```
3. Deploy: `cd sample-contracts && bun deploy.ts`

## Next steps

Now that you have QuickDapp running, explore the documentation to learn about:

* [Backend architecture](./backend/) - Understanding the ServerApp pattern and database layer
* [Frontend development](./frontend/) - Building React components and optional Web3 integrations
* [Worker system](./worker/) - Adding background jobs and cron tasks
* [Command line tools](./command-line/) - Development and deployment commands
* [Testing](./getting-started.md#step-6---run-tests) - Writing and running tests
