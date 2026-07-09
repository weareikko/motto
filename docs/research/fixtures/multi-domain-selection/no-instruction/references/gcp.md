# Deploy to GCP (Cloud Run)

1. Build with Cloud Build: `gcloud builds submit --tag <region>-docker.pkg.dev/<project>/<repo>/<svc>:<tag>`.
2. Deploy the revision: `gcloud run deploy <svc> --image <region>-docker.pkg.dev/<project>/<repo>/<svc>:<tag> --region <region>`.
3. Confirm traffic: `gcloud run services describe <svc> --region <region> --format='value(status.traffic)'`.

**Do NOT deploy with `--no-traffic` and then forget the migrate step** — a `--no-traffic` revision receives zero requests until you explicitly run `gcloud run services update-traffic <svc> --to-latest`. Deploys that omit the follow-up silently leave the old revision serving 100% of traffic, so the "successful" deploy ships nothing.

Rollback: `gcloud run services update-traffic <svc> --to-revisions <previous>=100`.
