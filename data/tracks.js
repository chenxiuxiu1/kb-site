/* 三条专项路线的正文：全栈 / 后端 / 前端。
   与 curriculum.js 完全同构（phases → steps），所以阶段轨、勾选、笔记、导出、续学条都不用另写一套。
   一条路线写完一块，就把那一块的 steps 填上；没填的块仍在首页标「待写」，点进骨架详情页。

   写法上守两条：
   1. 每步都要能在本机（Windows + PowerShell + 已有 kb-agent 仓库）真的做出来，不写空中楼阁；
   2. 每步带 2 条以上可点开的资料，而不是「去搜一下」。 */
window.CURRICULUM_TRACKS = {
  /* ============================ 全栈 ============================ */
  fs: {
    id: "fs",
    name: "全栈",
    tagline: "两端真正接起来的那一层",
    phases: [
      {
        id: "fs1",
        no: "FS1",
        title: "接口契约",
        goal: "前端按自己的想当然写字段，后端按自己的想当然返回结构，联调时才发现对不上。这一块把类型、错误、分页三件事钉死，让「对不上」在编译期就暴露。",
        output: "一份两端共用的契约：类型从后端 schema 生成，错误结构统一，分页与筛选写成约定。",
        label: "契约",
        steps: [
          {
            id: "fs1-1",
            title: "把返回结构写成 schema",
            brief: "现在接口返回的是 dict，字段名只活在函数里。先让 Pydantic 模型成为唯一的事实来源。",
            time: 3,
            code: {
              file: "app/schemas.py",
              lang: "python",
              body: `from typing import Generic, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

class ApiError(BaseModel):
    code: str          # 机器读：not_found / validation / forbidden
    message: str       # 人读
    detail: list | None = None   # 字段级细节，422 时填

class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int

class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    body: str`,
            },
            do: [
              "在 `app/schemas.py` 建四个模型：`NoteOut`、`NoteCreate`、`Page[T]`、`ApiError`；ORM 对象直接返回，所以要 `from_attributes=True`",
              "把每个路由的 `response_model=` 指到对应模型，删掉函数里手拼的 `dict` 返回 —— 字段少一个，`/docs` 上立刻能看出来",
              "写两个异常处理器：`HTTPException` → `ApiError`，`RequestValidationError` → `ApiError(code=\"validation\", detail=e.errors())`，让 422 也长成同一个形状",
              "在 `/docs` 里把成功和失败的响应都点开一遍，确认 schema 都在；再用 `curl -s http://127.0.0.1:8000/notes/999` 看错误体",
              "把「错误体必有 code」写进 `docs/contract.md`，后面所有前端错误处理都按这个读",
            ],
            learn: [
              "**契约不是文档，是类型**：文档靠自觉更新，类型忘了改就编译/校验失败。选后者才有约束力。",
              "**三种错误一个形状**：400 / 404 / 422 结构不同的话，前端要写三段分支；收成 `{code, message, detail}` 只写一次。",
              "**泛型 `Page[T]`**：列表接口只有一个形状，分页字段不会这个接口有、那个接口没有。",
            ],
            refs: [
              { name: "FastAPI · 响应模型", url: "https://fastapi.tiangolo.com/zh/tutorial/response-model/", where: "response_model 与过滤字段" },
              { name: "Pydantic v2 · 模型配置", url: "https://docs.pydantic.dev/latest/concepts/config/", where: "from_attributes 那一节" },
            ],
            done: "`/docs` 里每个接口的成功 / 失败响应都能看到同一套结构，任何错误体里必定有 `code`。",
          },
          {
            id: "fs1-2",
            title: "从 OpenAPI 生成前端类型",
            brief: "别手抄接口类型。让 TS 类型从后端 schema 长出来：改后端不重新生成，前端就编译不过。",
            time: 3,
            code: {
              file: "package.json · scripts",
              lang: "json",
              body: `"scripts": {
  "gen:api": "openapi-typescript http://127.0.0.1:8000/openapi.json -o src/api/schema.d.ts",
  "typecheck": "tsc --noEmit"
}`,
            },
            do: [
              "前端 `npm i -D openapi-typescript`；后端起着，跑 `npm run gen:api` 生成 `src/api/schema.d.ts`",
              "写 `src/api/client.ts`：`type Note = components[\"schemas\"][\"NoteOut\"]`，fetch 包一层，非 2xx 时读 body 的 `code/message` 抛错",
              "删掉列表页里手写的 `type Note = { id: number; title: string }`，全部换成生成的类型",
              "**验证价值**：把后端 `title` 改成 `name`，重新生成 → `npm run typecheck` 必须报错；改回再生成 → 绿",
              "把生成物提交进仓库，并在 README 写「改后端 schema 先跑 `gen:api`」",
            ],
            learn: [
              "**生成物要提交**：CI 里没有后端在跑，「先起服务再生成」会让构建不稳定；提交后才能比 diff。",
              "**类型只管编译期**：运行时形状还得靠后端校验，两层都要有，缺一层就是空转。",
              "**收益点在改名**：平时感觉不到，字段一改、一删、一改类型，编译期就替你找出所有调用点。",
            ],
            refs: [
              { name: "openapi-typescript", url: "https://openapi-ts.dev/introduction", where: "CLI 用法与输出形状" },
              { name: "FastAPI · OpenAPI 规范输出", url: "https://fastapi.tiangolo.com/zh/how-to/generate-clients/", where: "为什么要从 openapi.json 生成" },
            ],
            done: "后端改一个字段名，前端不改就 `tsc` 失败；重新生成后错误消失。",
          },
          {
            id: "fs1-3",
            title: "分页、筛选、排序写成约定",
            brief: "每个接口各写一套 limit/offset/page/size，是「各写一半」最典型的来源。",
            time: 3,
            do: [
              "定一套查询参数：`limit`（1–100，默认 20）、`offset`、`q`、`sort`（白名单字段，`-` 前缀表示倒序）",
              "后端抽一个 `PageParams` 依赖，路由签名里只写 `p: PageParams = Depends()`，返回统一 `Page[T]`",
              "`sort` 必须查白名单再拼 SQL：直接把字段名塞进 `order_by` 是注入点",
              "造 200 条假数据，验边界：`offset=190` 拿 10 条、`offset=500` 空列表、`limit=1000` 被拒 422",
              "把默认值、上限、排序白名单抄进 `docs/contract.md` 一页，前后端都只认这一页",
            ],
            learn: [
              "**必须返回 total**：只给 items 的接口，前端只能猜「还有没有下一页」。",
              "**offset 分页在深页会慢**：第 1000 页要跳过 2 万行；数据量上来换游标分页，接口形状可以不变（total 变成 has_more）。",
              "**约定要能被引用**：后端一个常量、前端一个类型，比写两遍文档可靠。",
            ],
            refs: [
              { name: "FastAPI · 查询参数与依赖", url: "https://fastapi.tiangolo.com/zh/tutorial/dependencies/", where: "Depends 复用参数" },
              { name: "Use The Index, Luke · 分页", url: "https://use-the-index-luke.com/no-offset", where: "为什么深页会慢" },
            ],
            done: "同一个 URL 在刷新、前进后退、分享给另一台机器时，看到的列表完全一致。",
          },
          {
            id: "fs1-4",
            title: "走一遍契约变更流程",
            brief: "契约的价值只在「改的时候」体现。用一个真实改动把流程跑通，并记下每步的耗时。",
            time: 3,
            do: [
              "选一个真实改动：`NoteOut` 加 `updated_at`，列表支持 `sort=-updated_at`",
              "按顺序做：改 schema → 写迁移加列并回填 → `gen:api` → 前端编译 → 补 UI（显示「3 分钟前」）",
              "**故意跳过 `gen:api`**，确认 `tsc` 报错，把报错贴进这条笔记 —— 这是链路有效的证据",
              "写 3 行 changelog：改了什么 / 谁需要改 / 怎么回滚；破坏性变更（删字段）必须分两步：先兼容再删除",
              "最后手工走一遍端到端：新建 → 列表按更新时间排序 → 详情显示相对时间",
            ],
            learn: [
              "**契约把成本挪到编译期**：同样的改法没有契约时要等到联调才发现，成本从十分钟变成一整晚。",
              "**变更成本是可见的**：这次记下「后端 20 分钟 + 生成 1 分钟 + 修 4 处」，下次估时就有依据。",
              "**先加后删**：删字段前先让前端不再读它，否则滚动发布时新旧版本会互相打脸。",
            ],
            refs: [
              { name: "API 演进与弃用（FastAPI）", url: "https://fastapi.tiangolo.com/zh/how-to/separate-openapi-schemas/", where: "兼容性与 schema 版本" },
              { name: "语义化版本 2.0.0（中文）", url: "https://semver.org/lang/zh-CN/", where: "什么算破坏性变更" },
            ],
            done: "一次字段变更从后端到前端全程有据可查；跳过生成这一步，编译就会红。",
          },
        ],
      },
    ],
  },

  /* ============================ 后端 ============================ */
  be: {
    id: "be",
    name: "后端",
    tagline: "从「能跑」到「扛得住」",
    phases: [
      {
        id: "be1",
        no: "BE1",
        title: "表设计与迁移",
        goal: "手敲 CREATE TABLE 的项目换台机器就装不起来。这一块把结构变成可执行的历史：迁移能升能降、索引拿 EXPLAIN 证明、字段变更按四步走。",
        output: "删库后三条命令能重建结构；一条慢查询有索引前后的数字；一次字段变更的四步顺序能口述。",
        label: "数据",
        steps: [
          {
            id: "be1-1",
            title: "把建表写进迁移",
            brief: "结构只活在 app.db 文件里，就永远没法在第二台机器上复现。用 Alembic 把它变成代码。",
            time: 3,
            code: {
              file: "PowerShell",
              lang: "powershell",
              body: `uv add alembic
uv run alembic init migrations
# 改 migrations/env.py：从环境变量读 DATABASE_URL

uv run alembic revision --autogenerate -m "init"
# 打开生成的 migrations/versions/xxx_init.py，逐行读

uv run alembic upgrade head`,
            },
            do: [
              "`uv add alembic` → `uv run alembic init migrations`，改 `env.py` 的 `target_metadata = Base.metadata` 并读 `DATABASE_URL`",
              "`uv run alembic revision --autogenerate -m \"init\"`，**逐行读生成的脚本**：autogenerate 不认索引名、漏 `server_default`、SQLite 下外键可能被忽略",
              "`uv run alembic upgrade head` 跑通；然后备份并删掉 `data/app.db`，从零再跑一次 —— 新机器就是这个路径",
              "在 README 写「新机器三条命令」：`uv sync` → `alembic upgrade head` → `uvicorn`",
              "把 `migrations/versions/` 提交进 git，和代码同一次提交",
            ],
            learn: [
              "**迁移文件是代码，要 review**：autogenerate 只是初稿，索引与默认值经常要手补。",
              "**SQLite 的 ALTER 很弱**：加约束、改类型往往要「建新表 → 拷数据 → 换名」，所以要在本地先演练。",
              "**迁移要和代码同提交**：代码回滚了、迁移没回滚，库就卡在中间版本。",
            ],
            refs: [
              { name: "Alembic 官方教程", url: "https://alembic.sqlalchemy.org/en/latest/tutorial.html", where: "init / revision / upgrade 三段" },
              { name: "SQLite · ALTER TABLE 限制", url: "https://www.sqlite.org/lang_altertable.html", where: "哪些改动只能重建表" },
            ],
            done: "删库后三条命令能重建出同样结构；`alembic current` 显示在 head。",
          },
          {
            id: "be1-2",
            title: "索引要拿 EXPLAIN 证明",
            brief: "建了索引不等于会走它。复合索引的列顺序写反，索引就白建了。",
            time: 3,
            code: {
              file: "PowerShell · sqlite3",
              lang: "sql",
              body: `EXPLAIN QUERY PLAN
SELECT id, title, created_at FROM notes
WHERE user_id = 1 AND created_at < '2026-10-01'
ORDER BY created_at DESC LIMIT 20;

-- 没走索引时建这个（等值在前、范围在后、排序最后）
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at);`,
            },
            do: [
              "先拿现有查询跑 `EXPLAIN QUERY PLAN`，记下有没有 `USING INDEX`、有没有 `USE TEMP B-TREE FOR ORDER BY`",
              "按「等值 → 范围 → 排序」建复合索引 `(user_id, created_at)`，再跑同一条计划，确认 `TEMP B-TREE` 消失",
              "写一个小脚本循环插 5 万行，用 `Measure-Command` 量建索引前后的耗时，数字记进笔记",
              "把列表接口的 `SELECT *` 改成只取需要的列，让覆盖索引能生效",
            ],
            learn: [
              "**顺序决定一切**：`(created_at, user_id)` 和 `(user_id, created_at)` 是两个完全不同的索引。",
              "**索引让写入变慢**：只给真正慢的查询加，别见字段就建。",
              "**`SELECT *` 会挡住覆盖索引**：列越多，越容易回表。",
            ],
            refs: [
              { name: "SQLite · 查询计划", url: "https://www.sqlite.org/eqp.html", where: "怎么读 EXPLAIN QUERY PLAN 输出" },
              { name: "Use The Index, Luke", url: "https://use-the-index-luke.com/", where: "复合索引列顺序与范围查询" },
            ],
            done: "至少一条慢查询有「索引前 / 索引后」两份计划与耗时，数字写进笔记。",
          },
          {
            id: "be1-3",
            title: "降级演练",
            brief: "只测过 upgrade 的迁移，等于没有回滚方案。",
            time: 3,
            do: [
              "写一个加列迁移，`upgrade head` 后插几行数据，再 `downgrade -1`，确认数据与结构都回到之前",
              "写一个删列迁移，在笔记里明确标注「此步不可回滚，先备份」—— 不是所有迁移都能降级",
              "加一道启动检查：应用启动时比对 `alembic_version` 与代码期望版本，不一致就拒绝启动并打印该跑哪个命令",
              "把「升级 / 回滚 / 不可逆」三种情况写进 README 的运维小节",
            ],
            learn: [
              "**向前兼容优先**：先加可空列并双写，回填，切读，最后删旧列 —— 每一步都能单独回滚。",
              "**大数据量别一个事务改全表**：分批 + 可重入，失败能续跑。",
              "**备份是最后方案**：恢复一次几十分钟，能降级就不要走这条。",
            ],
            refs: [
              { name: "Alembic · 降级与分支", url: "https://alembic.sqlalchemy.org/en/latest/tutorial.html#downgrade", where: "downgrade 语义" },
              { name: "零停机迁移模式", url: "https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern", where: "expand / contract 四步" },
            ],
            done: "一次 `downgrade -1` 跑通且数据完整；不可逆的那一步在文档里有醒目标注。",
          },
          {
            id: "be1-4",
            title: "结构变更走四步",
            brief: "「给表加个字段」在生产上是四步，不是一步。",
            time: 2,
            do: [
              "把 `be1-3` 的加列拆成四步：加可空列 → 双写新旧字段 → 回填脚本 → 切读新列 → 删旧列",
              "回填脚本写成可重入：重复跑结果一致，中间失败能从断点续",
              "在本地演练一次「回填跑到一半 Ctrl+C」，再重跑，确认没有重复写入或漏写",
              "把四步写成一张检查单（每步做什么、失败怎么退），放到项目 wiki 或 README",
            ],
            learn: [
              "**四步的本质是「任何时刻代码与库都兼容」**：滚动发布时新旧实例同时在跑。",
              "**回填要限速**：一次 update 全表会锁库几十秒，按主键分页慢慢来。",
              "**检查单比记忆可靠**：凌晨两点不会有人记得第四步。",
            ],
            refs: [
              { name: "Expand and Contract（Prisma）", url: "https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern", where: "四步图解" },
              { name: "PostgreSQL · 并发建索引", url: "https://www.postgresql.org/docs/current/sql-createindex.html", where: "CONCURRENTLY 的代价" },
            ],
            done: "能不看笔记口述一次字段变更的四步顺序，以及每步失败时怎么退。",
          },
        ],
      },
    ],
  },

  /* ============================ 前端 ============================ */
  fe: {
    id: "fe",
    name: "前端",
    tagline: "把「能显示」做成「能用」",
    phases: [
      {
        id: "fe1",
        no: "FE1",
        title: "组件与状态",
        goal: "所有状态都塞进 useState 的结果是改一处全页重渲染、表单错误散在七八个地方。这一块先决定每个状态该放在哪，再把三态与错误收口。",
        output: "状态各有归属（服务端 / URL / 局部），筛选可分享可后退，表单错误一处收口，加载与空态都有文案。",
        label: "前端",
        steps: [
          {
            id: "fe1-1",
            title: "先给状态分三类",
            brief: "判断标准只有两个问题：刷新后该不该保留？别人打开同一个链接该不该看到一样的东西？",
            time: 3,
            do: [
              "把列表页所有状态列出来：数据、筛选、搜索词、选中项、弹窗、表单草稿、提交中",
              "分三类：**服务端**（数据）、**URL**（筛选 / 搜索 / 选中）、**局部**（弹窗 / 草稿 / 提交中）",
              "服务端用一层 `useNotes(params)` 收口请求；URL 用 `useSearchParams`；其余留 `useState`",
              "打开 React DevTools Profiler，改一次筛选，数一下重渲染了几个组件，记在笔记里",
            ],
            learn: [
              "**能分享吗？** 能 → URL；**别人也用吗？** 是 → 服务端；剩下的才是局部。",
              "**草稿别提到全局**：切页签回来发现草稿还在别处，比丢了更吓人。",
              "**状态提得越高，重渲染范围越大**：提到页面根，一次输入全页都动。",
            ],
            refs: [
              { name: "React · 选择 state 结构", url: "https://zh-hans.react.dev/learn/choosing-the-state-structure", where: "分组与去重原则" },
              { name: "React · 在组件间共享 state", url: "https://zh-hans.react.dev/learn/sharing-state-between-components", where: "何时该提升" },
            ],
            done: "每个状态都能说出归属和理由；Profiler 里改筛选只重渲染列表与工具栏。",
          },
          {
            id: "fe1-2",
            title: "把筛选放进 URL",
            brief: "筛选放 useState，刷新就丢、不能分享、后退键失效 —— 这三件事在小项目里没人提，上线第一周就会有人问。",
            time: 3,
            code: {
              file: "src/pages/Notes.tsx",
              lang: "tsx",
              body: `const [sp, setSp] = useSearchParams();
const q = sp.get("q") ?? "";
const offset = Number(sp.get("offset") ?? 0);
const sort = sp.get("sort") ?? "-created_at";

function patch(next: Record<string, string>) {
  const p = new URLSearchParams(sp);
  Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
  // 筛选变化一律回到第一页，否则会停在一个空白页
  p.set("offset", next.offset ?? "0");
  setSp(p, { replace: true });
}`,
            },
            do: [
              "`q / limit / offset / sort` 全部从 `useSearchParams()` 读，组件内不再存一份",
              "搜索框做 300ms 防抖再 `setSp`，用 `{ replace: true }`；翻页用默认的 `push`，否则后退键要按十次",
              "任何筛选变化都把 `offset` 归零 —— 这是「翻到第 5 页再改筛选看到空列表」的根因",
              "手动改地址栏 `?q=uv&sort=-created_at`，确认输入框、列表、分页同时跟着变",
            ],
            learn: [
              "**URL 是前端自带的持久化**：不用写 localStorage，也不怕刷新。",
              "**replace 与 push 要分场景**：输入搜索用 replace，翻页用 push。",
              "**只留一个真相**：URL 是状态源，请求从 URL 派生，就不会出现「显示与请求不一致」。",
            ],
            refs: [
              { name: "React Router · useSearchParams", url: "https://reactrouter.com/api/hooks/useSearchParams", where: "setSearchParams 的第二个参数" },
              { name: "MDN · URLSearchParams", url: "https://developer.mozilla.org/zh-CN/docs/Web/API/URLSearchParams", where: "增删改查与序列化" },
            ],
            done: "复制地址栏到另一台机器，看到同一个筛选结果；后退键能回到上一组筛选。",
          },
          {
            id: "fe1-3",
            title: "表单错误收口到一处",
            brief: "错误散在七八个 useState 里，提交那天一定会漏掉一个。",
            time: 3,
            code: {
              file: "src/pages/NoteForm.tsx",
              lang: "tsx",
              body: `const [errors, setErrors] = useState<Record<string, string>>({});
const setError = (field: string, msg: string) =>
  setErrors((e) => ({ ...e, [field]: msg }));

// 后端 422：{ detail: [{ loc: ["body","title"], msg }] }
function mapServerErrors(detail: any[]) {
  const out: Record<string, string> = {};
  detail.forEach((d) => {
    const field = d.loc[d.loc.length - 1];
    if (typeof field === "string") out[field] = d.msg;
  });
  setErrors(out);
}`,
            },
            do: [
              "用一个 `errors: Record<string, string>`，只留一个 `setError(field, msg)`；提交前校验一遍并 `return` 到第一个错误",
              "后端 422 的 `detail[].loc` 是路径数组（`[\"body\",\"title\"]`），取最后一段映射回字段，别整段字符串直接显示",
              "错误文案贴在该字段下方，`aria-invalid` + `aria-describedby` 指过去；提交中禁用按钮防重复提交",
              "故意留空必填项提交一次，Tab 走一遍，确认读屏能念出错误",
            ],
            learn: [
              "**前端校验只为了体验**：服务端校验才是防线，两边都要有。",
              "**错误要能定位字段**：一个「提交失败」横幅，用户不知道改哪里。",
              "**提交中必须锁**：慢网下双击会创建两条记录。",
            ],
            refs: [
              { name: "Pydantic · 错误结构", url: "https://docs.pydantic.dev/latest/errors/validation_errors/", where: "loc 数组怎么读" },
              { name: "WCAG · 错误识别", url: "https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html", where: "错误要用文字指出字段" },
            ],
            done: "留空必填项提交，错误出现在对应字段下方；读屏能念出字段名与原因。",
          },
          {
            id: "fe1-4",
            title: "加载、空、错误三态",
            brief: "只有成功态的页面，网慢的时候就是白屏，出错的时候也是白屏。",
            time: 3,
            do: [
              "抽一个 `<Async>` 组件，接 `status: \"loading\" | \"error\" | \"empty\" | \"ok\"`，把判断收在一处",
              "空态写「下一步做什么」而不是「暂无数据」：比如「还没有笔记，点右上角新建第一条」",
              "错误态给重试按钮，把后端 `code` 显示出来（`network` / `not_found` / `validation`），便于截图报错",
              "用 DevTools 的 Network 限速 Slow 3G、再切 Offline 各试一次",
            ],
            learn: [
              "**三态是默认要求**：任何一个从网络拿数据的地方都有这三种可能。",
              "**空态是引导位**：新用户看到的第一句话，决定他会不会留下来。",
              "**错误要可复制**：把 code 显示出来，用户截图就能定位，不用复述整段报错。",
            ],
            refs: [
              { name: "React · 加载与错误处理", url: "https://zh-hans.react.dev/reference/react/useTransition", where: "pending 状态与骨架屏" },
              { name: "Nielsen Norman · 空状态设计", url: "https://www.nngroup.com/articles/empty-state-interface-design/", where: "空态该说什么" },
            ],
            done: "断网时看到错误态与「重试」，不是白屏；一条数据都没有时看到下一步引导。",
          },
        ],
      },
    ],
  },
};
