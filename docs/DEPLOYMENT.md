# Deployment

## CI/CD Pipeline

### Build (on PR)

`.github/workflows/build.yml` triggers on pull requests to `main`:

1. Authenticates to GCP via Workload Identity Federation
2. Builds the combined Docker image (frontend + backend)
3. Tags as `gcr.io/grndctrl/aii:pr-{number}` and `gcr.io/grndctrl/aii:sha-{sha}`
4. Pushes to GCR
5. Runs backend tests inside the container

### Deploy (on merge to main)

`.github/workflows/deploy.yml` triggers on push to `main`:

1. Authenticates to GCP
2. Pulls the PR-built image by SHA (avoids redundant rebuild)
3. Retags as `gcr.io/grndctrl/aii:latest`
4. Pushes to GCR
5. Deploys to Cloud Run with secrets and config

If the merge commit SHA doesn't match a PR build (e.g., direct push), it builds fresh.

## GCP Setup (one-time)

### 1. Create secrets in Secret Manager

```bash
gcloud secrets create anthropic-key --data-file=- <<< "sk-ant-..."
gcloud secrets create tavily-key --data-file=- <<< "tvly-..."
```

### 2. Set up Workload Identity Federation for GitHub Actions

```bash
# Create a workload identity pool
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Actions"

# Create a provider in the pool
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub OIDC" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Create a service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant roles
gcloud projects add-iam-policy-binding grndctrl \
  --member="serviceAccount:github-actions@grndctrl.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding grndctrl \
  --member="serviceAccount:github-actions@grndctrl.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding grndctrl \
  --member="serviceAccount:github-actions@grndctrl.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding grndctrl \
  --member="serviceAccount:github-actions@grndctrl.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Allow GitHub to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@grndctrl.iam.gserviceaccount.com \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/apshoemaker/aii" \
  --role="roles/iam.workloadIdentityUser"
```

### 3. Add GitHub repository secrets

| Secret | Value |
|--------|-------|
| `WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `WIF_SERVICE_ACCOUNT` | `github-actions@grndctrl.iam.gserviceaccount.com` |

Replace `PROJECT_NUMBER` with your GCP project number (not project ID).

### 4. Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com
```

## Cloud Run Configuration

| Setting | Value | Why |
|---------|-------|-----|
| Memory | 1 GiB | LangGraph agent + ffmpeg frame capture |
| CPU | 1 | Sufficient for single-user |
| Timeout | 300s | Long chat sessions via WebSocket |
| Min instances | 0 | Scale to zero when idle |
| Max instances | 3 | Cost control |
| Concurrency | 80 (default) | WebSocket connections per instance |

## Local Development

Use `docker-compose up --build` for local dev — separate frontend/backend containers with hot reload.

The production `Dockerfile` (root) is only used for Cloud Run deployment.
