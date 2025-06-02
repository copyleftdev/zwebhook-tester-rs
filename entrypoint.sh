#!/bin/sh

# Redirect all TCP ports 1024-65535 to internal port 8080
iptables -t nat -A PREROUTING -p tcp --dport 1024:65535 -j REDIRECT --to-port 8080

# Create data directory if it doesn't exist
mkdir -p /app/data

# Start ZWebHook-Tester Rust application
exec ./zwebhook-tester-rs
