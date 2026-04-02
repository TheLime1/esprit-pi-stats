import os
import re
from typing import List, Dict

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


# -----------------------------
# SEARCH
# -----------------------------
def search_pi_mode(pi_name: str) -> List[dict]:
    pi_name = pi_name.upper()
    repos = fetch_github_repos(f"ESPRIT-{pi_name} in:name")

    pattern = re.compile(rf"^ESPRIT-{pi_name}-.+", re.IGNORECASE)
    return [r for r in repos if pattern.match(r.get("name", ""))]


def search_class_mode(class_name: str) -> List[dict]:
    class_name = class_name.upper()
    repos = fetch_github_repos(f"ESPRIT {class_name} in:name")

    pattern = re.compile(rf"^ESPRIT-.+-{class_name}-.+", re.IGNORECASE)
    return [r for r in repos if pattern.match(r.get("name", ""))]


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
                f"[link={url}]{url}[/link]"  # ✅ lien complet + cliquable
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
                f"[link={url}]{url}[/link]"
            )

        console.print(table)

    console.print(f"\n[bold green]Total: {len(repos)}[/bold green]")


# -----------------------------
# COMMANDS
# -----------------------------
@app.command()
def pi_repos(pi_name: str):
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print(f"[bold]Searching ESPRIT-{pi_name}...[/bold]\n")

    repos = search_pi_mode(pi_name)
    display_grouped_by_class(repos)


@app.command()
def class_repos(class_name: str):
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print(f"[bold]Searching class {class_name}...[/bold]\n")

    repos = search_class_mode(class_name)
    display_grouped_by_pi(repos)


@app.command()
def all_repos():
    console.print(ESPRIT_PI_ASCII, style="bold blue")
    console.print("[bold]Searching all ESPRIT-PI repositories...[/bold]\n")

    repos = fetch_github_repos("ESPRIT-PI in:name")

    repos = [
        r for r in repos
        if r.get("name", "").upper().startswith("ESPRIT-PI")
    ]

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