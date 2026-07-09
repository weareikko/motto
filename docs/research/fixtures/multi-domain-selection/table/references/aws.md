# Deploy to AWS (ECS Fargate)

1. Build and push the image: `aws ecr get-login-password | docker login ...`, then `docker push <acct>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>`.
2. Register a new task definition revision: `aws ecs register-task-definition --cli-input-json file://taskdef.json`.
3. Update the service: `aws ecs update-service --cluster <cluster> --service <svc> --task-definition <family>:<rev>`.
4. Watch the rollout: `aws ecs wait services-stable --cluster <cluster> --services <svc>`.

**Do NOT set `--force-new-deployment` together with a new task-definition revision** — doing both in one call triggers two overlapping rollouts, doubles running task count, and can trip the service's minimum-healthy-percent alarms. Pass the new revision alone; ECS rolls it out.

Rollback: `aws ecs update-service --task-definition <family>:<previous-rev>`.
