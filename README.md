# BigQuery Release Notes Explorer

A beautiful, premium dark-themed web dashboard for exploring Google Cloud BigQuery release notes. The application aggregates Google's official XML feed, parses day-level blocks into individual cards, caches results in-memory, and provides real-time search, category filtering, and date controls.

---

## 🚀 Key Features

*   **Granular Item Splitting**: Google's official feed groups all of a day's changes under a single feed entry. This application automatically parses and breaks down the entry into individual release cards, tagged by type (*Feature*, *Change*, *Breaking*, *Issue*, *Announcement*, etc.).
*   **Dual Cache Architecture**: Includes an in-memory server cache (10 minutes) to load pages instantly, combined with a frontend **Force Refresh** trigger to manually bypass the cache and query live feed data.
*   **Real-time Search & Filter**: Instantly search release descriptions, dates, or types. Highlights matches dynamically without breaking nested HTML markup.
*   **Time Period Filters**: Restrict release notes view to the last 30 days, 90 days, 6 months, or 1 year.
*   **Responsive UI**: A premium dark-theme interface with custom CSS scrollbars, visual skeleton load shimmers, and counts that animate as data loads.

---

## 🛠️ Tech Stack

*   **Backend**: Python, Flask, `feedparser` (Atom/RSS), `beautifulsoup4` (HTML parsing/DOM traversal), `requests`
*   **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+), FontAwesome Icons, Google Fonts (Outfit & Inter)

---

## 📂 Project Structure

```text
bigquery-release-notes/
├── app.py                  # Flask Application Server & Feed Parser
├── requirements.txt        # Python Dependecy Definitions
├── .gitignore              # Standard git ignore definitions
├── templates/
│   └── index.html          # Dashboard HTML Layout Template
└── static/
    ├── css/
    │   └── style.css       # Custom Dark Mode styling & micro-animations
    └── js/
        └── app.js          # Client-side routing, filtering & copy functions
```

---

## ⚙️ Setup and Installation

### Prerequisites
*   Python 3.12+ installed

### 1. Clone & Navigate
```bash
git clone https://github.com/liuxianghan1980/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 2. Create Virtual Environment
```bash
# On Windows
python -m venv venv
.\venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
```bash
python app.py
```
Open your browser and navigate to: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔌 API Documentation

### Get Release Notes
Returns the list of parsed, categorized release items, sorted newest first.

*   **Endpoint**: `/api/releases`
*   **Method**: `GET`
*   **Query Parameters**:
    *   `refresh` (optional): Set to `true` to force bypass the cache and fetch live updates.
*   **Success Response**: `200 OK`
    ```json
    {
      "success": true,
      "count": 42,
      "from_cache": true,
      "last_updated": "2026-06-28T00:08:18.234567",
      "releases": [
        {
          "id": "tag:google.com,2016:bigquery-release-notes#June_25_2026_0",
          "date": "June 25, 2026",
          "updated": "2026-06-25T00:00:00-07:00",
          "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_25_2026",
          "type": "Change",
          "content": "<p>An updated version of the Simba ODBC driver...</p>"
        }
      ]
    }
    ```
