/* kb-agent 学习路径 · 路由 / 渲染 / 进度 */
(function () {
  "use strict";

  var DATA = window.CURRICULUM;
  var TRACKS = window.CURRICULUM_TRACKS || {};
  var KB = window.KNOWLEDGE;
  var LINKS = window.LINKS || [];
  var CAREER = window.CAREER || null;
  var LIB = window.LIBRARY || null;
  var LOG = window.PROGRESS || null;
  var KEY = "kb-agent-progress-v3";
  var KEY_V2 = "kb-agent-progress-v2";
  var COEF = 1.6;        // 步骤估时只算敲代码；读文档、踩坑、返工按这个系数补
  /* 两层导航：顶栏只管全局四块；路线 / 全景 / 实操档案 / 概念地图 是路线内部的，
     只有进到某条路线才显示。这样顶栏不再看起来像「AI 应用专用」。 */
  var GLOBAL_VIEWS = ["boards", "library", "rules", "career"];
  var TRACK_VIEWS = ["roadmap", "pano", "log", "concepts"];
  var VIEWS = ["boards", "track"].concat(TRACK_VIEWS, GLOBAL_VIEWS);

  var totalSteps = DATA.phases.reduce(function (n, p) { return n + p.steps.length; }, 0);

  /* 四条路线共用一套渲染：AI 主线的数据在 curriculum.js，三条专项在 tracks.js。
     两者结构完全同构，所以只要换掉「当前路线的数据」，阶段轨 / 步骤 / 勾选都能复用。
     一条路线写完一块就往 tracks.js 里填一块，其余页面不用动。 */
  function trackData(id) {
    if (id === "ai") return DATA;
    var t = TRACKS[id];
    return t && t.phases && t.phases.length ? t : null;
  }

  // 这条路线一共有几块（包待写的）：页头与二级导航要说「几块里有几块已写」
  function boardsOfTrack(id) {
    if (id === "ai") return DATA.phases;
    var t = (window.BOARD_TRACKS || []).filter(function (x) { return x.id === id; })[0];
    return t ? t.boards : [];
  }

  function curData() { return trackData(curTrack) || DATA; }

  function stepsOf(d) { return d.phases.reduce(function (n, p) { return n + p.steps.length; }, 0); }

  // 所有路线的阶段摊平：id 全局唯一（p1…p5 / fs1 / be1 / fe1），查一步不用先知道它属于哪条路线
  function allPhases() {
    var out = DATA.phases.slice();
    Object.keys(TRACKS).forEach(function (k) {
      (TRACKS[k].phases || []).forEach(function (p) { out.push(p); });
    });
    return out;
  }

  function phaseTrack(phaseId) {
    var i;
    for (i = 0; i < DATA.phases.length; i++) if (DATA.phases[i].id === phaseId) return "ai";
    var ids = Object.keys(TRACKS);
    for (i = 0; i < ids.length; i++) {
      var ps = TRACKS[ids[i]].phases || [];
      for (var j = 0; j < ps.length; j++) if (ps[j].id === phaseId) return ids[i];
    }
    return null;
  }

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
    var ps = allPhases();
    for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i];
    return null;
  }

  // 步骤链接统一带路线段（#/ai/roadmap/p2/p2-3、#/fs/roadmap/fs1/fs1-2）
  function stepHref(phaseId, stepId) {
    var t = phaseTrack(phaseId) || curTrack;
    return "#/" + t + "/roadmap/" + phaseId + (stepId ? "/" + stepId : "");
  }

  function phaseOf(stepId) {
    var ps = allPhases();
    for (var i = 0; i < ps.length; i++) {
      var steps = ps[i].steps;
      for (var j = 0; j < steps.length; j++) {
        if (steps[j].id === stepId) return ps[i];
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

  /* v3 存四样东西：
     tracks  每条路线自己的勾选（现在只有 ai 有步骤，其余是空的，等正文写好直接能用）
     notes   每步的本机笔记
     days    每天勾了几步（本周进度与连续天数都从这算）
     last    上次停在哪一步，首页续学条与「继续学习」都用它 */
  function blankState() {
    return {
      v: 3,
      tracks: {
        ai: { done: {}, start: "", pace: 12 },
        fs: { done: {}, start: "", pace: 6 },
        be: { done: {}, start: "", pace: 6 },
        fe: { done: {}, start: "", pace: 6 },
      },
      notes: {},
      days: {},
      last: null,
    };
  }

  function load() {
    var s = blankState();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw) || {};
        if (o.tracks) {
          s.tracks = o.tracks;
          s.notes = o.notes || {};
          s.days = o.days || {};
          s.last = o.last || null;
        }
      } else {
        // 老用户：v2 是「一条路线平铺」的结构，整包搬进 tracks.ai，勾选一个不丢
        var old = localStorage.getItem(KEY_V2);
        if (old) {
          var o2 = JSON.parse(old) || {};
          s.tracks.ai = { done: o2.done || {}, start: o2.start || "", pace: +o2.pace || 12 };
        }
      }
    } catch (e) {}
    if (!s.tracks || !s.tracks.ai) s.tracks = blankState().tracks;
    return s;
  }

  var state = load();
  var query = "";   // 步骤搜索词

  // 勾选 / 节奏 / 开始日期按路线各存一份：三条专项的节奏与主线互不干扰
  function trackState(id) {
    if (!state.tracks[id]) state.tracks[id] = { done: {}, start: "", pace: 12 };
    return state.tracks[id];
  }

  function aiState() { return trackState("ai"); }

  function curState() { return trackState(curTrack); }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  /* 勾一步就在今天的格子里 +1；取消不扣 —— 那是那天的真实动作，不该被回滚 */
  function markDay() {
    var k = todayISO();
    state.days[k] = (state.days[k] || 0) + 1;
  }

  function dayKey(offset) {
    var d = new Date();
    d.setDate(d.getDate() - offset);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // 最近 7 天（含今天）勾了几步
  function weekSteps() {
    var n = 0;
    for (var i = 0; i < 7; i++) n += state.days[dayKey(i)] || 0;
    return n;
  }

  // 连续学习天数：今天还没勾不算断（可能还没到晚上），从昨天往回数
  function streakDays() {
    var n = 0;
    var i = state.days[dayKey(0)] ? 0 : 1;
    while (i < 400 && state.days[dayKey(i)]) { n++; i++; }
    return n;
  }

  /* ---------------- 时间模型 ---------------- */

  function rawHours(p) {
    return p.steps.reduce(function (n, s) { return n + s.time; }, 0);
  }

  function planHours(p) { return rawHours(p) * COEF; }

  function pace() { return curState().pace || 12; }

  // 阶段周次按累计工时切、首尾相接，改每周投入就整体重排
  function weekRanges() {
    var acc = 0, prevEnd = 0, out = {};
    curData().phases.forEach(function (p) {
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
    var ps = curData().phases;
    return r[ps[ps.length - 1].id].end;
  }

  /* ---------------- 实测记录 ---------------- */

  var IDX = {};   // step id → { ref, title }，四条路线共用（id 全局唯一）
  allPhases().forEach(function (p) {
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
      (DONE_LOG[step.id] ? '<span class="tag">已实测</span>' : "") +
      (state.notes[step.id] ? '<span class="tag tag--note">笔记</span>' : "") + "</span>");
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
          return '<a class="chip" href="#/ai/concepts" data-term="' + esc(t) + '">' + esc(t) + "</a>";
        }).join("") + "</div>");
    }

    if (DONE_LOG[step.id]) h.push(logBlockHTML(DONE_LOG[step.id]));

    /* 笔记：只存在这台浏览器里，不上传。换设备时跟着进度文件一起导出。 */
    h.push('<div class="note">');
    h.push('<label class="k" for="note-' + step.id + '">我的笔记</label>');
    h.push('<textarea class="note__box" id="note-' + step.id + '" data-note="' + step.id + '" rows="3" ' +
      'placeholder="卡在哪、命令改成了什么、下次从哪继续 —— 只存在这台浏览器">' +
      esc(state.notes[step.id] || "") + "</textarea>");
    h.push("</div>");

    h.push("</div></li>");
    return h.join("");
  }
  /* ---------------- 渲染：阶段轨 ---------------- */

  function counts() {
    var out = {};
    var done = curState().done;
    curData().phases.forEach(function (p) {
      out[p.id] = p.steps.filter(function (s) { return done[s.id]; }).length;
    });
    return out;
  }

  function renderRail() {
    var c = counts();
    var mount = document.getElementById("rail");
    if (!mount) return;
    mount.innerHTML = curData().phases.map(function (p) {
      var n = c[p.id];
      var full = n === p.steps.length;
      var pct = p.steps.length ? (n / p.steps.length) * 100 : 0;
      return '<li>' +
        '<a href="' + stepHref(p.id) + '" data-phase-link="' + p.id + '"' +
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

  // 「下一步」与「继续学习」共用：某条路线第一个未完成的步骤
  function nextStepOf(track) {
    var d = trackData(track);
    if (!d) return null;
    var done = trackState(track).done;
    for (var i = 0; i < d.phases.length; i++) {
      var p = d.phases[i];
      for (var j = 0; j < p.steps.length; j++) {
        if (!done[p.steps[j].id]) return { phase: p, step: p.steps[j] };
      }
    }
    return null;
  }

  function nextStep() { return nextStepOf(curTrack); }

  function renderHead() {
    var d = curData();
    var t = trackMeta(curTrack) || {};
    var steps = stepsOf(d);

    // 页头跟着路线换：停在 fs 上时不应该还写着「AI 应用开发」
    setText("headEyebrow", t.sub || "项目制学习路线");
    setText("headTitle", curTrack === "ai" ? "AI 应用开发" : (t.name || "") + "专项");
    setText("headLede", t.intro || "");
    setText("headSteps", steps);
    setText("headPhases", curTrack === "ai" ? d.phases.length : boardsOfTrack(curTrack).length);
    setText("headPhasesUnit", curTrack === "ai" ? "个版本" : "个板块");
    setText("headConcepts", kbCount());
    var cw = document.getElementById("headConceptsWrap");
    if (cw) cw.hidden = curTrack !== "ai";   // 专项没有概念地图，这个数字对它是假的

    // 页头那句「几有实测」只属于主线：专项还没有实测记录，写成实话
    var note = document.getElementById("headNote");
    if (note) {
      note.innerHTML = curTrack === "ai"
        ? '<b id="headTested">' + (LOG ? LOG.stats.steps : "–") +
          '</b> 步已有实测记录（提交、测试、接口都可查），其余按同一套验收标准推演 —— 差异都在<a href="#/ai/log">实操档案</a>里。'
        : "每一步都有验收标准、代码和资料链接；还没有实测记录，按同一套标准写 —— 做完哪一步就把自己的命令与报错补进那条笔记。";
    }

    var nx = nextStep();
    var link = document.getElementById("headNext");
    if (link) {
      if (nx) {
        link.setAttribute("href", stepHref(nx.phase.id, nx.step.id));
        link.innerHTML = "<b>" + esc(IDX[nx.step.id].ref) + "</b>" +
          esc(nx.step.title.replace(/^第\s*\d+\s*步[：:]\s*/, ""));
      } else {
        link.setAttribute("href", "#/boards");
        link.textContent = "这条路线走完了，回去挑下一块";
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
    var ps = curData().phases;
    var i = ps.indexOf(p);
    var r = weekRanges()[p.id];
    var c = counts()[p.id];
    var prev = ps[i - 1];
    var next = ps[i + 1];
    var h = [];

    h.push('<div class="ph__nav">');
    h.push('<a class="ph__arrow' + (prev ? "" : " is-off") + '" ' +
      (prev ? 'href="' + stepHref(prev.id) + '" data-phase-link="' + prev.id + '" aria-label="上一阶段"'
        : 'aria-disabled="true" aria-label="上一阶段"') + ">‹</a>");
    h.push('<span class="ph__pos">' + p.no + " / " + pad(ps.length) + "</span>");
    h.push('<a class="ph__arrow' + (next ? "" : " is-off") + '" ' +
      (next ? 'href="' + stepHref(next.id) + '" data-phase-link="' + next.id + '" aria-label="下一阶段"'
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
      curData().phases.forEach(function (p) {
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
        meta.textContent = "在 " + stepsOf(curData()) + " 步里搜到 " + hits.length + " 条";
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
    var ps = curData().phases;
    var p = null;
    for (var i = 0; i < ps.length; i++) if (ps[i].id === curPhase) p = ps[i];
    p = p || ps[0];
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
      h.push('<a class="kb__step" href="' + stepHref(phaseOf(c.step).id, c.step) + '" data-goto="' + c.step + '">' +
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
    setText("tbKb", kbCount());
  }

  /* ---------------- 渲染：实操档案 ---------------- */

  function renderLog() {
    if (!LOG) return;
    var s = LOG.stats;

    setText("tbLog", s.steps + " 步实测");

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

  /* ---------------- 知识库：静态快照 + 浏览器内 BM25 ---------------- */

  /* 数据在构建时导成 data/library.js，检索在浏览器里算 —— 站点是纯静态的，
     没有 Python 也没有 key。下面这套分词与打分是从 kb-agent/app/rag.py 照搬的：
     两处同规则，才不会出现「线上搜得到、这里搜不到」。改一边就得改另一边。 */

  var LIB_TOKEN_RE = /[a-zA-Z0-9_]+|[\u4e00-\u9fff]+/g;

  var lib = { built: false, segs: [], tfs: [], lens: [], idf: {}, avgdl: 0 };

  function libTokens(text) {
    var out = [];
    var m;
    LIB_TOKEN_RE.lastIndex = 0;
    while ((m = LIB_TOKEN_RE.exec(text))) {
      var piece = m[0];
      if (piece.charCodeAt(0) < 128) out.push(piece.toLowerCase());
      else if (piece.length === 1) out.push(piece);
      else for (var i = 0; i < piece.length - 1; i++) out.push(piece.substr(i, 2));
    }
    return out;
  }

  function libBuild() {
    if (lib.built) return;
    lib.built = true;
    if (!LIB) return;

    LIB.documents.forEach(function (doc) {
      (doc.chunks || []).forEach(function (text, i) {
        lib.segs.push({ doc: doc, seq: i, text: text });
      });
    });

    var df = {};
    lib.segs.forEach(function (seg) {
      var tf = {};
      var toks = libTokens(seg.text);
      toks.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      lib.tfs.push(tf);
      lib.lens.push(toks.length);
      Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
    });

    var n = lib.segs.length;
    var total = 0;
    lib.lens.forEach(function (l) { total += l; });
    lib.avgdl = n ? total / n : 0;
    Object.keys(df).forEach(function (t) {
      lib.idf[t] = Math.log(1 + (n - df[t] + 0.5) / (df[t] + 0.5));
    });
  }

  function libSearch(query, k) {
    libBuild();
    var terms = libTokens(query);
    if (!terms.length || !lib.segs.length) return [];

    var K1 = 1.5, B = 0.75;
    var scored = [];
    lib.segs.forEach(function (seg, i) {
      var tf = lib.tfs[i];
      var norm = K1 * (1 - B + B * lib.lens[i] / (lib.avgdl || 1));
      var score = 0;
      terms.forEach(function (t) {
        var f = tf[t];
        if (!f) return;
        score += (lib.idf[t] || 0) * f * (K1 + 1) / (f + norm);
      });
      if (score > 0) scored.push({ i: i, score: score });
    });

    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k || 8);
  }

  function libEscRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /* 高亮得在「原文」上找、在「转义后」的片段上拼，否则用户输入 <b> 这类文本会被当成标签 */
  function libHighlight(raw, terms) {
    if (!terms.length) return esc(raw);
    var re = new RegExp(terms.map(libEscRe).join("|"), "gi");
    var out = [], last = 0, m, guard = 0;
    while ((m = re.exec(raw)) && guard++ < 400) {
      if (!m[0]) { re.lastIndex++; continue; }
      if (m.index > last) out.push(esc(raw.slice(last, m.index)));
      out.push("<mark>" + esc(m[0]) + "</mark>");
      last = m.index + m[0].length;
    }
    out.push(esc(raw.slice(last)));
    return out.join("");
  }

  /* 摘要取「第一个命中词」附近，而不是永远从开头截 —— 命中在后面时前者才说明问题 */
  function libSnippet(text, terms) {
    var low = text.toLowerCase();
    var at = -1;
    terms.forEach(function (t) {
      var p = low.indexOf(t.toLowerCase());
      if (p >= 0 && (at < 0 || p < at)) at = p;
    });
    if (at < 0) at = 0;
    var start = Math.max(0, at - 45);
    var end = Math.min(text.length, start + 170);
    return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  }

  function libHighlightTerms(query) {
    var seen = {};
    return libTokens(query).filter(function (t) {
      if (t.length < 2 || seen[t]) return false;
      seen[t] = 1;
      return true;
    }).slice(0, 12);
  }

  var LIB_CHEV = '<svg class="kb__chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';

  function libDocHTML(doc, idx) {
    var h = [];
    h.push('<div class="kb__layer" data-doc="' + doc.id + '">');
    h.push('<button class="kb__head" type="button" aria-expanded="false">');
    h.push('<span class="kb__no">' + pad(idx + 1) + "</span>");
    h.push('<span class="kb__titles"><b>' + esc(doc.title) + "</b><i>" +
      esc(doc.source || "资料") + (doc.at ? " · " + esc(doc.at) : "") + "</i></span>");
    h.push('<span class="kb__n">' + (doc.chunks || []).length + " 段</span>");
    h.push(LIB_CHEV);
    h.push("</button>");
    h.push('<div class="kb__body">');
    (doc.chunks || []).forEach(function (text, i) {
      h.push('<div class="lib__chunk" id="chunk-' + doc.id + "-" + i + '">');
      h.push('<span class="lib__seq">第 ' + (i + 1) + " 段</span>");
      h.push("<p>" + esc(text) + "</p>");
      h.push("</div>");
    });
    h.push("</div></div>");
    return h.join("");
  }

  function libNoteHTML(note) {
    var h = [];
    h.push('<div class="kb__layer">');
    h.push('<button class="kb__head" type="button" aria-expanded="false">');
    h.push('<span class="kb__no">#' + note.id + "</span>");
    h.push('<span class="kb__titles"><b>' + esc(note.title) + "</b><i>" +
      esc((note.tags || []).join(" / ") || "笔记") + "</i></span>");
    h.push('<span class="kb__n">' + (note.content || "").length + " 字</span>");
    h.push(LIB_CHEV);
    h.push("</button>");
    h.push('<div class="kb__body">');
    (note.content || "").split(/\n+/).forEach(function (p) {
      if (p.trim()) h.push("<p class=\"lib__p\">" + esc(p) + "</p>");
    });
    h.push("</div></div>");
    return h.join("");
  }

  function libHitsHTML(hits, terms) {
    if (!hits.length) {
      return '<p class="empty">这一段内容里没有匹配的段：换个说法，或只留关键词（比如「反向代理」而不是「反向代理会导致什么问题」）。</p>';
    }
    return '<ol class="lib__hits">' + hits.map(function (hit, i) {
      var seg = lib.segs[hit.i];
      return '<li class="lib__hit">' +
        '<button type="button" class="lib__hit-btn" data-doc="' + seg.doc.id + '" data-seq="' + seg.seq + '">' +
        '<span class="lib__rank">' + (i + 1) + "</span>" +
        '<span class="lib__hit-main">' +
        '<span class="lib__from">《' + esc(seg.doc.title) + "》第 " + (seg.seq + 1) + " 段" +
        '<span class="lib__score">score ' + hit.score.toFixed(2) + "</span></span>" +
        '<span class="lib__snippet">' + libHighlight(libSnippet(seg.text, terms), terms) + "</span>" +
        "</span></button></li>";
    }).join("") + "</ol>";
  }

  function renderLibrary(filter) {
    var q = (filter || "").trim();
    var docsBox = document.getElementById("libDocs");
    var notesBox = document.getElementById("libNotes");
    var hitsBox = document.getElementById("libHits");
    var meta = document.getElementById("libMeta");
    var foot = document.getElementById("libFoot");

    if (!LIB) {
      if (docsBox) docsBox.innerHTML = '<p class="empty">没有找到 data/library.js：先在 kb-agent 里跑一次 scripts/export_static.py。</p>';
      if (meta) meta.hidden = true;
      return;
    }

    var S = LIB.stats || {};
    setText("tabLib", S.documents || 0);

    var intro = document.getElementById("libIntro");
    if (intro) {
      intro.innerHTML = inline("这一页是 kb-agent 知识库的**静态快照**：构建时把资料和笔记导成一个文件，检索直接在浏览器里算（中文二元组 + BM25），和线上 `/library/search` 同一套打分。没有后端、不用登录，打开就能搜。");
    }

    var how = document.getElementById("libHow");
    if (how) {
      how.innerHTML = [
        "搜的是**段**不是篇：命中会写明出自哪篇的第几段",
        "排序用 BM25：词频高、词越罕见、段落越短，分越高",
        "快照不联网：线上库变了，要回项目重跑一次导出",
        "会话与指标不在快照里 —— 那些是运行时数据，这里只有内容",
      ].map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("");
    }

    if (foot) {
      // 拼好一整段再交给 inline()：先把 HTML 写进去再 inline，会被整体转义成文本
      foot.innerHTML = inline(
        "快照生成于 **" + (LIB.generatedAt || "—") + "**，取自 `" +
        (LIB.dbPath || "data/app.db") + "`；重新导出：`python scripts/export_static.py --with-eval`。" +
        "资料里有一部分是评测语料（标题旁标了「评测语料」），不是你手写的内容。"
      );
    }

    var docs = LIB.documents || [];
    var notes = LIB.notes || [];

    if (!q) {
      if (hitsBox) hitsBox.innerHTML = "";
      if (meta) meta.hidden = true;
      libBuild();
      if (docsBox) {
        docsBox.innerHTML = docs.length
          ? docs.map(libDocHTML).join("")
          : '<p class="empty">库里还没有资料。在 kb-agent 里上传一篇，再重跑导出。</p>';
      }
      if (notesBox) {
        notesBox.innerHTML = notes.length ? notes.map(libNoteHTML).join("") : '<p class="empty">还没有笔记。</p>';
      }
      setText("libDocsLabel", "全部资料（" + docs.length + " 篇 / " + (S.chunks || 0) + " 段）");
      setText("libNotesLabel", "笔记（" + notes.length + " 条）");
      return;
    }

    libBuild();
    var terms = libHighlightTerms(q);
    var started = (window.performance && performance.now) ? performance.now() : Date.now();
    var hits = libSearch(q, 8);
    var ms = ((window.performance && performance.now) ? performance.now() : Date.now()) - started;

    if (hitsBox) hitsBox.innerHTML = libHitsHTML(hits, terms);

    if (meta) {
      meta.hidden = false;
      meta.textContent = "在 " + lib.segs.length + " 段里命中 " + hits.length + " 段，用时 " + ms.toFixed(1) + "ms";
    }

    // 命中的文档按最好名次排序展示；笔记按关键词硬匹配（笔记少，不值得单独建索引）
    var order = [], seen = {};
    hits.forEach(function (hit) {
      var id = lib.segs[hit.i].doc.id;
      if (!seen[id]) { seen[id] = 1; order.push(id); }
    });
    var hitDocs = order.map(function (id) {
      return docs.filter(function (d) { return d.id === id; })[0];
    }).filter(Boolean);

    var kw = q.toLowerCase();
    var hitNotes = notes.filter(function (n) {
      return (n.title + " " + n.content + " " + (n.tags || []).join(" ")).toLowerCase().indexOf(kw) >= 0;
    });

    if (docsBox) {
      docsBox.innerHTML = hitDocs.length
        ? hitDocs.map(libDocHTML).join("")
        : '<p class="empty">没有资料命中，看看上面的摘要是不是换个词就能搜到。</p>';
    }
    if (notesBox) {
      notesBox.innerHTML = hitNotes.length
        ? hitNotes.map(libNoteHTML).join("")
        : '<p class="empty">没有笔记命中这个关键词。</p>';
    }
    setText("libDocsLabel", "命中资料（" + hitDocs.length + " 篇）");
    setText("libNotesLabel", "笔记（命中 " + hitNotes.length + " 条）");

    // 搜完把第一条命中的文档展开：不然用户还得再多点一下才看得到上下文
    if (hitDocs.length) libOpenDoc(hitDocs[0].id);
  }

  function libOpenDoc(docId) {
    var box = document.querySelector('#libDocs [data-doc="' + docId + '"]');
    if (!box) return null;
    box.classList.add("is-open");
    var head = box.querySelector(".kb__head");
    if (head) head.setAttribute("aria-expanded", "true");
    return box;
  }

  function bindLibrary() {
    ["libDocs", "libNotes"].forEach(function (id) {
      var box = document.getElementById(id);
      if (!box) return;
      box.addEventListener("click", function (e) {
        var head = e.target.closest(".kb__head");
        if (!head) return;
        var layer = head.closest(".kb__layer");
        var open = !layer.classList.contains("is-open");
        layer.classList.toggle("is-open", open);
        head.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });

    // 点摘要跳到原文那一段：展开 + 滚过去 + 闪一下，省得人自己在长文里找
    var hits = document.getElementById("libHits");
    if (hits) {
      hits.addEventListener("click", function (e) {
        var btn = e.target.closest(".lib__hit-btn");
        if (!btn) return;
        var docId = +btn.getAttribute("data-doc");
        var seq = +btn.getAttribute("data-seq");
        libOpenDoc(docId);
        var el = document.getElementById("chunk-" + docId + "-" + seq);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("is-flash");
        setTimeout(function () { el.classList.remove("is-flash"); }, 1600);
      });
    }

    var box = document.getElementById("libSearch");
    var clear = document.getElementById("libClear");
    if (box) {
      box.addEventListener("input", function () {
        renderLibrary(box.value);
        if (clear) clear.hidden = !box.value;
      });
    }
    if (clear) {
      clear.addEventListener("click", function () {
        if (!box) return;
        box.value = "";
        box.focus();
        clear.hidden = true;
        renderLibrary("");
      });
    }
  }

  /* ---------------- 板块墙（首页） ---------------- */

  /* 一个板块 = 一条路线里的一个阶段。主线的 5 块直接从 DATA.phases 长出来，
     另外三条的元信息在 data/boards.js —— 步骤正文还没写，先把卡片立出来。 */

  var BOARD_FILTER = { track: "all", tag: "全部" };

  function boardList() {
    var out = [];

    var main = window.BOARD_MAIN;
    if (main && DATA) {
      DATA.phases.forEach(function (p) {
        var m = main.boards[p.id] || {};
        out.push({
          track: main.id,
          trackName: main.name,
          id: p.id,
          no: p.no,
          title: p.title,
          desc: m.desc || p.goal || "",
          tags: m.tags || [],
          steps: p.steps.length,
          hours: Math.round(rawHours(p)),
          done: p.steps.filter(function (s) { return aiState().done[s.id]; }).length,
          todo: false,
          href: stepHref(p.id),
        });
      });
    }

    (window.BOARD_TRACKS || []).forEach(function (t) {
      t.boards.forEach(function (b) {
        // 这一块已经有正文：卡片改用真实步数与勾选，点进去就是路线页
        var ph = phaseIn(t.id, b.id);
        if (ph) {
          var done = trackState(t.id).done;
          out.push({
            track: t.id,
            trackName: t.name,
            id: ph.id,
            no: ph.no,
            title: ph.title,
            desc: b.desc || ph.goal || "",
            tags: b.tags || [],
            steps: ph.steps.length,
            hours: Math.round(rawHours(ph)),
            done: ph.steps.filter(function (s) { return done[s.id]; }).length,
            goal: b.goal || ph.output || "",
            todo: false,
            href: stepHref(ph.id),
          });
          return;
        }
        out.push({
          track: t.id,
          trackName: t.name,
          id: b.id,
          no: b.no,
          title: b.title,
          desc: b.desc || "",
          tags: b.tags || [],
          steps: b.steps || 0,
          hours: b.hours || 0,
          goal: b.goal || "",
          done: 0,
          todo: true,
          href: "#/b/" + b.id,
        });
      });
    });

    return out;
  }

  function boardMatches(b) {
    if (BOARD_FILTER.track !== "all" && b.track !== BOARD_FILTER.track) return false;
    if (BOARD_FILTER.tag !== "全部" && b.tags.indexOf(BOARD_FILTER.tag) < 0) return false;
    return true;
  }

  function pillHTML(attr, value, label, on) {
    return '<button type="button" class="pill' + (on ? " is-on" : "") + '" ' +
      attr + '="' + esc(value) + '" aria-pressed="' + (on ? "true" : "false") + '">' +
      esc(label) + "</button>";
  }

  function boardCardHTML(b) {
    var pct = b.steps ? Math.round((b.done / b.steps) * 100) : 0;
    var h = [];
    h.push('<a class="board board--' + b.track + (b.todo ? " board--todo" : "") + '" data-board="' + b.track + "-" + b.id + '"');
    h.push(' href="' + b.href + '">');
    h.push('<span class="board__no">' + esc(b.no) + "</span>");
    h.push('<span class="board__main">');
    h.push('<span class="board__title">' + esc(b.title) +
      "<em class=\"board__n\">" + (b.todo ? "待写" : b.steps + " 步") + "</em></span>");
    h.push('<span class="board__desc">' + esc(b.desc) + "</span>");
    h.push("</span>");
    h.push('<span class="board__bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>');
    h.push("</a>");
    return h.join("");
  }

  /* 首页续学条：一句话回答「上次停在哪」，顺带把本周与连续天数给出来。
     一个人自学最容易断在「打开页面不知道点哪」，所以它放在筛选框上面。
     路线也跟着 last 走：上次停在全栈，就给全栈的下一步。 */
  function renderResume() {
    var box = document.getElementById("resumeCard");
    if (!box) return;

    var last = state.last;
    var lt = last && trackData(last.track) ? last.track : "ai";
    var lmeta = trackMeta(lt) || { name: "AI 应用" };
    var lstate = trackState(lt);
    var ltotal = stepsOf(trackData(lt) || DATA);
    var done = Object.keys(lstate.done).length;

    var step = last && last.track === lt && last.step ? findStep(last.step) : null;
    var phase = step ? phaseOf(step.id) : null;
    var nx = nextStepOf(lt);

    var where, href, goLabel, label;
    if (step && phase) {
      label = "上次学到";
      where = esc(lmeta.name) + " · " +
        esc(IDX[step.id].ref) + " · " + esc(step.title.replace(/^第\s*\d+\s*步[：:]\s*/, "")) +
        (lstate.done[step.id] ? "（已勾）" : "");
      href = stepHref(phase.id, step.id);
      goLabel = lstate.done[step.id] ? "再看一遍" : "接着做";
    } else if (nx && done) {
      // 停过但没点具体某步（比如只看了一眼路线）：不能说「还没开始」
      label = "接下来";
      where = esc(lmeta.name) + " · 下一步 · " + esc(IDX[nx.step.id].ref) + " · " +
        esc(nx.step.title.replace(/^第\s*\d+\s*步[：:]\s*/, ""));
      href = stepHref(nx.phase.id, nx.step.id);
      goLabel = "接着做";
    } else if (nx) {
      label = "从这开始";
      where = esc(lmeta.name) + " · 第一步 · " + esc(IDX[nx.step.id].ref) + " · " +
        esc(nx.step.title.replace(/^第\s*\d+\s*步[：:]\s*/, ""));
      href = stepHref(nx.phase.id, nx.step.id);
      goLabel = "开始第一步";
    } else {
      label = "这条走完了";
      where = esc(lmeta.name) + " 的 " + ltotal + " 步都勾完了 —— 回去挑下一块，或者去求职页把这些变成机会。";
      href = "#/career";
      goLabel = "去求职页";
    }

    var bits = [lmeta.name + " " + done + "/" + ltotal + " 步"];
    var wk = weekSteps();
    if (wk) bits.push("本周 " + wk + " 步");
    var st = streakDays();
    if (st > 1) bits.push("连续 " + st + " 天");

    var h = ['<div class="nextup__in">'];
    h.push('<div class="nextup__main"><p class="nextup__label">' + label + "</p>" +
      '<p class="nextup__where">' + where + "</p></div>");
    h.push('<p class="nextup__stats">' + bits.join(" · ") + "</p>");
    h.push('<a class="btn btn--primary nextup__go" href="' + href + '">' + goLabel + "</a>");
    h.push("</div>");

    box.innerHTML = h.join("");
    box.hidden = false;
  }

  function renderBoards() {
    var grid = document.getElementById("boardGrid");
    if (!grid) return;

    var home = document.getElementById("boardHome");
    var detail = document.getElementById("boardDetail");
    if (home) home.hidden = false;
    if (detail) detail.hidden = true;

    renderResume();
    var all = boardList();
    // 顶栏用「几条路线」而不是「几块」：块会随着写作一直变，路线数是稳定的
    setText("tabBoards", 1 + (window.BOARD_TRACKS || []).length + " 条路线");

    var F = window.BOARD_FILTERS || { tracks: [{ id: "all", name: "全部" }], tags: ["全部"] };

    var tr = document.getElementById("filterTracks");
    if (tr) {
      tr.innerHTML = F.tracks.map(function (t) {
        return pillHTML("data-track", t.id, t.name, t.id === BOARD_FILTER.track);
      }).join("");
    }

    var tg = document.getElementById("filterTags");
    if (tg) {
      tg.innerHTML = F.tags.map(function (t) {
        return pillHTML("data-tag", t, t, t === BOARD_FILTER.tag);
      }).join("");
    }

    var shown = all.filter(boardMatches);
    var meta = document.getElementById("boardMeta");
    if (meta) {
      var narrowed = BOARD_FILTER.track !== "all" || BOARD_FILTER.tag !== "全部";
      meta.hidden = !narrowed;
      meta.textContent = narrowed
        ? "筛出 " + shown.length + " 块 · 共 " + all.length + " 块 · 合计 " +
          shown.reduce(function (n, b) { return n + b.steps; }, 0) + " 步"
        : "";
    }

    if (!shown.length) {
      grid.innerHTML = '<p class="empty">没有同时满足这两个条件的板块，换一个筛选试试。</p>';
      return;
    }

    // 按路线分组：卡片墙一眼看不出归属，分组标题补上这个信息
    var order = [];
    var groups = {};
    shown.forEach(function (b) {
      if (!groups[b.track]) { groups[b.track] = []; order.push(b); }
      groups[b.track].push(b);
    });

    // 分组统计里"整条路线"对有正文的路线直接进路线页
    grid.innerHTML = order.map(function (first) {
      var list = groups[first.track];
      var steps = list.reduce(function (n, b) { return n + b.steps; }, 0);
      var done = list.reduce(function (n, b) { return n + b.done; }, 0);
      var writing = list.filter(function (b) { return b.todo; }).length;
      var written = list.length - writing;
      return '<section class="board-group">' +
        '<p class="k-label">' + esc(first.trackName) +
          '<span class="board-group__sum">' + list.length + " 块 · " +
          (steps ? steps + " 步" : "待写") +
          (done ? " · 已完成 " + done + " 步" : "") +
          (writing ? " · " + written + " 块已写 / " + writing + " 块待写" : "") +
          "</span>" +
          '<a class="board-group__all" href="' +
            (first.track === "ai" ? "#/ai/roadmap" : "#/" + first.track) +
          '">整条路线 →</a></p>' +
        '<div class="board-grid">' + list.map(boardCardHTML).join("") + "</div>" +
        "</section>";
    }).join("");

    var foot = document.getElementById("boardFoot");
    if (foot) {
      foot.innerHTML = inline(
        "标了**待写**的板块骨架已经定了（标题、要解决什么、验收标准），步骤正文还在写；" +
        "四条路线现在各自有第一块可以先做。进度按路线分开记，只存在这台浏览器里，换设备请用导出 / 导入。"
      );
    }
  }

  function findBoard(id) {
    var found = boardList().filter(function (b) { return b.id === id; });
    return found.length ? found[0] : null;
  }

  /* 待写的板块没有步骤正文，但骨架（要解决什么、怎么算做完、几块几小时）已经定了，
     那就给它一个真页面 —— 点进去什么都不发生比空白更槽。 */
  function renderBoardDetail(id) {
    var home = document.getElementById("boardHome");
    var box = document.getElementById("boardDetail");
    if (!home || !box) return false;

    var b = findBoard(id);
    if (!b || !b.todo) return false;

    var h = [];
    h.push('<p class="crumb"><a href="#/boards">← 全部板块</a></p>');
    h.push('<p class="eyebrow">' + esc(b.trackName) + " · " + esc(b.no) + " · 写作中</p>");
    h.push('<h2 class="panel__h">' + esc(b.title) + "</h2>");
    h.push('<p class="panel__lede">' + esc(b.desc) + "</p>");
    h.push('<div class="bd">');
    h.push('<div class="bd__item"><p class="k-label">怎么算做完</p><p>' + esc(b.goal || "—") + "</p></div>");
    h.push('<div class="bd__item"><p class="k-label">规模</p><p>' + b.steps + " 步 · 约 " + b.hours + " 小时</p></div>");
    h.push("</div>");

    h.push('<p class="k-label">步骤（正文待写）</p>');
    h.push('<ol class="bd__steps">');
    for (var i = 1; i <= (b.steps || 0); i++) {
      h.push('<li><span>' + pad(i) + '</span>待写</li>');
    }
    h.push("</ol>");

    h.push('<p class="pano__foot">这一块的骨架定了，正文还没落 —— 先拿 ' +
      '<a href="#/boards">AI 应用那 5 块</a> 开工，写好的板块会把这里填上。</p>');

    box.innerHTML = h.join("");
    home.hidden = true;
    box.hidden = false;
    return true;
  }

  function bindBoards() {
    var box = document.getElementById("boardFilters");
    if (box) {
      box.addEventListener("click", function (e) {
        var btn = e.target.closest(".pill");
        if (!btn) return;
        var t = btn.getAttribute("data-track");
        if (t) BOARD_FILTER.track = t;
        var g = btn.getAttribute("data-tag");
        if (g) BOARD_FILTER.tag = g;
        renderBoards();
      });
    }

    // 待写的板块现在有自己的详情页（#/b/<id>），不再需要“点了没反应”的提示
  }

  /* ---------------- 进度同步 ---------------- */

  function syncChecks() {
    var done = curState().done;
    var boxes = document.querySelectorAll("input[data-check]");
    Array.prototype.forEach.call(boxes, function (box) {
      var id = box.getAttribute("data-check");
      if (!IDX[id]) return;
      var on = !!done[id];
      box.checked = on;
      box.closest(".step").classList.toggle("is-done", on);
    });
  }

  // 全站：只算已经有正文的路线（待写的路线没有步骤，不能拉低百分比）
  function siteTotals() {
    var total = stepsOf(DATA);
    var done = Object.keys(aiState().done).length;
    Object.keys(TRACKS).forEach(function (k) {
      var d = trackData(k);
      if (!d) return;
      total += stepsOf(d);
      done += Object.keys(trackState(k).done).length;
    });
    return { total: total, done: done };
  }

  function sync() {
    var c = counts();
    var doneTotal = 0;
    curData().phases.forEach(function (p) { doneTotal += c[p.id]; });
    var mine = stepsOf(curData());

    var site = siteTotals();
    var pct = site.total ? (site.done / site.total) * 100 : 0;
    setText("sideDone", doneTotal);
    setText("sideTotal", mine);
    setText("tbCount", doneTotal + "/" + mine);
    setText("topPct", Math.round(pct) + "%");

    var fill = document.getElementById("topFill");
    if (fill) fill.style.width = pct + "%";
    var side = document.getElementById("sideFill");
    if (side) side.style.width = mine ? (doneTotal / mine) * 100 + "%" : "0%";

    renderRail();
    syncChecks();
    renderHead();
    renderResume();
  }

  /* ---------------- 日期 ---------------- */

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // 开始日期 + 计划周数 → 完成日（按当前路线的节奏算）
  function etaDate() {
    var st = curState();
    if (!st.start) st.start = todayISO();
    var parts = st.start.split("-");
    if (parts.length !== 3) return null;
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    d.setDate(d.getDate() + totalWeeks() * 7);
    return d;
  }

  function renderEta() {
    var input = document.getElementById("startDate");
    var eta = document.getElementById("etaDate");
    var st = curState();
    if (!st.start) st.start = todayISO();
    if (input) input.value = st.start;

    // 节奏也是每条路线一份，切路线时下拉框得跟着回到它自己的值
    var sel = document.getElementById("pace");
    if (sel) sel.value = String(pace());

    setText("etaWeeks", totalWeeks());

    var d = etaDate();
    if (eta) {
      eta.textContent = d
        ? d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日"
        : "—";
    }
  }

  /* ---------------- 路线内二级导航 ---------------- */

  function tbChip(view, label, extra, on) {
    return '<a class="trackbar__a' + (on ? " is-on" : "") + '" href="#/' + curTrack + "/" + view + '"' +
      (on ? ' aria-current="page"' : "") + ">" + label + extra + "</a>";
  }

  /* 二级导航只在路线里出现：顶栏放全局四块，这里放这条路线自己的四个视角。
     三条待写路线只有「路线」本身，就换成一行说明，不摆四个点不动的 tab。 */
  function renderTrackBar(r) {
    var bar = document.getElementById("trackBar");
    if (!bar) return;

    var inTrack = TRACK_VIEWS.indexOf(r.view) >= 0 || r.view === "track";
    bar.hidden = !inTrack;
    // 告诉 CSS 「多了一行」：锚点滚动、sticky 偏移都靠这个变量避让
    document.body.classList.toggle("is-track", inTrack);
    if (!inTrack) return;

    var t = trackMeta(r.track) || trackMeta("ai");
    var h = ['<div class="trackbar__in">'];
    h.push('<a class="trackbar__back" href="#/boards">← 全部板块</a>');
    h.push('<span class="trackbar__name">' + esc(t.name) + "</span>");

    if (!t.ready) {
      h.push('<span class="trackbar__note">' + esc(t.sub) + " · 正文写作中</span>");
    } else {
      h.push('<nav class="trackbar__tabs" aria-label="' + esc(t.name) + ' 内">');
      h.push(tbChip("roadmap", "路线", '<em id="tbCount">' + Object.keys(curState().done).length + "/" + stepsOf(curData()) + "</em>", r.view === "roadmap"));
      // 全景 / 实操档案 / 概念地图只属于主线：专项路线还没这三维，摆上去就是空壳
      if (r.track === "ai") {
        h.push(tbChip("pano", "全景", "", r.view === "pano"));
        h.push(tbChip("log", "实操档案", '<em id="tbLog">' + (LOG ? LOG.stats.steps + " 步实测" : "–") + "</em>", r.view === "log"));
        h.push(tbChip("concepts", "概念地图", '<em id="tbKb">' + kbCount() + "</em>", r.view === "concepts"));
      } else {
        var written = curData().phases.length;
        var total = boardsOfTrack(r.track).length;
        h.push('<span class="trackbar__note">' + written + " / " + total + " 块已写 · " +
          stepsOf(curData()) + " 步" + (written < total ? " · 其余待写" : "") + "</span>");
      }
      h.push("</nav>");
    }
    h.push("</div>");
    bar.innerHTML = h.join("");
  }

  /* ---------------- 渲染：待写路线的骨架 ---------------- */

  /* 首页卡片只能放下「一句话」，整条路线得有地方展开：四块排开、每块的验收标准与规模，
     加上一句「正文还在写」，比一个禁用的入口诚实。 */
  function renderTrackPage(id) {
    var box = document.getElementById("trackBody");
    var t = trackMeta(id);
    if (!box || !t) return;

    var boards = boardList().filter(function (b) { return b.track === id; });
    var steps = boards.reduce(function (n, b) { return n + b.steps; }, 0);
    var written = boards.filter(function (b) { return !b.todo; }).length;

    var h = ['<div class="tp">'];
    h.push('<p class="eyebrow">' + esc(t.sub) + "</p>");
    h.push('<h2 class="panel__h">' + esc(t.name) + " · " + boards.length + " 块 / " + steps + " 步</h2>");
    h.push('<p class="panel__lede">' + esc(t.intro) + "</p>");
    h.push('<p class="tp__badge">' + (written
      ? "已写完 " + written + " 块（点「进路线」直接开工），剩下 " + (boards.length - written) + " 块还在写。先把写好的那块走完，比等全部写完更划算。"
      : "正文还在写。下面是四块的骨架 —— 每块要解决什么、怎么算做完、几步几小时都已经定了。") + "</p>");

    h.push('<ol class="tp__list">');
    boards.forEach(function (b, i) {
      h.push('<li class="tp__item tp__item--' + esc(b.track) + '">');
      h.push('<p class="tp__no">' + pad(i + 1) + " · " + esc(b.no) +
        (b.todo ? " · 待写" : " · 已写") + "</p>");
      h.push('<h3 class="tp__h">' + esc(b.title) + "</h3>");
      h.push('<p class="tp__desc">' + esc(b.desc) + "</p>");
      h.push('<p class="tp__goal"><b>怎么算做完</b>' + esc(b.goal || "—") + "</p>");
      h.push('<p class="tp__meta">' + b.steps + " 步 · 约 " + b.hours + " 小时" +
        (b.tags.length ? " · " + b.tags.join(" / ") : "") +
        '<a class="tp__link" href="' + b.href + '">' + (b.todo ? "看这一块 →" : "进路线 →") + "</a></p>");
      h.push("</li>");
    });
    h.push("</ol>");

    h.push('<p class="pano__foot">三条专项路线的写法是：一块一块写，写完就上线。已经写好的块跟主线一样带验收标准、代码和资料链接；没写的块先看骨架。按你的目标挑顺序，不用等全部写完。</p>');
    h.push("</div>");
    box.innerHTML = h.join("");
  }

  /* ---------------- 路由 ---------------- */

  var curPhase = DATA.phases[0].id;
  var curStep = null;
  var curTrack = "ai";
  var curView = "boards";
  var prevView = null;
  var prevTrack = null;

  function firstUnfinishedPhase(track) {
    var d = trackData(track) || DATA;
    var done = trackState(track || "ai").done;
    for (var i = 0; i < d.phases.length; i++) {
      var p = d.phases[i];
      for (var j = 0; j < p.steps.length; j++) if (!done[p.steps[j].id]) return p.id;
    }
    return d.phases[0].id;
  }

  function phaseIn(track, id) {
    var d = trackData(track);
    if (!d || !id) return null;
    for (var i = 0; i < d.phases.length; i++) if (d.phases[i].id === id) return d.phases[i];
    return null;
  }

  /* 路线元信息：ai 的标题在 BOARD_MAIN，其余三条在 BOARD_TRACKS。
     ready = 已经有正文（哪怕只写了一块）；还没写的走骨架页。 */
  function isTrack(id) {
    if (id === "ai") return true;
    return (window.BOARD_TRACKS || []).filter(function (t) { return t.id === id; }).length > 0;
  }

  function trackMeta(id) {
    if (id === "ai") {
      var m = window.BOARD_MAIN || {};
      return { id: "ai", name: m.name || "AI 应用", sub: m.sub || "", intro: m.intro || "", ready: true };
    }
    var t = (window.BOARD_TRACKS || []).filter(function (x) { return x.id === id; })[0];
    if (!t) return null;
    return { id: t.id, name: t.name, sub: t.sub || "", intro: t.intro || "", ready: !!trackData(id) };
  }

  /* 地址栏规则：
       #/boards  #/b/fs1  #/library  #/rules  #/career     全局
       #/ai/roadmap/p2/p2-3  #/ai/pano  #/ai/log  #/ai/concepts  主线
       #/fs/roadmap/fs1/fs1-2  #/fs                     专项（有正文走路线，没正文走骨架页）
     旧地址（#/roadmap/p2/p2-3、#/pano…）没有路线段，仍落到 AI 应用那一条。 */
  function parseHash() {
    var raw = String(location.hash || "").replace(/^#\/?/, "");
    var parts = raw.split("/").filter(Boolean);
    var r = { track: "ai", view: "boards", phase: null, step: null, board: null };
    var a = parts[0] || "";

    if (a === "b" && parts[1]) {
      r.view = "boards";
      r.board = parts[1];
    } else if (TRACK_VIEWS.indexOf(a) >= 0) {
      r.view = a;
      r.phase = parts[1] || null;
      r.step = parts[2] || null;
    } else if (GLOBAL_VIEWS.indexOf(a) >= 0) {
      r.view = a;
    } else if (a === "ai") {
      if (TRACK_VIEWS.indexOf(parts[1]) >= 0) {
        r.view = parts[1];
        r.phase = parts[2] || null;
        r.step = parts[3] || null;
      } else {
        r.view = "roadmap";
      }
    } else if (isTrack(a)) {
      r.track = a;
      if (TRACK_VIEWS.indexOf(parts[1]) >= 0) {
        r.view = parts[1];
        r.phase = parts[2] || null;
        r.step = parts[3] || null;
      } else {
        // 一条都没写时是骨架页；写了一块就直推路线页
        r.view = trackData(a) ? "roadmap" : "track";
      }
    }

    // 专项路线里没有全景 / 实操档案 / 概念地图，别让手改的地址停在空面板上
    if (r.track !== "ai" && (r.view === "pano" || r.view === "log" || r.view === "concepts")) {
      r.view = trackData(r.track) ? "roadmap" : "track";
      r.phase = null;
      r.step = null;
    }

    if (r.view === "roadmap") {
      r.phase = phaseIn(r.track, r.phase) ? r.phase : firstUnfinishedPhase(r.track);
      r.step = r.step || null;
      if (r.step && !findStep(r.step)) r.step = null;
    }
    return r;
  }

  function applyRoute(scrollTop) {
    var r = parseHash();
    curView = r.view;
    curTrack = r.track;
    curPhase = r.phase || curPhase;
    curStep = r.step;

    VIEWS.forEach(function (v) {
      var panel = document.getElementById("panel-" + v);
      if (panel) panel.hidden = v !== r.view;
    });

    // 顶栏只对全局四块高亮；进了某条路线，位置由二级导航条表示
    var tabs = document.querySelectorAll(".tab");
    Array.prototype.forEach.call(tabs, function (a) {
      var on = a.getAttribute("data-view") === r.view;
      a.classList.toggle("is-on", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    renderTrackBar(r);

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

    // 记下停在哪一步：首页续学条与「继续学习」都读它。
    // 只点了「路线」没点具体某步时，保留同一阶段里上次那一步，别把它抹成 null
    if (r.view === "roadmap") {
      var keep = !r.step && state.last && state.last.track === r.track && state.last.phase === r.phase
        ? state.last.step : null;
      state.last = { track: r.track, phase: r.phase, step: r.step || keep };
      save();
    }

    if (r.view === "boards") {
      // 详情页优先：只有待写板块有详情，主线板块直接进路线页
      if (!r.board || !renderBoardDetail(r.board)) renderBoards();
      if (scrollTop) window.scrollTo(0, 0);
    } else if (r.view === "roadmap") {
      var switched = prevTrack && prevTrack !== r.track;
      renderPhase();
      renderEta();           // 专项路线有自己的节奏与周数
      sync();                // 阶段轨 / 进度计数 / 页头 / 续学条一起刷（换路线时这些全变了）
      prevTrack = r.track;
      if (r.step) focusStep(r.step);
      else if (scrollTop && switched) window.scrollTo(0, 0);   // 换了路线先看页头
      else if (scrollTop) {
        // 同一路线内切阶段后停在阶段头，而不是把整页拽回顶部（顶部是标题区，跟当前操作无关）
        var head = document.getElementById("phaseHead");
        if (head) head.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.scrollTo(0, 0);
      }
    } else if (r.view === "track") {
      renderTrackPage(r.track);
      if (scrollTop) window.scrollTo(0, 0);
    } else if (scrollTop) {
      window.scrollTo(0, 0);
    }
  }

  function go(view, phase, step) {
    var h;
    if (GLOBAL_VIEWS.indexOf(view) >= 0) h = "#/" + view;
    else h = "#/" + curTrack + "/" + view +
      (view === "roadmap" && phase ? "/" + phase : "") + (step ? "/" + step : "");
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
      if (box.checked) {
        curState().done[id] = true;
        markDay();
      } else delete curState().done[id];
      save();
      sync();
      if (query) renderSteps();
    });

    // 笔记：边打边存。43 步的文本量很小，没必要防抖 —— 丢了才可惜
    mount.addEventListener("input", function (e) {
      var ta = e.target.closest("textarea[data-note]");
      if (!ta) return;
      var id = ta.getAttribute("data-note");
      var v = ta.value;
      var had = !!state.notes[id];

      if (v.trim()) state.notes[id] = v;
      else delete state.notes[id];
      save();

      if (had === !!state.notes[id]) return;
      // 标题上的「笔记」小标跟着变，不用整页重画
      var li = ta.closest(".step");
      var title = li ? li.querySelector(".step__title") : null;
      if (!title) return;
      var tag = title.querySelector(".tag--note");
      if (state.notes[id] && !tag) {
        var t = document.createElement("span");
        t.className = "tag tag--note";
        t.textContent = "笔记";
        title.appendChild(t);
      } else if (!state.notes[id] && tag) {
        tag.parentNode.removeChild(tag);
      }
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

      var ps = curData().phases;
      var i = ps.indexOf(byId(curPhase));
      if (e.key === "ArrowLeft" && i > 0) {
        e.preventDefault();
        go("roadmap", ps[i - 1].id);
      } else if (e.key === "ArrowRight" && i > -1 && i < ps.length - 1) {
        e.preventDefault();
        go("roadmap", ps[i + 1].id);
      }
    });
  }

  /* ---------------- 进度导入导出 ---------------- */

  function exportProgress() {
    var payload = {
      site: "kb-agent-roadmap",
      ver: 3,
      savedAt: new Date().toISOString(),
      tracks: state.tracks,
      notes: state.notes,
      days: state.days,
      last: state.last,
      // 这三个是 v2 的字段，多留着：文件拿到旧版页面上也还能导入
      done: aiState().done,
      start: aiState().start,
      pace: aiState().pace,
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
        if (!o) throw new Error("格式不对");
        // 两代文件都收：v3 认 tracks，v2 认平铺的 done
        var isV3 = !!(o.tracks && o.tracks.ai && typeof o.tracks.ai.done === "object");
        var flat = typeof o.done === "object" ? o.done : null;
        if (!isV3 && !flat) throw new Error("格式不对");
        var n = Object.keys(isV3 ? o.tracks.ai.done : flat).length;
        if (!window.confirm("用文件里的进度覆盖当前进度？（已完成 " + n + " 步，笔记一起换）")) return;
        if (isV3) {
          state.tracks = o.tracks;
          state.notes = o.notes || {};
          state.days = o.days || {};
          state.last = o.last || null;
        } else {
          aiState().done = flat;
          aiState().start = o.start || aiState().start;
          aiState().pace = +o.pace || aiState().pace;
        }
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
    query = "";
    var box = document.getElementById("search");
    if (box) box.value = "";

    // 先回「上次停在哪一步」—— 跨路线也成立：停在 fs1-2 就回 fs1-2
    var last = state.last;
    if (last && trackData(last.track) && last.phase && last.step &&
        !trackState(last.track).done[last.step] && findStep(last.step)) {
      curTrack = last.track;
      go("roadmap", last.phase, last.step);
      return;
    }

    // 否则从上次那条路线的下一步开始；那条走完了就回 AI 主线（它是全部路线的前提）
    var lt = last && trackData(last.track) ? last.track : "ai";
    var nx = nextStepOf(lt);
    if (!nx) {
      lt = "ai";
      nx = nextStepOf("ai");
    }
    if (!nx) { location.hash = "#/boards"; return; }
    curTrack = lt;
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
          ? '<a class="tr__go" href="' + stepHref(ph.id, t.step) + '" data-goto="' + t.step + '">→ ' +
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
    renderRules();
    renderPano();
    renderCareer();
    renderSelfcheck();
    renderTrouble("");
    renderKnowledge("");
    renderLog();
    renderBoards();
    bindSteps();
    bindNav();
    bindSearch();
    bindKeys();
    bindBoards();
    renderEta();
    sync();
    renderLibrary("");
    bindLibrary();
    applyRoute(false);

    // 第一次来：只在路线页把第一个未完成步骤展开，省掉「要点哪里」的犹豫。
    // 不写死 p1-0 —— 老用户可能停在 p3，展开的应该是他自己那一段
    if (curView === "roadmap" && !Object.keys(curState().done).length && !parseHash().step) {
      var first = document.querySelector("#steps .step");
      if (first) openStep(first, true);
    }

    var cont = document.getElementById("continueBtn");
    if (cont) cont.addEventListener("click", continueLearning);

    var start = document.getElementById("startDate");
    if (start) {
      start.addEventListener("change", function (e) {
        curState().start = e.target.value || todayISO();
        save();
        renderEta();
        if (curView === "roadmap") renderPhase();
      });
    }

    var paceSel = document.getElementById("pace");
    if (paceSel) {
      paceSel.value = String(pace());
      paceSel.addEventListener("change", function (e) {
        curState().pace = +e.target.value || 12;
        save();
        renderEta();
        if (curView === "roadmap") renderPhase();
      });
    }

    var reset = document.getElementById("resetBtn");
    if (reset) {
      reset.addEventListener("click", function () {
        if (!window.confirm("清空这条路线所有已完成标记？（笔记会保留，这一步不能撤销）")) return;
        curState().done = {};
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
