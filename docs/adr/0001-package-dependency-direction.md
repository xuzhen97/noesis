# Package dependency direction

Noesis uses a pnpm TypeScript monorepo with one-way package dependencies: `shared` is the protocol/type base, `server`, `client`, `sdk`, and `web` may depend on `shared`, `cli` depends on `sdk`, and `web` does not depend on `sdk` during initialization. This keeps the first project skeleton small and prevents Gateway, Client Agent, Web, and CLI concerns from coupling before the P0 control loop is proven.
