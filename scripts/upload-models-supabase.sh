#!/bin/bash
# Upload fixed GLB models to Supabase Storage
# Run this after fix-garment-uvs.py has processed the models

FIXED_DIR="$HOME/Downloads/garments-fixed"
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" ~/.openclaw/workspace/projects/emotivx_app/.env.local | cut -d= -f2)
SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" ~/.openclaw/workspace/projects/emotivx_app/.env.local | cut -d= -f2)

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local"
  exit 1
fi

echo "Uploading models to Supabase..."
for model in hoodie.glb tshirt.glb longsleeve.glb; do
  if [ -f "$FIXED_DIR/$model" ]; then
    echo -n "  $model... "
    result=$(curl -s -X POST "$SUPABASE_URL/storage/v1/object/models/$model" \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: model/gltf-binary" \
      --data-binary "@$FIXED_DIR/$model")
    echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✓' if 'Key' in d else '✗ '+str(d))" 2>/dev/null || echo "✓"
  else
    echo "  ⚠ $model not found in $FIXED_DIR"
  fi
done

echo ""
echo "✅ Done — models live at:"
echo "   $SUPABASE_URL/storage/v1/object/public/models/"
