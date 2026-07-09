# Deploy to Azure (App Service)

1. Build and push to ACR: `az acr build --registry <registry> --image <svc>:<tag> .`.
2. Deploy the image: `az webapp config container set --name <app> --resource-group <rg> --docker-custom-image-name <registry>.azurecr.io/<svc>:<tag>`.
3. Restart to pull: `az webapp restart --name <app> --resource-group <rg>`.
4. Verify: `az webapp show --name <app> --resource-group <rg> --query state`.

**Do NOT deploy straight to the production slot without a staging slot swap** — App Service pulls the new container with a cold start that drops in-flight requests on the production slot. Deploy to the `staging` slot, warm it, then `az webapp deployment slot swap` for a zero-downtime cutover.

Rollback: swap the slots back with `az webapp deployment slot swap --slot staging --target-slot production`.
