# syntax=docker/dockerfile:1
# Replyot self-hosted image: Next.js app, SMTP listener, job queues and
# backups in one Node process.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 REPLYOT_RUNTIME=node MAILFLARE_RUNTIME=node

FROM base AS deps
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --ignore-scripts

FROM deps AS build
COPY . .
RUN --mount=type=cache,target=/app/.next-node/cache pnpm run build:node

# Production dependencies only.
FROM build AS prod-deps
RUN pnpm prune --prod --ignore-scripts \
	&& rm -rf node_modules/@aws-sdk node_modules/esbuild node_modules/@esbuild node_modules/typescript node_modules/better-sqlite3

FROM base AS runtime
ENV NODE_ENV=production DATA_DIR=/data PORT=4008 SMTP_INBOUND_PORT=25 SMTP_URL=smtp://postfix:587 SMTP_TLS_REJECT_UNAUTHORIZED=false OUTBOUND_PROVIDER=postfix
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/.next-node ./.next-node
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/public ./public
COPY --chown=node:node --from=build /app/drizzle ./drizzle
COPY --chown=node:node --from=build /app/package.json /app/next.config.ts ./
COPY --chown=node:node --from=build /app/src/lib/security/headers.ts ./src/lib/security/headers.ts
COPY --chown=node:node --from=build /app/scripts/neon-dump.sql ./scripts/neon-dump.sql
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 4008 25
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4008)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.mjs"]
