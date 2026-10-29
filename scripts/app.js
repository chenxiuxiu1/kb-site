/* kb-agent 学习路径 · 路由 / 渲染 / 进度 */
(function () {
  "use strict";

  var DATA = window.CURRICULUM;
  var KB = window.KNOWLEDGE;
  var LINKS = window.LINKS || [];
  var CAREER = window.CAREER || null;
  var LOG = window.PROGRESS || null;
  var KEY = "kb-agent-progress-v2";
  var COEF = 1.6;        // 步骤估时只算敲代码；读文档、踩坑、返工按这个系数补
  var VIEWS = ["roadmap", "pano", "log", "concepts", "rules", "career"];

  var totalSteps = DATA.phases.reduce(function (n, p) { return n + p.steps.length; }, 0);

  /* ---------------- 小工具 ---------------- */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // 支持 `code` 与 **加粗**
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  function byId(id) {
    for (var i = 0; i < DATA.phases.length; i++) {
      if (DATA.phases[i].id === id) return DATA.phases[i];
    }
    return null;
  }

  function phaseOf(stepId) {
    for (var i = 0; i < DATA.phases.length; i++) {
      var steps = DATA.phases[i].steps;
      for (var j = 0; j < steps.length; j++) {
        if (steps[j].id === stepId) return DATA.phases[i];
      }
    }
    return null;
  }

  function findStep(id) {
    var p = phaseOf(id);
    if (!p) return null;
    for (var i = 0; i < p.steps.length; i++) if (p.steps[i].id === id) return p.steps[i];
    return null;
  }

  /* ---------------- 进度存取 ---------------- */

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { done: {}, start: "", pace: 12 };
      var o = JSON.parse(raw);
      return { done: o.done || {}, start: o.start || "", pace: +o.pace || 12 };
    } catch (e) {
      return { done: {}, start: "", pace: 12 };
    }
  }

  var state = load();
  var query = "";   // 步骤搜索词

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  /* ---------------- 时间模型 ---------------- */

  function rawHours(p) {
    return p.steps.reduce(function (n, s) { return n + s.time; }, 0);
  }

  function planHours(p) { return rawHours(p) * COEF; }

  function pace() { return state.pace || 12; }

  // 阶段周次按累计工时切、首尾相接，改每周投入就整体重排
  function weekRanges() {
    var acc = 0, prevEnd = 0, out = {};
    DATA.phases.forEach(function (p) {
      acc += planHours(p);
      var end = Math.max(prevEnd + 1, Math.ceil(acc / pace()));
      out[p.id] = { start: prevEnd + 1, end: end };
      prevEnd = end;
    });
    return out;
  }

  function weeksText(r) {
    return r.start === r.end ? "第 " + r.start + " 周" : "第 " + r.start + "–" + r.end + " 周";
  }

  function totalWeeks() {
    var r = weekRanges();
    return r[DATA.phases[DATA.phases.length - 1].id].end;
  }

  /* ---------------- 实测记录 ---------------- */

  var IDX = {};   // step id → { ref, title }
  DATA.phases.forEach(function (p) {
    p.steps.forEach(function (s, i) { IDX[s.id] = { ref: p.no + "." + pad(i + 1), title: s.title }; });
  });

  var DONE_LOG = {};
  if (LOG) {
    LOG.milestones.forEach(function (m) {
      m.step.split("/").forEach(function (id) { DONE_LOG[id] = m; });
    });
  }

  /* 概念 ↔ 步骤 双向索引：概念卡要有锚点 id，步骤也要知道涉及哪几个概念 */
  var KB_TERM = {};
  var STEP_TERMS = {};
  if (KB) {
    KB.layers.forEach(function (l) {
      l.concepts.forEach(function (c, j) {
        KB_TERM[c.term] = { id: "c-" + l.id + "-" + (j + 1), layer: l.id };
        if (c.step) {
          if (!STEP_TERMS[c.step]) STEP_TERMS[c.step] = [];
          STEP_TERMS[c.step].push(c.term);
        }
      });
    });
  }

  function logBlockHTML(m) {
    var h = [];
    h.push('<div class="evi">');
    h.push('<p class="evi__head"><b>本机实测</b>' +
      (m.date ? "<span>" + esc(m.date) + "</span>" : "") +
      (m.commitUrl ? '<a href="' + esc(m.commitUrl) + '" target="_blank" rel="noopener">' + esc(m.commit) + " ↗</a>" : "") +
      "</p>");
    h.push('<ul class="evi__list">' +
      m.evidence.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + "</ul>");
    if (m.pitfalls && m.pitfalls.length) {
      h.push('<details class="evi__pit"><summary>踩过的 ' + m.pitfalls.length + " 个坑</summary><ul>" +
        m.pitfalls.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + "</ul></details>");
    }
    h.push("</div>");
    return h.join("");
  }

  /* ---------------- 渲染：单个步骤 ---------------- */

  function stepHTML(step, idx, ref) {
    var h = [];
    var terms = STEP_TERMS[step.id] || [];

    h.push('<li class="step" id="' + step.id + '" data-step="' + step.id + '">');
    h.push('<div class="step__row">');

    h.push('<button class="step__btn" type="button" aria-expanded="false" aria-controls="body-' + step.id + '">');
    h.push('<span class="step__no">' + (ref || pad(idx + 1)) + "</span>");
    h.push('<span class="step__main">');
    h.push('<span class="step__title">' + inline(step.title) +
      (DONE_LOG[step.id] ? '<span class="tag">已实测</span>' : "") + "</span>");
    h.push('<span class="step__brief">' + inline(step.brief) + "</span>");
    h.push("</span></button>");

    h.push('<span class="step__meta">');
    h.push('<span class="step__time">' + step.time + " 小时</span>");
    h.push('<svg class="step__chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>');
    h.push("</span>");

    h.push('<label class="step__check"><input type="checkbox" data-check="' + step.id +
      '" aria-label="标记完成：' + esc(step.title) + '"></label>');

    h.push("</div>");

    /* 展开体 */
    h.push('<div class="step__body" id="body-' + step.id + '">');

    h.push('<span class="k">动手做</span>');
    h.push('<ul class="do">');
    (step.do || []).forEach(function (item) { h.push("<li>" + inline(item) + "</li>"); });
    h.push("</ul>");

    if (step.code) {
      h.push('<div class="code">');
      h.push('<div class="code__head"><span class="code__file">' + esc(step.code.file) + "</span>" +
        '<button class="code__copy" type="button" data-copy="' + step.id + '">复制</button></div>');
      h.push("<pre><code>" + esc(step.code.body) + "</code></pre>");
      h.push("</div>");
    }

    if (step.learn && step.learn.length) {
      h.push('<span class="k">这一步要懂的</span>');
      h.push('<ul class="learn">');
      step.learn.forEach(function (item) { h.push("<li>" + inline(item) + "</li>"); });
      h.push("</ul>");
    }

    if (step.refs && step.refs.length) {
      h.push('<span class="k">卡住就看这些</span>');
      h.push('<div class="refs">');
      step.refs.forEach(function (r) {
        h.push('<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' +
          '<span class="refs__name">' + esc(r.name) + "</span>" +
          (r.where ? '<span class="refs__where">' + esc(r.where) + "</span>" : "") +
          "</a>");
      });
      h.push("</div>");
    }

    h.push('<p class="done"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8.5l3.5 3.5 7.5-8"/></svg>' +
      "<span><b>做完的标准</b><i>：</i>" + inline(step.done) + "</span></p>");

    if (terms.length) {
      h.push('<div class="step__kb"><span class="step__kb-k">涉及概念</span>' +
        terms.map(function (t) {
          return '<a class="chip" href="#/concepts" data-term="' + esc(t) + '">' + esc(t) + "</a>";
        }).join("") + "</div>");
    }

    if (DONE_LOG[step.id]) h.push(logBlockHTML(DONE_LOG[step.id]));

    h.push("</div></li>");
    return h.join("");
  }
  /* ---------------- 渲染：阶段轨 ---------------- */

  function counts() {
    var out = {};
    DATA.phases.forEach(function (p) {
      out[p.id] = p.steps.filter(function (s) { return state.done[s.id]; }).length;
    });
    return out;
  }

  function renderRail() {
    var c = counts();
    var mount = document.getElementById("rail");
    if (!mount) return;
    mount.innerHTML = DATA.phases.map(function (p) {
      var n = c[p.id];
      var full = n === p.steps.length;
      var pct = p.steps.length ? (n / p.steps.length) * 100 : 0;
      return '<li>' +
        '<a href="#/roadmap/' + p.id + '" data-phase-link="' + p.id + '"' +
        ' class="' + (p.id === curPhase ? "is-on" : "") + (full ? " is-full" : "") + '"' +
        (p.id === curPhase ? ' aria-current="true"' : "") + '>' +
        '<span class="rail__no">' + p.no + "</span>" +
        '<span class="rail__text">' +
          "<b>" + esc(p.title) + "</b>" +
          '<em><span class="rail__n">' + n + "/" + p.steps.length + "</span>" + (full ? " 已完" : " 步") + "</em>" +
          '<span class="rail__bar"><i style="width:' + pct + '%"></i></span>' +
        "</span>" +
        (full ? '<span class="rail__tick" aria-label="完成">✓</span>' : "") +
        "</a></li>";
    }).join("");
  }

  /* ---------------- 渲染：页头（标题 + 最新资料） ---------------- */

  // 「下一步」与「继续学习」共用：第一个未完成的步骤
  function nextStep() {
    for (var i = 0; i < DATA.phases.length; i++) {
      var p = DATA.phases[i];
      for (var j = 0; j < p.steps.length; j++) {
        if (!state.done[p.steps[j].id]) return { phase: p, step: p.steps[j] };
      }
    }
    return null;
  }

  function renderHead() {
    setText("headSteps", totalSteps);
    setText("headConcepts", kbCount());

    var nx = nextStep();
    var link = document.getElementById("headNext");
    if (link) {
      if (nx) {
        link.setAttribute("href", "#/roadmap/" + nx.phase.id + "/" + nx.step.id);
        link.innerHTML = "<b>" + esc(IDX[nx.step.id].ref) + "</b>" +
          esc(nx.step.title.replace(/^第\s*\d+\s*步[：:]\s*/, ""));
      } else {
        link.setAttribute("href", "#/rules");
        link.textContent = "全部完成，去看执行规则";
      }
    }

    var mount = document.getElementById("headRefs");
    if (mount) {
      // 页头只放 hot 的几条（多了会把页头撑高），其余在求职页资料库里
      var hot = LINKS.filter(function (x) { return x.hot; });
      if (!hot.length) hot = LINKS.slice(0, 6);
      mount.innerHTML = hot.map(function (x) {
        return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener" title="' +
          esc(x.note || "") + '"><span class="head__ref-p">' + esc(x.tag || "") +
          '</span><span class="head__ref-t">' + esc(x.name) + "</span></a></li>";
      }).join("");
      setText("headRefsAll", "全部 " + LINKS.length + " 条资料");
    }

    if (LOG) {
      setText("headRefsAt", String(LOG.generatedAt).slice(0, 10));
      setText("headTested", LOG.stats.steps);
    }
  }

  /* ---------------- 渲染：阶段 + 步骤 ---------------- */

  function phaseHeadHTML(p) {
    var i = DATA.phases.indexOf(p);
    var r = weekRanges()[p.id];
    var c = counts()[p.id];
    var prev = DATA.phases[i - 1];
    var next = DATA.phases[i + 1];
    var h = [];

    h.push('<div class="ph__nav">');
    h.push('<a class="ph__arrow' + (prev ? "" : " is-off") + '" ' +
      (prev ? 'href="#/roadmap/' + prev.id + '" data-phase-link="' + prev.id + '" aria-label="上一阶段"'
        : 'aria-disabled="true" aria-label="上一阶段"') + ">‹</a>");
    h.push('<span class="ph__pos">' + p.no + " / " + pad(DATA.phases.length) + "</span>");
    h.push('<a class="ph__arrow' + (next ? "" : " is-off") + '" ' +
      (next ? 'href="#/roadmap/' + next.id + '" data-phase-link="' + next.id + '" aria-label="下一阶段"'
        : 'aria-disabled="true" aria-label="下一阶段"') + ">›</a>");
    h.push("</div>");

    h.push('<p class="ph__eyebrow">' + weeksText(r) + " · " + p.steps.length + " 步 / 估时 " + rawHours(p) + " 小时</p>");
    h.push('<h2 class="ph__title">' + esc(p.title) + "</h2>");
    h.push('<p class="ph__goal">' + inline(p.goal) + "</p>");
    h.push('<p class="ph__out"><b>本阶段产出</b>' + esc(p.output) + "</p>");

    h.push('<div class="ph__bar"><div class="pbar"><i style="width:' +
      (p.steps.length ? (c / p.steps.length) * 100 : 0) + '%"></i></div>' +
      "<span>" + c + "/" + p.steps.length + " 完成</span></div>");

    return h.join("");
  }

  function renderSteps() {
    var mount = document.getElementById("steps");
    var meta = document.getElementById("searchMeta");
    var clear = document.getElementById("searchClear");
    if (!mount) return;

    if (clear) clear.hidden = !query;

    if (query) {
      var q = query.toLowerCase();
      var hits = [];
      DATA.phases.forEach(function (p) {
        p.steps.forEach(function (s) {
          var hay = [s.title, s.brief, s.done].concat(s.do || [], s.learn || []).join(" ").toLowerCase();
          if (hay.indexOf(q) >= 0) hits.push({ step: s, phase: p, ref: p.no + "." + pad(p.steps.indexOf(s) + 1) });
        });
      });
      mount.innerHTML = hits.length
        ? hits.map(function (hit) { return stepHTML(hit.step, 0, hit.ref); }).join("")
        : '<li class="empty">没找到「' + esc(query) + "」。换个词试试：CORS、pytest、uv、SSE、token。</li>";
      if (meta) {
        meta.hidden = false;
        meta.textContent = "在 43 步里搜到 " + hits.length + " 条";
      }
      syncChecks();
      return;
    }

    var p = byId(curPhase);
    mount.innerHTML = p.steps.map(function (s, i) { return stepHTML(s, i); }).join("");
    if (meta) meta.hidden = true;
    syncChecks();
  }

  function renderPhase() {
    var p = byId(curPhase) || DATA.phases[0];
    curPhase = p.id;
    var head = document.getElementById("phaseHead");
    if (head) head.innerHTML = phaseHeadHTML(p);
    renderSteps();
  }

  /* ---------------- 渲染：概念地图 ---------------- */

  function kbCount() {
    return KB ? KB.layers.reduce(function (n, l) { return n + l.concepts.length; }, 0) : 0;
  }

  function kbItemHTML(c, idx, layerId) {
    var hit = c.step ? IDX[c.step] : null;
    var h = [];

    h.push('<li class="kb__item" id="c-' + layerId + "-" + (idx + 1) + '">');
    h.push('<p class="kb__term">' + inline(c.term) +
      (c.en ? '<span class="kb__en">' + esc(c.en) + "</span>" : "") +
      '<span class="kb__idx">' + pad(idx + 1) + "</span></p>");
    h.push('<p class="kb__plain">' + inline(c.plain) + "</p>");

    if (c.js) h.push('<p class="kb__line"><b>对标你熟的</b>' + inline(c.js) + "</p>");
    if (c.pit) h.push('<p class="kb__line kb__line--pit"><b>常见误解</b>' + inline(c.pit) + "</p>");
    if (hit) {
      h.push('<a class="kb__step" href="#/roadmap/' + phaseOf(c.step).id + "/" + c.step + '" data-goto="' + c.step + '">' +
        "→ " + hit.ref + " · " + esc(hit.title) + "</a>");
    }

    h.push("</li>");
    return h.join("");
  }

  function kbLayerHTML(l, i, open) {
    var h = [];

    h.push('<div class="kb__layer' + (open ? " is-open" : "") + '" data-layer="' + l.id + '">');
    h.push('<button class="kb__head" type="button" aria-expanded="' + open +
      '" aria-controls="body-' + l.id + '">');
    h.push('<span class="kb__no">' + l.no + "</span>");
    h.push('<span class="kb__titles"><b>' + esc(l.title) + "</b><i>" + esc(l.sub) + "</i></span>");
    h.push('<span class="kb__n">' + l.concepts.length + " 个</span>");
    h.push('<svg class="kb__chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>');
    h.push("</button>");

    h.push('<div class="kb__body" id="body-' + l.id + '">');
    h.push('<p class="kb__note">' + inline(l.note) + "</p>");
    h.push('<ul class="kb__list">');
    l.concepts.forEach(function (c, j) { h.push(kbItemHTML(c, j, l.id)); });
    h.push("</ul></div></div>");
    return h.join("");
  }

  function renderKnowledge(filter) {
    if (!KB) return;
    var mount = document.getElementById("kbLayers");
    if (mount) {
      var q = (filter || "").toLowerCase();
      var layers = KB.layers.map(function (l) {
        if (!q) return l;
        var hit = l.concepts.filter(function (c) {
          return (c.term + " " + (c.en || "") + " " + c.plain + " " + (c.js || "") + " " + (c.pit || ""))
            .toLowerCase().indexOf(q) >= 0;
        });
        return hit.length ? { id: l.id, no: l.no, title: l.title, sub: l.sub, note: l.note, concepts: hit } : null;
      }).filter(Boolean);

      mount.innerHTML = layers.length
        ? layers.map(function (l, i) { return kbLayerHTML(l, i, q ? true : i === 0); }).join("")
        : '<p class="empty">没找到「' + esc(filter) + "」，换个词：RAG、token、SSE。</p>";
    }

    var intro = document.getElementById("kbIntro");
    if (intro) intro.innerHTML = inline(KB.intro);
    var how = document.getElementById("kbHow");
    if (how) how.innerHTML = KB.how.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("");
    setText("kbCount", kbCount());
    setText("tabKb", kbCount());
  }

  /* ---------------- 渲染：实操档案 ---------------- */

  function renderLog() {
    if (!LOG) return;
    var s = LOG.stats;

    setText("tabLog", s.steps + " 步实测");

    var meta = document.getElementById("logMeta");
    if (meta) {
      meta.innerHTML = "数据不是手写的：从 <a href=\"" + esc(LOG.repo.url) + "\" target=\"_blank\" rel=\"noopener\">" +
        esc(LOG.repo.name) + "</a> 的 <code>" + esc(LOG.repo.appPath) + "</code> 目录里读出来——提交数、接口清单、测试数全自动。" +
        "想刷新就跑下 <code>node scripts/sync-progress.mjs</code>。最后同步：<b>" + esc(LOG.generatedAt) + "</b>。";
    }

    var stats = document.getElementById("logStats");
    if (stats) {
      stats.innerHTML = [
        [s.steps, "步", "本机跑通"],
        [s.commits, "次", "提交在册"],
        [s.endpoints, "个", "最外露接口"],
        [s.tests, "个", "测试全绿"],
        [s.modules, "个", "Python 模块"],
      ].map(function (row) {
        return '<div class="ls"><p><b>' + row[0] + "</b><span>" + row[1] + "</span></p><em>" + row[2] + "</em></div>";
      }).join("");
    }

    var eps = document.getElementById("logEps");
    if (eps) {
      eps.innerHTML = LOG.endpoints.map(function (e) {
        return '<span class="ep"><i class="ep--' + e.method.toLowerCase() + '">' + e.method + "</i>" + esc(e.path) + "</span>";
      }).join("");
    }

    var list = document.getElementById("logList");
    if (list) {
      list.innerHTML = LOG.milestones.map(function (m) {
        var first = m.step.split("/")[0];
        var hit = IDX[first];
        var ph = phaseOf(first);
        var href = "#/roadmap/" + (ph ? ph.id : DATA.phases[0].id) + "/" + first;
        var h = [];
        h.push('<li class="mile">');
        h.push('<div class="mile__top">');
        h.push('<a class="mile__ref" href="' + href + '" data-goto="' + esc(first) + '">' +
          (hit ? esc(hit.ref) : esc(first)) + "</a>");
        h.push("<h3>" + esc(m.title) + "</h3>");
        h.push('<span class="mile__date">' + esc(m.date || "") + "</span>");
        h.push("</div>");
        h.push('<ul class="mile__evi">' +
          m.evidence.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + "</ul>");
        if (m.pitfalls && m.pitfalls.length) {
          h.push('<details class="mile__pit"><summary>踩过的 ' + m.pitfalls.length + " 个坑</summary><ul>" +
            m.pitfalls.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + "</ul></details>");
        }
        h.push('<p class="mile__foot">' +
          (m.commitUrl ? '<a href="' + esc(m.commitUrl) + '" target="_blank" rel="noopener">commit ' + esc(m.commit) + " ↗</a>" : "<span>尚未提交</span>") +
          '<a href="' + href + '" data-goto="' + esc(first) + '" class="mile__open">去这一步 →</a></p>');
        h.push("</li>");
        return h.join("");
      }).join("");
    }

    var commits = document.getElementById("logCommits");
    if (commits) {
      commits.innerHTML = LOG.commits.map(function (c) {
        return '<li><a href="' + esc(c.url) + '" target="_blank" rel="noopener">' +
          '<span class="cl__hash">' + esc(c.hash) + "</span>" +
          '<span class="cl__sub">' + esc(c.subject) + "</span>" +
          '<span class="cl__date">' + esc(c.date) + "</span></a></li>";
      }).join("");
    }
  }

  function renderRules() {
    var mount = document.getElementById("rulesGrid");
    if (!mount) return;
    mount.innerHTML = DATA.rules.map(function (r) {
      return "<div><h3>" + esc(r.title) + "</h3><ul>" +
        r.items.map(function (i) { return "<li>" + inline(i) + "</li>"; }).join("") +
        "</ul></div>";
    }).join("");
  }

  /* ---------------- 渲染：全景 ---------------- */

  function renderPano() {
    var flow = document.getElementById("flowVersions");
    if (flow) {
      flow.innerHTML = DATA.phases.map(function (p, i) {
        var out = String(p.output).replace(/^v\d+\s*·\s*/, "");
        return '<div class="flow__node">' +
          "<b>v" + i + "</b>" +
          "<i>" + p.no + " · " + esc(p.title) + "</i>" +
          "<em>" + esc(out) + "</em>" +
          "<span class=\"flow__meta\">" + p.steps.length + " 步 / " + rawHours(p) + " 小时</span>" +
          "</div>";
      }).join("");
    }

    var table = document.getElementById("panoTable");
    if (table) {
      table.innerHTML = "<thead><tr><th>版本</th><th>阶段</th><th>产出（验收对象）</th><th>步数 / 工时</th></tr></thead><tbody>" +
        DATA.phases.map(function (p, i) {
          var out = String(p.output).replace(/^v\d+\s*·\s*/, "");
          return "<tr><td><b>v" + i + "</b></td><td>" + p.no + " · " + esc(p.title) +
            "</td><td>" + esc(out) + "</td><td>" + p.steps.length + " 步 / " + rawHours(p) + " 小时</td></tr>";
        }).join("") + "</tbody>";
    }
  }

  /* 从步骤里的概念 chip 跳到概念地图的那一条 */
  function openConcept(term) {
    var hit = KB_TERM[term];
    go("concepts");
    if (!hit) return;
    setTimeout(function () {
      var layer = document.querySelector('[data-layer="' + hit.layer + '"]');
      if (layer && !layer.classList.contains("is-open")) {
        layer.classList.add("is-open");
        var head = layer.querySelector(".kb__head");
        if (head) head.setAttribute("aria-expanded", "true");
      }
      var el = document.getElementById(hit.id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("is-flash");
      setTimeout(function () { el.classList.remove("is-flash"); }, 1600);
    }, 90);
  }

  /* ---------------- 进度同步 ---------------- */

  function syncChecks() {
    var boxes = document.querySelectorAll("input[data-check]");
    Array.prototype.forEach.call(boxes, function (box) {
      var id = box.getAttribute("data-check");
      var on = !!state.done[id];
      box.checked = on;
      box.closest(".step").classList.toggle("is-done", on);
    });
  }

  function sync() {
    var c = counts();
    var doneTotal = 0;
    DATA.phases.forEach(function (p) { doneTotal += c[p.id]; });

    var pct = totalSteps ? (doneTotal / totalSteps) * 100 : 0;
    setText("sideDone", doneTotal);
    setText("sideTotal", totalSteps);
    setText("tabCount", doneTotal + "/" + totalSteps);
    setText("topPct", Math.round(pct) + "%");

    var fill = document.getElementById("topFill");
    if (fill) fill.style.width = pct + "%";
    var side = document.getElementById("sideFill");
    if (side) side.style.width = pct + "%";

    renderRail();
    syncChecks();
    renderHead();
  }

  /* ---------------- 日期 ---------------- */

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // 开始日期 + 计划周数 → 完成日
  function etaDate() {
    if (!state.start) state.start = todayISO();
    var parts = state.start.split("-");
    if (parts.length !== 3) return null;
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    d.setDate(d.getDate() + totalWeeks() * 7);
    return d;
  }

  function renderEta() {
    var input = document.getElementById("startDate");
    var eta = document.getElementById("etaDate");
    if (!state.start) state.start = todayISO();
    if (input) input.value = state.start;

    setText("etaWeeks", totalWeeks());

    var d = etaDate();
    if (eta) {
      eta.textContent = d
        ? d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日"
        : "—";
    }
  }

  /* ---------------- 路由 ---------------- */

  var curPhase = DATA.phases[0].id;
  var curStep = null;
  var curView = "roadmap";
  var prevView = null;

  function firstUnfinishedPhase() {
    for (var i = 0; i < DATA.phases.length; i++) {
      var p = DATA.phases[i];
      for (var j = 0; j < p.steps.length; j++) if (!state.done[p.steps[j].id]) return p.id;
    }
    return DATA.phases[0].id;
  }

  function parseHash() {
    var raw = String(location.hash || "").replace(/^#\/?/, "");
    var parts = raw.split("/").filter(Boolean);
    var v = VIEWS.indexOf(parts[0]) >= 0 ? parts[0] : "roadmap";
    var p = byId(parts[1]) ? parts[1] : firstUnfinishedPhase();
    var s = parts[2] || null;
    return { view: v, phase: p, step: s };
  }

  function applyRoute(scrollTop) {
    var r = parseHash();
    curView = r.view;
    curPhase = r.phase;
    curStep = r.step;

    VIEWS.forEach(function (v) {
      var panel = document.getElementById("panel-" + v);
      if (panel) panel.hidden = v !== r.view;
    });

    var tabs = document.querySelectorAll(".tab");
    Array.prototype.forEach.call(tabs, function (a) {
      var on = a.getAttribute("data-view") === r.view;
      a.classList.toggle("is-on", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    // 只在真的换了模块时做一次短淡入，首屏与「展开某一步」不动画
    if (prevView && prevView !== r.view) {
      var active = document.getElementById("panel-" + r.view);
      if (active) {
        active.classList.remove("is-anim");
        void active.offsetWidth;
        active.classList.add("is-anim");
      }
    }
    prevView = r.view;

    if (r.view === "roadmap") {
      renderRail();          // 阶段切了就得重画轨，否则 is-on 停在旧的那一项
      renderPhase();
      if (r.step) focusStep(r.step);
      else if (scrollTop) {
        // 切阶段后停在阶段头，而不是把整页拽回顶部（顶部是标题区，跟当前操作无关）
        var head = document.getElementById("phaseHead");
        if (head) head.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.scrollTo(0, 0);
      }
    } else if (scrollTop) {
      window.scrollTo(0, 0);
    }
  }

  function go(view, phase, step) {
    var h = "#/" + view + (view === "roadmap" && phase ? "/" + phase : "") + (step ? "/" + step : "");
    if (location.hash === h) applyRoute(false);
    else location.hash = h;
  }

  function openStep(li, open) {
    li.classList.toggle("is-open", open);
    var btn = li.querySelector(".step__btn");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function focusStep(stepId) {
    var li = document.getElementById(stepId);
    if (!li) return;
    openStep(li, true);
    setTimeout(function () {
      li.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  /* ---------------- 事件绑定 ---------------- */

  function bindSteps() {
    var mount = document.getElementById("steps");
    if (!mount) return;

    mount.addEventListener("click", function (e) {
      var btn = e.target.closest(".step__btn");
      if (btn) {
        var li = btn.closest(".step");
        openStep(li, !li.classList.contains("is-open"));
        return;
      }
      var copy = e.target.closest(".code__copy");
      if (copy) {
        var step = findStep(copy.getAttribute("data-copy"));
        if (step && step.code) copyText(step.code.body, copy);
      }
    });

    mount.addEventListener("change", function (e) {
      var box = e.target.closest("input[data-check]");
      if (!box) return;
      var id = box.getAttribute("data-check");
      if (box.checked) state.done[id] = true;
      else delete state.done[id];
      save();
      sync();
      if (query) renderSteps();
    });
  }

  function bindNav() {
    // 概念跳转 / 里程碑跳转统一走 hash，先切面板再展开那一步
    document.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-term]");
      if (chip) {
        e.preventDefault();
        openConcept(chip.getAttribute("data-term"));
        return;
      }

      var jump = e.target.closest("[data-goto]");
      if (jump) {
        e.preventDefault();
        var id = jump.getAttribute("data-goto");
        var ph = phaseOf(id);
        if (ph) go("roadmap", ph.id, id);
        return;
      }

      // 求职页小节：只滚屏，不碰路由
      var sec = e.target.closest("[data-jump]");
      if (!sec) return;
      e.preventDefault();
      var box = document.getElementById(sec.getAttribute("data-jump"));
      if (box) box.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    window.addEventListener("hashchange", function () { applyRoute(true); });

    // 概念地图：展开 / 收起
    var kb = document.getElementById("kbLayers");
    if (kb) {
      kb.addEventListener("click", function (e) {
        var head = e.target.closest(".kb__head");
        if (!head) return;
        var layer = head.closest(".kb__layer");
        var open = !layer.classList.contains("is-open");
        layer.classList.toggle("is-open", open);
        head.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  function bindSearch() {
    var box = document.getElementById("search");
    var clear = document.getElementById("searchClear");
    if (box) {
      box.addEventListener("input", function () {
        query = box.value.trim();
        renderSteps();
        if (curStep) { curStep = null; }
      });
      box.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        var first = document.querySelector("#steps .step");
        if (first) openStep(first, true);
      });
    }
    if (clear) {
      clear.addEventListener("click", function () {
        query = "";
        if (box) { box.value = ""; box.focus(); }
        renderSteps();
      });
    }

    var kbBox = document.getElementById("kbSearch");
    if (kbBox) {
      kbBox.addEventListener("input", function () { renderKnowledge(kbBox.value.trim()); });
    }
  }

  function bindKeys() {
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "select" || tag === "textarea";

      if (e.key === "Escape") {
        var box = document.getElementById("search");
        if (box && box.value) { box.value = ""; query = ""; renderSteps(); box.blur(); }
        return;
      }
      if (typing) return;

      if (e.key === "/") {
        e.preventDefault();
        var s = document.getElementById("search");
        if (s) { if (curView !== "roadmap") go("roadmap", curPhase); s.focus(); s.select(); }
        return;
      }
      if (curView !== "roadmap" || query) return;

      var i = DATA.phases.indexOf(byId(curPhase));
      if (e.key === "ArrowLeft" && i > 0) {
        e.preventDefault();
        go("roadmap", DATA.phases[i - 1].id);
      } else if (e.key === "ArrowRight" && i < DATA.phases.length - 1) {
        e.preventDefault();
        go("roadmap", DATA.phases[i + 1].id);
      }
    });
  }

  /* ---------------- 进度导入导出 ---------------- */

  function exportProgress() {
    var payload = {
      site: "kb-agent-roadmap",
      savedAt: new Date().toISOString(),
      done: state.done,
      start: state.start,
      pace: state.pace,
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kb-progress-" + todayISO() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var o = JSON.parse(String(reader.result));
        if (!o || typeof o.done !== "object") throw new Error("格式不对");
        if (!window.confirm("用文件里的进度覆盖当前进度？（已完成 " + Object.keys(o.done).length + " 步）")) return;
        state.done = o.done || {};
        state.start = o.start || state.start;
        state.pace = +o.pace || state.pace;
        save();
        sync();
        renderEta();
        if (curView === "roadmap") renderPhase();
      } catch (err) {
        window.alert("导入失败：不是有效的进度文件。");
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- 继续学习 ---------------- */

  function continueLearning() {
    var nx = nextStep();
    if (!nx) { go("rules"); return; }
    query = "";
    var box = document.getElementById("search");
    if (box) box.value = "";
    go("roadmap", nx.phase.id, nx.step.id);
  }

  /* ---------------- 渲染：起步自测 ---------------- */

  function renderSelfcheck() {
    var el = document.getElementById("selfcheck");
    if (!el || !CAREER) return;

    var h = ['<h3 class="pano__h3"><span>✓</span>起步自测：你该从哪一步开始</h3>',
      '<p class="cb__sub">' + esc(CAREER.selfcheck.intro) + "</p>",
      '<ul class="sc__list">'];
    CAREER.selfcheck.items.forEach(function (it) {
      h.push('<li><label><input type="checkbox" data-sc="' + it.id + '"><span>' + esc(it.q) + "</span></label></li>");
    });
    h.push('</ul><div class="sc__out" id="scOut" aria-live="polite"></div>');
    el.innerHTML = h.join("");

    var out = document.getElementById("scOut");
    function paint() {
      var n = el.querySelectorAll("input[data-sc]:checked").length;
      var hit = null;
      CAREER.selfcheck.results.forEach(function (r) {
        if (n >= r.min && n <= r.max) hit = r;
      });
      if (!hit || !out) return;
      var html = '<p class="sc__t">' + esc(hit.title) + "</p><p>" + inline(hit.body) + "</p>";
      if (hit.links && hit.links.length) {
        html += '<p class="sc__links">' + hit.links.map(function (l) {
          return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.name) + "</a>";
        }).join("") + "</p>";
      }
      out.innerHTML = html;
    }
    el.addEventListener("change", paint);
    // 先给空态：一进来就判「你要补两周基础」太武断，勾过再出结论
    if (out) out.innerHTML = '<p class="sc__hint">勾了上面几项，这里给出起点结论。</p>';
  }

  /* ---------------- 渲染：卡住了 ---------------- */

  // 16 条全铺开会把规则页拉得很长；默认只给最常见的一小截，搜索时不限
  var TR_SHOW = 7;
  var trOpen = false;

  function renderTrouble(filter) {
    var list = document.getElementById("troubleList");
    if (!list || !CAREER) return;

    var all = CAREER.trouble.length;
    var q = String(filter || "").toLowerCase();
    var rows = CAREER.trouble.filter(function (t) {
      return !q || (t.err + " " + t.why + " " + t.fix).toLowerCase().indexOf(q) >= 0;
    });

    var meta = document.getElementById("troubleMeta");
    if (meta) {
      meta.hidden = !q;
      meta.textContent = q ? "在 " + all + " 条里搜到 " + rows.length + " 条" : "";
    }

    var more = document.getElementById("troubleMore");
    var fold = !q && !trOpen && rows.length > TR_SHOW;
    if (fold) rows = rows.slice(0, TR_SHOW);
    if (more) {
      if (q || all <= TR_SHOW) {
        more.hidden = true;
      } else {
        more.hidden = false;
        more.textContent = trOpen ? "收起，只看最常见的 " + TR_SHOW + " 条" : "展开全部 " + all + " 条报错";
      }
    }

    list.innerHTML = rows.length
      ? rows.map(function (t) {
        var ph = t.step ? phaseOf(t.step) : null;
        var hit = t.step ? IDX[t.step] : null;
        var link = ph && hit
          ? '<a class="tr__go" href="#/roadmap/' + ph.id + "/" + t.step + '" data-goto="' + t.step + '">→ ' +
            hit.ref + " · " + esc(hit.title) + "</a>"
          : "";
        return '<li class="tr"><p class="tr__err">' + inline(t.err) + "</p>" +
          '<p class="tr__line"><b>为什么</b>' + inline(t.why) + "</p>" +
          '<p class="tr__line"><b>怎么办</b>' + inline(t.fix) + "</p>" + link + "</li>";
      }).join("")
      : '<li class="empty">没有匹配的报错。把关键字换成状态码或英文单词再试：401、CORS、port。</li>';
  }

  /* ---------------- 渲染：求职 ---------------- */

  function cbHead(t, sub) {
    return '<h3 class="cb__h">' + t + "</h3>" + (sub ? '<p class="cb__sub">' + sub + "</p>" : "");
  }

  // 求职页很长，先给一行小节入口；点它只滚屏，不改 hash（改了会重走路由）
  var CB_JUMP = [
    ["cb-metrics", "① 三个数字"],
    ["cb-story", "② 项目叙述"],
    ["cb-resume", "③ 简历"],
    ["cb-qa", "④ 十个追问"],
    ["cb-recall", "⑤ 复述题"],
    ["cb-lib", "⑥ 资料库"],
  ];

  function renderCareer() {
    var mount = document.getElementById("careerBody");
    if (!mount || !CAREER) return;
    var h = [];

    h.push('<nav class="cbjump" aria-label="本页小节">' +
      CB_JUMP.map(function (x) {
        return '<a href="#/career" data-jump="' + x[0] + '">' + x[1] + "</a>";
      }).join("") + "</nav>");

    h.push('<section class="cb" id="cb-metrics">' + cbHead("① 先补三个数字", "没有数字的项目，在面试里只能叫练习。三个都能量，都不需要装监控。") +
      '<div class="mgrid">' +
      CAREER.metrics.map(function (m) {
        return '<div class="mgrid__i"><b>' + esc(m.k) + "</b><span>" + inline(m.v) + "</span><i>" + inline(m.why) + "</i></div>";
      }).join("") + "</div></section>");

    h.push('<section class="cb" id="cb-story">' + cbHead("② " + esc(CAREER.story.title), "") +
      '<ol class="story">' +
      CAREER.story.parts.map(function (p) {
        return "<li><b>" + esc(p.k) + "</b><span>" + inline(p.v) + "</span></li>";
      }).join("") + "</ol>" +
      '<p class="cb__tip">' + inline(CAREER.story.tip) + "</p></section>");

    h.push('<section class="cb" id="cb-resume">' + cbHead("③ " + esc(CAREER.resume.title), "") +
      '<div class="resume">' +
      CAREER.resume.lines.map(function (l, i) {
        return '<p' + (i === 0 ? ' class="resume__t"' : "") + ">" + inline(l) + "</p>";
      }).join("") + "</div>" +
      '<p class="cb__tip">' + inline(CAREER.resume.tip) + "</p></section>");

    h.push('<section class="cb" id="cb-qa">' + cbHead("④ 十个必被追问的", "每条只给骨架；最后那句是「答成这样就废了」。") +
      '<ol class="qa">' +
      CAREER.qa.map(function (x, i) {
        return '<li><p class="qa__q"><span>' + pad(i + 1) + "</span>" + esc(x.q) + "</p>" +
          '<ul class="qa__p">' + x.points.map(function (p) { return "<li>" + inline(p) + "</li>"; }).join("") + "</ul>" +
          '<p class="qa__trap"><b>别答成</b>' + inline(x.trap) + "</p></li>";
      }).join("") + "</ol></section>");

    h.push('<section class="cb" id="cb-recall">' + cbHead("⑤ 合上代码，能不能说出来", "每阶段三问。答不出来的那一问，回去把对应步骤重做一遍。") +
      '<div class="recall">' +
      CAREER.recall.map(function (g) {
        return '<div class="recall__g"><b>' + esc(g.phase) + "</b><ol>" +
          g.items.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ol></div>";
      }).join("") + "</div></section>");

    // 资料库：全站唯一来源 links.js，按 tag 分组
    var tags = [];
    LINKS.forEach(function (x) { if (tags.indexOf(x.tag) < 0) tags.push(x.tag); });
    h.push('<section class="cb" id="cb-lib">' + cbHead("⑥ 资料库", "只维护 <code>data/links.js</code> 一份；带「顶部」的在首页页头。") +
      '<div class="lib">' +
      tags.map(function (t) {
        return '<div class="lib__g"><p class="lib__t">' + esc(t) + "</p><ul>" +
          LINKS.filter(function (x) { return x.tag === t; }).map(function (x) {
            return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.name) +
              (x.hot ? '<span class="lib__hot">顶部</span>' : "") + "</a><span>" + esc(x.note || "") + "</span></li>";
          }).join("") + "</ul></div>";
      }).join("") + "</div></section>");

    mount.innerHTML = h.join("");
  }

  /* ---------------- 初始化 ---------------- */

  function init() {
    setText("sideTotal", totalSteps);
    setText("tabCount", "0/" + totalSteps);

    renderRules();
    renderPano();
    renderCareer();
    renderSelfcheck();
    renderTrouble("");
    renderKnowledge("");
    renderLog();
    bindSteps();
    bindNav();
    bindSearch();
    bindKeys();
    renderEta();
    sync();
    applyRoute(false);

    // 空进度 + 没指定具体步骤时，先把第 0 步展开，省掉「要点哪里」的犹豫
    if (!Object.keys(state.done).length && !parseHash().step) {
      var first = document.getElementById("p1-0");
      if (first) openStep(first, true);
    }

    var cont = document.getElementById("continueBtn");
    if (cont) cont.addEventListener("click", continueLearning);

    var start = document.getElementById("startDate");
    if (start) {
      start.addEventListener("change", function (e) {
        state.start = e.target.value || todayISO();
        save();
        renderEta();
        if (curView === "roadmap") renderPhase();
      });
    }

    var paceSel = document.getElementById("pace");
    if (paceSel) {
      paceSel.value = String(pace());
      paceSel.addEventListener("change", function (e) {
        state.pace = +e.target.value || 12;
        save();
        renderEta();
        if (curView === "roadmap") renderPhase();
      });
    }

    var reset = document.getElementById("resetBtn");
    if (reset) {
      reset.addEventListener("click", function () {
        if (!window.confirm("清空所有已完成标记？这一步不能撤销。")) return;
        state.done = {};
        save();
        sync();
        if (curView === "roadmap") renderPhase();
      });
    }

    var trBox = document.getElementById("troubleSearch");
    if (trBox) {
      trBox.addEventListener("input", function () { renderTrouble(trBox.value.trim()); });
    }

    // 手机上页头资料默认收起（CSS 控制），这里只管展开／收起
    var refToggle = document.getElementById("headRefsToggle");
    if (refToggle) {
      refToggle.addEventListener("click", function () {
        var box = document.querySelector(".head__refs");
        if (!box) return;
        var open = box.classList.toggle("is-open");
        refToggle.setAttribute("aria-expanded", open ? "true" : "false");
        refToggle.textContent = open ? "收起" : "展开";
      });
    }

    var trMore = document.getElementById("troubleMore");
    if (trMore) {
      trMore.addEventListener("click", function () {
        trOpen = !trOpen;
        renderTrouble(trBox ? trBox.value.trim() : "");
        if (!trOpen) {
          var sec = document.querySelector(".trouble");
          if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

    var exp = document.getElementById("exportBtn");
    if (exp) exp.addEventListener("click", exportProgress);

    var imp = document.getElementById("importBtn");
    var file = document.getElementById("importFile");
    if (imp && file) {
      imp.addEventListener("click", function () { file.click(); });
      file.addEventListener("change", function () {
        if (file.files && file.files[0]) importProgress(file.files[0]);
        file.value = "";
      });
    }
  }

  function copyText(text, btn) {
    function ok() {
      var old = btn.textContent;
      btn.textContent = "已复制";
      setTimeout(function () { btn.textContent = old; }, 1400);
    }
    // file:// 不是安全上下文，clipboard API 不可用，需要回退
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, function () { legacyCopy(text, ok); });
      return;
    }
    legacyCopy(text, ok);
  }

  function legacyCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
