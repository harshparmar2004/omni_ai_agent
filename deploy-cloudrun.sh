#!/usr/bin/env bash
# OmniStudio v7 — Google Cloud Run Instant Deployment Script
# Provisions zero-cold-start container service with persistent min-instances

set -e

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="omnistudio-cloud-runner"

echo "======================================================="
echo "🚀 Deploying OmniStudio v7 to Google Cloud Run"
echo "Project: $PROJECT_ID | Region: $REGION | Service: $SERVICE_NAME"
echo "======================================================="

# Build container via Google Cloud Build
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

# Deploy to Cloud Run with 1 min-instance for ZERO cold-start latency
gcloud run deploy "$SERVICE_NAME" \
  --image "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 4000 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 5 \
  --timeout 300

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format 'value(status.url)')

echo ""
echo "✅ Cloud Run Service deployed successfully!"
echo "🌐 URL: $SERVICE_URL"
echo ""
echo "💡 Add this URL to your Vercel Environment Variables as:"
echo "   CLOUD_RUN_WORKER_URL=$SERVICE_URL"
echo "This enables sub-second (<200ms) instant Telegram repost dispatches!"
