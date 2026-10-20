// Convenience script for `npm run dev` at the project root:
// runs the backend (port 4000) and the Vite dev server (port 5173, proxying /api
// to the backend) side by side, without needing the `concurrently` package.
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function run(name, cmd, args, cwd) {
  const proc = spawn(cmd, args, { cwd, stdio: "pipe", shell: process.platform === "win32" });
  proc.stdout.on("data", (d) => process.stdout.write(`[${name}] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[${name}] ${d}`));
  proc.on("exit", (code) => console.log(`[${name}] exited with code ${code}`));
  return proc;
}

const server = run("server", "node", ["index.js"], path.join(root, "server"));
const client = run("client", "npm", ["run", "dev"], path.join(root, "client"));

function shutdown() {
  server.kill();
  client.kill();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
