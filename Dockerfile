# Use the same pinned Node 22 Debian base as CCC's HTTP service.
FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS dependencies
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8083
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node src ./src
COPY --chown=node:node data/brand.json data/fonts.example.json ./data/
COPY --chown=node:node assets ./assets
COPY --chown=node:node examples ./examples
COPY --chown=node:node scripts/smoke-http.mjs scripts/smoke-test.mjs ./scripts/
RUN mkdir inputs deliverables && chown node:node inputs deliverables
USER node
EXPOSE 8083
CMD ["node", "src/http-server.mjs"]
