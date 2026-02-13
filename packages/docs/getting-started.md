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

At this point everything is ready for you to actually develop your app. 

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

## Step 8 - Run Github workflow

Now we're ready to run the Github workflow to build the production-ready version of our web app.

Goto your Github repository's _Actions_ tab and select the _Docker Build and Push_ worfklow from the left.

Then choose to run the workflow against the `main` branch:

![](/images/github-run-docker-workflow.png)

Refresh the page and you should see the workflow running.

Once it has completed successfully a Docker image should have been created. To see this package goto your Github's repository homepage and look at the right-hand side:

![](/images/github-package-list.png)

If you click into the package generated in the previous step you will see something like this, with the package marked as _Private_:

![](/images/github-package-overview.png)

## Step 9 - Generate Github access token

In order to deploy your newly built Docker image you will need to authenticate access to it.

To do this goto https://github.com/settings/tokens/new. Create a new token with the `read:packages` permission set:

![](/images/github-new-pat.png)

Copy and paste the generated token value somewhere (you will only be shown in once!).

## Step 10 - Setup production database

You will need a PostgreSQL database for production use. You can use any PostgreSQL hosting service such as:

* [DigitalOcean Managed Databases](https://www.digitalocean.com/products/managed-databases)
* [AWS RDS](https://aws.amazon.com/rds/)
* [Railway](https://railway.app/)
* [Supabase](https://supabase.com/)

## Step 11 - TODO


## Next steps

Now that you have QuickDapp running, explore the documentation to learn about:

* [Backend architecture](./backend/) - Understanding the ServerApp pattern and database layer
* [Frontend development](./frontend/) - Building React components
* [Worker system](./worker/) - Adding background jobs and cron tasks
* [Command line tools](./command-line/) - Development and deployment commands
* [Variants](./variants/) - Specialized derivations like the Web3 variant
