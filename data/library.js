/* 由 kb-agent/scripts/export_static.py 生成，别手改。
   要更新内容：改完 kb-agent 里的资料/笔记，重跑一次导出脚本。 */
window.LIBRARY = {
  "generatedAt": "2026-10-29 10:57",
  "dbPath": "data\\app.db",
  "stats": {
    "documents": 13,
    "chunks": 13,
    "notes": 1,
    "chars": 2482
  },
  "documents": [
    {
      "id": 10003,
      "title": "BM25 与向量检索",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "BM25 是词法检索，靠词频和逆文档频率打分，召回的是字面重叠。它的上限很明确：用户问「怎么让回答更快」，资料里写的是「降低首字延迟」，词对不上就搜不到。向量检索把句子映射成向量，能跨过用词差异，但要多一个嵌入模型和一份向量索引的开销。中文没有空格，BM25 用字二元组切分是最省事的做法：知识库切成 知识、识库 两个 token。"
      ]
    },
    {
      "id": 10006,
      "title": "CORS 与同源策略",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "浏览器同源策略规定，协议、域名、端口三者任一不同就算跨域。前端在 5173、后端在 8000，请求就是跨域的，浏览器会先发一个 OPTIONS 预检请求。后端必须返回 access-control-allow-origin 并且值要精确匹配前端地址，不能图省事写星号：写着星号等于对全世界开放，一旦带上 Cookie 还会失效。生产环境把前端和后端放到同一个域名下，就完全绕开了这个问题。"
      ]
    },
    {
      "id": 10004,
      "title": "DeepSeek 成本估算",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "deepseek-chat 按 token 计费，输入和输出分开算。一次问答的成本等于输入 token 数乘输入单价，加上输出 token 数乘输出单价。真正决定费用的不是单次价格，而是输入长度：把二十轮历史全塞进去，输入会越滚越大。所以要做两件事，一是限制带进上下文的历史条数，二是检索只放最相关的几段资料。流式接口默认不返回用量，必须在请求里加 stream_options 的 include_usage 才能拿到 token 数。"
      ]
    },
    {
      "id": 10005,
      "title": "Docker 多阶段构建",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "多阶段构建解决的是镜像体积问题。第一阶段用 node 镜像装依赖、跑 npm run build 产出静态文件，第二阶段只从第一阶段复制 dist 目录，运行镜像里不带 node_modules。Python 侧同理，构建阶段装编译工具，运行阶段只留 wheel 装好的包。这样镜像能从一 GB 降到两百 MB 左右。注意复制静态文件用 COPY --from=builder 指定阶段名，别把整个构建目录搬过去。"
      ]
    },
    {
      "id": 10001,
      "title": "FastAPI 流式响应",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "在 FastAPI 里做流式输出用 StreamingResponse，media_type 设成 text/event-stream。每个事件写成 data: 加一行 JSON，再跟一个空行，这就是 SSE 协议。必须同时设置三个响应头：cache-control: no-cache、connection: keep-alive、x-accel-buffering: no。最后一个最容易被忽略，缺了它 Nginx 之类的反向代理会把内容攒起来一次性发出去，客户端看到的就是等半天然后整段蹦出来，流式效果全没了。"
      ]
    },
    {
      "id": 10009,
      "title": "Render 部署与冷启动",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "GitHub Pages 只能托管静态文件，有后端就必须找别的地方。Render 的免费层可以直接连仓库，识别 Dockerfile 后自动构建。它的代价是冷启动：十五分钟没人访问就休眠，下次请求要等几十秒才醒。演示前先自己访问一次预热。另外免费实例的本地磁盘是临时的，SQLite 文件重启就没了，要持久化得挂磁盘或者换 Postgres。"
      ]
    },
    {
      "id": 10002,
      "title": "SQLite 还是 Postgres",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "本地开发和单机部署用 SQLite 足够，一个文件、零运维。但要提前打开 WAL 模式，否则读写会互相阻塞，并发请求一多就报 database is locked。SQLite 的短板在多实例部署：容器重启后文件被清空，两个副本之间也没法共享数据。需要横向扩容、或者数据不能丢，就得换 Postgres。换的时候只改 DATABASE_URL 和装 psycopg 驱动，业务代码一行不用动。"
      ]
    },
    {
      "id": 10008,
      "title": "Windows 智能应用控制",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "Windows 的智能应用控制会拦下未签名的可执行文件。装了它之后，uv 自己下载的 CPython 构建经常一执行就被系统挡掉，报错看起来像是权限问题。解决办法是在 pyproject 里把 python-preference 设成 only-system，强制使用系统里已经签名过的 python.org 解释器，不让包管理器自己下载。同样的坑也会出现在某些预编译的二进制包上。"
      ]
    },
    {
      "id": 10007,
      "title": "pytest 的 fixture 与 monkeypatch",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "测试里不要真调外部服务，慢、要钱、还会因为网络抖动红一片。pytest 的 monkeypatch 可以在用例执行期间替换任意属性，比如把调用大模型的函数换成一个假的异步生成器，只吐出预设的几句话。fixture 用 yield 分成前后两段，前段准备数据，后段清理，这样每个用例都从干净状态开始。autouse 的 fixture 会自动作用于该文件里所有用例。"
      ]
    },
    {
      "id": 10011,
      "title": "切片与重叠",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "切片长度是个权衡：太长，一段里混了多个主题，检索精度下降；太短，单段缺少上下文，模型读到也答不出完整意思。实践上按结构切比按字数切好，先按空行分段，超长段落再按句号切。相邻切片之间留八十到一百字的重叠，是为了防止答案正好被切在两段的缝上。重叠会让总片段数变多，索引变大，所以不宜过大。"
      ]
    },
    {
      "id": 10010,
      "title": "提示词里的引用约束",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "知识库场景里最要命的问题不是答不出来，而是答得太顺。模型会拿训练数据里的常识把空白补上，看起来对，实际是编的。所以系统提示词里要写三条硬约束：只依据给定资料回答；资料里没有的必须明说没有，不许补常识；每个事实后面标出来源编号。把检索到的片段编号后拼进上下文，回答里的序号就能和原文对上，用户可以点开核对。"
      ]
    },
    {
      "id": 10012,
      "title": "首字延迟与 p95",
      "source": "评测语料",
      "at": "",
      "chunks": [
        "流式产品里，用户感受到的快慢是首字延迟，不是总耗时。总耗时三秒但零点四秒开始出字，体感上是快的；总耗时也是三秒但攒到最后才出，就是卡。所以要单独记录第一个 token 到达的时间，并且看 p95 而不是平均值，平均值会把少数极慢的请求藏起来。流式响应开始后状态码已经发出去了，中途失败只能发一条错误事件，前端自己处理。"
      ]
    },
    {
      "id": 1,
      "title": "FastAPI 流式响应备忘",
      "source": "手动粘贴",
      "at": "2026-10-29",
      "chunks": [
        "流式接口要设三个响应头：content-type 为 text/event-stream、cache-control 为 no-cache、connection 为 keep-alive。\n\n如果前面有 Nginx 这类反向代理，必须加上 x-accel-buffering: no，否则代理会把数据块攒起来一次性发出去，看起来就不像流式了。\n\n要拿到用量统计，需要在请求里显式传 stream_options: {include_usage: true}，否则最后一块里没有 usage。"
      ]
    }
  ],
  "notes": [
    {
      "id": 1,
      "title": "重启也要在",
      "content": "数据库版",
      "tags": [
        "p1-5"
      ]
    }
  ]
};
