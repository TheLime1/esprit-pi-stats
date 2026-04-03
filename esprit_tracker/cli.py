import json
import os
import re
from datetime import datetime
from typing import List, Dict, Optional

import requests
import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer()
console = Console()

ESPRIT_PI_ASCII = r"""
  _____ ____  ____  ____  ___ _____      ____ ___ 
 | ____/ ___||  _ \|  _ \|_ _|_   _|    |  _ \_ _|
 |  _| \___ \| |_) | |_) || |  | |_____ | |_) | | 
 | |___ ___) |  __/|  _ < | |  | |_____||  __/| | 
 |_____|____/|_|   |_| \_\___| |_|      |_|  |___|
"""

# Suffixes that indicate the same project split across repos
_PROJECT_SUFFIXES = re.compile(
    r"[-_]?(backend|frontend|front[-_]?end|back[-_]?end|"
    r"mobile|desktop|web|api|server|client|microservice|gateway|"
    r"devops|dashboard|admin|landing)$",
    re.IGNORECASE,
)

MIN_YEAR = 2025


# -----------------------------
# GitHub API
# -----------------------------
def get_github_headers():
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def fetch_github_repos(query: str, per_page: int = 100) -> List[dict]:
    repos = []
    page = 1

    while True:
        url = "https://api.github.com/search/repositories"
        params = {"q": query, "per_page": per_page, "page": page}

        try:
            response = requests.get(
                url,
                params=params,
                headers=get_github_headers(),
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()

            items = data.get("items", [])
            if not items:
                break

            repos.extend(items)

            if len(items) < per_page or len(repos) >= 1000:
                break

            page += 1

        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")
            break

    return repos


def fetch_contributors(owner: str, repo: str) -> List[str]:
    """Fetch contributor logins for a repository."""
    url = f"https://api.github.com/repos/{owner}/{repo}/contributors"
    try:
        response = requests.get(
            url,
            headers=get_github_headers(),
            params={"per_page": 100},
            timeout=10,
        )
        if response.status_code == 200:
            return [c.get("login", "") for c in response.json() if c.get("login")]
        return []
    except Exception:
        return []


# -----------------------------
# FILTERING
# -----------------------------
def filter_by_year(repos: List[dict], min_year: int = MIN_YEAR) -> List[dict]:
    """Remove repos created before *min_year*."""
    filtered = []
    for repo in repos:
        created = repo.get("created_at", "")
        if created:
            try:
                year = int(created[:4])
                if year < min_year:
                    continue
            except (ValueError, IndexError):
                pass
        filtered.append(repo)
    return filtered


def _project_key(name: str) -> str:
    """
    Return a normalised key that strips common multi-repo suffixes.

    Esprit-PI-4SE3-2025-2026-ConnectCamp-Backend  -> ESPRIT-PI-4SE3-2025-2026-CONNECTCAMP
    Esprit-PI-4SE3-2025-2026-ConnectCamp-FrontEnd -> ESPRIT-PI-4SE3-2025-2026-CONNECTCAMP
    """
    key = name.strip().upper()
    key = _PROJECT_SUFFIXES.sub("", key)
    # Remove any trailing hyphens/underscores left behind
    key = key.rstrip("-_")
    return key


def deduplicate_repos(repos: List[dict]) -> List[dict]:
    """
    Deduplicate repos that are the same project split across multiple repos.
    Keeps the first occurrence (by name alphabetically) for each project key.
    """
    # Sort by name so dedup is deterministic (keeps the shortest / first name)
    repos_sorted = sorted(repos, key=lambda r: r.get("name", ""))
    seen = {}
    result = []
    for repo in repos_sorted:
        key = _project_key(repo.get("name", ""))
        if key not in seen:
            seen[key] = True
            result.append(repo)
    return result


# -----------------------------
# SEARCH
# -----------------------------
def search_pi_mode(pi_name: str) -> List[dict]:
    pi_name = pi_name.upper()
    repos = fetch_github_repos(f"ESPRIT-{pi_name} in:name")

    pattern = re.compile(rf"^ESPRIT-{pi_name}-.+", re.IGNORECASE)
    repos = [r for r in repos if pattern.match(r.get("name", ""))]
    repos = filter_by_year(repos)
    return deduplicate_repos(repos)


def search_class_mode(class_name: str) -> List[dict]:
    class_name = class_name.upper()
    repos = fetch_github_repos(f"ESPRIT {class_name} in:name")

    pattern = re.compile(rf"^ESPRIT-.+-{class_name}-.+", re.IGNORECASE)
    repos = [r for r in repos if pattern.match(r.get("name", ""))]
    repos = filter_by_year(repos)
    return deduplicate_repos(repos)


def search_all() -> List[dict]:
    repos = fetch_github_repos("ESPRIT-PI in:name")
    repos = [
        r for r in repos
        if r.get("name", "").upper().startswith("ESPRIT-PI")
    ]
    repos = filter_by_year(repos)
    return deduplicate_repos(repos)


# -----------------------------
# EXTRACTION
# -----------------------------
def extract_class(repo_name: str) -> str:
    parts = repo_name.split("-")
    return parts[2] if len(parts) >= 3 else "UNKNOWN"


def extract_pi(repo_name: str) -> str:
    parts = repo_name.split("-")
    return parts[1] if len(parts) >= 2 else "UNKNOWN"


# -----------------------------
# GROUPING
# -----------------------------
def group_by_class(repos: List[dict]) -> Dict[str, List[dict]]:
    grouped = {}
    for repo in repos:
        cls = extract_class(repo.get("name", ""))
        grouped.setdefault(cls, []).append(repo)
    return dict(sorted(grouped.items()))


def group_by_pi(repos: List[dict]) -> Dict[str, List[dict]]:
    grouped = {}
    for repo in repos:
        pi = extract_pi(repo.get("name", ""))
        grouped.setdefault(pi, []).append(repo)
    return dict(sorted(grouped.items()))


# -----------------------------
# DISPLAY
# -----------------------------
def display_grouped_by_class(repos: List[dict]):
    grouped = group_by_class(repos)

    for cls, repo_list in grouped.items():
        console.print(f"\n[bold cyan]Class: {cls}[/bold cyan]")

        table = Table()
        table.add_column("Repository", style="green")
        table.add_column("Owner")
        table.add_column("Stars")
        table.add_column("URL", style="blue", no_wrap=False, overflow="fold")

        for repo in repo_list:
            url = repo.get("html_url", "")

            table.add_row(
                repo.get("name", ""),
                repo.get("owner", {}).get("login", ""),
                str(repo.get("stargazers_count", 0)),
                f"[link={url}]{url}[/link]",
            )

        console.print(table)

    console.print(f"\n[bold green]Total: {len(repos)}[/bold green]")


def display_grouped_by_pi(repos: List[dict]):
    grouped = group_by_pi(repos)

    for pi, repo_list in grouped.items():
        console.print(f"\n[bold magenta]PI: {pi}[/bold magenta]")

        table = Table()
        table.add_column("Repository", style="green")
        table.add_column("Owner")
        table.add_column("Stars")
        table.add_column("URL", style="blue", no_wrap=False, overflow="fold")

        for repo in repo_list:
            url = repo.get("html_url", "")

            table.add_row(
                repo.get("name", ""),
                repo.get("owner", {}).get("login", ""),
                str(repo.get("stargazers_count", 0)),
                f"[link={url}]{url}[/link]",
            )

        console.print(table)

    console.print(f"\n[bold green]Total: {len(repos)}[/bold green]")


# -----------------------------
# JSON EXPORT
# -----------------------------
def export_repos_to_json(repos: List[dict], output_path: str):
    """Export repos to a JSON file with full metadata including contributors."""
    console.print(f"[bold yellow]Fetching contributors for {len(repos)} repos…[/bold yellow]")

    export_data = []
    for i, repo in enumerate(repos, 1):
        owner = repo.get("owner", {}).get("login", "")
        name = repo.get("name", "")
        console.print(f"  [{i}/{len(repos)}] {name}…", end="\r")

        contributors = fetch_contributors(owner, name)

        export_data.append({
            "name": name,
            "owner": owner,
            "contributors": contributors,
            "stars": repo.get("stargazers_count", 0),
            "url": repo.get("html_url", ""),
            "created_at": repo.get("created_at", ""),
        })

    result = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total": len(export_data),
        "repositories": export_data,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    console.print(f"\n[bold green]✓ Saved {len(export_data)} repos to {output_path}[/bold green]")


# -----------------------------
# COMMANDS
# -----------------------------
@app.command()
def pi_repos(
    pi_name: str,
    json_out: Optional[str] = typer.Option(None, "--json", help="Export results to a JSON file"),
):
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print(f"[bold]Searching ESPRIT-{pi_name}...[/bold]\n")

    repos = search_pi_mode(pi_name)

    if json_out:
        export_repos_to_json(repos, json_out)
    else:
        display_grouped_by_class(repos)


@app.command()
def class_repos(
    class_name: str,
    json_out: Optional[str] = typer.Option(None, "--json", help="Export results to a JSON file"),
):
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print(f"[bold]Searching class {class_name}...[/bold]\n")

    repos = search_class_mode(class_name)

    if json_out:
        export_repos_to_json(repos, json_out)
    else:
        display_grouped_by_pi(repos)


@app.command()
def all_repos(
    json_out: Optional[str] = typer.Option(None, "--json", help="Export results to a JSON file"),
):
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print("[bold]Searching all ESPRIT-PI repositories...[/bold]\n")

    repos = search_all()

    if json_out:
        export_repos_to_json(repos, json_out)
    else:
        display_grouped_by_class(repos)


# -----------------------------
# MAIN
# -----------------------------
@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    if ctx.invoked_subcommand is None:
        console.print(ESPRIT_PI_ASCII, style="bold blue")
        console.print("[bold yellow]Use --help to see commands[/bold yellow]\n")


if __name__ == "__main__":
    app()