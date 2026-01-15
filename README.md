# esprit-pi-stats

A Python CLI tool to search and track GitHub repositories starting with `ESPRITPI`.

## Features

- 🎨 Beautiful ASCII art display
- 🔍 Multiple search modes (All, Class, Exact, Year)
- 📊 Rich formatted table output
- 🔄 Automatic pagination handling
- 🎯 Local filtering with case-insensitive matching
- 🚀 GitHub API integration with rate limit handling

## Installation

```bash
# Clone the repository
git clone https://github.com/TheLime1/esprit-pi-stats.git
cd esprit-pi-stats

# Install the package
pip install -e .
```

## Usage

The CLI provides four search modes:

### 1. All Mode - Search all ESPRITPI repositories

```bash
esprit-tracker all-repos
```

Searches for all repositories starting with `ESPRITPI` (case-insensitive).

### 2. Class Mode - Search by class

```bash
esprit-tracker class-repos <Class>
```

Searches for repositories matching the pattern `ESPRITPI-<Class>`.

**Example:**
```bash
esprit-tracker class-repos 3A
# Finds: ESPRITPI-3A, ESPRITPI-3A-2024, ESPRITPI-3A-2025, etc.
```

### 3. Exact Mode - Search for exact match

```bash
esprit-tracker exact-repo <Class> <Year>
```

Searches for an exact repository match `ESPRITPI-<Class>-<Year>`.

**Example:**
```bash
esprit-tracker exact-repo 3A 2024
# Finds: ESPRITPI-3A-2024 (exact match only)
```

### 4. Year Mode - Search by year

```bash
esprit-tracker year-repos <Year>
```

Searches for repositories matching the pattern `ESPRITPI-*-<Year>`.

**Example:**
```bash
esprit-tracker year-repos 2024
# Finds: ESPRITPI-3A-2024, ESPRITPI-4TWIN-2024, etc.
```

## GitHub Token (Optional but Recommended)

To avoid GitHub API rate limits, set a GitHub personal access token:

```bash
export GITHUB_TOKEN=your_github_token_here
```

Without a token, you may encounter rate limiting (60 requests/hour). With a token, you get 5000 requests/hour.

### Creating a GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `public_repo` scope
3. Copy the token and set it as an environment variable

## Output

The tool displays results in a beautiful table format:

```
  _____ ____  ____  ____  ___ _____      ____ ___ 
 | ____/ ___||  _ \|  _ \|_ _|_   _|    |  _ \_ _|
 |  _| \___ \| |_) | |_) || |  | |_____ | |_) | | 
 | |___ ___) |  __/|  _ < | |  | |_____||  __/| | 
 |_____|____/|_|   |_| \_\___| |_|      |_|  |___|

                    ESPRIT-PI Repositories                    
┏━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━┓
┃ Repository Name    ┃ Owner    ┃ Stars ┃ URL                 ┃
┡━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━┩
│ ESPRITPI-3A-2024 │ foulen │     5 │ https://github.com… │
│ ESPRITPI-4TWIN-2024  │ ahmed mohsen │     3 │ https://github.com… │
└────────────────────┴──────────┴───────┴─────────────────────┘

Total repositories found: 2
```

## Technical Details

### Search Strategy

The tool uses a two-phase approach:

1. **Broad GitHub API Search**: Fetches all potential matches using GitHub's fuzzy search API
2. **Local Filtering**: Applies precise `startswith` filtering on fetched results

This ensures accurate results despite GitHub's fuzzy search behavior.

### Pagination

The tool automatically handles pagination, fetching up to 100 results per page until all matching repositories are retrieved.

### Dependencies

- `typer>=0.9.0` - CLI framework
- `requests>=2.31.0` - HTTP requests
- `rich>=13.0.0` - Terminal formatting and tables

## License

See [LICENSE](LICENSE) file for details.
