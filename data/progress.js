/* 自动生成，别手改。改数据请改 scripts/sync-progress.mjs 后重跑：
 *   node scripts/sync-progress.mjs
 * 生成时间：2026-10-28 17:18（本地时间）
 */
window.PROGRESS = {
  "generatedAt": "2026-10-28 17:18",
  "repo": {
    "name": "chenxiuxiu1/ai-learning",
    "url": "https://github.com/chenxiuxiu1/ai-learning",
    "branch": "main",
    "appPath": "kb-agent"
  },
  "stats": {
    "steps": 8,
    "commits": 6,
    "tests": 7,
    "endpoints": 6,
    "modules": 10
  },
  "endpoints": [
    {
      "method": "GET",
      "path": "/health",
      "file": "kb-agent/app/main.py"
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
