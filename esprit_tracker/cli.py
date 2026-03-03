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

# Format :
# Esprit-[PI]-[Classe]-[AU]-[NomDuProjet]
REPO_PATTERN = re.compile(
    r"^Esprit-([A-Za-z]+)-([A-Za-z0-9]+)-(\d{4})-([A-Za-z0-9_-]+)$"
)


def get_github_headers():
    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def fetch_github_repos(query: str) -> List[dict]:
    repos = []
    page = 1

    while True:
        url = "https://api.github.com/search/repositories"
        params = {
            "q": query,
            "per_page": 100,
            "page": page,
        }

        response = requests.get(url, params=params, headers=get_github_headers())

        if response.status_code != 200:
            console.print(f"[red]GitHub API error: {response.status_code}[/red]")
            break

        data = response.json()
        items = data.get("items", [])

        if not items:
            break

        repos.extend(items)
        page += 1

        if len(repos) >= 1000:
            break

    return repos


def validate_repo_format(name: str):
    return bool(REPO_PATTERN.match(name))


def extract_repo_info(name: str):
    match = REPO_PATTERN.match(name)
    if not match:
        return None

    return {
        "pi": match.group(1),
        "classe": match.group(2),
        "annee": match.group(3),
        "projet": match.group(4),
    }


def search_all_mode():
    console.print("[bold]Searching repos for year 2526...[/bold]")
    repos = fetch_github_repos("Esprit-2526 in:name")

    valid = []
    for repo in repos:
        name = repo["name"]
        if validate_repo_format(name):
            valid.append(repo)

    return valid


def display_results(repos):
    table = Table(title="ESPRIT Repositories")

    table.add_column("Repository")
    table.add_column("PI")
    table.add_column("Classe")
    table.add_column("AU")
    table.add_column("Owner")
    table.add_column("URL")

    for repo in repos:
        info = extract_repo_info(repo["name"]) or {}

        table.add_row(
            repo["name"],
            info.get("pi", "N/A"),
            info.get("classe", "N/A"),
            info.get("annee", "N/A"),
            repo["owner"]["login"],
            repo["html_url"],
        )

    console.print(table)
    console.print(f"\nTotal repositories found: {len(repos)}\n")


@app.command()
def all_repos():
    repos = search_all_mode()
    display_results(repos)


@app.command()
def repo(name: str):
    repos = fetch_github_repos(f"{name} in:name")
    display_results(repos)


if __name__ == "__main__":
    app()