#!/bin/bash
# Download party logos from Wikimedia Commons
DEST="/opt/voterslist/data/party_symbols"
mkdir -p "$DEST"

echo "Downloading INC logo..."
curl -L -A "Mozilla/5.0" -o "$DEST/inc.png" \
  "https://upload.wikimedia.org/wikipedia/commons/6/63/INC_Logo.png"

echo "Downloading CPM logo..."
curl -L -A "Mozilla/5.0" -o "$DEST/cpm.png" \
  "https://upload.wikimedia.org/wikipedia/commons/c/cc/CPI_%28M%29.png"

echo "Downloading CPI logo..."
curl -L -A "Mozilla/5.0" -o "$DEST/cpi.png" \
  "https://upload.wikimedia.org/wikipedia/commons/f/f0/CPI-insignia.png"

echo "Downloading IUML logo (flag)..."
curl -L -A "Mozilla/5.0" -o "$DEST/iuml.png" \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Flag_of_IUML.png/320px-Flag_of_IUML.png"

echo "Downloading BJP logo..."
curl -L -A "Mozilla/5.0" -o "$DEST/bjp.png" \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Logo_of_the_Bharatiya_Janata_Party.svg/500px-Logo_of_the_Bharatiya_Janata_Party.svg.png"

echo "Downloading RSP logo..."
curl -L -A "Mozilla/5.0" -o "$DEST/rsp.png" \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/RSP_Political_Party_Logo.png/320px-RSP_Political_Party_Logo.png"

echo "Downloading Kerala Congress M logo (flag)..."
curl -L -A "Mozilla/5.0" -o "$DEST/kcm.png" \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Kerala_Congress_Flag.svg/320px-Kerala_Congress_Flag.svg.png"

echo ""
echo "=== Download Complete ==="
ls -lh "$DEST"
