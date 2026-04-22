# Esprit-PI-Repositories-Tracker

A website and A Python CLI tool to search and track ESPRIT projects.

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


### 3. Pi Mode - Search by PI

```bash
esprit-tracker pi-repos <PI>
```

Searches for repositories matching the pattern `ESPRITPI-<PI>`.

**Example:**
```bash
esprit-tracker pi-repos PIDEV
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
