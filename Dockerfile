ARG BUN_VERSION=1.3.11

# --- Stage 1: install + build with full source (less cacheable but works reliably
# with Bun workspaces, which need workspace dirs present at install time). ---
FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN cd apps/web && bun run build

# --- Stage 2: runtime (carries full source so the same image runs migrations) ---
FROM oven/bun:${BUN_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=build /app ./
EXPOSE 3000
CMD ["bun", "apps/web/.output/server/index.mjs"]
