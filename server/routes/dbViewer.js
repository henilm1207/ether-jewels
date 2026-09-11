const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

async function collections() {
  const cols = await mongoose.connection.db.listCollections().toArray();
  const out = [];
  for (const c of cols.map((x) => x.name).sort()) {
    out.push({ name: c, count: await mongoose.connection.db.collection(c).countDocuments() });
  }
  return out;
}

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Etherstar DB</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;max-width:1000px;margin:24px auto;padding:0 16px;color:#222}
a{color:#7a2e3f}table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border:1px solid #e5e5e5;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#f7f2ef}pre{background:#fafafa;border:1px solid #eee;padding:12px;overflow:auto;font-size:12px}
.pill{display:inline-block;background:#37181d;color:#fff;border-radius:10px;padding:1px 10px;font-size:12px}</style>
</head><body><p><a href="/admin/db">← all collections</a></p>${body}</body></html>`;

// GET /admin/db — collection overview
router.get('/', async (_req, res) => {
  try {
    const cols = await collections();
    const rows = cols
      .map((c) => `<tr><td><a href="/admin/db/${c.name}">${c.name}</a></td><td>${c.count}</td></tr>`)
      .join('');
    res.send(
      page(
        'Database',
        `<h1>Etherstar DB <span class="pill">${mongoose.connection.name}</span></h1>
        <p>Read-only viewer · dev only · <a href="/api/health">api health</a></p>
        <table><tr><th>collection</th><th>documents</th></tr>${rows}</table>`
      )
    );
  } catch (e) {
    res.status(500).send(page('Error', `<pre>${esc(e.message)}</pre>`));
  }
});

// GET /admin/db/:collection?page=&limit= — browse documents
router.get('/:name', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const pg = Math.max(1, parseInt(req.query.page || '1', 10));
    const col = mongoose.connection.db.collection(req.params.name);
    const [docs, total] = await Promise.all([
      col.find({}).skip((pg - 1) * limit).limit(limit).toArray(),
      col.countDocuments(),
    ]);
    const pages = Math.max(1, Math.ceil(total / limit));
    const nav =
      `<p>Page ${pg} of ${pages} · ${total} docs ` +
      (pg > 1 ? `<a href="?page=${pg - 1}&limit=${limit}">← prev</a> ` : '') +
      (pg < pages ? `<a href="?page=${pg + 1}&limit=${limit}">next →</a>` : '') + '</p>';
    const body = docs.map((d) => `<pre>${esc(JSON.stringify(d, null, 2))}</pre>`).join('') || '<p>Empty.</p>';
    res.send(page(req.params.name, `<h1>${esc(req.params.name)}</h1>${nav}${body}${nav}`));
  } catch (e) {
    res.status(404).send(page('Not found', `<pre>${esc(e.message)}</pre>`));
  }
});

module.exports = router;
