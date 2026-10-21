"""Package the built Cloudflare release for dashboard Direct Upload (stdlib only)."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

release = Path(__file__).resolve().parent.parent / "release"
source = release / "cloudflare"
output = release / "11-0-0-cloudflare.zip"
if not (source / "index.html").is_file():
    raise SystemExit("No Cloudflare release found. Run npm run build:cloudflare first.")

staging = output.with_suffix(".zip.tmp")
try:
    with ZipFile(staging, "w", compression=ZIP_DEFLATED) as archive:
        for path in sorted(source.rglob("*")):
            if path.is_file():
                # Stable metadata makes an unchanged release reproducible.
                entry = ZipInfo(path.relative_to(source).as_posix(), (2026, 1, 1, 0, 0, 0))
                entry.compress_type = ZIP_DEFLATED
                entry.external_attr = 0o100644 << 16
                archive.writestr(entry, path.read_bytes())
    staging.replace(output)
finally:
    staging.unlink(missing_ok=True)
print(f"Cloudflare Direct Upload archive: {output} ({output.stat().st_size:,} bytes)")
