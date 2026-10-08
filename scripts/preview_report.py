"""Report a repository-owned Vercel preview's accessibility from its CI runner."""

import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen


def github(path, body=None):
    request = Request(
        "https://api.github.com" + path,
        headers={
            "Authorization": "Bearer " + os.environ["GITHUB_TOKEN"],
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urlopen(request, timeout=15) as response:
        return json.load(response)


def report():
    repo = os.environ["GITHUB_REPOSITORY"]
    if repo != "shivenpatro/IntelliApply":
        return {"status": "unsupported_repository"}
    sha = os.environ["RELEASE_SHA"]
    prefix = f"/repos/{repo}/deployments"
    for attempt in range(6):
        deployments = github(prefix + "?" + urlencode({"sha": sha}))
        previews = [item for item in deployments if item["environment"] == "Preview"]
        if previews:
            statuses = github(prefix + "/" + str(int(previews[0]["id"])) + "/statuses")
            successful = [item for item in statuses if item["state"] == "success"]
            if successful:
                url = successful[0].get("environment_url", "")
                parsed = urlsplit(url)
                if parsed.scheme != "https" or not re.fullmatch(
                    r"intelli-apply-[a-z0-9-]+-shivenpatros-projects\.vercel\.app",
                    parsed.hostname or "",
                ):
                    return {"status": "unrecognized_preview_host"}
                # No GitHub token, user session or deployment bypass sent here.
                request = Request(url, headers={"User-Agent": "IntelliApply-preview-check"})
                try:
                    with urlopen(request, timeout=20) as response:
                        body = response.read(1024 * 1024).decode(errors="replace")
                        serves_app = 'id="root"' in body and "/assets/" in body
                        protected = "Authentication Required" in body or urlsplit(response.url).hostname == "vercel.com"
                        return {"url": url, "http_status": response.status,
                                "status": "app_served" if serves_app else "authentication_required" if protected else "unexpected_page"}
                except HTTPError as error:
                    return {"url": url, "http_status": error.code,
                            "status": "authentication_required" if error.code in (401, 403) else "http_error"}
                except URLError:
                    return {"url": url, "status": "network_unavailable"}
        if attempt < 5:
            time.sleep(5)
    return {"status": "preview_not_ready"}


def publish_check(result, browser=False):
    if os.getenv("GITHUB_ACTIONS") != "true":
        return
    passed = result["status"] == ("passed" if browser else "app_served")
    conclusion = "success" if passed else "failure" if result["status"] == "failed" else "neutral"
    try:
        github(f"/repos/{os.environ['GITHUB_REPOSITORY']}/check-runs", {
            "name": "Preview browser smoke" if browser else "Preview HTTP access",
            "head_sha": os.environ["RELEASE_SHA"],
            "status": "completed",
            "conclusion": conclusion,
            "output": {
                "title": result["status"],
                "summary": "```json\n" + json.dumps(result, indent=2) + "\n```",
            },
        })
    except HTTPError as error:
        # Fork tokens may be read-only; retain the artifact/report either way.
        print(json.dumps({"check_publication": "unavailable", "http_status": error.code}))


if __name__ == "__main__":
    browser = "--browser" in sys.argv
    result = json.loads(Path("preview-browser-report.json").read_text()) if browser else report()
    if not browser:
        Path("preview-report.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))
    publish_check(result, browser)
