FROM node:20-buster
WORKDIR /app
COPY package.json pnpm-lock.yaml* tsconfig.json prisma/schema.prisma ./
RUN corepack enable && pnpm install --frozen-lockfile || pnpm install
COPY src ./src
COPY prisma ./prisma
RUN pnpm build
CMD ["node", "dist/index.js"]
