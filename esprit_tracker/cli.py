"""CLI module for ESPRIT-PI repository tracker."""

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


def get_github_headers() -> dict:
    """Get headers for GitHub API requests, including token if available."""
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    
    # Check for GitHub token in environment variable
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    return headers


def fetch_github_repos(query: str, per_page: int = 100) -> List[dict]:
    """
    Fetch repositories from GitHub API with pagination.
    
    Args:
        query: Search query for GitHub API
        per_page: Number of results per page
        
    Returns:
        List of repository dictionaries
    """
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
            headers = get_github_headers()
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            repos = data.get("items", [])
            if not repos:
                break
                
            all_repos.extend(repos)
            
            # Check if there are more pages
            # GitHub Search API limits results to 1000 items max
            # Also break if we get fewer items than requested (last page)
            total_count = data.get("total_count", 0)
            if len(all_repos) >= min(total_count, 1000) or len(repos) < per_page:
                break
                
            page += 1
            
        except requests.exceptions.HTTPError as e:
            # Check response status code for specific errors
            if e.response is not None:
                if e.response.status_code == 403:
                    console.print(
                        "[red]Error: GitHub API rate limit reached.[/red]\n"
                        "[yellow]Tip: Set GITHUB_TOKEN environment variable to increase rate limits.[/yellow]\n"
                        "[yellow]Example: export GITHUB_TOKEN=your_github_token[/yellow]"
                    )
                elif e.response.status_code == 422:
                    console.print(
                        "[red]Error: Invalid search query.[/red]\n"
                        f"[yellow]Details: {e.response.json().get('message', 'Unknown error')}[/yellow]"
                    )
                else:
                    console.print(f"[red]HTTP Error {e.response.status_code}: {e}[/red]")
            else:
                console.print(f"[red]Error fetching repositories: {e}[/red]")
            break
        except requests.exceptions.RequestException as e:
            console.print(f"[red]Error fetching repositories: {e}[/red]")
            break
    
    return all_repos


def filter_repos_by_pattern(repos: List[dict], pattern: str, exact_match: bool = False) -> List[dict]:
    """
    Filter repositories by name pattern.
    
    Args:
        repos: List of repository dictionaries
        pattern: Pattern to match against repository names
        exact_match: If True, use exact match; otherwise use startswith
        
    Returns:
        Filtered list of repositories
    """
    filtered = []
    
    for repo in repos:
        repo_name = repo.get("name", "").upper()
        
        if exact_match:
            if repo_name == pattern.upper():
                filtered.append(repo)
        else:
            if repo_name.startswith(pattern.upper()):
                filtered.append(repo)
    
    return filtered


def search_all_mode() -> List[dict]:
    """Search for all repositories starting with ESPRITPI."""
    query = "ESPRITPI in:name"
    repos = fetch_github_repos(query)
    return filter_repos_by_pattern(repos, "ESPRITPI")


def search_class_mode(class_name: str) -> List[dict]:
    """
    Search for repositories matching ESPRITPI-<Class> pattern.
    
    Args:
        class_name: The class name to search for
        
    Returns:
        Filtered list of repositories
    """
    query = f"ESPRITPI-{class_name} in:name"
    repos = fetch_github_repos(query)
    pattern = f"ESPRITPI-{class_name}"
    return filter_repos_by_pattern(repos, pattern)


def search_exact_mode(class_name: str, year: str) -> List[dict]:
    """
    Search for exact repository match ESPRITPI-<Class>-<Year>.
    
    Args:
        class_name: The class name
        year: The year
        
    Returns:
        Filtered list of repositories
    """
    query = f"ESPRITPI-{class_name}-{year} in:name"
    repos = fetch_github_repos(query)
    pattern = f"ESPRITPI-{class_name}-{year}"
    return filter_repos_by_pattern(repos, pattern, exact_match=True)


def search_year_mode(year: str) -> List[dict]:
    """
    Search for repositories matching ESPRITPI-*-<Year> pattern.
    
    Args:
        year: The year to search for
        
    Returns:
        Filtered list of repositories
    """
    query = f"ESPRITPI {year} in:name"
    repos = fetch_github_repos(query)
    
    # Filter for repos that match ESPRITPI-*-<Year> pattern
    pattern = re.compile(rf"^ESPRITPI-.+-{year}$", re.IGNORECASE)
    filtered = [repo for repo in repos if pattern.match(repo.get("name", ""))]
    
    return filtered


def display_results(repos: List[dict]) -> None:
    """
    Display repositories in a rich table.
    
    Args:
        repos: List of repository dictionaries to display
    """
    table = Table(title="ESPRIT-PI Repositories")
    table.add_column("Repository Name", style="cyan", no_wrap=False)
    table.add_column("Owner", style="magenta")
    table.add_column("Stars", justify="right", style="yellow")
    table.add_column("URL", style="blue", no_wrap=False)
    
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
    """Search for all repositories starting with ESPRITPI."""
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print("[bold]Searching for all ESPRITPI repositories...[/bold]\n")
    
    repos = search_all_mode()
    display_results(repos)


@app.command()
def class_repos(class_name: str):
    """
    Search for repositories matching ESPRITPI-<Class> pattern.
    
    Args:
        class_name: The class name to search for (e.g., "2ING", "1CS")
    """
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print(f"[bold]Searching for ESPRITPI-{class_name} repositories...[/bold]\n")
    
    repos = search_class_mode(class_name)
    display_results(repos)


@app.command()
def exact_repo(class_name: str, year: str):
    """
    Search for exact repository match ESPRITPI-<Class>-<Year>.
    
    Args:
        class_name: The class name (e.g., "2ING", "1CS")
        year: The year (e.g., "2024", "2025")
    """
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print(f"[bold]Searching for exact match: ESPRITPI-{class_name}-{year}[/bold]\n")
    
    repos = search_exact_mode(class_name, year)
    display_results(repos)


@app.command()
def year_repos(year: str):
    """
    Search for repositories matching ESPRITPI-*-<Year> pattern.
    
    Args:
        year: The year to search for (e.g., "2024", "2025")
    """
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print(f"[bold]Searching for all ESPRITPI repositories from year {year}...[/bold]\n")
    
    repos = search_year_mode(year)
    display_results(repos)


@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """
    ESPRIT-PI Repository Tracker.
    
    A CLI tool to search and track GitHub repositories starting with ESPRITPI.
    
    Use one of the commands to search in different modes:
    - all-repos: Search all ESPRITPI repositories
    - class-repos: Search by class (ESPRITPI-<Class>)
    - exact-repo: Search exact match (ESPRITPI-<Class>-<Year>)
    - year-repos: Search by year (ESPRITPI-*-<Year>)
    """
    if ctx.invoked_subcommand is None:
        # If no subcommand is provided, show ASCII art and help
        console.print(ESPRIT_PI_ASCII, style="bold blue")
        console.print("[bold yellow]Use --help to see available commands[/bold yellow]\n")


if __name__ == "__main__":
    app()
