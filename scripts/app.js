/* kb-agent 学习路径 · 路由 / 渲染 / 进度 */
(function () {
  "use strict";

  var DATA = window.CURRICULUM;
  var KB = window.KNOWLEDGE;
  var LOG = window.PROGRESS || null;
  var KEY = "kb-agent-progress-v2";
  var COEF = 1.6;        // 步骤估时只算敲代码；读文档、踩坑、返工按这个系数补
  var VIEWS = ["roadmap", "log", "concepts", "rules"];

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
      return '<li>' +
        '<a href="#/roadmap/' + p.id + '" data-phase-link="' + p.id + '"' +
        ' class="' + (p.id === curPhase ? "is-on" : "") + (full ? " is-full" : "") + '">' +
        '<span class="rail__no">' + p.no + "</span>" +
        '<span class="rail__text"><b>' + esc(p.title) + "</b><em data-navcount=\"" + p.id + '\">' + n + "/" + p.steps.length + " 步</em></span>" +
        (full ? '<span class="rail__tick" aria-label="完成">✓</span>' : "") +
        "</a></li>";
    }).join("");
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

  function kbItemHTML(c, idx) {
    var hit = c.step ? IDX[c.step] : null;
    var h = [];

    h.push('<li class="kb__item">');
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
    l.concepts.forEach(function (c, j) { h.push(kbItemHTML(c, j)); });
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

    setText("statSteps", s.steps);
    setText("statCommits", s.commits);
    setText("statEndpoints", s.endpoints);
    setText("statTests", s.tests);
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
  }

  /* ---------------- 日期 ---------------- */

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function renderEta() {
    var input = document.getElementById("startDate");
    var eta = document.getElementById("etaDate");
    if (!state.start) state.start = todayISO();
    if (input) input.value = state.start;

    setText("etaWeeks", totalWeeks());

    if (!eta) return;
    var parts = state.start.split("-");
    if (parts.length !== 3) { eta.textContent = "—"; return; }
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    d.setDate(d.getDate() + totalWeeks() * 7);
    eta.textContent = d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日";
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
      renderPhase();
      if (r.step) focusStep(r.step);
      else if (scrollTop) window.scrollTo(0, 0);
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
      var jump = e.target.closest("[data-goto]");
      if (!jump) return;
      e.preventDefault();
      var id = jump.getAttribute("data-goto");
      var ph = phaseOf(id);
      if (ph) go("roadmap", ph.id, id);
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
    var target = null;
    for (var i = 0; i < DATA.phases.length && !target; i++) {
      var steps = DATA.phases[i].steps;
      for (var j = 0; j < steps.length; j++) {
        if (!state.done[steps[j].id]) { target = steps[j]; break; }
      }
    }
    if (!target) { go("rules"); return; }
    var ph = phaseOf(target.id);
    query = "";
    var box = document.getElementById("search");
    if (box) box.value = "";
    go("roadmap", ph.id, target.id);
  }

  /* ---------------- 初始化 ---------------- */

  function init() {
    setText("factSteps", totalSteps);
    setText("factHours", DATA.phases.reduce(function (n, p) { return n + rawHours(p); }, 0));
    setText("factConcepts", kbCount());
    setText("sideTotal", totalSteps);
    setText("tabCount", "0/" + totalSteps);

    renderRules();
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
