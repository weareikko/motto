---
name: cloud-deploy
description: Deploy a service to AWS, GCP, or Azure. Use when the user asks to deploy, ship, or release a service to a named cloud provider.
metadata:
  kind: multi-domain
---

# cloud-deploy

This skill deploys a service to one cloud provider. First determine which provider the request targets, then read only that provider's reference file and follow it.

Use the AWS reference when the request names AWS, Amazon, ECS, Fargate, EKS, or Elastic Beanstalk — see [references/aws.md](references/aws.md). Use the GCP reference when the request names GCP, Google Cloud, Cloud Run, GKE, or App Engine — see [references/gcp.md](references/gcp.md). Use the Azure reference when the request names Azure, Microsoft, App Service, AKS, or Container Apps — see [references/azure.md](references/azure.md).

If the request does not clearly identify exactly one provider — for example it names a capability that all three offer (like "a managed Kubernetes cluster") without saying which cloud — do not guess and do not read every reference file. Ask the user which provider they mean before continuing.
