"""CLI module for ESPRIT repository tracker."""

import os
import re
from typing import List

import requests
import typer
from rich.console import Console
from rich.style import Style
from rich.table import Table
from rich.text import Text

app = typer.Typer()
console = Console()


ESPRIT_PI_ASCII = r"""
  _____ ____  ____  ____  ___ _____      ____ ___ 
 | ____/ ___||  _ \|  _ \|_ _|_   _|    |  _ \_ _|
 |  _| \___ \| |_) | |_) || |  | |_____ | |_) | | 
 | |___ ___) |  __/|  _ < | |  | |_____||  __/| | 
 |_____|____/|_|   |_| \_\___| |_|      |_|  |___|
"""

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


def fetch_github_orgs(query: str) -> List[dict]:
    orgs = []
    page = 1

    while True:
        url = "https://api.github.com/search/users"
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

        orgs.extend(items)
        page += 1

        if len(orgs) >= 1000:
            break

    return orgs


def fetch_github_user(login: str):
    """Fetch a single user/org by login (GET /users/{login}). Works for orgs with no public repos."""
    url = f"https://api.github.com/users/{login}"
    response = requests.get(url, headers=get_github_headers())
    if response.status_code != 200:
        return None
    return response.json()


def get_known_orgs_path():
    """Path to optional file listing known org logins (one per line)."""
    return os.environ.get("ESPRIT_KNOWN_ORGS_FILE") or os.path.join(os.getcwd(), "known_orgs.txt")


def load_known_org_logins() -> List[str]:
    """Load known org logins from file (one per line, skip empty and # comments)."""
    path = get_known_orgs_path()
    if not os.path.isfile(path):
        return []
    logins = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                logins.append(line)
    return logins


def merge_known_orgs(
    orgs: List[dict],
    filter_nomenclature: bool = True,
    predicate=None,
) -> List[dict]:
    """Add orgs from known_orgs.txt that are not already in orgs (fetch via API).
    If predicate is set, only add when predicate(login) is True (e.g. same class/PI).
    """
    known = load_known_org_logins()
    existing_logins = {o.get("login") for o in orgs}
    for login in known:
        if login in existing_logins:
            continue
        if filter_nomenclature and not validate_repo_format(login):
            continue
        if predicate is not None and not predicate(login):
            continue
        user = fetch_github_user(login)
        if not user:
            continue
        orgs.append(user)
        existing_logins.add(login)
    return orgs


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
    # Use token-based search (Esprit 2526) so names like
    # Esprit-PI-4TWIN2-2526-MediFollow are correctly found.
    repos = fetch_github_repos("Esprit 2526 in:name")

    valid = []
    for repo in repos:
        name = repo["name"]
        if validate_repo_format(name):
            valid.append(repo)

    return valid


def search_all_orgs_mode():
    # We search all GitHub accounts (users or orgs) whose login matches the pattern.
    orgs = fetch_github_orgs("Esprit 2526 in:login")
    # Add orgs from known_orgs.txt (e.g. orgs with no public repos, not returned by search).
    orgs = merge_known_orgs(orgs)
    return orgs


def search_by_class(classe: str):
    # Targeted search to avoid GitHub Search 1000-results cap.
    # We still validate the naming convention and then filter by parsed class.
    repos = fetch_github_repos(f"Esprit {classe} 2526 in:name")
    filtered = []

    for repo in repos:
        name = repo["name"]
        if not validate_repo_format(name):
            continue

        info = extract_repo_info(name)
        if info and info.get("classe", "").lower() == classe.lower():
            filtered.append(repo)

    console.print(f"[bold]Found {len(filtered)} repositories for class {classe}[/bold]")
    return filtered


def search_orgs_by_class(classe: str):
    # Targeted search to avoid GitHub Search 1000-results cap.
    orgs = fetch_github_orgs(f"Esprit {classe} 2526 in:login")
    filtered = []
    for org in orgs:
        login = org.get("login", "")
        info = extract_repo_info(login)
        if info and info.get("classe", "").lower() == classe.lower():
            filtered.append(org)
    # Add known orgs from file that match this class (e.g. orgs with no public repos).
    merge_known_orgs(
        filtered,
        predicate=lambda login: extract_repo_info(login)
        and extract_repo_info(login).get("classe", "").lower() == classe.lower(),
    )
    console.print(
        f"[bold]Found {len(filtered)} organizations for class {classe}[/bold]"
    )
    return filtered


def search_by_pi(pi: str):
    # Targeted search to avoid GitHub Search 1000-results cap.
    repos = fetch_github_repos(f"Esprit {pi} 2526 in:name")
    filtered = []

    for repo in repos:
        name = repo["name"]
        if not validate_repo_format(name):
            continue

        info = extract_repo_info(name)
        if info and info.get("pi", "").lower() == pi.lower():
            filtered.append(repo)

    console.print(f"[bold]Found {len(filtered)} repositories for PI {pi}[/bold]")
    return filtered


def search_orgs_by_pi(pi: str):
    # Targeted search to avoid GitHub Search 1000-results cap.
    orgs = fetch_github_orgs(f"Esprit {pi} 2526 in:login")
    filtered = []
    for org in orgs:
        login = org.get("login", "")
        info = extract_repo_info(login)
        if info and info.get("pi", "").lower() == pi.lower():
            filtered.append(org)
    # Add known orgs from file that match this PI (e.g. orgs with no public repos).
    merge_known_orgs(
        filtered,
        predicate=lambda login: extract_repo_info(login)
        and extract_repo_info(login).get("pi", "").lower() == pi.lower(),
    )
    console.print(f"[bold]Found {len(filtered)} organizations for PI {pi}[/bold]")
    return filtered


def display_results(repos):
    table = Table(title="ESPRIT Repositories")

    table.add_column("Repository")
    table.add_column("PI")
    table.add_column("Classe")
    table.add_column("Stars")
    table.add_column("Owner")
    table.add_column("URL", no_wrap=False, overflow="fold")

    for repo in repos:
        info = extract_repo_info(repo["name"]) or {}
        # URL complète du projet sur GitHub (priorité: html_url API, sinon full_name, sinon owner/name)
        repo_url = repo.get("html_url")
        if not repo_url or not str(repo_url).strip().startswith("https://github.com/"):
            full_name = (repo.get("full_name") or "").strip()
            if full_name:
                repo_url = f"https://github.com/{full_name}"
            else:
                owner_login = (repo.get("owner") or {}).get("login", "") if isinstance(repo.get("owner"), dict) else ""
                repo_name = repo.get("name", "")
                repo_url = f"https://github.com/{owner_login}/{repo_name}" if (owner_login and repo_name) else "N/A"
        repo_url = (repo_url or "").strip().rstrip("/") or "N/A"
        url_cell = Text(repo_url, style=Style(link=repo_url)) if repo_url != "N/A" else repo_url

        table.add_row(
            repo["name"],
            info.get("pi", "N/A"),
            info.get("classe", "N/A"),
            str(repo.get("stargazers_count", 0)),
            repo.get("owner", {}).get("login", "N/A"),
            url_cell,
        )

    console.print(table)
    console.print(f"\nTotal repositories found: {len(repos)}\n")


def display_org_results(orgs):
    if not orgs:
        return
    table = Table(title="ESPRIT Organizations")

    table.add_column("Organization")
    table.add_column("PI")
    table.add_column("Classe")
    table.add_column("Owner")
    table.add_column("URL", no_wrap=False, overflow="fold")

    for org in orgs:
        login = org.get("login", "N/A")
        info = extract_repo_info(login) or {}
        # URL complète du projet/orga sur GitHub (priorité: html_url API, sinon https://github.com/login)
        org_url = (org.get("html_url") or "").strip()
        if not org_url or not org_url.startswith("https://github.com/"):
            org_url = f"https://github.com/{login}" if login and login != "N/A" else "N/A"
        org_url = org_url.rstrip("/") or "N/A"
        url_cell = Text(org_url, style=Style(link=org_url)) if org_url != "N/A" else org_url

        table.add_row(
            login,
            info.get("pi", "N/A"),
            info.get("classe", "N/A"),
            login,
            url_cell,
        )

    console.print(table)
    console.print(f"\nTotal organizations found: {len(orgs)}\n")


@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """ESPRIT PI - Track GitHub repositories and organizations."""
    if ctx.invoked_subcommand is None:
        console.print(ESPRIT_PI_ASCII)
        raise typer.Exit(0)
    console.print(ESPRIT_PI_ASCII + "\n")


@app.command()
def all_repos():
    repos = search_all_mode()
    display_results(repos)

    orgs = search_all_orgs_mode()
    display_org_results(orgs)


@app.command()
def repo(name: str):
    repos = fetch_github_repos(f"{name} in:name")
    display_results(repos)


@app.command("class-repos")
def class_repos(classe: str):
    """Class mode - search repositories by class code."""
    repos = search_by_class(classe)
    display_results(repos)

    orgs = search_orgs_by_class(classe)
    display_org_results(orgs)


@app.command("pi-repos")
def pi_repos(pi: str):
    """PI mode - search repositories by PI name/code (e.g. PIDEV)."""
    repos = search_by_pi(pi)
    display_results(repos)

    orgs = search_orgs_by_pi(pi)
    display_org_results(orgs)


if __name__ == "__main__":
    app()