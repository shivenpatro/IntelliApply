"""Report a repository-owned Vercel preview's accessibility from its CI runner."""

import json
import os
import re
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen


def github(path):
    request = Request(
        "https://api.github.com" + path,
        headers={
            "Authorization": "Bearer " + os.environ["GITHUB_TOKEN"],
            "Accept": "application/vnd.github+json",
        },
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
                        return {"url": url, "http_status": response.status,
                                "status": "app_served" if serves_app else "unexpected_page"}
                except HTTPError as error:
                    return {"url": url, "http_status": error.code,
                            "status": "authentication_required" if error.code in (401, 403) else "http_error"}
                except URLError:
                    return {"url": url, "status": "network_unavailable"}
        if attempt < 5:
            time.sleep(5)
    return {"status": "preview_not_ready"}


if __name__ == "__main__":
    result = report()
    Path("preview-report.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))
