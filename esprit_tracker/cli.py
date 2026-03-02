"""CLI module for ESPRIT repository tracker."""

import os
import re
from typing import List

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

# Format officiel du repo
REPO_PATTERN = re.compile(
    r"^ESPRIT-[A-Z]+-[A-Z0-9]+-\d{4}-[A-Z0-9_-]+$",
    re.IGNORECASE
)


def get_github_headers() -> dict:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    return headers


def fetch_github_repos(query: str, per_page: int = 100) -> List[dict]:
    all_repos = []
    page = 1

    while True:
        url = "https://api.github.com/search/repositories"
        params = {
            "q": query,
            "per_page": per_page,
            "page": page,
        }

        try:
            response = requests.get(
                url,
                params=params,
                headers=get_github_headers(),
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()

            repos = data.get("items", [])
            if not repos:
                break

            all_repos.extend(repos)

            total_count = data.get("total_count", 0)
            if len(all_repos) >= min(total_count, 1000) or len(repos) < per_page:
                break

            page += 1

        except requests.exceptions.RequestException as e:
            console.print(f"[red]Error fetching repositories: {e}[/red]")
            break

    return all_repos


def validate_repo_format(repo_name: str) -> bool:
    """Check if repo respects ESPRIT format."""
    return bool(REPO_PATTERN.match(repo_name))


def search_all_mode() -> List[dict]:
    """Search all ESPRIT repositories respecting the format."""
    query = "Esprit in:name"
    repos = fetch_github_repos(query)

    return [
        repo for repo in repos
        if validate_repo_format(repo.get("name", ""))
    ]


def search_by_class(class_name: str) -> List[dict]:
    """Search repos by class."""
    query = f"Esprit {class_name} in:name"
    repos = fetch_github_repos(query)

    pattern = re.compile(
        rf"^ESPRIT-[A-Z]+-{class_name}-\d{{4}}-[A-Z0-9_-]+$",
        re.IGNORECASE
    )

    return [
        repo for repo in repos
        if pattern.match(repo.get("name", ""))
    ]


def search_by_year(year: str) -> List[dict]:
    """Search repos by academic year."""
    query = f"Esprit {year} in:name"
    repos = fetch_github_repos(query)

    pattern = re.compile(
        rf"^ESPRIT-[A-Z]+-[A-Z0-9]+-{year}-[A-Z0-9_-]+$",
        re.IGNORECASE
    )

    return [
        repo for repo in repos
        if pattern.match(repo.get("name", ""))
    ]


def search_exact_repo(pi: str, classe: str, au: str, projet: str) -> List[dict]:
    """Search exact repository."""
    repo_name = f"Esprit-{pi}-{classe}-{au}-{projet}"
    query = f"{repo_name} in:name"

    repos = fetch_github_repos(query)

    return [
        repo for repo in repos
        if repo.get("name", "").lower() == repo_name.lower()
    ]


def display_results(repos: List[dict]) -> None:
    table = Table(title="ESPRIT Repositories")
    table.add_column("Repository Name", style="cyan")
    table.add_column("Owner", style="magenta")
    table.add_column("Stars", justify="right", style="yellow")
    table.add_column("URL", style="blue")

    for repo in repos:
        table.add_row(
            repo.get("name", "N/A"),
            repo.get("owner", {}).get("login", "N/A"),
            str(repo.get("stargazers_count", 0)),
            repo.get("html_url", "N/A"),
        )

    console.print(table)
    console.print(f"\n[bold green]Total repositories found: {len(repos)}[/bold green]\n")


@app.command()
def all_repos():
    """Search all ESPRIT repositories."""
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print("[bold]Searching all ESPRIT repositories...[/bold]\n")

    repos = search_all_mode()
    display_results(repos)


@app.command()
def class_repos(class_name: str):
    """Search repositories by class."""
    console.print(ESPRIT_PI_ASCII, style="bold blue")

    repos = search_by_class(class_name)
    display_results(repos)


@app.command()
def year_repos(year: str):
    """Search repositories by academic year."""
    console.print(ESPRIT_PI_ASCII, style="bold blue")

    repos = search_by_year(year)
    display_results(repos)


@app.command()
def repo(pi: str, classe: str, au: str, projet: str):
    """
    Search exact repository

    Example:
    python tracker.py repo PIDEV 3A10 2026 TaskManager
    """
    console.print(ESPRIT_PI_ASCII, style="bold blue")

    repos = search_exact_repo(pi, classe, au, projet)
    display_results(repos)


@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    if ctx.invoked_subcommand is None:
        console.print(ESPRIT_PI_ASCII, style="bold blue")
        console.print("[bold yellow]Use --help to see available commands[/bold yellow]\n")


if __name__ == "__main__":
    app()