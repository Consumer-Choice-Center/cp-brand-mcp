FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN npm install --global pnpm@11.19.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:24-bookworm-slim
ENV NODE_ENV=production CP_BRAND_FONT_CONFIG=/config/fonts.json CP_BRAND_OUTPUT_DIR=/app/deliverables
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY data/brand.json data/fonts.example.json ./data/
COPY assets ./assets
COPY examples ./examples
COPY scripts/smoke-test.mjs ./scripts/smoke-test.mjs
RUN mkdir -p /app/inputs /app/deliverables && chown -R node:node /app
USER node
ENTRYPOINT ["node", "src/server.mjs"]
