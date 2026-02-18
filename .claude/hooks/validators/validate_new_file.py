#!/usr/bin/env python3
"""Validate that new files in a directory meet basic requirements."""
import argparse
import glob
import sys
import os


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", required=True)
    parser.add_argument("--extension", required=True)
    args = parser.parse_args()

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    search_dir = os.path.join(project_dir, args.directory)
    pattern = os.path.join(search_dir, f"*{args.extension}")
    files = glob.glob(pattern)

    if not files:
        print(f"No {args.extension} files found in {search_dir}")
        sys.exit(1)

    errors = []
    for filepath in files:
        stat = os.stat(filepath)
        if stat.st_size == 0:
            errors.append(f"{os.path.basename(filepath)}: file is empty")
        if stat.st_size < 100:
            errors.append(f"{os.path.basename(filepath)}: file too small ({stat.st_size} bytes)")

    if errors:
        print("Validation failed:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    print(f"All {len(files)} file(s) pass validation.")


if __name__ == "__main__":
    main()
