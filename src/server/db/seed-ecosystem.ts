/**
 * Second-wave seed: 34 real Python ecosystem packages, researched facts
 * (launch dates, creators, licenses, lineage). Dates are the first public
 * release; where the exact day is not well documented, Jan 1 of the release
 * year is used.
 *
 * Idempotent per node: slugs that already exist are skipped, so it can be
 * re-run safely. Run with: bun run db:seed:ecosystem
 */
import { eq } from "drizzle-orm";
import { db, schema } from "./client";
import { createNode, setStatus, updateNode, type NodeInput } from "../repo/nodes";

type LinkSpec = { kind?: "github" | "discord" | "forum" | "pypi" | "docs" | "website" | "custom"; label: string; url: string };
type Spec = {
  slug: string;
  name: string;
  kind: NonNullable<NodeInput["kind"]>;
  summary: string;
  launchedAt: string;
  launchedBy: string;
  ownership: NonNullable<NodeInput["ownership"]>;
  license: string;
  parents: string[];
  milestones?: { date: string; label: string }[];
  pip?: string | null; // pip package name; null = ships with Python
  tutorial: string; // python snippet
  functions: string[];
  links: LinkSpec[];
};

const gh = (repo: string): LinkSpec => ({ kind: "github", label: "GitHub", url: `https://github.com/${repo}` });
const pypi = (p: string): LinkSpec => ({ kind: "pypi", label: "PyPI", url: `https://pypi.org/project/${p}/` });
const docs = (url: string): LinkSpec => ({ kind: "docs", label: "Docs", url });

const specs: Spec[] = [
  // ---------- foundations / stdlib ----------
  {
    slug: "asyncio", name: "asyncio", kind: "module",
    summary: "Python's built-in framework for asynchronous I/O with async/await — the foundation of the modern async web stack.",
    launchedAt: "2014-03-16", launchedBy: "Guido van Rossum (as 'tulip', Python core)", ownership: "foundation", license: "PSF License",
    parents: ["python"], pip: null,
    milestones: [{ date: "2014-03-16", label: "Shipped in Python 3.4" }, { date: "2015-09-13", label: "async/await syntax (Python 3.5)" }],
    tutorial: `import asyncio\n\nasync def main():\n    await asyncio.sleep(1)\n    print("hello async")\n\nasyncio.run(main())`,
    functions: ["`asyncio.run(coro)`", "`asyncio.gather(*coros)`", "`asyncio.sleep(s)`", "`asyncio.create_task(coro)`"],
    links: [docs("https://docs.python.org/3/library/asyncio.html")]
  },
  {
    slug: "ipython", name: "IPython", kind: "package",
    summary: "The interactive Python shell that grew into the whole Jupyter ecosystem.",
    launchedAt: "2001-12-01", launchedBy: "Fernando Pérez", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["python"], pip: "ipython",
    tutorial: `# in a terminal\n# $ ipython\nIn [1]: %timeit sum(range(1000))\nIn [2]: ?len   # instant help`,
    functions: ["`%timeit` magic", "`%run script.py`", "`obj?` introspection", "tab completion everywhere"],
    links: [pypi("ipython"), gh("ipython/ipython"), docs("https://ipython.readthedocs.io")]
  },
  {
    slug: "pip", name: "pip", kind: "package",
    summary: "The package installer for Python — the front door to PyPI.",
    launchedAt: "2008-10-15", launchedBy: "Ian Bicking (now PyPA)", ownership: "opensource", license: "MIT",
    parents: ["python"], pip: null,
    milestones: [{ date: "2008-10-15", label: "First release (as pyinstall, renamed pip)" }],
    tutorial: `# install, upgrade, freeze\npip install requests\npip install --upgrade requests\npip freeze > requirements.txt`,
    functions: ["`pip install <pkg>`", "`pip install -r requirements.txt`", "`pip list --outdated`", "`pip show <pkg>`"],
    links: [pypi("pip"), gh("pypa/pip"), docs("https://pip.pypa.io")]
  },
  {
    slug: "pytest", name: "pytest", kind: "framework",
    summary: "The de-facto standard testing framework: plain assert statements, powerful fixtures.",
    launchedAt: "2004-01-01", launchedBy: "Holger Krekel", ownership: "opensource", license: "MIT",
    parents: ["python"], pip: "pytest",
    tutorial: `# test_math.py\ndef inc(x):\n    return x + 1\n\ndef test_inc():\n    assert inc(3) == 4\n\n# run: pytest -q`,
    functions: ["plain `assert`", "`@pytest.fixture`", "`@pytest.mark.parametrize`", "`pytest.raises(Error)`"],
    links: [pypi("pytest"), gh("pytest-dev/pytest"), docs("https://docs.pytest.org")]
  },
  {
    slug: "click", name: "Click", kind: "library",
    summary: "Composable command-line interfaces with almost no code — decorators all the way down.",
    launchedAt: "2014-04-24", launchedBy: "Armin Ronacher (Pallets)", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["python"], pip: "click",
    tutorial: `import click\n\n@click.command()\n@click.option("--name", default="world")\ndef hello(name):\n    click.echo(f"Hello {name}!")\n\nif __name__ == "__main__":\n    hello()`,
    functions: ["`@click.command()`", "`@click.option(...)`", "`@click.argument(...)`", "`click.echo(...)`"],
    links: [pypi("click"), gh("pallets/click"), { kind: "discord", label: "Pallets Discord", url: "https://discord.gg/pallets" }, docs("https://click.palletsprojects.com")]
  },
  {
    slug: "pillow", name: "Pillow", kind: "library",
    summary: "The friendly fork of PIL — image opening, processing and saving in every common format.",
    launchedAt: "2010-07-31", launchedBy: "Jeffrey A. Clark, fork of PIL (Fredrik Lundh, 1995)", ownership: "opensource", license: "MIT-CMU",
    parents: ["python"], pip: "pillow",
    milestones: [{ date: "1995-01-01", label: "Original PIL" }, { date: "2010-07-31", label: "Pillow fork" }],
    tutorial: `from PIL import Image\n\nim = Image.open("photo.jpg")\nim.thumbnail((300, 300))\nim.save("thumb.png")`,
    functions: ["`Image.open(path)`", "`im.resize((w, h))`", "`im.crop(box)`", "`im.save(path)`"],
    links: [pypi("pillow"), gh("python-pillow/Pillow"), docs("https://pillow.readthedocs.io")]
  },
  {
    slug: "sqlalchemy", name: "SQLAlchemy", kind: "library",
    summary: "The database toolkit and ORM: from raw SQL expression language to full unit-of-work mapping.",
    launchedAt: "2006-02-14", launchedBy: "Michael Bayer", ownership: "opensource", license: "MIT",
    parents: ["python"], pip: "sqlalchemy",
    milestones: [{ date: "2023-01-26", label: "2.0 release (new unified API)" }],
    tutorial: `from sqlalchemy import create_engine, text\n\nengine = create_engine("sqlite:///app.db")\nwith engine.connect() as conn:\n    rows = conn.execute(text("SELECT 1"))\n    print(rows.all())`,
    functions: ["`create_engine(url)`", "`Session` / `sessionmaker`", "`select(Model).where(...)`", "declarative `Mapped[]` models"],
    links: [pypi("sqlalchemy"), gh("sqlalchemy/sqlalchemy"), docs("https://docs.sqlalchemy.org")]
  },
  {
    slug: "celery", name: "Celery", kind: "framework",
    summary: "Distributed task queue: run work in the background across workers, with retries and schedules.",
    launchedAt: "2009-04-24", launchedBy: "Ask Solem", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["python"], pip: "celery",
    tutorial: `from celery import Celery\n\napp = Celery("tasks", broker="redis://localhost")\n\n@app.task\ndef add(x, y):\n    return x + y\n\n# add.delay(2, 3) from anywhere`,
    functions: ["`@app.task`", "`task.delay(...)`", "`task.apply_async(countdown=60)`", "beat periodic schedules"],
    links: [pypi("celery"), gh("celery/celery"), docs("https://docs.celeryq.dev")]
  },
  {
    slug: "lxml", name: "lxml", kind: "library",
    summary: "Fast XML and HTML processing binding libxml2/libxslt with a Pythonic API.",
    launchedAt: "2005-01-01", launchedBy: "Stefan Behnel and contributors", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["python"], pip: "lxml",
    tutorial: `from lxml import html\n\ntree = html.fromstring("<p class='x'>hi</p>")\nprint(tree.xpath("//p[@class='x']/text()"))  # ['hi']`,
    functions: ["`etree.parse(src)`", "`tree.xpath(expr)`", "`html.fromstring(s)`", "`etree.tostring(el)`"],
    links: [pypi("lxml"), gh("lxml/lxml"), docs("https://lxml.de")]
  },
  {
    slug: "twisted", name: "Twisted", kind: "framework",
    summary: "The original event-driven networking engine — protocols, servers and clients since 2002.",
    launchedAt: "2002-10-22", launchedBy: "Glyph Lefkowitz", ownership: "opensource", license: "MIT",
    parents: ["python"], pip: "twisted",
    tutorial: `from twisted.internet import reactor\n\nreactor.callLater(1, lambda: (print("tick"), reactor.stop()))\nreactor.run()`,
    functions: ["`reactor.run()`", "`Deferred` callbacks", "`Protocol` / `Factory`", "`reactor.callLater(s, f)`"],
    links: [pypi("twisted"), gh("twisted/twisted"), docs("https://docs.twisted.org")]
  },
  {
    slug: "beautifulsoup4", name: "Beautiful Soup", kind: "library",
    summary: "Forgiving HTML/XML parsing for screen scraping — finds what you mean even in broken markup.",
    launchedAt: "2004-05-01", launchedBy: "Leonard Richardson", ownership: "individual", license: "MIT",
    parents: ["python"], pip: "beautifulsoup4",
    tutorial: `from bs4 import BeautifulSoup\nimport requests\n\nhtml = requests.get("https://example.com").text\nsoup = BeautifulSoup(html, "html.parser")\nprint(soup.title.string)`,
    functions: ["`soup.find(tag, attrs)`", "`soup.find_all(...)`", "`soup.select('css > selector')`", "`el.get_text()`"],
    links: [pypi("beautifulsoup4"), docs("https://www.crummy.com/software/BeautifulSoup/bs4/doc/")]
  },
  // ---------- web stack ----------
  {
    slug: "urllib3", name: "urllib3", kind: "library",
    summary: "The HTTP client under Requests: connection pooling, retries, TLS — the plumbing of Python HTTP.",
    launchedAt: "2008-06-01", launchedBy: "Andrey Petrov", ownership: "opensource", license: "MIT",
    parents: ["python"], pip: "urllib3",
    tutorial: `import urllib3\n\nhttp = urllib3.PoolManager()\nr = http.request("GET", "https://httpbin.org/get")\nprint(r.status, r.data[:60])`,
    functions: ["`PoolManager()`", "`http.request(method, url)`", "`Retry(...)` policies", "`Timeout(...)`"],
    links: [pypi("urllib3"), gh("urllib3/urllib3"), docs("https://urllib3.readthedocs.io")]
  },
  {
    slug: "werkzeug", name: "Werkzeug", kind: "library",
    summary: "The WSGI toolkit Flask is built on: request/response objects, routing, debugging.",
    launchedAt: "2007-12-09", launchedBy: "Armin Ronacher (Pallets)", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["python"], pip: "werkzeug",
    tutorial: `from werkzeug.wrappers import Request, Response\n\n@Request.application\ndef app(request):\n    return Response("Hello from Werkzeug!")\n\n# serve with any WSGI server`,
    functions: ["`Request` / `Response`", "`Map` / `Rule` routing", "interactive debugger", "`run_simple(host, port, app)`"],
    links: [pypi("werkzeug"), gh("pallets/werkzeug"), { kind: "discord", label: "Pallets Discord", url: "https://discord.gg/pallets" }, docs("https://werkzeug.palletsprojects.com")]
  },
  {
    slug: "jinja2", name: "Jinja", kind: "library",
    summary: "The templating engine of Flask (and Ansible): expressive {{ placeholders }} with inheritance.",
    launchedAt: "2008-07-17", launchedBy: "Armin Ronacher (Pallets)", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["python"], pip: "jinja2",
    tutorial: `from jinja2 import Template\n\nt = Template("Hello {{ name }}!")\nprint(t.render(name="PythonTree"))`,
    functions: ["`Template(src).render(**ctx)`", "`{% for %}` / `{% if %}`", "template inheritance `{% extends %}`", "filters `{{ x|upper }}`"],
    links: [pypi("jinja2"), gh("pallets/jinja"), docs("https://jinja.palletsprojects.com")]
  },
  {
    slug: "tornado", name: "Tornado", kind: "framework",
    summary: "Async web framework and networking library, born at FriendFeed — long-polling and websockets before asyncio existed.",
    launchedAt: "2009-09-10", launchedBy: "FriendFeed (open-sourced by Facebook)", ownership: "company", license: "Apache-2.0",
    parents: ["python"], pip: "tornado",
    tutorial: `import tornado.web, tornado.ioloop\n\nclass Main(tornado.web.RequestHandler):\n    def get(self):\n        self.write("Hello Tornado")\n\napp = tornado.web.Application([("/", Main)])\napp.listen(8888)\ntornado.ioloop.IOLoop.current().start()`,
    functions: ["`RequestHandler.get/post`", "`Application(routes)`", "`WebSocketHandler`", "`IOLoop.current()`"],
    links: [pypi("tornado"), gh("tornadoweb/tornado"), docs("https://www.tornadoweb.org")]
  },
  {
    slug: "gunicorn", name: "Gunicorn", kind: "package",
    summary: "The battle-tested WSGI HTTP server that runs Flask/Django apps in production.",
    launchedAt: "2010-02-01", launchedBy: "Benoit Chesneau", ownership: "opensource", license: "MIT",
    parents: ["python"], pip: "gunicorn",
    tutorial: `# run a Flask/Django WSGI app with 4 workers\ngunicorn -w 4 -b 0.0.0.0:8000 myapp:app`,
    functions: ["`gunicorn module:app`", "`-w` worker count", "`-k` worker class (sync/gevent/uvicorn)", "`--bind host:port`"],
    links: [pypi("gunicorn"), gh("benoitc/gunicorn"), docs("https://docs.gunicorn.org")]
  },
  {
    slug: "starlette", name: "Starlette", kind: "framework",
    summary: "The lightweight ASGI toolkit FastAPI stands on: routing, middleware, websockets, background tasks.",
    launchedAt: "2018-06-25", launchedBy: "Tom Christie (Encode)", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["asyncio"], pip: "starlette",
    tutorial: `from starlette.applications import Starlette\nfrom starlette.responses import JSONResponse\nfrom starlette.routing import Route\n\nasync def home(request):\n    return JSONResponse({"hello": "starlette"})\n\napp = Starlette(routes=[Route("/", home)])`,
    functions: ["`Route` / `Mount`", "`JSONResponse` / `StreamingResponse`", "middleware stack", "`WebSocketRoute`"],
    links: [pypi("starlette"), gh("encode/starlette"), docs("https://www.starlette.io")]
  },
  {
    slug: "uvicorn", name: "Uvicorn", kind: "package",
    summary: "The lightning-fast ASGI server (uvloop + httptools) that serves FastAPI and Starlette apps.",
    launchedAt: "2017-05-01", launchedBy: "Tom Christie (Encode)", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["asyncio"], pip: "uvicorn",
    tutorial: `# serve an ASGI app\nuvicorn main:app --reload\n# or programmatically\n# uvicorn.run("main:app", port=8000)`,
    functions: ["`uvicorn main:app`", "`--reload` for dev", "`--workers N`", "`uvicorn.run(...)`"],
    links: [pypi("uvicorn"), gh("encode/uvicorn"), docs("https://www.uvicorn.org")]
  },
  {
    slug: "pydantic", name: "Pydantic", kind: "library",
    summary: "Data validation from type hints — the model layer behind FastAPI, now Rust-fast in v2.",
    launchedAt: "2017-05-03", launchedBy: "Samuel Colvin", ownership: "opensource", license: "MIT",
    parents: ["python"], pip: "pydantic",
    milestones: [{ date: "2023-06-30", label: "v2 with Rust core (pydantic-core)" }],
    tutorial: `from pydantic import BaseModel\n\nclass User(BaseModel):\n    id: int\n    name: str = "anon"\n\nu = User(id="7")  # coerced to int\nprint(u.model_dump())`,
    functions: ["`BaseModel`", "`model_validate(data)`", "`model_dump()` / `model_dump_json()`", "`Field(...)` constraints"],
    links: [pypi("pydantic"), gh("pydantic/pydantic"), docs("https://docs.pydantic.dev")]
  },
  {
    slug: "aiohttp", name: "aiohttp", kind: "library",
    summary: "Async HTTP client AND server on asyncio — the workhorse of async crawling and services.",
    launchedAt: "2013-10-01", launchedBy: "Andrew Svetlov and aio-libs", ownership: "opensource", license: "Apache-2.0",
    parents: ["asyncio"], pip: "aiohttp",
    tutorial: `import aiohttp, asyncio\n\nasync def main():\n    async with aiohttp.ClientSession() as s:\n        async with s.get("https://httpbin.org/get") as r:\n            print(r.status)\n\nasyncio.run(main())`,
    functions: ["`ClientSession()`", "`session.get/post(url)`", "`web.Application()` server", "websocket client+server"],
    links: [pypi("aiohttp"), gh("aio-libs/aiohttp"), docs("https://docs.aiohttp.org")]
  },
  {
    slug: "httpx", name: "HTTPX", kind: "library",
    summary: "The requests API, but with async support and HTTP/2 — the modern client for both worlds.",
    launchedAt: "2019-06-20", launchedBy: "Tom Christie (Encode)", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["requests", "asyncio"], pip: "httpx",
    tutorial: `import httpx\n\nr = httpx.get("https://api.github.com")\nprint(r.status_code)\n\n# async:\n# async with httpx.AsyncClient() as c:\n#     r = await c.get(url)`,
    functions: ["`httpx.get/post(url)`", "`AsyncClient()`", "HTTP/2 via `http2=True`", "`r.json()` / `r.raise_for_status()`"],
    links: [pypi("httpx"), gh("encode/httpx"), docs("https://www.python-httpx.org")]
  },
  {
    slug: "scrapy", name: "Scrapy", kind: "framework",
    summary: "The industrial web-crawling framework: spiders, pipelines, throttling, built on Twisted.",
    launchedAt: "2008-06-01", launchedBy: "Insophia / Scrapinghub (now Zyte)", ownership: "company", license: "BSD-3-Clause",
    parents: ["twisted"], pip: "scrapy",
    tutorial: `import scrapy\n\nclass QuotesSpider(scrapy.Spider):\n    name = "quotes"\n    start_urls = ["https://quotes.toscrape.com"]\n\n    def parse(self, response):\n        for q in response.css("span.text::text"):\n            yield {"quote": q.get()}\n\n# run: scrapy runspider spider.py -o out.json`,
    functions: ["`scrapy.Spider` + `parse()`", "`response.css()` / `.xpath()`", "item pipelines", "`scrapy shell <url>`"],
    links: [pypi("scrapy"), gh("scrapy/scrapy"), docs("https://docs.scrapy.org")]
  },
  // ---------- scientific stack ----------
  {
    slug: "pandas", name: "pandas", kind: "package",
    summary: "DataFrames for Python: the tool an entire generation of data analysis is written in.",
    launchedAt: "2008-01-01", launchedBy: "Wes McKinney (at AQR Capital)", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["numpy"], pip: "pandas",
    milestones: [{ date: "2008-01-01", label: "Development starts at AQR" }, { date: "2009-12-01", label: "Open-sourced" }, { date: "2020-01-29", label: "1.0 release" }],
    tutorial: `import pandas as pd\n\ndf = pd.DataFrame({"lang": ["py", "js"], "year": [1991, 1995]})\nprint(df[df.year < 1995])\nprint(df.describe())`,
    functions: ["`pd.DataFrame` / `pd.Series`", "`pd.read_csv(path)`", "`df.groupby(col).agg(...)`", "`df.merge(other, on=...)`"],
    links: [pypi("pandas"), gh("pandas-dev/pandas"), docs("https://pandas.pydata.org/docs/")]
  },
  {
    slug: "matplotlib", name: "Matplotlib", kind: "package",
    summary: "The grandfather of Python plotting — every chart type, publication quality, since 2003.",
    launchedAt: "2003-05-01", launchedBy: "John D. Hunter", ownership: "opensource", license: "matplotlib License (BSD-style)",
    parents: ["numpy"], pip: "matplotlib",
    tutorial: `import matplotlib.pyplot as plt\n\nplt.plot([1, 2, 3], [1, 4, 9], marker="o")\nplt.title("growth")\nplt.savefig("growth.png")`,
    functions: ["`plt.plot` / `plt.scatter` / `plt.bar`", "`plt.subplots(rows, cols)`", "`ax.set_xlabel/ylabel`", "`plt.savefig(path)`"],
    links: [pypi("matplotlib"), gh("matplotlib/matplotlib"), docs("https://matplotlib.org/stable/")]
  },
  {
    slug: "sympy", name: "SymPy", kind: "package",
    summary: "Symbolic mathematics in pure Python: algebra, calculus, equation solving — a CAS in a pip install.",
    launchedAt: "2007-03-01", launchedBy: "Ondřej Čertík", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["math"], pip: "sympy",
    tutorial: `import sympy as sp\n\nx = sp.symbols("x")\nprint(sp.diff(sp.sin(x) * x**2, x))\nprint(sp.solve(x**2 - 4, x))  # [-2, 2]`,
    functions: ["`sp.symbols(...)`", "`sp.diff` / `sp.integrate`", "`sp.solve(eq, x)`", "`sp.simplify(expr)`"],
    links: [pypi("sympy"), gh("sympy/sympy"), docs("https://docs.sympy.org")]
  },
  {
    slug: "scikit-learn", name: "scikit-learn", kind: "package",
    summary: "Classical machine learning with one consistent API: fit, predict, score.",
    launchedAt: "2010-02-01", launchedBy: "David Cournapeau (2007 GSoC), INRIA team", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["numpy", "scipy"], pip: "scikit-learn",
    milestones: [{ date: "2007-06-01", label: "Started as a Google Summer of Code project" }, { date: "2010-02-01", label: "First public release (v0.1)" }],
    tutorial: `from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\nclf = RandomForestClassifier().fit(X, y)\nprint(clf.predict(X[:3]))`,
    functions: ["`model.fit(X, y)` / `.predict(X)`", "`train_test_split(...)`", "`Pipeline([...])`", "`cross_val_score(model, X, y)`"],
    links: [pypi("scikit-learn"), gh("scikit-learn/scikit-learn"), docs("https://scikit-learn.org")]
  },
  {
    slug: "statsmodels", name: "statsmodels", kind: "package",
    summary: "Statistical modeling with the rigor of R: regressions, time series, hypothesis tests.",
    launchedAt: "2009-01-01", launchedBy: "Skipper Seabold, Josef Perktold", ownership: "opensource", license: "BSD-3-Clause",
    parents: ["numpy", "scipy"], pip: "statsmodels",
    tutorial: `import statsmodels.api as sm\nimport numpy as np\n\nx = np.arange(10); y = 2 * x + 1 + np.random.randn(10)\nmodel = sm.OLS(y, sm.add_constant(x)).fit()\nprint(model.summary())`,
    functions: ["`sm.OLS(y, X).fit()`", "`model.summary()`", "`sm.tsa.ARIMA(...)`", "`sm.stats` test suite"],
    links: [pypi("statsmodels"), gh("statsmodels/statsmodels"), docs("https://www.statsmodels.org")]
  },
  {
    slug: "seaborn", name: "seaborn", kind: "library",
    summary: "Statistical plotting on top of Matplotlib — beautiful defaults, dataframe-aware.",
    launchedAt: "2012-06-01", launchedBy: "Michael Waskom", ownership: "individual", license: "BSD-3-Clause",
    parents: ["matplotlib", "pandas"], pip: "seaborn",
    tutorial: `import seaborn as sns\n\ntips = sns.load_dataset("tips")\nsns.scatterplot(data=tips, x="total_bill", y="tip", hue="day")`,
    functions: ["`sns.scatterplot` / `lineplot`", "`sns.histplot` / `kdeplot`", "`sns.heatmap(corr)`", "`sns.pairplot(df)`"],
    links: [pypi("seaborn"), gh("mwaskom/seaborn"), docs("https://seaborn.pydata.org")]
  },
  {
    slug: "jupyter", name: "Project Jupyter", kind: "framework",
    summary: "Notebooks: code, prose and plots in one shareable document — spun out of IPython in 2015.",
    launchedAt: "2015-07-01", launchedBy: "Fernando Pérez, Brian Granger", ownership: "foundation", license: "BSD-3-Clause",
    parents: ["ipython"], pip: "jupyterlab",
    tutorial: `# install and launch\npip install jupyterlab\njupyter lab\n# then create a notebook and run cells with Shift+Enter`,
    functions: ["notebook cells (code/markdown)", "`jupyter lab` / `jupyter notebook`", "kernels for many languages", "`.ipynb` sharing"],
    links: [pypi("jupyterlab"), gh("jupyterlab/jupyterlab"), { kind: "forum", label: "Jupyter Discourse", url: "https://discourse.jupyter.org" }, docs("https://docs.jupyter.org")]
  },
  {
    slug: "polars", name: "Polars", kind: "package",
    summary: "The Rust-powered DataFrame library: lazy execution, multicore by default, often 10x pandas.",
    launchedAt: "2020-03-01", launchedBy: "Ritchie Vink", ownership: "opensource", license: "MIT",
    parents: ["python"], pip: "polars",
    tutorial: `import polars as pl\n\ndf = pl.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "x"]})\nprint(df.group_by("b").agg(pl.col("a").sum()))`,
    functions: ["`pl.DataFrame` / `pl.LazyFrame`", "`pl.scan_csv(path)` (lazy)", "`df.group_by(...).agg(...)`", "`pl.col(...)` expressions"],
    links: [pypi("polars"), gh("pola-rs/polars"), { kind: "discord", label: "Discord", url: "https://discord.gg/4UfP5cfBE7" }, docs("https://docs.pola.rs")]
  },
  // ---------- machine learning / AI ----------
  {
    slug: "tensorflow", name: "TensorFlow", kind: "framework",
    summary: "Google's end-to-end deep learning platform, from research to phones to TPUs.",
    launchedAt: "2015-11-09", launchedBy: "Google Brain", ownership: "company", license: "Apache-2.0",
    parents: ["numpy"], pip: "tensorflow",
    milestones: [{ date: "2015-11-09", label: "Open-sourced" }, { date: "2019-09-30", label: "TensorFlow 2.0 (eager by default)" }],
    tutorial: `import tensorflow as tf\n\nx = tf.constant([[1.0, 2.0]])\nlayer = tf.keras.layers.Dense(3)\nprint(layer(x))`,
    functions: ["`tf.constant` / `tf.Variable`", "`tf.keras.Model` / `Sequential`", "`model.compile/fit/predict`", "`tf.GradientTape()`"],
    links: [pypi("tensorflow"), gh("tensorflow/tensorflow"), { kind: "forum", label: "TF Forum", url: "https://discuss.tensorflow.org" }, docs("https://www.tensorflow.org")]
  },
  {
    slug: "pytorch", name: "PyTorch", kind: "framework",
    summary: "The deep learning framework research fell in love with: dynamic graphs, plain Python feel.",
    launchedAt: "2016-09-01", launchedBy: "Meta AI (FAIR), Soumith Chintala et al.", ownership: "foundation", license: "BSD-3-Clause",
    parents: ["numpy"], pip: "torch",
    milestones: [{ date: "2016-09-01", label: "Initial release" }, { date: "2022-09-12", label: "Moved to the PyTorch Foundation" }, { date: "2023-03-15", label: "PyTorch 2.0 (torch.compile)" }],
    tutorial: `import torch\n\nx = torch.randn(2, 3, requires_grad=True)\ny = (x ** 2).sum()\ny.backward()\nprint(x.grad)`,
    functions: ["`torch.tensor` / `randn`", "`nn.Module` + `forward()`", "`loss.backward()` autograd", "`torch.compile(model)`"],
    links: [pypi("torch"), gh("pytorch/pytorch"), { kind: "forum", label: "PyTorch Forums", url: "https://discuss.pytorch.org" }, docs("https://pytorch.org/docs/")]
  },
  {
    slug: "keras", name: "Keras", kind: "framework",
    summary: "Deep learning for humans — the high-level API that made neural nets approachable.",
    launchedAt: "2015-03-27", launchedBy: "François Chollet", ownership: "company", license: "Apache-2.0",
    parents: ["tensorflow"], pip: "keras",
    milestones: [{ date: "2023-11-28", label: "Keras 3: multi-backend (TF / JAX / PyTorch)" }],
    tutorial: `import keras\n\nmodel = keras.Sequential([\n    keras.layers.Dense(8, activation="relu"),\n    keras.layers.Dense(1)\n])\nmodel.compile(optimizer="adam", loss="mse")`,
    functions: ["`keras.Sequential([...])`", "`model.compile(...)`", "`model.fit(X, y, epochs=n)`", "`keras.layers.*`"],
    links: [pypi("keras"), gh("keras-team/keras"), docs("https://keras.io")]
  },
  {
    slug: "transformers", name: "🤗 Transformers", kind: "library",
    summary: "Hugging Face's library of pretrained models — the standard interface to the LLM era.",
    launchedAt: "2018-11-17", launchedBy: "Hugging Face", ownership: "company", license: "Apache-2.0",
    parents: ["pytorch", "tensorflow"], pip: "transformers",
    milestones: [{ date: "2018-11-17", label: "First release (as pytorch-pretrained-bert)" }],
    tutorial: `from transformers import pipeline\n\nclf = pipeline("sentiment-analysis")\nprint(clf("PythonTree is wonderful!"))`,
    functions: ["`pipeline(task)`", "`AutoModel.from_pretrained(id)`", "`AutoTokenizer.from_pretrained(id)`", "`Trainer` API"],
    links: [pypi("transformers"), gh("huggingface/transformers"), { kind: "discord", label: "HF Discord", url: "https://discord.gg/hugging-face-879548962464493619" }, docs("https://huggingface.co/docs/transformers")]
  },
  {
    slug: "xgboost", name: "XGBoost", kind: "library",
    summary: "Gradient-boosted trees that dominated a decade of Kaggle — fast, regularized, distributed.",
    launchedAt: "2014-03-27", launchedBy: "Tianqi Chen (DMLC)", ownership: "opensource", license: "Apache-2.0",
    parents: ["numpy"], pip: "xgboost",
    tutorial: `import xgboost as xgb\nfrom sklearn.datasets import load_iris\n\nX, y = load_iris(return_X_y=True)\nmodel = xgb.XGBClassifier(n_estimators=50).fit(X, y)\nprint(model.predict(X[:3]))`,
    functions: ["`XGBClassifier` / `XGBRegressor`", "`model.fit(X, y)`", "`xgb.DMatrix(data)`", "early stopping + eval sets"],
    links: [pypi("xgboost"), gh("dmlc/xgboost"), docs("https://xgboost.readthedocs.io")]
  }
];

function toInput(s: Spec): NodeInput {
  const install =
    s.pip === null
      ? "## Install\n\nNothing to install — ships with Python."
      : `## Install\n\n\`\`\`sh\npip install ${s.pip ?? s.slug}\n\`\`\``;
  return {
    slug: s.slug,
    name: s.name,
    kind: s.kind,
    summary: s.summary,
    launchedAt: s.launchedAt,
    launchedBy: s.launchedBy,
    ownership: s.ownership,
    license: s.license,
    milestones: s.milestones ?? [],
    installGuide: install,
    tutorial: "## Quick start\n\n```python\n" + s.tutorial + "\n```",
    commonFunctions: "## Often used\n\n" + s.functions.map(f => `- ${f}`).join("\n"),
    parentSlugs: s.parents,
    links: s.links
  };
}

async function main() {
  let added = 0;
  for (const s of specs) {
    const existing = await db.query.nodes.findFirst({ where: eq(schema.nodes.slug, s.slug) });
    if (existing) {
      console.log(`  skip ${s.slug} (exists)`);
      continue;
    }
    const row = await createNode(toInput(s));
    await setStatus(row.id, "published");
    console.log(`  published ${s.slug}`);
    added++;
  }

  // FastAPI's real lineage: it stands on Starlette and Pydantic. Keep the
  // original `requests` parent from the first seed, add the true ones.
  const fastapi = await db.query.nodes.findFirst({ where: eq(schema.nodes.slug, "fastapi") });
  if (fastapi) {
    await updateNode(fastapi.id, { parentSlugs: ["requests", "starlette", "pydantic"] });
    console.log("  updated fastapi parents -> requests, starlette, pydantic");
  }
  // Flask's real lineage: Werkzeug + Jinja.
  const flask = await db.query.nodes.findFirst({ where: eq(schema.nodes.slug, "flask") });
  if (flask) {
    await updateNode(flask.id, { parentSlugs: ["requests", "werkzeug", "jinja2"] });
    console.log("  updated flask parents -> requests, werkzeug, jinja2");
  }

  console.log(`Done: ${added} new nodes published.`);
}

main().then(() => process.exit(0));
