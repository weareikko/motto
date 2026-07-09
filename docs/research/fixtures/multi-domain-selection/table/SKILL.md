---
name: cloud-deploy
description: Deploy a service to AWS, GCP, or Azure. Use when the user asks to deploy, ship, or release a service to a named cloud provider.
metadata:
  kind: multi-domain
---

# cloud-deploy

This skill deploys a service to one cloud provider. First determine which provider the request targets, then read only that provider's reference file and follow it.

| If the request names… | Read this reference |
| --- | --- |
| AWS, Amazon, ECS, Fargate, EKS, Elastic Beanstalk | [references/aws.md](references/aws.md) |
| GCP, Google Cloud, Cloud Run, GKE, App Engine | [references/gcp.md](references/gcp.md) |
| Azure, Microsoft, App Service, AKS, Container Apps | [references/azure.md](references/azure.md) |

If the request does not clearly identify exactly one provider — for example it names a capability that all three offer (like "a managed Kubernetes cluster") without saying which cloud — do not guess and do not read every reference file. Ask the user which provider they mean before continuing.
