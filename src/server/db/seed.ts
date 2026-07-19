/**
 * Seeds the demo tree. Idempotent: skips if the python root already exists.
 * Run with: bun run db:seed   (after bun run db:migrate)
 */
import { eq } from "drizzle-orm";
import { db, schema } from "./client";
import { createNode, setStatus } from "../repo/nodes";

const seedNodes = [
  {
    slug: "python",
    name: "Python",
    kind: "language" as const,
    summary:
      "A high-level, general-purpose programming language emphasizing readability. The root of this tree — everything here grows out of it.",
    launchedAt: "1991-02-20",
    launchedBy: "Guido van Rossum",
    ownership: "foundation" as const,
    license: "PSF License",
    milestones: [
      { date: "1991-02-20", label: "First release (0.9.0)" },
      { date: "2000-10-16", label: "Python 2.0" },
      { date: "2008-12-03", label: "Python 3.0" },
      { date: "2020-01-01", label: "Python 2 end of life" }
    ],
    installGuide:
      "## Install\n\nDownload from [python.org](https://www.python.org/downloads/) or use a version manager:\n\n```sh\n# Windows\nwinget install Python.Python.3.12\n\n# macOS\nbrew install python\n\n# Linux\nsudo apt install python3\n```\n\nVerify with `python --version`.",
    tutorial:
      "## First steps\n\n```python\nprint(\"Hello, PythonTree!\")\n\nfor fruit in [\"apple\", \"banana\"]:\n    print(fruit.upper())\n```\n\nRun a file with `python hello.py`, or explore interactively with `python` (the REPL).",
    commonFunctions:
      "## Often used built-ins\n\n| Function | What it does |\n|---|---|\n| `len(x)` | length of a sequence |\n| `range(n)` | iterate 0..n-1 |\n| `enumerate(xs)` | index + value pairs |\n| `zip(a, b)` | pair up two sequences |\n| `open(path)` | read/write files |",
    parentSlugs: [] as string[],
    links: [
      { kind: "website" as const, label: "python.org", url: "https://www.python.org" },
      { kind: "github" as const, label: "GitHub", url: "https://github.com/python/cpython" },
      { kind: "forum" as const, label: "Discuss forum", url: "https://discuss.python.org" },
      { kind: "docs" as const, label: "Documentation", url: "https://docs.python.org/3/" }
    ]
  },
  {
    slug: "requests",
    name: "Requests",
    kind: "library" as const,
    summary: "HTTP for Humans — the de-facto standard library for making HTTP calls in Python.",
    launchedAt: "2011-02-14",
    launchedBy: "Kenneth Reitz",
    ownership: "opensource" as const,
    license: "Apache-2.0",
    milestones: [{ date: "2011-02-14", label: "First release" }],
    installGuide: "## Install\n\n```sh\npip install requests\n```",
    tutorial:
      "## Basics\n\n```python\nimport requests\n\nr = requests.get(\"https://api.github.com\")\nprint(r.status_code)\nprint(r.json())\n```",
    commonFunctions:
      "## Often used\n\n- `requests.get(url, params=...)`\n- `requests.post(url, json=...)`\n- `response.json()`, `response.text`, `response.status_code`\n- `requests.Session()` for connection reuse",
    parentSlugs: ["python"],
    links: [
      { kind: "pypi" as const, label: "PyPI", url: "https://pypi.org/project/requests/" },
      { kind: "github" as const, label: "GitHub", url: "https://github.com/psf/requests" },
      { kind: "docs" as const, label: "Docs", url: "https://requests.readthedocs.io" }
    ]
  },
  {
    slug: "math",
    name: "math (stdlib)",
    kind: "module" as const,
    summary:
      "Python's built-in mathematics module — the numeric foundation that scientific packages grew from.",
    launchedAt: "1991-02-20",
    launchedBy: "Python core team",
    ownership: "foundation" as const,
    license: "PSF License",
    milestones: [],
    installGuide: "## Install\n\nNothing to install — ships with Python:\n\n```python\nimport math\n```",
    tutorial:
      "## Basics\n\n```python\nimport math\n\nprint(math.sqrt(16))      # 4.0\nprint(math.pi)            # 3.14159...\nprint(math.factorial(5))  # 120\n```",
    commonFunctions:
      "## Often used\n\n- `math.sqrt`, `math.pow`, `math.exp`, `math.log`\n- `math.floor`, `math.ceil`\n- `math.sin`, `math.cos`, `math.tan`\n- constants: `math.pi`, `math.e`, `math.inf`",
    parentSlugs: ["python"],
    links: [
      { kind: "docs" as const, label: "Docs", url: "https://docs.python.org/3/library/math.html" }
    ]
  },
  {
    slug: "flask",
    name: "Flask",
    kind: "framework" as const,
    summary: "A lightweight WSGI web framework — start small, scale to complex apps.",
    launchedAt: "2010-04-01",
    launchedBy: "Armin Ronacher (Pallets)",
    ownership: "opensource" as const,
    license: "BSD-3-Clause",
    milestones: [{ date: "2010-04-01", label: "First release (April Fools' joke turned real)" }],
    installGuide: "## Install\n\n```sh\npip install flask\n```",
    tutorial:
      "## Minimal app\n\n```python\nfrom flask import Flask\napp = Flask(__name__)\n\n@app.route(\"/\")\ndef hello():\n    return \"Hello from Flask!\"\n```\n\nRun with `flask run`.",
    commonFunctions:
      "## Often used\n\n- `@app.route(path, methods=[...])`\n- `flask.request` — access form/json/query data\n- `flask.jsonify(...)`\n- `flask.render_template(name, **ctx)`",
    parentSlugs: ["requests"],
    links: [
      { kind: "pypi" as const, label: "PyPI", url: "https://pypi.org/project/Flask/" },
      { kind: "github" as const, label: "GitHub", url: "https://github.com/pallets/flask" },
      { kind: "discord" as const, label: "Pallets Discord", url: "https://discord.gg/pallets" },
      { kind: "docs" as const, label: "Docs", url: "https://flask.palletsprojects.com" }
    ]
  },
  {
    slug: "django",
    name: "Django",
    kind: "framework" as const,
    summary: "The batteries-included web framework for perfectionists with deadlines.",
    launchedAt: "2005-07-21",
    launchedBy: "Adrian Holovaty & Simon Willison (Django Software Foundation)",
    ownership: "foundation" as const,
    license: "BSD-3-Clause",
    milestones: [
      { date: "2005-07-21", label: "First public release" },
      { date: "2008-09-03", label: "1.0 release" }
    ],
    installGuide: "## Install\n\n```sh\npip install django\ndjango-admin startproject mysite\n```",
    tutorial:
      "## First app\n\n```sh\npython manage.py startapp blog\npython manage.py migrate\npython manage.py runserver\n```\n\nThen define models in `models.py` and views in `views.py`.",
    commonFunctions:
      "## Often used\n\n- `models.Model`, `models.CharField`, `models.ForeignKey`\n- `HttpResponse`, `render(request, template, ctx)`\n- `path(route, view)` in `urls.py`\n- `python manage.py makemigrations / migrate`",
    parentSlugs: ["requests"],
    links: [
      { kind: "pypi" as const, label: "PyPI", url: "https://pypi.org/project/Django/" },
      { kind: "github" as const, label: "GitHub", url: "https://github.com/django/django" },
      { kind: "forum" as const, label: "Django forum", url: "https://forum.djangoproject.com" },
      { kind: "docs" as const, label: "Docs", url: "https://docs.djangoproject.com" }
    ]
  },
  {
    slug: "fastapi",
    name: "FastAPI",
    kind: "framework" as const,
    summary:
      "A modern, high-performance async web framework built on type hints, Starlette and Pydantic.",
    launchedAt: "2018-12-05",
    launchedBy: "Sebastián Ramírez",
    ownership: "opensource" as const,
    license: "MIT",
    milestones: [{ date: "2018-12-05", label: "First release" }],
    installGuide: "## Install\n\n```sh\npip install \"fastapi[standard]\"\n```",
    tutorial:
      "## Minimal app\n\n```python\nfrom fastapi import FastAPI\napp = FastAPI()\n\n@app.get(\"/\")\nasync def root():\n    return {\"message\": \"Hello from FastAPI\"}\n```\n\nRun with `fastapi dev main.py` — interactive docs at `/docs`.",
    commonFunctions:
      "## Often used\n\n- `@app.get / @app.post(path)`\n- Pydantic models as request bodies\n- `Depends(...)` for dependency injection\n- `HTTPException(status_code, detail)`",
    parentSlugs: ["requests"],
    links: [
      { kind: "pypi" as const, label: "PyPI", url: "https://pypi.org/project/fastapi/" },
      { kind: "github" as const, label: "GitHub", url: "https://github.com/fastapi/fastapi" },
      { kind: "discord" as const, label: "Discord", url: "https://discord.gg/VQjSZaeJmf" },
      { kind: "docs" as const, label: "Docs", url: "https://fastapi.tiangolo.com" }
    ]
  },
  {
    slug: "numpy",
    name: "NumPy",
    kind: "package" as const,
    summary: "The fundamental package for numerical computing: N-dimensional arrays and fast math.",
    launchedAt: "2006-01-01",
    launchedBy: "Travis Oliphant (community)",
    ownership: "opensource" as const,
    license: "BSD-3-Clause",
    milestones: [
      { date: "1995-01-01", label: "Numeric (predecessor)" },
      { date: "2006-01-01", label: "NumPy 1.0" }
    ],
    installGuide: "## Install\n\n```sh\npip install numpy\n```",
    tutorial:
      "## Basics\n\n```python\nimport numpy as np\n\na = np.array([1, 2, 3])\nprint(a * 2)          # [2 4 6]\nprint(a.mean())       # 2.0\nm = np.zeros((3, 3))\n```",
    commonFunctions:
      "## Often used\n\n- `np.array`, `np.zeros`, `np.ones`, `np.arange`, `np.linspace`\n- `arr.reshape`, `arr.T`, `arr.mean()`, `arr.sum()`\n- `np.dot` / `@` matrix multiply\n- `np.random.default_rng()`",
    parentSlugs: ["math"],
    links: [
      { kind: "pypi" as const, label: "PyPI", url: "https://pypi.org/project/numpy/" },
      { kind: "github" as const, label: "GitHub", url: "https://github.com/numpy/numpy" },
      { kind: "docs" as const, label: "Docs", url: "https://numpy.org/doc/" }
    ]
  },
  {
    slug: "scipy",
    name: "SciPy",
    kind: "package" as const,
    summary:
      "Scientific computing on top of NumPy: optimization, integration, signal processing, statistics.",
    launchedAt: "2001-01-01",
    launchedBy: "Travis Oliphant, Pearu Peterson, Eric Jones",
    ownership: "opensource" as const,
    license: "BSD-3-Clause",
    milestones: [{ date: "2001-01-01", label: "First release" }],
    installGuide: "## Install\n\n```sh\npip install scipy\n```",
    tutorial:
      "## Basics\n\n```python\nfrom scipy import optimize\n\nresult = optimize.minimize(lambda x: (x - 2) ** 2, x0=0)\nprint(result.x)  # ~[2.]\n```",
    commonFunctions:
      "## Often used\n\n- `scipy.optimize.minimize`, `curve_fit`\n- `scipy.integrate.quad`\n- `scipy.stats` distributions and tests\n- `scipy.signal` filtering",
    parentSlugs: ["math"],
    links: [
      { kind: "pypi" as const, label: "PyPI", url: "https://pypi.org/project/scipy/" },
      { kind: "github" as const, label: "GitHub", url: "https://github.com/scipy/scipy" },
      { kind: "forum" as const, label: "Scientific Python forum", url: "https://discuss.scientific-python.org" },
      { kind: "docs" as const, label: "Docs", url: "https://docs.scipy.org/doc/scipy/" }
    ]
  }
];

async function main() {
  const existing = await db.query.nodes.findFirst({
    where: eq(schema.nodes.slug, "python")
  });
  if (existing) {
    console.log("Seed skipped: tree already exists.");
    return;
  }
  // Parents are referenced by slug, so insert in dependency order (the array
  // above is already ordered parents-first).
  for (const n of seedNodes) {
    const row = await createNode(n);
    await setStatus(row.id, "published");
    console.log(`  published ${n.slug}`);
  }
  console.log(`Seeded ${seedNodes.length} nodes.`);
}

main().then(() => process.exit(0));
