#!/bin/bash
# Use Wikimedia API to get actual image URLs and download them
DEST="/opt/voterslist/data/party_symbols"
mkdir -p "$DEST"

download_wiki_file() {
    local filename="$1"
    local outname="$2"
    
    # Get the direct URL from Wikimedia API
    local api_url="https://en.wikipedia.org/w/api.php?action=query&titles=File:${filename}&prop=imageinfo&iiprop=url&format=json"
    local direct_url=$(curl -s -A "ElectionIntel/1.0 (contact@intelhub.live)" "$api_url" | python3 -c "import sys,json; data=json.load(sys.stdin); pages=data['query']['pages']; page=list(pages.values())[0]; print(page['imageinfo'][0]['url'])" 2>/dev/null)
    
    if [ -n "$direct_url" ]; then
        echo "Downloading $outname from: $direct_url"
        curl -L -A "ElectionIntel/1.0 (contact@intelhub.live)" -o "$DEST/$outname" "$direct_url"
        echo "Done: $(file $DEST/$outname)"
    else
        echo "FAILED to get URL for $filename"
    fi
}

download_wiki_file "INC_Logo.png" "inc.png"
download_wiki_file "CPI_(M).png" "cpm.png"
download_wiki_file "CPI-insignia.png" "cpi.png"
download_wiki_file "Logo_of_the_Bharatiya_Janata_Party.svg" "bjp.svg"
download_wiki_file "RSP_Political_Party_Logo.png" "rsp.png"
download_wiki_file "Flag_of_IUML.png" "iuml.png"

echo ""
echo "=== Results ==="
ls -lh "$DEST"
