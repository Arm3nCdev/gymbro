#!/bin/sh
# Start for the development stage: Express + Vite middleware with HMR.
# tsx watch restarts the server when server.ts changes; changes in src/ are handled by Vite's HMR.
set -e
exec npx tsx watch --clear-screen=false server.ts
