#!/bin/bash
# Test daily-song API endpoint resilience

echo "🧪 Testing daily-song API endpoint..."
echo ""

# Test 1: Direct API call (should always return 200)
echo "📡 Test 1: Direct API call"
echo "URL: https://ty-vole.wtf/.netlify/functions/daily-song"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" https://ty-vole.wtf/.netlify/functions/daily-song)
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Status code is 200"
else
  echo "❌ Status code is $HTTP_CODE (expected 200)"
  exit 1
fi

# Test 2: Check response structure
echo ""
echo "📋 Test 2: Response structure"

if echo "$BODY" | jq -e '.picks' > /dev/null 2>&1; then
  echo "✅ Response has 'picks' field"
else
  echo "❌ Response missing 'picks' field"
  exit 1
fi

if echo "$BODY" | jq -e '.source' > /dev/null 2>&1; then
  echo "✅ Response has 'source' field"
else
  echo "❌ Response missing 'source' field"
  exit 1
fi

PICKS_COUNT=$(echo "$BODY" | jq '.picks | length')
if [ "$PICKS_COUNT" = "3" ]; then
  echo "✅ Response has exactly 3 picks"
else
  echo "❌ Response has $PICKS_COUNT picks (expected 3)"
  exit 1
fi

# Test 3: Check source type
echo ""
echo "🎵 Test 3: Source type"
SOURCE=$(echo "$BODY" | jq -r '.source')
echo "Source: $SOURCE"

if [ "$SOURCE" = "spotify" ] || [ "$SOURCE" = "demo" ] || [ "$SOURCE" = "seed-env" ] || [[ "$SOURCE" =~ ^demo: ]]; then
  echo "✅ Valid source type: $SOURCE"
else
  echo "❌ Invalid source type: $SOURCE (expected 'spotify', 'demo', 'seed-env', or 'demo:*')"
  exit 1
fi

# Test 4: Check track structure
echo ""
echo "🎧 Test 4: Track structure"

FIRST_TRACK=$(echo "$BODY" | jq '.picks[0]')
if echo "$FIRST_TRACK" | jq -e '.id' > /dev/null 2>&1 && \
   echo "$FIRST_TRACK" | jq -e '.title' > /dev/null 2>&1 && \
   echo "$FIRST_TRACK" | jq -e '.artists' > /dev/null 2>&1 && \
   echo "$FIRST_TRACK" | jq -e '.albumCoverUrl' > /dev/null 2>&1 && \
   echo "$FIRST_TRACK" | jq -e '.spotifyUrl' > /dev/null 2>&1; then
  echo "✅ Track has all required fields"
else
  echo "❌ Track missing required fields"
  exit 1
fi

# Test 5: Check Cache-Control header
echo ""
echo "🗄️ Test 5: Cache-Control header"

CACHE_HEADER=$(curl -s -I https://ty-vole.wtf/.netlify/functions/daily-song | grep -i "cache-control" | cut -d: -f2- | xargs)
echo "Cache-Control: $CACHE_HEADER"

if echo "$CACHE_HEADER" | grep -q "no-store"; then
  echo "✅ Cache-Control contains 'no-store'"
else
  echo "⚠️ Warning: Cache-Control doesn't contain 'no-store'"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All tests passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Today's picks ($SOURCE):"
echo "$BODY" | jq -r '.picks[] | "  • \(.title) — \(.artists)"'
echo ""
