// Fills __ADMIN_EMAIL__ in firestore.rules with ADMIN_EMAIL (env or .env.local)
// and writes firestore.rules.rendered, which firebase.json deploys.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

let email = process.env.ADMIN_EMAIL;
if (!email && existsSync(".env.local")) {
  const m = readFileSync(".env.local", "utf8").match(/^ADMIN_EMAIL=(.+)$/m);
  email = m?.[1].trim();
}
if (!email) {
  console.error("Set ADMIN_EMAIL in .env.local (or the environment) before deploying rules.");
  process.exit(1);
}
const rules = readFileSync("firestore.rules", "utf8").replaceAll("__ADMIN_EMAIL__", email.toLowerCase());
writeFileSync("firestore.rules.rendered", rules);
console.log("Rendered firestore.rules.rendered");
