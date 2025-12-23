#!/bin/bash
# Wait for PostgREST schema cache to reload

echo "Waiting 30 seconds for schema cache reload..."
sleep 30

echo ""
echo "Testing connection..."
cd /mnt/e/dev/Cusor/tape2/mental-insight
.venv/bin/python backend/scripts/debug_api.py
