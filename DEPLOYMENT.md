# Temporal Services Deployment

This document outlines the deployment process and required GitHub repository configuration for the Temporal CI/CD pipeline defined in `.github/workflows/deploy-temporal.yml`.

## Overview

The CI/CD pipeline automates the building and containerization of two key services:
1.  **Temporal Worker** (runs orchestration logic from `/temporal`).
2.  **Temporal REST Gateway** (Express.js bridge to Temporal Cloud from `/temporal-rest-gateway`).

The pipeline uses GitHub Actions to build Docker images and push them to the GitHub Container Registry (GHCR).

## Required Configuration

For the current build-and-push pipeline to execute successfully, ensure the following is configured in your repository settings:

### Permissions
*   **Workflow Permissions:** Under **Settings > Actions > General**, ensure that `GITHUB_TOKEN` has read and write permissions (or explicitly `packages: write` in the workflow file, which is already configured). This is required to push images to GHCR.

### Secrets
Currently, the pipeline leverages the automatically provided `GITHUB_TOKEN` to authenticate with GHCR.

**Environment Variables:**
Ensure the backend environment (where the Temporal Worker runs) contains the following variables:
*   `ALBATO_WEBHOOK_URL`: Webhook URL for the external automation layer (Albato) to route failure alerts.

**Future Deployment Phase:**
When the deployment step placeholder is replaced with actual deployment logic (e.g., SSH to a target server), you will need to add corresponding secrets. Common examples include:
*   `DEPLOY_SSH_KEY`: The private SSH key for the target server.
*   `DEPLOY_HOST`: The IP address or hostname of the target server.
*   `DEPLOY_USER`: The username for the SSH connection.

## Pipeline Trigger

The workflow automatically triggers on **pushes to the `main` branch** when changes are detected in:
*   `temporal/**`
*   `temporal-rest-gateway/**`
*   `.github/workflows/deploy-temporal.yml`

This ensures that builds are only run when relevant codebase areas are updated.
