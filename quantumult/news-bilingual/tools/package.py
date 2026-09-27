from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
root = Path(__file__).resolve().parents[1]
files = ['NewsBilingual.js', 'NewsBilingual.snippet', 'NewsBilingual.boxjs.json', 'README.md', 'VALIDATION.md']
output = root.parent / 'NewsBilingual-QX.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(root / name, name)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert sorted(archive.namelist()) == sorted(files)
    for name in files:
        assert archive.read(name) == (root / name).read_bytes()
print(output)
print('SHA256:', hashlib.sha256(output.read_bytes()).hexdigest())
