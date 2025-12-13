#!/bin/sh
set -e

# Ensure data directories exist with correct permissions
mkdir -p /app/data/db /app/data/sessions
chown -R nodejs:nodejs /app/data

# Switch to nodejs user and execute the command
exec gosu nodejs "$@"
