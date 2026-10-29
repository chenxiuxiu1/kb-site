/* 课程数据：一条主线项目，五段递进。所有步骤都指向同一个仓库。 */
window.CURRICULUM = {
  project: {
    name: "kb-agent",
    tagline: "个人知识库助手",
    desc: "上传自己的资料 → 提问 → 得到带引用的回答 → 需要时自己调工具去查、去算。五段分别产出 v0 到 v4，每段结束都有一个能跑、能演示的东西。",
  },

  phases: [
    /* ============================ P1 ============================ */
    {
      id: "p1",
      no: "01",
      title: "把后端跑起来",
      goal: "这一阶段不学新思想，只换语法。路由、校验、数据库这三件事你在 Node 里都干过，现在用 Python 再干一遍。第 0 步先把整条链路打通，之后每一步都要有东西在动。",
      output: "v0 · 资料条目后端：五个接口 + SQLite + 自测通过 + 一个能用的列表页",
      label: "后端接口",
      steps: [
        {
          id: "p1-0",
          title: "第 0 步：三天内让它说一句话",
          brief: "在学任何工程之前，先看到端到端跑通的东西。这一步不通，后面全是抽象名词。",
          time: 2,
          code: {
            file: "PowerShell · 两段，依次执行",
            lang: "powershell",
            body: `# 一、确认 key 能用（Node 18+，零安装，本机已有 v24）
$env:DEEPSEEK_API_KEY = "sk-你的key"

node -e "const b={model:'deepseek-flash',messages:[{role:'user',content:'Explain what a token is in one short sentence, in Chinese.'}],thinking:{type:'disabled'}};fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+process.env.DEEPSEEK_API_KEY},body:JSON.stringify(b)}).then(async r=>{const j=await r.json();console.log(r.ok?j.choices[0].message.content:'HTTP '+r.status+' '+JSON.stringify(j))})"

# 屏幕上出现一句中文 → key 有效。
# 出错会直接打印状态码：401 = key 不对；402 = 没余额；429 = 限流（等一分钟再试）。

# 二、跑那个能打字的页面
cd "E:\\my-project\\ai应用\\hello-ai"
node server.mjs
# 另开一个标签页：http://127.0.0.1:8787`,
          },
          do: [
            "注册 DeepSeek 开放平台，在「API keys」建一个 key，充 10 元 —— flash 输出 4~8 元/百万 tokens，10 元够你把这整条路线跑好几遍",
            "先跑代码块第 1 段：两行命令，屏幕上出现中文就说明 key 通了。这一段不装任何东西",
            "再跑第 2 段：`node server.mjs` 启动 `ai应用/hello-ai` 里那个 150 行的零依赖后端，浏览器只跟它说话",
            "打开 `server.mjs` 通读一遍，能指出三件事：key 存在哪、浏览器为什么拿不到它、上游的 SSE 是怎么被重新包了一遍",
            "故意把 key 改错一个字符重启，把报错抄进笔记 —— 第一天就必须见过一次失败长什么样",
          ],
          learn: [
            "**先跑通再正确**：`make it work → make it right → make it fast`。新手最大的失速点不是难，是学了两周还没亲眼见过一次模型输出。",
            "**key 不能进前端**：`index.html` 里的任何字符串，用户按 F12 都能看到。所以第一次调用必须经过一个你自己控制的进程。",
            "**流式不是优化，是体验**：`stream: true` 把首字延迟从「等 3 秒」变成「0.3 秒开始出声」，后面所有交互都建在这个基础上。",
            "**为什么这一步不用 Python**：Windows 上 `python --version` 没反应、面板弹出应用商店，说明 `python.exe` 只是 0 字节的别名，真解释器根本没装。这一步用不到它，就不引入这个变量；Python 到下一步才真正需要。",
            "**Windows 的编码坑**：PowerShell 5.1 控制台默认 GB2312，`Invoke-RestMethod` 读不到 charset 时会把 UTF-8 当 Latin-1，中文直接乱码。所以这里用 `node -e` 而不是 PowerShell 原生命令 —— 坑最好踩在别人的代码里。",
            "**命令行里的中文会乱码，页面里的不会**：PS 5.1 把参数按系统编码交给子进程，Node 按 UTF-8 读，`node -e` 里写中文就会变成 `鐢ㄤ竴...` 这种。所以上面那条命令的提问写英文（让模型用中文回答）。中文只放在 `.mjs` / `.html` 文件里，或者放进浏览器的输入框 —— 文件是 UTF-8，HTTP 传的也是原始字节，都不经过这层转换。",
          ],
          refs: [
            { name: "DeepSeek · 你的第一个 API 请求", url: "https://api-docs.deepseek.com/zh-cn/", where: "base_url、模型名、请求体，全在这一页" },
            { name: "DeepSeek · 模型与价格", url: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing", where: "为什么 10 元够用；flash 和 v4-pro 差多少" },
            { name: "DeepSeek · 创建 API Key", url: "https://platform.deepseek.com/api_keys", where: "建 key 和充值只能网页操作，没有接口" },
          ],
          done: "浏览器里输入一句话，看到回答一个字一个字出现；并且你能指着 `server.mjs` 说出 key 在哪、浏览器为什么拿不到它。",
        },
        {
          id: "p1-1",
          title: "建工程骨架",
          brief: "用 uv 建项目、装依赖、确认能跑，顺便把目录结构定下来。",
          time: 2,
          do: [
            "装 uv：Windows 用 `powershell -c \"irm https://astral.sh/uv/install.ps1 | iex\"`，macOS 用 `brew install uv`；装完重开一个终端，`uv --version` 能打印就行",
            "`uv init --no-package kb-agent && cd kb-agent`，然后 `uv add fastapi \"uvicorn[standard]\" pydantic-settings`（必须带 `--no-package`：uv 0.13 默认建的是 `src/` 包结构加构建后端，`--app` 也一样，都不适合一个 Web 应用）",
            "`uv run python -c \"import fastapi; print(fastapi.__version__)\"` —— 能打印版本就说明环境通了。报 `应用程序控制策略已阻止此文件 (os error 4551)` 就做下一条",
            "**只在 Windows 开了「智能应用控制」时才需要**：uv 下载的 CPython 没签名，会被系统直接拦掉。换一个签名的：`winget install --id Python.Python.3.12 --scope user`，然后在 `pyproject.toml` 末尾加 `[tool.uv]` 和 `python-preference = \"only-system\"`，再 `uv venv --python \"$env:LOCALAPPDATA\\Programs\\Python\\Python312\\python.exe\" --clear`，最后 `uv sync`",
            "目录按这个摆：`app/main.py`（入口）、`app/models.py`、`app/db.py`、`app/routers/`、`tests/`，根目录放 `.env` 和 `.gitignore`",
            "先 commit 一次。后面每完成一步都 commit，出问题能回退。",
          ],
          learn: [
            "**uv 是什么**：相当于 npm + nvm 合体。`uv run` 自动激活虚拟环境再执行，不用手动 activate。",
            "**pyproject.toml ≈ package.json**，`uv.lock ≈ package-lock.json`，都是锁版本用。",
            "**虚拟环境**：Python 没有 node_modules 的概念，每个项目一个隔离的解释器环境，装在这个项目的 `.venv/` 里。",
            "**Python 装没装上去，别信 `python --version`**：Windows 上它可能指向 `WindowsApps\\python.exe`，那是个 0 字节的商店别名，敲了弹应用商店。用 `(Get-Command python).Source` 看路径，或直接 `uv python list`。",
            "**智能应用控制（Smart App Control）是 Windows 11 的一道坎**：它只放行有签名或有信誉的可执行文件。查一下就明白：`Get-AuthenticodeSignature .venv\\Scripts\\python.exe` 返回 `NotSigned`，那就是它。两条路——装签名版 Python 并锁 `only-system`（推荐，不动系统安全设置），或者关掉智能应用控制（注意：关了就回不去，要重装系统才能再打开）。",
          ],
          refs: [
            { name: "uv 官方文档", url: "https://docs.astral.sh/uv/", where: "Getting started 一节，看完就够" },
            { name: "Python 官方教程（中文）", url: "https://docs.python.org/zh-cn/3/tutorial/", where: "第 3–4 章：流程控制、函数" },
          ],
          done: "`uv run` 能打印 FastAPI 版本，仓库有一次 commit。",
        },
        {
          id: "p1-2",
          title: "第一个接口和自动文档",
          brief: "写十行代码，起一个服务，在浏览器里直接调通它。",
          time: 2,
          code: {
            file: "app/main.py",
            lang: "python",
            body: `from fastapi import FastAPI

app = FastAPI(title="kb-agent")

@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}`,
          },
          do: [
            "`uv run uvicorn app.main:app --reload` 起服务，访问 http://127.0.0.1:8000/docs",
            "在 /docs 页面上点 Try it out，直接执行 /health，看返回",
            "改一下返回值，不重启，观察 `--reload` 自动生效（相当于 nodemon）",
            "故意把 `-> dict[str, bool]` 改成返回字符串，看文档里的 schema 跟着变——这是类型注解在驱动文档",
          ],
          learn: [
            "**uvicorn 是服务器，FastAPI 是框架**：前者负责监听端口，后者负责路由和校验。类比 node 里的 http + express。",
            "**装饰器就是路由声明**：`@app.get(\"/x\")` 等价于 `app.get('/x', handler)`，写法不同，意思一样。",
            "**/docs 是自动生成的**，来自你写的类型注解，不是你手写的接口文档。这是后面所有接口调试的主战场。",
          ],
          refs: [
            { name: "FastAPI 中文 · 第一步", url: "https://fastapi.tiangolo.com/zh/tutorial/first-steps/", where: "整节，20 分钟" },
          ],
          done: "/docs 里能成功执行 /health，返回 `{\"ok\": true}`。",
        },
        {
          id: "p1-3",
          title: "用 Pydantic 定义数据结构",
          brief: "先把数据长什么样钉死，再写逻辑。这一层以后会一路用到最后的 Agent 工具参数。",
          time: 3,
          code: {
            file: "app/schemas.py",
            lang: "python",
            body: `from datetime import datetime
from pydantic import BaseModel, Field

class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    content: str = ""
    tags: list[str] = []

class Note(NoteCreate):
    id: int
    created_at: datetime`,
          },
          do: [
            "写 NoteCreate（用户传进来的）和 Note（返回给前端的）两个模型，后者多 id 和时间",
            "用 `Field` 给字段加约束：title 最短 1 最长 80，tags 最多 10 个",
            "发一个 title 为空字符串的请求到任意接口，读一遍 422 的响应体结构",
            "给 User 预留一个 password 字段，然后在响应模型里去掉它，理解为什么要有两套模型",
          ],
          learn: [
            "**模型即校验**：不用写 `if not title:`，类型和约束写在字段上，框架自动拦截。相当于 Zod。",
            "**输入模型和输出模型要分开**：同一个模型既收又发，迟早把密码、内部字段漏出去。",
            "**422 不是 bug**，是校验失败的标准响应，前端应该按它渲染表单错误。",
          ],
          refs: [
            { name: "Pydantic · Models", url: "https://pydantic.dev/docs/validation/latest/concepts/models/", where: "Models 与 Fields 两节" },
            { name: "FastAPI 中文 · 请求体", url: "https://fastapi.tiangolo.com/zh/tutorial/body/", where: "多个模型组合那部分" },
          ],
          done: "故意传错字段，能从 422 里一眼看出是哪个字段、错在哪。",
        },
        {
          id: "p1-4",
          title: "CRUD 五个接口（先存内存）",
          brief: "用 dict 当假数据库，先把接口形状定下来，别一上来就掺数据库。",
          time: 3,
          do: [
            "实现 POST /notes、GET /notes、GET /notes/{id}、PATCH /notes/{id}、DELETE /notes/{id}",
            "数据先放模块级的 `notes: dict[int, Note] = {}`，配一个自增 id",
            "找不到就 `raise HTTPException(404, \"note not found\")`，不要返回 null",
            "GET /notes 加 limit / offset 两个查询参数，默认 20 / 0",
            "在 /docs 里把五个接口按 增→查→改→删 顺序点一遍",
            "用 curl 压一遍时先看这条：PowerShell 5.1 把中文参数按 GBK 交给子进程，`curl -d '{\"title\":\"中文\"}'` 到后端就是乱码。把 body 写进 UTF-8 文件，再 `curl --data-binary \"@body.json\"`",
          ],
          learn: [
            "**REST 的语义**：GET 不改状态、POST 创建、PATCH 局部改、DELETE 删。状态码要对：201 创建成功、204 删除成功、404 不存在。",
            "**路径参数 vs 查询参数**：资源定位用路径（/notes/12），筛选分页用查询（?limit=20）。",
            "**为什么先存内存**：接口契约先验证一遍，改起来成本最低。这一步偷的懒后面能省很多返工。",
          ],
          refs: [
            { name: "FastAPI 中文 · 路径参数", url: "https://fastapi.tiangolo.com/zh/tutorial/path-params/", where: "类型转换与校验" },
            { name: "FastAPI 中文 · 查询参数", url: "https://fastapi.tiangolo.com/zh/tutorial/query-params/", where: "默认值与可选参数" },
          ],
          done: "五个接口都能在 /docs 里跑通，404 和 201 的行为一致。",
        },
        {
          id: "p1-5",
          title: "换成真数据库",
          brief: "SQLite + SQLAlchemy，把内存 dict 替换掉。这一步是本阶段唯一有难度的。",
          time: 5,
          code: {
            file: "app/db.py",
            lang: "python",
            body: `from collections.abc import Iterator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

engine = create_engine(
    "sqlite:///./data/app.db",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False)

def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()`,
          },
          do: [
            "`uv add sqlalchemy`，写 app/models.py：一个 NoteORM 表，字段跟 schema 对齐",
            "写 app/db.py（见代码），关键是 `get_db()` 这个生成器——请求进来给一个 session，请求结束一定关掉",
            "路由里用 `db: Session = Depends(get_db)` 拿到 session，把 dict 操作换成 `db.add / db.get / db.delete`",
            "重启服务，确认数据还在（这一步是内存版永远做不到的）",
            "故意把表名写错，看报错长什么样——以后你会经常见到 NoSuchTable",
          ],
          learn: [
            "**ORM 模型 ≠ Pydantic 模型**：ORM 描述表结构，Pydantic 描述接口数据。两套都要有，可以互相转换。",
            "**依赖注入解决的是资源生命周期**：你不用在每个路由里手写 try/finally 关闭连接。",
            "**Session 不是连接**：它是一个工作单元，操作攒着，commit 才落库。别在循环里反复 commit。",
          ],
          refs: [
            { name: "SQLAlchemy 2.0 ORM 快速上手", url: "https://docs.sqlalchemy.org/en/20/orm/quickstart.html", where: "整页，照着抄结构" },
            { name: "FastAPI 中文 · SQL 数据库", url: "https://fastapi.tiangolo.com/zh/tutorial/sql-databases/", where: "依赖注入 + session 那部分" },
          ],
          done: "重启服务后数据还在，接口行为跟内存版完全一致。",
        },
        {
          id: "p1-6",
          title: "错误处理、配置和日志",
          brief: "让出错时的表现可控。这一步做完，代码才从「能跑」变成「能用」。",
          time: 3,
          do: [
            "注册一个全局异常处理器，把未捕获异常统一转成 `{code, message, request_id}`",
            "用 pydantic-settings 写 Settings 类，从 .env 读 `DATABASE_URL`、`LOG_LEVEL`，代码里不再出现硬编码",
            "加一个中间件，给每个请求生成 request_id，放进日志和响应头",
            "把散落的 `print` 全换成 `logging.getLogger(__name__)`，日志里带上 request_id",
          ],
          learn: [
            "**中间件是洋葱模型**：请求从外到内穿过所有中间件，响应再从内到外回来。加鉴权、埋点、计时都在这层。",
            "**配置要从环境读**：写死在代码里的连接串，上线那天一定会出事。",
            "**日志要能串起来**：一次请求的所有日志带同一个 request_id，排查时才有意义。",
          ],
          refs: [
            { name: "FastAPI 中文 · 中间件", url: "https://fastapi.tiangolo.com/zh/tutorial/middleware/", where: "自定义中间件示例" },
            { name: "FastAPI 中文 · CORS", url: "https://fastapi.tiangolo.com/zh/tutorial/cors/", where: "下一步联调要用的" },
          ],
          done: "任意一种错误（字段非法、资源不存在、代码抛异常）返回的 JSON 结构一致，且带 request_id。",
        },
        {
          id: "p1-7",
          title: "前端最小页：列表 + 新建",
          brief: "用你熟的 Vite + React 做一个能用的界面。你的前端功底在这里就是优势，别省。",
          time: 4,
          do: [
            "`npm create vite@latest web -- --template react-ts`，起一个页面",
            "卡住不动（没输出、目录也没生成）就别跟它耗：手写 `package.json`、`index.html`、`vite.config.ts`、`src/` 四个东西，五分钟就有一个能跑的页面",
            "把 /notes 列表拉下来渲染，加一个新建表单，POST 完刷新列表",
            "三种状态都要做：加载中（骨架或转圈）、空列表（引导文案）、请求失败（可重试）",
            "后端加 CORSMiddleware，`allow_origins` 只写本地开发地址，别写 `*`",
          ],
          learn: [
            "**CORS 是浏览器行为**：后端允许了才放行，报错在浏览器控制台而不在后端日志。",
            "**接口契约先行**：后端 /docs 就是契约，前端照着它写类型，比靠猜快得多。",
            "**三种状态是基本功**：只做成功态的界面，一到真实网络环境就不能看了。",
          ],
          refs: [
            { name: "跨域资源共享 CORS 详解（阮一峰）", url: "https://www.ruanyifeng.com/blog/2016/04/cors.html", where: "简单请求与预检两段" },
          ],
          done: "页面上新增一条，刷新浏览器后还在。",
        },
        {
          id: "p1-8",
          title: "自测与收尾",
          brief: "写测试、砍掉没用的抽象、把启动方式写进 README。",
          time: 2,
          do: [
            "`uv add --dev pytest httpx`，写 tests/test_notes.py，用 TestClient 覆盖五个接口",
            "`uv run pytest -q`，跑到全绿",
            "报 `ModuleNotFoundError: app` 就在 `pyproject.toml` 里加 `[tool.pytest.ini_options]` 与 `pythonpath = [\".\"]`；测试里用 `with TestClient(app)`，否则 lifespan 不执行、建表根本没发生",
            "对着 FastAPI 官方教程的项目结构，删掉自己多写的抽象层（第一次做项目几乎一定会过度设计）",
            "README 写清：项目是什么、怎么起、怎么测、目录结构各放什么",
          ],
          learn: [
            "**TestClient 不需要真起服务**，它直接调用应用，快得多。",
            "**测试先覆盖「能跑通」的路径**，边界条件等有真实 bug 再补，别一上来追求覆盖率。",
          ],
          refs: [
            { name: "FastAPI 中文 · 测试", url: "https://fastapi.tiangolo.com/zh/tutorial/testing/", where: "TestClient 用法" },
          ],
          done: "`uv run pytest` 全绿，README 里三条命令就能让别人跑起来。",
        },
      ],
    },

    /* ============================ P2 ============================ */
    {
      id: "p2",
      no: "02",
      title: "接上大模型",
      goal: "调模型接口和调任何 REST API 没区别。真正新的东西只有三样：提示词怎么写、输出怎么控、字怎么一个字一个字地吐出来。",
      output: "v1 · 流式对话应用：多会话、历史落库、能中断生成、成本可见",
      label: "对话应用",
      steps: [
        {
          id: "p2-1",
          title: "跑通第一次调用",
          brief: "拿 key、发一条消息、看到计费数字。先把「神秘感」消掉。",
          time: 2,
          code: {
            file: "scratch/hello_llm.py",
            lang: "python",
            body: `from openai import OpenAI

client = OpenAI(
    api_key="sk-...",
    base_url="https://api.deepseek.com",   # 兼容 OpenAI 协议
)

resp = client.chat.completions.create(
    model="deepseek-flash",
    messages=[{"role": "user", "content": "用一句话解释 RAG"}],
)
print(resp.choices[0].message.content)
print(resp.usage)   # 计费就看这里`,
          },
          do: [
            "注册一个国内模型平台，充最低额度（10 元够玩很久），拿 API Key",
            "`uv add openai`，照代码跑通第一条消息——DeepSeek / 智谱 / 通义都兼容这个协议，换 base_url 和模型名即可",
            "打印 `resp.usage`，用「输入 token × 单价 + 输出 token × 单价」手算一次花了多少钱",
            "同一句话分别用 temperature=0 和 1 各跑三次，观察稳定性差异",
          ],
          learn: [
            "**messages 是有角色的数组**：system 定规矩、user 提问、assistant 是模型说过的话。多轮对话就是把历史一直往后追加。",
            "**token 不是字**：中文大约 1 字 ≈ 1–1.5 token，英文 1 词 ≈ 1.3 token。上下文窗口、计费、限流全都按 token 算。",
            "**temperature 控制随机性**：做抽取、分类这类任务用 0，做创意才调高。",
          ],
          refs: [
            { name: "DeepSeek API · 首次调用", url: "https://api-docs.deepseek.com/zh-cn/", where: "快速开始那节" },
            { name: "DeepSeek · 模型与价格", url: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing", where: "算成本用" },
          ],
          done: "能说出刚才那次调用花了多少钱，精确到分。",
        },
        {
          id: "p2-2",
          title: "把调用包一层",
          brief: "别在路由里直接调 SDK。抽一个 llm.py，以后换模型只改一处。",
          time: 3,
          do: [
            "写 app/llm.py：读 key 从 .env，模型名/base_url 也做成配置",
            "`uv add tenacity`，只对 5xx 和超时重试（3 次，指数退避）；4xx 直接抛出去，重试没意义",
            "定义自己的异常类型 LLMError，路由层统一转成 502，附上人话错误",
            "把 key 改成一个错的，确认接口返回的是可读错误而不是 500 堆栈",
          ],
          learn: [
            "**适配器模式**：业务代码只认「给我一段文本」这个接口，不认是哪家模型。这是能随时换模型的前提。",
            "**重试要有边界**：只重试可恢复的错（超时、限流、5xx），参数错误重试一万次也没用，只会放大账单。",
            "**密钥只从环境读**：写进代码再推到 GitHub，等于公开送人。",
          ],
          refs: [
            { name: "tenacity 文档", url: "https://tenacity.readthedocs.io/en/latest/", where: "retry 装饰器 + 异常过滤" },
          ],
          done: "换一个模型只需要改 .env，业务代码一行不动。",
        },
        {
          id: "p2-3",
          title: "提示词：system 与历史",
          brief: "写第一版能用的 system prompt，并实现 messages 的组装逻辑。",
          time: 3,
          do: [
            "写 system prompt，包含四件事：身份、任务边界、输出格式、禁止项（不要编造、不要寒暄）",
            "写 `build_messages(history, user_text)`：system 固定在最前，历史按时间顺序，超预算就从头丢",
            "同一个问题换三版 system（宽松 / 严格 / 带 few-shot），把输出差异记在一个 markdown 里",
            "专门试一个「诱导越界」的问题，看你的 system 能不能挡住",
          ],
          learn: [
            "**system 是全局约束，user 是单次输入**。规则写在 system，临时要求写在 user。",
            "**「不要做什么」比「要做什么」更有效**。写「只输出 JSON，不要解释」比「请尽量输出 JSON」强得多。",
            "**few-shot 是最稳的格式控制手段**：给两个输入输出样例，比描述十句规则管用。",
          ],
          refs: [
            { name: "吴恩达 · 提示工程短课", url: "https://www.deeplearning.ai/courses/chatgpt-prompt-eng", where: "Guidelines 两节，需要网络条件" },
            { name: "DeepSeek · 提示词实践", url: "https://api-docs.deepseek.com/zh-cn/guides/prompt_engineering", where: "官方给的写法建议" },
          ],
          done: "有一份「提示词版本 → 输出差异」的三组对比记录。",
        },
        {
          id: "p2-4",
          title: "结构化输出",
          brief: "让模型稳定吐 JSON，并且解析失败时能自己救回来。这是玩具和生产的分界线。",
          time: 4,
          code: {
            file: "app/structured.py",
            lang: "python",
            body: `class Answer(BaseModel):
    answer: str
    keywords: list[str]
    confidence: float = Field(ge=0, le=1)

raw = llm.complete(prompt)              # prompt 里明确：只输出 JSON
try:
    data = Answer.model_validate_json(raw)
except ValidationError as e:
    raw = llm.complete(f"{prompt}\\n\\n上次输出不合法：{e}\\n只输出合法 JSON。")
    data = Answer.model_validate_json(raw)   # 再失败就走降级分支`,
          },
          do: [
            "定义 Answer 模型，让模型输出 `{answer, keywords, confidence}`",
            "先试平台的 JSON mode / response_format；如果不支持或不够稳，用「提示词 + Pydantic 校验 + 失败重试一次」兜底",
            "解析失败时把原始文本打进日志——你会反复用到这些脏样本",
            "连跑 20 次，统计解析成功率，低于 95% 就回去改提示词",
          ],
          learn: [
            "**结构化输出不是模型能力，是工程约束**：模型只会生成文本，是你用 schema + 校验把它逼成结构。",
            "**要区分三种失败**：没输出 JSON、JSON 合法但字段不符、字段对但内容错。前两种能自动救，第三种只能靠评测。",
            "**解析失败必须降级**，不能直接 500——用户可以接受「这次没解析好」，不能接受白屏。",
          ],
          refs: [
            { name: "DeepSeek · JSON Output", url: "https://api-docs.deepseek.com/zh-cn/guides/json_mode", where: "注意它的限制条件" },
            { name: "Pydantic · JSON 解析", url: "https://pydantic.dev/docs/validation/latest/concepts/json/", where: "model_validate_json" },
          ],
          done: "20 次调用解析成功率 ≥ 95%，失败的都有日志。",
        },
        {
          id: "p2-5",
          title: "流式：后端吐字",
          brief: "把一次性返回改成一块一块推。SSE 格式只有一行规则，很好记。",
          time: 3,
          code: {
            file: "app/routers/chat.py",
            lang: "python",
            body: `@router.post("/chat/stream")
async def chat_stream(body: ChatIn):
    async def gen():
        async for piece in llm.astream(body.messages):
            payload = {"type": "delta", "text": piece}
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\\n\\n"
        yield 'data: {"type": "done"}\\n\\n'

    return StreamingResponse(gen(), media_type="text/event-stream")`,
          },
          do: [
            "用 StreamingResponse + 生成器实现流式接口，事件分三种：delta / done / error",
            "用 curl 直接看输出：`curl -N -X POST ... `，确认是一块一块出来的",
            "处理客户端断开：捕获 `asyncio.CancelledError`，把上游的模型请求也停掉，别让它继续烧钱",
            "加响应头 `X-Accel-Buffering: no`，否则上线后会被反向代理缓冲成一次性返回",
          ],
          learn: [
            "**SSE 格式**：每条消息 `data: xxx` 加两个换行结束。就这么简单，不用 WebSocket。",
            "**生成器就是流**：函数里 yield 一次，客户端就收到一段。框架负责把 yield 的东西刷出去。",
            "**断线要停上游**：不处理的话，用户关了页面，你的账单还在涨。",
          ],
          refs: [
            { name: "FastAPI · 自定义响应", url: "https://fastapi.tiangolo.com/zh/advanced/custom-response/", where: "StreamingResponse 那节" },
            { name: "DeepSeek · 流式输出", url: "https://api-docs.deepseek.com/zh-cn/api/create-chat-completion", where: "stream 与 stream_options 两个参数的定义" },
          ],
          done: "curl 能看到文字逐块到达，不是等半天一次性刷出来。",
        },
        {
          id: "p2-6",
          title: "流式：前端消费",
          brief: "前端自己解流、自己拼字。这里用 fetch 而不用 EventSource，原因在下面的知识点里。",
          time: 4,
          code: {
            file: "web/src/lib/stream.ts",
            lang: "ts",
            body: `const res = await fetch("/api/chat/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages }),
  signal: controller.signal,
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buf = "";

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });

  const parts = buf.split("\\n\\n");
  buf = parts.pop() ?? "";
  for (const p of parts) {
    if (!p.startsWith("data: ")) continue;
    const evt = JSON.parse(p.slice(6));
    if (evt.type === "delta") appendText(evt.text);
  }
}`,
          },
          do: [
            "按代码实现流式读取，注意 `decoder.decode(value, {stream: true})`——不加这个参数，中文会被从中间截断成乱码",
            "做一个「停止生成」按钮，用 AbortController 中断 fetch",
            "异常处理三件事：网络中断、流中途 error 事件、非 200 响应（先读 body 再说人话）",
            "自动滚到底部，但用户手动往上滚时不要抢滚动条",
          ],
          learn: [
            "**为什么不用 EventSource**：它只支持 GET、不能带自定义头、不能传 body。对话必须 POST，所以只能手动解流。",
            "**按 `\\n\\n` 切分是必须的**：一次 read 可能拿到半个事件，也可能拿到三个事件，必须以分隔符边界处理。",
            "**TextDecoder 的 stream 模式**：多字节字符可能跨 chunk，不做流式解码就会看到 `�`。",
          ],
          refs: [
            { name: "现代 JavaScript 教程 · fetch", url: "https://zh.javascript.info/fetch", where: "中止（AbortController）一节" },
            { name: "现代 JavaScript 教程 · 下载进度", url: "https://zh.javascript.info/fetch-progress", where: "read() 读流的最小示例" },
          ],
          done: "点停止能立刻中断，且后端日志显示上游请求也被取消。",
        },
        {
          id: "p2-7",
          title: "会话与历史",
          brief: "把对话存下来。这一步之后它才像一个产品，而不是一个演示页。",
          time: 3,
          do: [
            "建两张表：conversation（标题、时间）、message（role、content、token 数、conversation_id）",
            "POST /chat 带 conversation_id；没有就新建一个会话",
            "左侧会话列表 + 点击切换；标题先用首条消息前 20 字自动生成",
            "上下文裁剪：只带最近 N 轮，system 永远保留。用 `tiktoken` 估算 token 而不是数字符",
          ],
          learn: [
            "**上下文是预算**：窗口有限，历史越长越贵越慢。裁剪策略是产品决策，不是技术细节。",
            "**消息表要存 token 数**：不然后面算成本、做统计全得重算。",
          ],
          refs: [
            { name: "tiktoken（PyPI）", url: "https://pypi.org/project/tiktoken/", where: "装法与计数示例" },
          ],
          done: "刷新页面后会话还在，能点开历史接着聊。",
        },
        {
          id: "p2-8",
          title: "v1 验收",
          brief: "补一个成本面板，把这一阶段的东西串成一句能讲给人听的话。",
          time: 2,
          do: [
            "每次调用记录：模型、输入输出 token、耗时、是否流式，存到一张 usage 表",
            "页面底部显示「本次会话消耗 X tokens ≈ ¥Y」",
            "README 加一节：一次请求从点击到出字，中间经过哪五步",
            "录一段 30 秒演示，自己看一遍哪里卡",
          ],
          learn: [
            "**能讲清链路才算真会**：浏览器 → 你的 API → 模型 API → 流回前端，每一步都可能出问题。",
          ],
          refs: [],
          done: "不看笔记能讲清这五个步骤，并说出哪一步最容易出错。",
        },
      ],
    },

    /* ============================ P3 ============================ */
    {
      id: "p3",
      no: "03",
      title: "让模型读你的资料",
      goal: "RAG 的原理一句话就讲完了，难点全在脏活：怎么切、怎么检索准、怎么证明它准。这一阶段的价值在参数对比表和失败归因上；最后一步会把你放进别人的代码仓库，看看真实项目怎么分层。",
      output: "v2 · 文档问答：上传 → 切片 → 入库 → 带引用回答 → 有评测基线 + 一个外部仓库的提交",
      label: "文档问答",
      steps: [
        {
          id: "p3-1",
          title: "文档解析",
          brief: "把各种格式的文件变成干净纯文本。先做 md/txt，再加 PDF。",
          time: 3,
          do: [
            "支持 .md / .txt 先行，`uv add pypdf` 之后再支持 PDF",
            "清洗三件事：去掉页眉页脚重复行、合并被硬换行打断的句子、统一全角半角",
            "输出统一结构：`{doc_id, title, page, text}`",
            "拿 10 份不同来源的文档试，专门找编码问题（GBK 的 txt 在中国很常见）",
          ],
          learn: [
            "**抽取质量决定上限**：文本本来就脏，后面再好的模型也救不回来。这是 RAG 最容易被低估的一步。",
            "**编码要显式处理**：读文件时 `encoding=\"utf-8\"` 遇到 GBK 会直接抛错，要么探测要么让用户选。",
          ],
          refs: [
            { name: "pypdf 文档", url: "https://pypdf.readthedocs.io/en/stable/", where: "extract_text 用法与坑" },
          ],
          done: "10 份文档都能稳定抽出干净文本，肉眼读一遍没有粘连和乱码。",
        },
        {
          id: "p3-2",
          title: "自己写切分",
          brief: "三种策略各写一版，比一比谁切出来的片段更像「能独立回答问题的一段话」。",
          time: 3,
          code: {
            file: "app/split.py",
            lang: "python",
            body: `def split_fixed(text: str, size: int = 500, overlap: int = 80) -> list[str]:
    chunks, i = [], 0
    while i < len(text):
        chunks.append(text[i : i + size])
        i += size - overlap          # overlap 保证跨块的语义不断
    return chunks

# 再写两版：
# split_by_heading(text)  —— 按 Markdown 标题层级切，保留标题路径作为上下文
# split_by_sentence(text) —— 按句号聚合到目标长度，不切断句子`,
          },
          do: [
            "实现三版切分：定长+重叠、按标题层级、按句子边界聚合到目标长度",
            "同一份文档跑三版，把输出打出来人工读——你要找的是「这一段单独拿出来还能看懂吗」",
            "给每个 chunk 补元数据：doc_id、chunk_index、所在标题路径（这一条对检索质量影响很大）",
            "记录一个反例：某段被切断后，问题和答案落在了两块里，导致永远检索不到",
          ],
          learn: [
            "**chunk size 是权衡**：太小答案不完整，太大检索不精准还费 token。中文一般 300–800 字起步试。",
            "**overlap 是补丁**：重叠 10–20% 能缓解边界切断，代价是存储和重复召回。",
            "**保留标题路径**：把「第三章 > 3.2 部署」拼进 chunk 文本，检索命中率会明显变好。",
          ],
          refs: [
            { name: "LangChain · 文本切分", url: "https://docs.langchain.com/oss/python/integrations/splitters/", where: "看它怎么划分策略，别直接用" },
          ],
          done: "有一张三种策略的对比表，能说出你选哪种、为什么。",
        },
        {
          id: "p3-3",
          title: "向量化，先用 numpy 硬算",
          brief: "不上向量库，先用几十行代码把「embedding + 余弦相似度」这件事彻底弄明白。",
          time: 3,
          code: {
            file: "scratch/vec.py",
            lang: "python",
            body: `import numpy as np

def top_k(q_vec, doc_vecs, k=3):
    q = np.asarray(q_vec, dtype=float)
    D = np.asarray(doc_vecs, dtype=float)
    q /= np.linalg.norm(q)
    D /= np.linalg.norm(D, axis=1, keepdims=True)
    scores = D @ q                       # 归一化后点积 = 余弦相似度
    return scores.argsort()[-k:][::-1], scores`,
          },
          do: [
            "选一个 embedding 服务（阿里百炼 text-embedding 系列，或本地跑 `BAAI/bge-small-zh`），先把每段文本转成向量",
            "把向量存成 numpy 数组，用上面的代码做暴力检索——几百条数据完全够用",
            "输入一个问题，打印 top3 片段和分数，人工判断相关性",
            "故意问一个知识库里没有的问题，观察最高分是多少——这个数以后用来定阈值",
          ],
          learn: [
            "**embedding 就是把文本压成一串数字**，语义相近的向量方向相近。不涉及任何你不需要理解的数学。",
            "**归一化后，点积 = 余弦相似度**。所以向量库里的 COSINE 距离，本质上就是算夹角。",
            "**小数据量不需要向量库**：几百条用 numpy 更快更透明，先跑通再换工具。",
          ],
          refs: [
            { name: "阿里云百炼 · 向量模型", url: "https://help.aliyun.com/zh/model-studio/embedding", where: "text-embedding 接口与维度" },
          ],
          done: "输入一句话，能返回 3 条最相关片段，且你认可排序合理。",
        },
        {
          id: "p3-4",
          title: "换成向量库",
          brief: "数据量一大就要索引。Qdrant 一条 docker 命令起来，API 比想象中简单。",
          time: 4,
          code: {
            file: "app/vector_store.py",
            lang: "python",
            body: `from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

client = QdrantClient(url="http://localhost:6333")
DIM = 1024                                    # 必须和 embedding 输出维度一致

client.recreate_collection(
    "kb", vectors_config=VectorParams(size=DIM, distance=Distance.COSINE)
)
client.upsert("kb", points=[
    PointStruct(id=1, vector=vec,
                payload={"doc_id": "a", "chunk_index": 3, "text": "..."}),
])
hits = client.search("kb", query_vector=q_vec, limit=5)`,
          },
          do: [
            "`docker run -p 6333:6333 -v $(pwd)/qdrant:/qdrant/storage qdrant/qdrant` 起服务",
            "`uv add qdrant-client`，建 collection，维度一定对上（对不上会直接报错，记住这个错）",
            "批量 upsert，payload 里存 doc_id、chunk_index、原文——后面做引用全靠它",
            "加过滤检索：只在某一个文档内搜，用 `filter` 而不是搜完再筛",
          ],
          learn: [
            "**collection / point / payload**：集合≈表，点≈行，payload≈任意 JSON 字段，可以过滤。",
            "**过滤要在检索时做**，不是召回后再过滤——后者会让 top_k 名不副实。",
            "**维度必须一致**：换 embedding 模型就得重建集合，这是最常见的踩坑点。",
          ],
          refs: [
            { name: "Qdrant · Quickstart", url: "https://qdrant.tech/documentation/quickstart/", where: "建集合与检索" },
            { name: "Qdrant · Filtering", url: "https://qdrant.tech/documentation/search/filtering/", where: "按 payload 过滤" },
          ],
          done: "检索结果与 numpy 版基本一致，且能按 doc_id 过滤。",
        },
        {
          id: "p3-5",
          title: "最小 RAG 闭环",
          brief: "把检索和生成接起来。代码不超过 50 行，但它就是 RAG 的全部。",
          time: 4,
          code: {
            file: "app/rag.py",
            lang: "text",
            body: `你是资料问答助手。只依据下面提供的资料回答。
资料不足时，直接回答「资料里没有提到」，不要推测。
每条结论后用 [n] 标注来源编号。

资料：
[1] （chunk 文本）
[2] （chunk 文本）

问题：（用户问题）`,
          },
          do: [
            "实现 `answer(question)`：问题 → embedding → 检索 top_k → 拼上下文 → 调模型 → 返回",
            "prompt 按代码那样写，三句话缺一不可：只依据资料、不知道就说不知道、标注来源编号",
            "把「检索到的片段」和「最终拼好的 prompt」都打日志——调试 RAG 时你只看这两样东西",
            "问三类问题验证：文档里的细节、文档里没有的、需要跨两段拼接的",
          ],
          learn: [
            "**RAG = 检索 + 拼上下文 + 生成**，没有更多魔法。所有优化都在「检索准不准」和「上下文干净不干净」上。",
            "**「不知道就说不知道」必须写进 prompt**，否则模型会用训练知识把空档填满，这就是幻觉的主要来源。",
            "**日志是调试入口**：答错时先看检索有没有拿到正确片段，再看模型有没有用好它。",
          ],
          refs: [
            { name: "LangChain · RAG 教程", url: "https://docs.langchain.com/oss/python/langchain/knowledge-base", where: "对照自己的实现，别照抄" },
            { name: "Anthropic · Contextual Retrieval", url: "https://www.anthropic.com/research/contextual-retrieval", where: "为什么上下文补全有效" },
          ],
          done: "问文档细节能答对，问文档外的问题会说「资料里没有」。",
        },
        {
          id: "p3-6",
          title: "加引用，能点开原文",
          brief: "让每个结论都能追溯。这是 RAG 产品可信度的来源，也是前端能做出差异的地方。",
          time: 3,
          do: [
            "后端返回结构里带上 `citations: [{n, doc_id, chunk_index, text}]`",
            "校验模型输出的编号：引用了不存在的编号就丢掉，降级为无引用回答（模型经常瞎编号）",
            "前端把 [1][2] 渲染成可点角标，点开显示原文片段并高亮关键词",
            "加一个「这段话出自《xx》第 3 段」，比只给编号可信得多",
          ],
          learn: [
            "**引用要能反查**：只存编号没用，必须能映射回具体 chunk 和原文位置。",
            "**模型会伪造引用**，所以编号校验必须在后端做，不能信模型。",
          ],
          refs: [],
          done: "每条回答的角标都能点开，看到对应的原文片段。",
        },
        {
          id: "p3-7",
          title: "调参对比 + 重排",
          brief: "固定一批问题，把参数挨个跑一遍，用表格说话而不是感觉。",
          time: 5,
          do: [
            "准备 20 个问题，写清标准答案和「应该命中哪个 chunk」",
            "跑网格：chunk_size（300/500/800）× top_k（3/5/8）× 阈值（0.3/0.5/0.7），记录命中率",
            "加 rerank（bge-reranker 或平台 rerank 接口）：召回 20 条 → 精排取前 5，对比前后差异",
            "试混合检索：向量 + BM25 关键词，看专有名词类问题是否变好",
          ],
          learn: [
            "**召回和精排是两件事**：先多捞（召回率高），再精挑（精度高）。rerank 就是第二步。",
            "**参数没有普适最优**，只有你这批数据上的最优。所以必须自己跑表。",
            "**混合检索解决的是专有名词**：向量抓不住「XH-2026 型号」这种词，BM25 能。",
          ],
          refs: [
            { name: "Qdrant · Hybrid Search", url: "https://qdrant.tech/documentation/search/hybrid-queries/", where: "稀疏+稠密组合" },
          ],
          done: "有一张参数对比表，最优组合比初始版本提升了多少，有具体数字。",
        },
        {
          id: "p3-8",
          title: "评测与失败归因",
          brief: "给系统打一个基线分，然后把答错的问题分类。这一步决定你面试时能不能聊得深。",
          time: 4,
          do: [
            "把 20 题整理成 JSON 基准集，写 `run_eval.py` 一键跑完输出报告",
            "记录两个指标：答案正确率、引用正确率（引用的片段是否真的支撑答案）",
            "把失败案例分四类：切太碎 / 没检索到 / 检索到但没答对 / 幻觉。统计占比",
            "用 RAGAS 跑一遍官方指标，跟自己的判断对一对，看差在哪",
          ],
          learn: [
            "**评测集要自己造**：公开榜单和你的文档没关系，能代表你场景的只有你自己出的题。",
            "**归因比分数重要**：知道 60% 的错来自「没检索到」，你就知道该调检索而不是换模型。",
          ],
          refs: [
            { name: "RAGAS 文档", url: "https://docs.ragas.io/en/stable/", where: "faithfulness / context recall 的定义" },
          ],
          done: "有基线分 + 失败分类占比，写进 README，改动后能重跑对比。",
        },
        {
          id: "p3-9",
          title: "出去看看：给别人的项目改一处",
          brief: "会自己搭，和能在陌生代码里改东西，是两种能力。这一节补后者，也是作品集里最不像教程作业的东西。",
          time: 8,
          code: {
            file: "PowerShell · 两个入口，选一个（都不需要 Docker）",
            lang: "powershell",
            body: `# A. open-webui（首选：Python 后端，分层清晰，不需要 Docker）
#    前提：Python 3.12（见 p1-1 装好的 uv）
pip install open-webui
$env:OPENAI_API_BASE_URL = "https://api.deepseek.com"
$env:OPENAI_API_KEY = "sk-你的key"
open-webui serve            # 默认 http://localhost:8080

# B. lobe-chat（备选：Next.js，纯前端视角）
#    注意：lobe-chat 仓库已并入 lobehub/lobehub 单仓，
#    clone 后按它 README 进对应子目录，用 pnpm 起开发环境
git clone https://github.com/lobehub/lobehub.git`,
          },
          do: [
            "选一个你真会用的项目。本机现在没有 Docker，所以优先 `open-webui`（Python，`pip install` 就能跑）；想看纯前端的选 `lobe-chat`（仓库已并入 `lobehub/lobehub` 单仓）。`Dify` 和 `RAGFlow` 必须 Docker，等第 5 阶段装了再说",
            "先用代码块把它跑到能聊天，并且改用你自己的 DeepSeek key —— 能用自己的 key 说话，才算真的看懂了它的调用链",
            "读目录：路由在哪、模型调用被包在哪一层、前端是怎么拿到流的（跟你第 2 阶段写的那套对比）",
            "从 issues 里筛 `good first issue` 或带 bug 标签的，挑一个 30 行以内能改完的",
            "定位 → 改 → 补一个测试 → 提 PR；被拒也不亏，把 review 意见读完再关掉",
            "写 300 字：这个仓库怎么分层，和你自己搭的差在哪",
          ],
          learn: [
            "**读代码比写代码更快建立品味**：没见过「正常项目长什么样」，就会一直过度设计自己的。",
            "**分层是可以抄的**：路由 → 服务 → 仓储 → 模型，几乎所有后端都这么切，你缺的只是看过一遍。",
            "**所有 AI 应用都长一个样**：浏览器 → 你的后端（存 key）→ 模型厂商。区别只在中间那一层怎么切，看懂一个，剩下的都是换皮。",
            "**PR 被拒是免费 review**：陌生维护者的三句话，比自己琢磨一周有用。",
          ],
          refs: [
            { name: "open-webui", url: "https://github.com/open-webui/open-webui", where: "先看目录结构，再翻 issues" },
            { name: "lobe-chat（已并入 lobehub 单仓）", url: "https://github.com/lobehub/lobehub", where: "原生支持 DeepSeek，.env.example 里有现成配置项" },
            { name: "Dify", url: "https://github.com/langgenius/dify", where: "必须 Docker，先只读代码，第 5 阶段再跑" },
          ],
          done: "有一个提交记录（PR 或 fork 上的 commit），并能说出这个项目分了几层、每层管什么。",
        },
      ],
    },

    /* ============================ P4 ============================ */
    {
      id: "p4",
      no: "04",
      title: "让它会动手",
      goal: "从「会回答」到「会做事」。坑几乎全在「模型不按你想的走」上——工具瞎调、循环不停、错了不认。这一阶段只占全线五分之一：Agent 的技术含量集中在手写循环那几步，框架够用就行，别在这里耗两周。",
      output: "v3 · 知识库 Agent：多步完成任务、工具日志可见、关键动作要确认",
      label: "工具调用",
      steps: [
        {
          id: "p4-1",
          title: "手写第一个工具调用",
          brief: "不用任何框架，把 function calling 的消息流转看清楚。这是整章的地基。",
          time: 3,
          code: {
            file: "scratch/tool_call.py",
            lang: "python",
            body: `tools = [{
    "type": "function",
    "function": {
        "name": "search_kb",
        "description": "在用户上传的资料库里检索相关片段。用户问到自己资料的内容时用它。",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "检索关键词，尽量具体"},
            },
            "required": ["query"],
        },
    },
}]

r = client.chat.completions.create(
    model="deepseek-flash", messages=msgs, tools=tools
)
# r.choices[0].message.tool_calls 里就是模型「点的菜」`,
          },
          do: [
            "定义 search_kb 一个工具，description 写清「什么时候该用」和「参数怎么填」",
            "调一次，观察返回的 `tool_calls`（里面只有函数名和 JSON 参数，没有执行结果）",
            "自己执行这个函数，把结果以 `{\"role\": \"tool\", \"tool_call_id\": ..., \"content\": ...}` 追加进 messages",
            "再请求一次，拿到最终回答。把完整的四段消息流打印出来看一遍",
          ],
          learn: [
            "**模型只点菜，不做菜**：它输出「调用 search_kb，参数是 X」，真正执行的是你的代码。理解这一点，Agent 就没有神秘感了。",
            "**tool_call_id 必须回填**：模型靠它把结果和请求对上，缺了会报错或乱答。",
            "**description 就是提示词**：写得含糊，模型该调的时候不调、不该调的时候乱调。",
          ],
          refs: [
            { name: "DeepSeek · Function Calling", url: "https://api-docs.deepseek.com/zh-cn/guides/function_calling", where: "完整请求响应示例" },
            { name: "Anthropic · Building Effective Agents", url: "https://www.anthropic.com/research/building-effective-agents", where: "先读这篇，能少走一半弯路" },
          ],
          done: "能打印出 user → assistant(tool_calls) → tool → assistant 的完整四段消息流。",
        },
        {
          id: "p4-2",
          title: "设计三个工具",
          brief: "工具的颗粒度决定 Agent 好不好用。太细它调不动，太粗你控不住。",
          time: 4,
          do: [
            "实现三个：`search_kb`（检索你的知识库）、`get_current_time`（模型不知道现在几点）、`calculate`（算数别让它心算）",
            "返回结构统一成 `{ok, data, error}`，模型才好判断成功失败",
            "参数校验用 Pydantic，非法参数返回结构化错误而不是抛异常",
            "单独给每个工具写小测试，别等集成时再调",
          ],
          learn: [
            "**工具是给模型用的 API**，不是给人用的。错误信息要写成人话，模型能读懂并自我纠正。",
            "**别让模型做它不擅长的事**：算数、取当前时间、查数据库，一律做成工具。",
            "**工具要有副作用分级**：只读的随便调，写操作必须确认。",
          ],
          refs: [
            { name: "LangChain · Tool Calling", url: "https://docs.langchain.com/oss/python/langchain/tools", where: "对照它怎么定义 schema" },
          ],
          done: "三个工具单独都能调通，传错参数能看到可读的错误。",
        },
        {
          id: "p4-3",
          title: "Agent 循环",
          brief: "一个 while 循环，加上终止条件，就是 Agent 的心脏。",
          time: 5,
          code: {
            file: "app/agent.py",
            lang: "python",
            body: `MAX_STEPS = 8

for step in range(MAX_STEPS):
    r = client.chat.completions.create(model=M, messages=msgs, tools=tools)
    msg = r.choices[0].message

    if not msg.tool_calls:              # 模型给出最终答案，收敛
        return msg.content

    msgs.append(msg)
    for call in msg.tool_calls:
        try:
            args = json.loads(call.function.arguments)
            out = run_tool(call.function.name, args)
        except Exception as e:
            out = {"ok": False, "error": str(e)}   # 失败也回填，让模型自己补救
        msgs.append({
            "role": "tool",
            "tool_call_id": call.id,
            "content": json.dumps(out, ensure_ascii=False),
        })

return "这一步没收敛，需要人工看一下"`,
          },
          do: [
            "按代码实现循环，三种终止都要有：拿到最终答案、达到步数上限、连续工具失败",
            "每轮把「这一步调了什么工具、参数是什么、结果多大」写进日志",
            "设计一个需要三步才能完成的问题（先检索 → 再算数 → 再总结），看它能不能自己跑完",
            "故意让工具返回空结果，观察模型是重试、换参数，还是硬编一个答案",
          ],
          learn: [
            "**ReAct = 想 → 做 → 看 → 再想**，本质就是这个循环。框架只是帮你把状态管理好。",
            "**必须有步数上限**：没有上限的 Agent 遇到工具一直失败，会烧到你的额度见底。",
            "**失败也要回填**：把错误当观察结果喂回去，模型往往能自己换条路。这比直接抛异常给用户强。",
          ],
          refs: [
            { name: "Anthropic · Building Effective Agents", url: "https://www.anthropic.com/research/building-effective-agents", where: "Workflows vs Agents 那节" },
          ],
          done: "一个三步任务能自动跑完，日志能还原它每一步在想什么。",
        },
        {
          id: "p4-4",
          title: "把失败当常态处理",
          brief: "工具会超时、会返回垃圾、会被模型瞎调。怎么让它优雅地不行，是这一节的主题。",
          time: 4,
          do: [
            "给每个工具加超时（如 10 秒）和重试（只对网络类错误）",
            "写一个「工具降级」：search_kb 挂了就退回只用模型知识回答，并在答复里说明",
            "关键动作（比如写文件、发请求）前暂停，要求用户确认后再继续",
            "统计一类数据：一次任务平均调几次工具、失败率多少。这数据面试很吃香",
          ],
          learn: [
            "**human-in-the-loop 不是可选项**：涉及不可逆操作，必须留人工确认的口子。",
            "**降级优于报错**：用户要的是答案，不是堆栈。能在低配模式下给出部分结果，就别整个失败。",
          ],
          refs: [],
          done: "故意把工具改成必失败，Agent 能降级给出可用回答而不是崩掉。",
        },
        {
          id: "p4-5",
          title: "用 LangGraph 重写",
          brief: "把你手写的循环翻译成状态机。目的是可读、可暂停、可恢复。",
          time: 6,
          code: {
            file: "app/graph.py",
            lang: "python",
            body: `from langgraph.graph import StateGraph, END

g = StateGraph(State)
g.add_node("llm", call_model)       # 调模型，产出 tool_calls 或最终答案
g.add_node("tools", run_tools)      # 执行工具，把结果写回 state
g.set_entry_point("llm")
g.add_conditional_edges(
    "llm",
    lambda s: "tools" if s["tool_calls"] else END,
)
g.add_edge("tools", "llm")          # 工具执行完回到模型
app = g.compile()`,
          },
          do: [
            "定义 State（messages、tool_calls、step 计数），把原来的循环拆成两个节点",
            "用条件边决定「继续调工具」还是「结束」",
            "加 checkpointer（MemorySaver 起步），让同一个 thread_id 能接着上次的状态跑",
            "同样的任务在新实现下跑一遍，确认行为一致，再对比代码可读性",
          ],
          learn: [
            "**状态机 vs while 循环**：循环里所有东西都是隐式的，状态机把「当前在哪、下一步去哪」显式写出来，能画图、能暂停、能恢复。",
            "**节点只做一件事**：调模型的节点不碰数据库，跑工具的节点不碰 prompt。分开才可测。",
            "**checkpointer 是断点续跑的基础**：长任务跑到一半挂了，能从上次状态继续。",
          ],
          refs: [
            { name: "LangGraph · 概念", url: "https://langchain-ai.github.io/langgraph/concepts/low_level/", where: "State / Node / Edge 三节" },
            { name: "LangGraph · 快速开始", url: "https://langchain-ai.github.io/langgraph/", where: "跟着跑一个最小例子" },
          ],
          done: "同一任务在新旧实现下行为一致，且你能画出这张状态图。",
        },
        {
          id: "p4-6",
          title: "长任务与记忆",
          brief: "20 轮之后还记不记得开头说的话？上下文预算要开始管了。",
          time: 5,
          do: [
            "实现历史压缩：超过 N 轮就把早期对话用模型总结成一段「前情提要」",
            "把中间结果（检索到的片段、算过的数）存在 state 里，别反复重算",
            "测试：让它记住第 1 轮设定的约束，到第 20 轮还在遵守",
            "记一次真实的长任务 token 消耗，看压缩前后差多少",
          ],
          learn: [
            "**记忆不是无限追加**：无脑堆历史，成本线性涨、效果反而下降（噪声变多）。",
            "**摘要压缩会丢细节**，所以关键事实（用户明确的约束）要单独存成结构化字段，不靠摘要。",
          ],
          refs: [],
          done: "20 轮对话后仍记得开头的约束，token 消耗比不压缩低 30% 以上。",
        },
        {
          id: "p4-7",
          title: "接一个现成工具：MCP",
          brief: "MCP 解决的是「工具不用重复写」。你自己写一个 server，再挂到外部客户端里用。",
          time: 5,
          do: [
            "先读 Introduction，搞清 host / client / server 三个角色分别是什么",
            "用 Python SDK 写一个 stdio server，把你的 search_kb 暴露成 MCP 工具",
            "在你的 Agent 里挂上它，确认能像普通工具一样调",
            "再挂到任意支持 MCP 的客户端里，验证「一次实现，多处使用」",
          ],
          learn: [
            "**MCP 是工具层的标准协议**，跟模型无关。写好一个 server，任何支持 MCP 的客户端都能用。",
            "**stdio 适合本地**（进程间通信），HTTP/SSE 适合远程共享。选哪个看部署形态。",
          ],
          refs: [
            { name: "MCP · 介绍", url: "https://modelcontextprotocol.io/docs/getting-started/intro", where: "架构那张图" },
            { name: "MCP · 写一个 server", url: "https://modelcontextprotocol.io/docs/develop/build-server", where: "Python 版本，照着跑一遍" },
          ],
          done: "同一个工具既能在你的 Agent 里调，也能在外部客户端里调。",
        },
        {
          id: "p4-8",
          title: "v3 验收",
          brief: "做一个能看到 Agent 在想什么的日志面板，然后录一段能给人看的演示。",
          time: 4,
          do: [
            "前端加一个可折叠的「执行过程」：每一步的工具名、参数、耗时、token",
            "把失败步骤标红，让人一眼看到它在哪卡住",
            "录一段 3 分钟演示：说出任务 → 它拆步 → 调工具 → 给结论",
            "找个不懂技术的朋友看一遍，问他「它在干什么」，看能不能答上来",
          ],
          learn: [
            "**可观测性就是这个产品的信任来源**：用户看不到过程，就不会信任结果。",
          ],
          refs: [],
          done: "陌生人看完演示能说清它在做什么，以及为什么可信。",
        },
      ],
    },

    /* ============================ P5 ============================ */
    {
      id: "p5",
      no: "05",
      title: "上线与作品集",
      goal: "把 demo 变成能交付的东西。这一段决定你是「会调接口」，还是「能负责一个 AI 功能上线」。",
      output: "v4 · 线上可访问的完整产品 + 架构文档 + 能过面试的项目叙述",
      label: "上线交付",
      steps: [
        {
          id: "p5-1",
          title: "建评测集与回归脚本",
          brief: "主观感觉不算数，一条命令能出分数的东西才算数。",
          time: 4,
          do: [
            "把 P3 的 20 题扩到 40 题，覆盖：文档问答、工具调用、拒绝回答、多轮指代",
            "`run_eval.py` 一条命令跑完，输出 JSON 报告 + 一张 markdown 表格",
            "结果按日期存档，能看历史趋势（`eval/2026-11-03.json`）",
            "把它接进 pre-push 钩子或 CI，改提示词必跑",
          ],
          learn: [
            "**评测集是你的资产**，比代码更值钱：换模型、换框架时，它是唯一能告诉你「变好了还是变差了」的东西。",
          ],
          refs: [
            { name: "RAGAS", url: "https://docs.ragas.io/en/stable/", where: "指标定义，自己实现也不难" },
          ],
          done: "一条命令出分数，两次改动之间能对比。",
        },
        {
          id: "p5-2",
          title: "成本与延迟",
          brief: "把每次调用的钱和秒数算清楚，然后砍掉一半。",
          time: 4,
          do: [
            "统计每个请求的 P50/P95 延迟和平均成本，找出最贵的那类请求",
            "做模型路由：简单问题（分类、抽取、改写）走便宜模型，复杂推理才升级",
            "加缓存：完全相同的输入直接返结果（哈希存起来），命中率统计出来",
            "优化串行：能并行的检索、工具调用并行跑",
          ],
          learn: [
            "**成本优化的大头永远是「少调用」**，不是「换便宜模型」。缓存和路由加起来通常能砍掉一半。",
            "**P95 才是体验**：平均值好看没用，慢的那 5% 决定用户骂不骂你。",
          ],
          refs: [],
          done: "成本降幅和 P95 改善都有具体数字，写进 README。",
        },
        {
          id: "p5-3",
          title: "稳定性",
          brief: "假设模型接口一定会挂、用户一定会乱点。",
          time: 4,
          do: [
            "限流：按用户/IP 每分钟请求数限制，超了返回 429 和明确提示",
            "超时 + 重试 + 熔断：连续失败就短暂停止调用，避免雪崩",
            "降级文案：模型不可用时显示什么，别让用户看白屏",
            "错误日志可检索：按 request_id 能串起整条链路",
          ],
          learn: [
            "**AI 功能的失败是常态**，不是异常。上游限流、超时、返回空，每天都会发生。",
            "**用户能接受「稍后再试」，不能接受「什么都不发生」**，所以每个失败路径都要有文案。",
          ],
          refs: [],
          done: "断开模型接口，用户看到的是人话提示，不是 500。",
        },
        {
          id: "p5-4",
          title: "Docker 化并部署",
          brief: "拿到一个别人能打开的公网地址。这是作品集的入场券。",
          time: 6,
          code: {
            file: "Dockerfile",
            lang: "docker",
            body: `FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen --no-dev
COPY . .
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`,
          },
          do: [
            "写 Dockerfile（前端先 `npm run build` 出静态文件，交给后端或 Nginx 托管）",
            "docker compose 编排 app + qdrant，用一个 `.env` 管密钥，`.env` 一定进 .gitignore",
            "买一台轻量云服务器（2C4G 足够），装 docker，拉代码，`docker compose up -d`",
            "域名解析 + HTTPS（Caddy 两行配置自动签证书），确认手机 4G 下能打开",
          ],
          learn: [
            "**部署是最快的成长**：本地跑通和线上跑通之间，差了环境变量、端口、反向代理、时区、文件权限五件事。",
            "**密钥永远不进仓库**，用环境变量或服务器上的 .env，出事时先 rotate 再排查。",
          ],
          refs: [
            { name: "Docker 文档 · Get started", url: "https://docs.docker.com/get-started/", where: "先是概念，再是 Dockerfile" },
            { name: "Caddy 文档", url: "https://caddyserver.com/docs/", where: "自动 HTTPS 配置" },
          ],
          done: "公网 URL 能打开，手机流量下也能用。",
        },
        {
          id: "p5-5",
          title: "前端打磨",
          brief: "你的差异化就在这。后端人人都能照抄，界面体验抄不走。",
          time: 5,
          do: [
            "补齐四态：空态、加载（骨架屏）、失败（可重试）、部分成功（降级提示）",
            "对话里的代码块高亮、引用可折叠、长回答可收起",
            "移动端适配：输入框固定底部、键盘弹起不遮挡",
            "把首屏加载压到 2 秒内（分包、图片压缩、字体子集化）",
          ],
          learn: [
            "**AI 产品的前端难点在「不确定性」**：结果长度不定、时间不定、可能失败，界面要能承接这些。",
          ],
          refs: [],
          done: "你能直接把链接发给一个陌生人，不用在旁边解释怎么用。",
        },
        {
          id: "p5-6",
          title: "拉三个真人用一遍",
          brief: "自己用一百遍，不如看一个陌生人用一次。这一步产出的是真实失败清单，后面所有文档都靠它。",
          time: 4,
          code: {
            file: "PowerShell · 先算账装阀门，再把人叫来",
            lang: "powershell",
            body: `# 一、先算清楚三个人要花你多少钱（deepseek-flash，高峰价）
$in = 2.0; $out = 8.0
$perAsk = 3000/1e6*$in + 500/1e6*$out      # 一次问答：输入 3000 token、输出 500 token
"单次 {0:N4} 元，15 次约 {1:N2} 元" -f $perAsk, ($perAsk*15)

# 结论：真人测试本身不贵，贵的是「没人管」。所以先装阀门，再给人地址：

# 二、每次请求都带死这两项（你的 /chat 接口里）
#   max_tokens: 800                          ← 输出上限，防止一句“继续写”跑掉几千 token
#   stream_options: { include_usage: true }   ← 拿到本次真实 usage，写进日志，收工对账
# 另外：用一个新的、只给这次测试用的 key，出事直接吊销

# 三、反馈记录表（一人一份，直接复制到 md 或表格里）
测试者：      职业：        设备：
1. 第一个卡住的地方（原话）：
2. 哪句话没看懂：
3. 哪个回答他不信：
4. 有没有超过 10 秒没反应：
5. 会不会推荐给同事（1-5）：`,
          },
          do: [
            "上线前先把钱包阀门装上：每次请求 `max_tokens: 800`、单日总额设上限、单独开一个只给测试用的 key",
            "找三个不是程序员的人（同事、家人、朋友），把公网地址发过去，让他们自己传自己的资料、自己问五个问题",
            "全程不指导，只记录：第一个卡点在哪、哪句话没看懂、哪个回答他不信、有没有一次超过 10 秒不出字",
            "收满 20 条，按出现次数排序，只改前 5 条 —— 剩下的写进「已知问题」",
            "算一笔账：三个人 × 五轮 ≈ 0.15 元（代码块里有算式），但真正烧钱的是无人值守，所以上限比压单价重要",
            "把最刺眼的那条反馈原话抄进 README，别美化",
          ],
          learn: [
            "**你自己不是用户**：你知道输入框在哪、知道引用能点，所以你踩不到的坑你会以为不存在。",
            "**只改前 5 条**：长尾修不完，先修「让人不想继续用」的那一类。",
            "**真人测试是第一次真实花钱**：前四步的成本都是你自己可控的，这一步别人点一下按钮就扣你的钱，阀门必须先装。",
            "**真实吐槽是最硬的素材**：「有个用户说看不懂引用编号，我改成了书名加段落」，比任何技术描述都可信。",
          ],
          refs: [
            { name: "DeepSeek · 模型与价格", url: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing", where: "自己重算一遍单价；注意空闲时段是高峰的一半" },
            { name: "DeepSeek · 限速与隔离", url: "https://api-docs.deepseek.com/zh-cn/quick_start/rate_limit", where: "并发上限多少，超了会怎样" },
            { name: "DeepSeek · 错误码", url: "https://api-docs.deepseek.com/zh-cn/quick_start/error_codes", where: "402 余额不足、429 限流，分别该怎么降级" },
          ],
          done: "有 20 条原始反馈、一份排序后的修改清单，前 5 条已上线，且钱包阀门的截图存进了项目文档。",
        },
        {
          id: "p5-7",
          title: "架构文档",
          brief: "证明你会设计，而不只是会调接口。",
          time: 4,
          do: [
            "画一张架构图：请求链路 + 数据流 + 外部依赖，标清每个环节的失败会怎样",
            "写选型理由：为什么这个向量库、为什么这个切分策略、为什么不用框架",
            "写已知问题：现在做不到什么、什么情况下会出错（这条最加分，说明你真跑过）",
            "写一页「成本与性能」：单请求成本、P95 延迟、评测分数",
          ],
          learn: [
            "**写「已知问题」比写「技术亮点」更能建立信任**。面试官一眼能看出谁真做过。",
          ],
          refs: [],
          done: "面试官看五分钟能懂这个系统，且能问出有深度的问题。",
        },
        {
          id: "p5-8",
          title: "简历与面试",
          brief: "把项目翻译成别人能评估的语言，每条都带数字。",
          time: 4,
          do: [
            "用 STAR 写 3 条项目描述，每条必须有量化结果（准确率、成本降幅、延迟）",
            "准备 10 个高频问题：切分怎么选、召回不准怎么办、幻觉怎么治、Agent 怎么防死循环、成本怎么降",
            "对着镜子讲一遍完整项目，控制在 3 分钟",
            "找一个做后端的朋友挑刺，专挑「你这里没说清」的地方",
          ],
          learn: [
            "**面试考的是判断力，不是记忆力**。同一个问题，答「我试过 A 和 B，数据是 X，所以选 A」比背定义高一个档次。",
          ],
          refs: [
            { name: "面试鸭 · AI 应用题库", url: "https://www.mianshiya.com/", where: "按 RAG / Agent 分类刷" },
          ],
          done: "每条简历描述都有数字，能撑住三层追问。",
        },
        {
          id: "p5-9",
          title: "复盘与下一步",
          brief: "六个月之后，你该知道自己下一个产品做什么。",
          time: 2,
          do: [
            "写一页复盘：哪些决定是对的、哪些是浪费时间的、如果重做会怎么改",
            "列出三个可以做成小产品的垂直场景（结合你接触过的行业）",
            "选一个，用这套技术栈做最小验证：能不能找到 10 个真实用户",
            "把学习仓库和产品仓库分开，学习的那份开源出去当作品",
          ],
          learn: [
            "**技术能力的终点是产品判断**。会做和知道该做什么，是两条不同的曲线。",
          ],
          refs: [],
          done: "有一页复盘 + 一个明确的下一步动作。",
        },
      ],
    },
  ],

  rules: [
    {
      title: "每周怎么排",
      items: [
        "工作日每天 1–1.5 小时：看文档 + 写当步的代码，不求跑通。",
        "周末留半天整块时间：把这一步跑通，commit，写三行笔记。",
        "铁律：周末结束必须有一个能跑的增量。跑不起来就砍功能，不许顺延到下周。",
        "全职冲刺：顺序完全不变，周期可以压到 3–4 个月。",
      ],
    },
    {
      title: "明确不学的",
      items: [
        "神经网络数学、模型训练、微调、CUDA —— 那是算法岗赛道，和你的路径不重叠。",
        "不要囤课：视频最多留一个，动手时间必须大于观看时间。",
        "不要用国外模型做主力：直连不稳、成本高，作品也不贴国内企业场景。",
        "不要追新框架：新东西先观望一个月，热度还在再学。",
      ],
    },
    {
      title: "卡住的标准动作",
      items: [
        "先看日志：检索到的片段、拼好的 prompt、模型的原始输出，这三样能解决 80% 的问题。",
        "把问题缩到最小：写一个 20 行的脚本单独复现，不要在项目里瞎改。",
        "搜英文关键词：报错原文 + 库名，比中文搜准得多。",
        "超过 2 小时没进展就跳过，标记 TODO，先把后面的跑通再回来——很多问题会在你理解了上下文之后自己消失。",
      ],
    },
    {
      title: "时间怎么算",
      items: [
        "每一步标的小时数只算「敲代码」，读文档、踩环境坑、返工按 1.6 倍算——页面上的周次就是按这个系数推出来的。",
        "侧栏改一下每周投入，整条时间轴会重排。别为了追上原计划熬夜，改投入比改内容划算。",
        "阶段顺序不要动，只允许删步骤：卡住的标记跳过，先把后面的跑通，很多问题会在你懂了上下文之后自己消失。",
      ],
    },
    {
      title: "这套路线默认用什么",
      items: [
        "模型统一用 DeepSeek：`deepseek-flash`（便宜、快、支持工具调用/JSON/图像）；要对比就换 `deepseek-v4-pro`。注意 `deepseek-chat` 这个旧名字已不在官方枚举里，照旧教程抄会直接报错。",
        "base_url 固定 `https://api.deepseek.com`（OpenAI 兼容），所以 `openai` SDK 能直接用；官方同时提供 Anthropic 兼容写法 `/anthropic`。",
        "思考模式默认是开的：需要最快首字的地方写 `thinking: {\"type\": \"disabled\"}`，需要推理质量的地方不写这个字段。",
        "价格（百万 tokens，高峰价）：flash 输入 1–2 元、输出 4–8 元；空闲时段（晚上、周末、节假日）是半价。",
        "运行时：先 Node 24（day 0 和前端一直用它）→ p1-1 装 uv + Python 3.12 → p5-4 才需要 Docker。本机现在这三样里只有 Node。",
      ],
    },
    {
      title: "怎么用概念地图",
      items: [
        "开工前通读一遍，不求懂，只求耳熟——带着这些词做项目，比空手强得多。",
        "每完成一步，回去找到对应概念，用自己的话讲一遍；讲不出来就回去重做那一步。",
        "面试前一天只复习每个概念的「常见误解」，那正是被追问的地方。",
      ],
    },
  ],
};
