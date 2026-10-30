/* 自动生成，别手改。改数据请改 scripts/sync-progress.mjs 后重跑：
 *   node scripts/sync-progress.mjs
 * 生成时间：2026-10-30 14:59（本地时间）
 */
window.PROGRESS = {
  "generatedAt": "2026-10-30 14:59",
  "repo": {
    "name": "chenxiuxiu1/ai-learning",
    "url": "https://github.com/chenxiuxiu1/ai-learning",
    "branch": "main",
    "appPath": "kb-agent"
  },
  "stats": {
    "steps": 8,
    "commits": 23,
    "tests": 48,
    "endpoints": 19,
    "modules": 18
  },
  "endpoints": [
    {
      "method": "GET",
      "path": "/health",
      "file": "kb-agent/app/main.py"
    },
    {
      "method": "GET",
      "path": "/auth/me",
      "file": "kb-agent/app/routers/auth.py"
    },
    {
      "method": "POST",
      "path": "/auth/login",
      "file": "kb-agent/app/routers/auth.py"
    },
    {
      "method": "POST",
      "path": "/auth/logout",
      "file": "kb-agent/app/routers/auth.py"
    },
    {
      "method": "POST",
      "path": "/chat",
      "file": "kb-agent/app/routers/chat.py"
    },
    {
      "method": "GET",
      "path": "/chat/conversations",
      "file": "kb-agent/app/routers/chat.py"
    },
    {
      "method": "GET",
      "path": "/chat/conversations/{conversation_id}",
      "file": "kb-agent/app/routers/chat.py"
    },
    {
      "method": "DELETE",
      "path": "/chat/conversations/{conversation_id}",
      "file": "kb-agent/app/routers/chat.py"
    },
    {
      "method": "POST",
      "path": "/library",
      "file": "kb-agent/app/routers/docs.py"
    },
    {
      "method": "GET",
      "path": "/library",
      "file": "kb-agent/app/routers/docs.py"
    },
    {
      "method": "GET",
      "path": "/library/search",
      "file": "kb-agent/app/routers/docs.py"
    },
    {
      "method": "GET",
      "path": "/library/{doc_id}",
      "file": "kb-agent/app/routers/docs.py"
    },
    {
      "method": "DELETE",
      "path": "/library/{doc_id}",
      "file": "kb-agent/app/routers/docs.py"
    },
    {
      "method": "GET",
      "path": "/metrics",
      "file": "kb-agent/app/routers/metrics.py"
    },
    {
      "method": "POST",
      "path": "/notes",
      "file": "kb-agent/app/routers/notes.py"
    },
    {
      "method": "GET",
      "path": "/notes",
      "file": "kb-agent/app/routers/notes.py"
    },
    {
      "method": "GET",
      "path": "/notes/{note_id}",
      "file": "kb-agent/app/routers/notes.py"
    },
    {
      "method": "PATCH",
      "path": "/notes/{note_id}",
      "file": "kb-agent/app/routers/notes.py"
    },
    {
      "method": "DELETE",
      "path": "/notes/{note_id}",
      "file": "kb-agent/app/routers/notes.py"
    }
  ],
  "milestones": [
    {
      "step": "p1-1",
      "title": "建工程骨架",
      "date": "2026-10-28",
      "commit": "44aac3b",
      "commitUrl": "https://github.com/chenxiuxiu1/ai-learning/commit/44aac3b",
      "evidence": [
        "`uv 0.13.6` + CPython `3.12.10`（winget 装的签名版），`uv run python -c \"import fastapi\"` 打印 `0.162.0`",
        "仓库已推上 GitHub 私有库，`main` 分支，`.venv` / `node_modules` / `data` 全在 .gitignore 里"
      ],
      "pitfalls": [
        "`uv init` 默认建的是 `src/` 包结构 + 构建后端，Web 应用要加 `--no-package`；`--app` 也不管用，实测还是 src 布局",
        "开了「智能应用控制」的机器上，uv 下载的解释器没签名，直接报 `应用程序控制策略已阻止此文件 (os error 4551)`；换签名版 Python + `python-preference = \"only-system\"` 才通",
        "装完 uv 后当前窗口还是旧 PATH，`uv` 一直「不是内部或外部命令」——要重开终端"
      ]
    },
    {
      "step": "p1-2",
      "title": "第一个接口和自动文档",
      "date": "2026-10-28",
      "commit": "e4dd402",
      "commitUrl": "https://github.com/chenxiuxiu1/ai-learning/commit/e4dd402",
      "evidence": [
        "`GET /health` → `{\"ok\":true}`，`/docs` 200，Swagger 里 Try it out 执行成功",
        "把返回类型从 `dict[str, bool]` 改成 `dict[str, str]`，`/openapi.json` 里的 schema 跟着从 `boolean` 变成 `string`"
      ],
      "pitfalls": [
        "起服务时漏了 `--reload`，改完代码怎么刷新都不变，差点以为是框架缓存",
        "`uvicorn app.main:app` 必须在 `kb-agent` 目录下执行，路径不对报的是 `Could not import module`"
      ]
    },
    {
      "step": "p1-3/p1-4",
      "title": "Pydantic 模型 + 五个 CRUD 接口（内存版）",
      "date": "2026-10-28",
      "commit": "1506b52",
      "commitUrl": "https://github.com/chenxiuxiu1/ai-learning/commit/1506b52",
      "evidence": [
        "五个接口逐个 curl 验过：201 / 200 列表 / 200 详情 / 200 局部改 / 404 不存在 / 422 字段非法 / 204 删除",
        "`PATCH` 只改传了的字段（`model_dump(exclude_unset=True)`），没传的 `title` 原样保留"
      ],
      "pitfalls": [
        "PowerShell 5.1 把中文参数按 GBK 交给子进程，`curl -d '{\"title\":\"中文\"}'` 到后端就是乱码；改成先写 UTF-8 临时文件再 `--data-binary @file`",
        "删除成功别忘了 204 不能有响应体，返回 `null` 反而会让前端解析报错"
      ]
    },
    {
      "step": "p1-5",
      "title": "换成真数据库",
      "date": "2026-10-28",
      "commit": "75629a6",
      "commitUrl": "https://github.com/chenxiuxiu1/ai-learning/commit/75629a6",
      "evidence": [
        "写完数据后杀掉进程重启，数据还在——内存版做不到的那一步真的跨过去了",
        "故意把表名写错，拿到 `no such table: notez`，确认 SQLAlchemy 报错长什么样"
      ],
      "pitfalls": [
        "SQLite 要给 `check_same_thread=False`，否则 FastAPI 的线程池一碰就报错",
        "`data/app.db` 必须进 .gitignore，第一次提交很容易把数据库文件一起推上去"
      ]
    },
    {
      "step": "p1-6",
      "title": "错误处理、配置和日志",
      "date": "2026-10-28",
      "commit": "ec8849c",
      "commitUrl": "https://github.com/chenxiuxiu1/ai-learning/commit/ec8849c",
      "evidence": [
        "404 / 422 / 500 三种错误的 JSON 结构完全一致：`{code, message, request_id}`，且响应头 `x-request-id` 与 body 里的值相同",
        "日志能串起来：`[f2998226e0b6] app.main: GET /notes/999 -> 404 (9.5ms)`"
      ],
      "pitfalls": [
        "500 的堆栈一开始打了三遍（中间件一次、异常处理器一次、uvicorn 一次）；去掉中间件里的 `logger.exception` 才干净",
        "异常处理器是在中间件之后执行的，contextvar 已经被 reset，必须在 handler 里重新 set 一次，否则日志里 request_id 是 `-`",
        "500 分支忘了设响应头，前端拿不到 request_id，等于白做"
      ]
    },
    {
      "step": "p1-7",
      "title": "前端最小页：列表 + 新建",
      "date": "2026-10-28",
      "commit": "b23e197",
      "commitUrl": "https://github.com/chenxiuxiu1/ai-learning/commit/b23e197",
      "evidence": [
        "`GET /` 200、`/assets/*.js` 200，`/notes` 与 `/docs` 没被静态挂载吃掉",
        "页面渲染出表单、`共 1 条` 和一条真实笔记（tag 来自 p1-5 写库那条），前后端真的连上了"
      ],
      "pitfalls": [
        "`npx create-vite` 卡住不动、目录也没生成，直接按最小结构手写脚手架更快",
        "CORS 的 `allow_origins` 写 `*` 等于对全世界开放；只写本地开发地址",
        "静态文件必须最后才挂到 `/`，挂早了会把 `/notes`、`/docs` 全挡住"
      ]
    },
    {
      "step": "p1-8",
      "title": "自测与收尾",
      "date": "2026-10-28",
      "commit": "b23e197",
      "commitUrl": "https://github.com/chenxiuxiu1/ai-learning/commit/b23e197",
      "evidence": [
        "`uv run pytest -q` → `7 passed`，覆盖增删改查、404 结构、422 details、`limit=0` 拦截",
        "README 三条命令能让别人从零跑起来"
      ],
      "pitfalls": [
        "`uv run pytest` 找不到 `app` 包：要在 pyproject 里配 `[tool.pytest.ini_options] pythonpath = [\".\"]`",
        "`TestClient` 不用 `with` 上下文时不会触发 lifespan，建表逻辑根本不执行，测试会莫名其妙地 500"
      ]
    }
  ],
  "commits": [
    {
      "hash": "1d8dbc1",
      "date": "2026-10-30",
      "subject": "docs(kb-agent): 补「数据在哪、口令在哪」一节，加静态导出脚本",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/1d8dbc1"
    },
    {
      "hash": "8e5d68e",
      "date": "2026-10-30",
      "subject": "feat: 顶栏「板块」改为「学习地图」，三条专项路线补上第一块正文",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/8e5d68e"
    },
    {
      "hash": "6c6e5fe",
      "date": "2026-10-29",
      "subject": "补站点图标，顺手把 .tmp-* 加进忽略",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/6c6e5fe"
    },
    {
      "hash": "cf5c293",
      "date": "2026-10-29",
      "subject": "修：切 tab 会中断正在生成的回答（对话面板改为藏在后台而非卸载）",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/cf5c293"
    },
    {
      "hash": "a97f834",
      "date": "2026-10-29",
      "subject": "p6: 口令登录（HttpOnly 签名 cookie）+ 上线说明；修老会话 citations/steps 为 NULL 时 500",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/a97f834"
    },
    {
      "hash": "705c73f",
      "date": "2026-10-29",
      "subject": "p5: 指标接口与指标页（首字延迟 p95 / 成本 / 工具次数）+ 一键启动脚本",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/705c73f"
    },
    {
      "hash": "0ce0ee9",
      "date": "2026-10-29",
      "subject": "p4: Agent 工具循环（查资料/查笔记/建笔记）+ 跨轮引用编号 + 界面步骤条",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/0ce0ee9"
    },
    {
      "hash": "dc7af20",
      "date": "2026-10-29",
      "subject": "p3: 资料库 + BM25 检索 + 带出处的问答（含评测脚本与资料库界面）",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/dc7af20"
    },
    {
      "hash": "8a3995d",
      "date": "2026-10-29",
      "subject": "p2: 接入 DeepSeek 流式对话（SSE）+ 会话消息落库 + 对话界面",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/8a3995d"
    },
    {
      "hash": "5915303",
      "date": "2026-10-29",
      "subject": "gitignore：令牌不进被跟踪文件，改放 .gh-token（已在忽略清单）",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/5915303"
    },
    {
      "hash": "b56d4e3",
      "date": "2026-10-28",
      "subject": "站点：页头补定位说明与「8 步已实测」标注；排错索引默认折叠可展开；求职页加小节跳转；手机上页头资料默认收起；发布清单补 links/career 并加引用自检",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/b56d4e3"
    },
    {
      "hash": "b564ed2",
      "date": "2026-10-28",
      "subject": "站点：新增求职模块与起步自测/排错索引；外部资料收敛到 data/links.js，首页顶部只放 6 条热资料",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/b564ed2"
    },
    {
      "hash": "878fcc6",
      "date": "2026-10-28",
      "subject": "站点：发布脚本支持令牌走 API + Pages 自检；全景适配 1180 宽度；gitignore 屏蔽 .gh-token",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/878fcc6"
    },
    {
      "hash": "c969be0",
      "date": "2026-10-28",
      "subject": "站点：新增全景模块（版本流水线/请求链路/技术选型/验收表）、步骤-概念互跳；修阶段轨切换后不高亮；标题改为 AI 应用开发",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/c969be0"
    },
    {
      "hash": "b75a091",
      "date": "2026-10-28",
      "subject": "站点重构：四模块切换卡 + 阶段轨 + 搜索/深链接/进度导入导出；新增 Pages 发布脚本",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/b75a091"
    },
    {
      "hash": "d3f170e",
      "date": "2026-10-28",
      "subject": "deploy: 多阶段 Dockerfile + Render blueprint + Postgres 可选依赖（本机仍只用 SQLite）",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/d3f170e"
    },
    {
      "hash": "4577705",
      "date": "2026-10-28",
      "subject": "站点改版：重排字号对比度与留白 + 新增实操档案（从仓库自动生成）+ p1 踩坑补进课程",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/4577705"
    },
    {
      "hash": "b23e197",
      "date": "2026-10-28",
      "subject": "p1-7/p1-8: React 最小页（三态）+ CORS + 静态托管 + pytest 冒烟测试 + README",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/b23e197"
    },
    {
      "hash": "ec8849c",
      "date": "2026-10-28",
      "subject": "p1-6: Settings 配置 + request_id 中间件 + 统一错误结构 + 结构化日志",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/ec8849c"
    },
    {
      "hash": "75629a6",
      "date": "2026-10-28",
      "subject": "p1-5: SQLite + SQLAlchemy，五个接口改成真数据库",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/75629a6"
    },
    {
      "hash": "1506b52",
      "date": "2026-10-28",
      "subject": "p1-3/p1-4: Pydantic 模型 + 五个 CRUD 接口（内存版）",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/1506b52"
    },
    {
      "hash": "e4dd402",
      "date": "2026-10-28",
      "subject": "p1-2: /health 接口 + 自动文档",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/e4dd402"
    },
    {
      "hash": "44aac3b",
      "date": "2026-10-28",
      "subject": "chore: 学习路线站 + hello-ai(第0步) + kb-agent 骨架(p1-1)",
      "url": "https://github.com/chenxiuxiu1/ai-learning/commit/44aac3b"
    }
  ]
};
