// Shim for simli-client to fix case-sensitivity build issue on Linux.
// The package exports ./Client (capital C) but the file is client.js (lowercase).
// We import directly from the dist path to bypass the broken barrel export.
export { SimliClient, generateSimliSessionToken, generateIceServers } from "simli-client/dist/client";
