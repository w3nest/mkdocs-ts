from pathlib import Path
import re

from w3nest.utils import parse_json

project_folder = Path(__file__).parent.parent

pkg_json = parse_json(project_folder / "package.json")

mkdocs_pkg_json = parse_json(project_folder / ".." / ".." / "package.json")
notebook_pkg_json = parse_json(
    project_folder / ".." / ".." / "plugins" / "notebook" / "package.json"
)
code_api__pkg_json = parse_json(
    project_folder / ".." / ".." / "plugins" / "code-api" / "package.json"
)

print("MkDocs-TS version", mkdocs_pkg_json["version"])
print("Notebook version", notebook_pkg_json["version"])
print("Code API version", code_api__pkg_json["version"])

version_mkdocs = mkdocs_pkg_json["version"]
version_notebook = notebook_pkg_json["version"]
version_codeapi = code_api__pkg_json["version"]

js_file_path = project_folder / "main.js"

with open(js_file_path, "r") as file:
    content = file.read()

content = re.sub(
    r"(const\s+versionMkDocs\s*=\s*')[^']+(')",
    lambda m: f"{m.group(1)}{version_mkdocs}{m.group(2)}",
    content,
)

content = re.sub(
    r"(const\s+versionNotebook\s*=\s*')[^']+(')",
    lambda m: f"{m.group(1)}{version_notebook}{m.group(2)}",
    content,
)

content = re.sub(
    r"(const\s+versionCodeApi\s*=\s*')[^']+(')",
    lambda m: f"{m.group(1)}{version_codeapi}{m.group(2)}",
    content,
)

with open(js_file_path, "w") as file:
    file.write(content)
