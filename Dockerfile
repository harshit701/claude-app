# Node 24 has stable native TypeScript execution, so this app runs source
# .ts files directly (see package.json "start") — no compile/build stage needed.
#
# Build: docker build -t task-manager-api .
# Run (connecting to Postgres on the host machine):
#   docker run --env-file .env -p 3000:3000 task-manager-api
# On Docker Desktop (Mac/Windows), set DATABASE_URL's host to
# "host.docker.internal" instead of "localhost" so the container can reach a
# host-machine Postgres. On Linux, add --add-host=host.docker.internal:host-gateway
# to the run command, or use the host's actual IP/hostname.
FROM node:24-slim

WORKDIR /app

# Prisma's engine needs OpenSSL to detect the correct binary target; node:24-slim
# doesn't include it by default (Prisma falls back to a guessed version otherwise).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

# npm ci triggers the "postinstall" script (prisma generate), so the Prisma
# schema must already be present (copied above) before this runs.
RUN npm ci

# --chown avoids a separate "RUN chown -R" step, which would otherwise force
# a full copy-up of the already-copied node_modules layer under overlay2.
COPY --chown=node:node . .

# Run as the non-root "node" user (built into the base image) instead of
# root, so a compromised request/dependency has less capability inside the
# container's filesystem.
USER node

EXPOSE 3000

# Run node directly (not "npm start") so node is PID 1 and receives SIGTERM
# directly — npm as PID 1 does not forward signals to its child process,
# which breaks the graceful shutdown handling in src/server.ts.
CMD ["node", "index.ts"]
