---
order: 60
---

# GitHub Workflows

QuickDapp comes with GitHub Actions workflows for CI/CD automation.

## Docker Build and Push

The primary workflow builds a Docker container image and pushes it to GitHub Container Registry (GHCR). This is the recommended approach for deploying QuickDapp to cloud platforms.

**Trigger**: Manual dispatch from the Actions tab (workflow_dispatch), targeting any branch.

**What it does**:

1. Checks out the repository
2. Logs into GitHub Container Registry
3. Builds the Docker image using the project's `Dockerfile`
4. Tags the image with `latest` and the git SHA
5. Pushes the image to `ghcr.io/<username>/<repo>`

**Usage**:

1. Go to your repository's **Actions** tab
2. Select **Docker Build and Push** from the left sidebar
3. Click **Run workflow** and choose the branch
4. Wait for the build to complete
5. Find the built image under your repository's **Packages** section

The built image can be deployed to any container platform (DigitalOcean App Platform, AWS ECS, Railway, Fly.io, etc.). See [Getting Started](../getting-started.md) for a step-by-step deployment walkthrough.

## Setting Up

The workflow uses `GITHUB_TOKEN` for GHCR authentication, which is automatically provided by GitHub Actions. No additional secrets are needed for the basic workflow.

For deployment to external platforms, you may need to add platform-specific secrets in your repository's **Settings > Secrets and variables > Actions**.
