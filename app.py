import time
import datetime
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Simple in-memory cache
CACHE_DURATION = 600  # 10 minutes cache duration
feed_cache = {
    'data': None,
    'timestamp': 0
}

def parse_release_notes(feed_content):
    """
    Parse the Atom feed XML content and extract individual release items.
    Since each date's changes are grouped in a single Atom entry, this
    splits the HTML content of the entry by `<h3>` tags to extract
    individual items, categorizing them by type (e.g., Feature, Change, Issue, etc.).
    """
    feed = feedparser.parse(feed_content)
    items = []
    
    for entry_idx, entry in enumerate(feed.entries):
        date_str = entry.get('title', '')
        updated_iso = entry.get('updated', '')
        entry_id = entry.get('id', '')
        entry_link = entry.get('link', '')
        
        content_html = ''
        if 'content' in entry and len(entry.content) > 0:
            content_html = entry.content[0].value
        elif 'summary' in entry:
            content_html = entry.summary
            
        if not content_html:
            continue
            
        soup = BeautifulSoup(content_html, 'html.parser')
        
        current_type = 'General'
        current_html_parts = []
        item_counter = 0
        
        # Iterate through the top-level contents of the parsed HTML
        for child in soup.contents:
            # Skip whitespace text nodes
            if isinstance(child, str) and not child.strip():
                continue
                
            if child.name == 'h3':
                # If we have accumulated HTML parts for the previous item, yield/save it
                if current_html_parts:
                    items.append({
                        'id': f"{entry_id}_{item_counter}",
                        'date': date_str,
                        'updated': updated_iso,
                        'link': entry_link,
                        'type': current_type,
                        'content': ''.join(str(p) for p in current_html_parts).strip()
                    })
                    item_counter += 1
                    current_html_parts = []
                
                current_type = child.get_text().strip()
            else:
                current_html_parts.append(child)
                
        # Append the final item of the entry
        if current_html_parts:
            items.append({
                'id': f"{entry_id}_{item_counter}",
                'date': date_str,
                'updated': updated_iso,
                'link': entry_link,
                'type': current_type,
                'content': ''.join(str(p) for p in current_html_parts).strip()
            })
            
    # Sort items by updated date descending (newest first)
    # The ISO string naturally sorts chronologically
    items.sort(key=lambda x: x.get('updated', ''), reverse=True)
    return items

def get_releases(bypass_cache=False):
    """
    Get the release notes list, either from cache or by fetching the feed from Google.
    """
    now = time.time()
    if not bypass_cache and feed_cache['data'] and (now - feed_cache['timestamp'] < CACHE_DURATION):
        return feed_cache['data'], True
        
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    
    items = parse_release_notes(response.content)
    
    # Update cache
    feed_cache['data'] = items
    feed_cache['timestamp'] = now
    return items, False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    bypass_cache = request.args.get('refresh', 'false').lower() == 'true'
    try:
        items, from_cache = get_releases(bypass_cache=bypass_cache)
        return jsonify({
            'success': True,
            'count': len(items),
            'from_cache': from_cache,
            'last_updated': datetime.datetime.fromtimestamp(feed_cache['timestamp']).isoformat(),
            'releases': items
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
