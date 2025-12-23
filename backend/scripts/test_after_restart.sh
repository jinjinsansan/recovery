#!/bin/bash
# Test Supabase connection after project restart

echo "========================================"
echo "Supabase Connection Test"
echo "========================================"
echo ""

cd /mnt/e/dev/Cusor/tape2/mental-insight

echo "1. Checking table availability..."
.venv/bin/python backend/scripts/check_tables.py

echo ""
echo "========================================"
echo ""

if .venv/bin/python backend/scripts/check_tables.py 2>&1 | grep -q "EXISTS"; then
    echo "✓ Tables are accessible!"
    echo ""
    echo "2. Uploading mock data (150 posts)..."
    .venv/bin/python backend/scripts/collect_samples.py --mode mock --max-results 50 --upload
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "========================================"
        echo "✓ SUCCESS! Mock data uploaded to Supabase"
        echo "========================================"
    else
        echo ""
        echo "✗ Upload failed. Check error above."
    fi
else
    echo "✗ Tables still not accessible. Try again in 1 minute."
fi
