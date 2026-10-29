/* 全站唯一的外部资料清单：首页顶部「最新资料」与求职页的资料库都读这一份。
   hot: true 的进首页顶部（只放 6 条，多了把页头撑高）；其余在求职页按 tag 分组列出。
   note 作为悬停提示；改这一份就够了，别在别处再抄一遍链接。 */
window.LINKS = [
  {
    tag: "面试",
    name: "面试鸭 · mianshiya",
    note: "按公司、按岗位的题库与真实面经；先搜目标岗位 JD 的关键词，再倒着补",
    url: "https://www.mianshiya.com/",
    hot: true,
  },
  {
    tag: "面试",
    name: "小林 coding",
    note: "网络 / 操作系统 / MySQL / Redis 的常考题，一面筛的就是这些",
    url: "https://xiaolincoding.com/",
    hot: true,
  },
  {
    tag: "算法",
    name: "Hello 算法",
    note: "数据结构与算法，图解 + 多语言可运行代码；面试前两周每天一小时",
    url: "https://www.hello-algo.com/",
    hot: true,
  },
  {
    tag: "模型",
    name: "DeepSeek · 开放平台文档",
    note: "模型与价格、流式输出、function calling 全在这一站",
    url: "https://api-docs.deepseek.com/zh-cn/",
    hot: true,
  },
  {
    tag: "后端",
    name: "FastAPI · 中文教程",
    note: "路由、依赖注入、后台任务；/docs 是它自动生成的",
    url: "https://fastapi.tiangolo.com/zh/tutorial/",
    hot: true,
  },
  {
    tag: "评估",
    name: "RAGAS · 文档",
    note: "检索准不准、回答有没有编，用指标说话",
    url: "https://docs.ragas.io/en/stable/",
    hot: true,
  },
  {
    tag: "环境",
    name: "uv · 官方文档",
    note: "装 Python、锁依赖、跑命令，代替 pip + venv + nvm",
    url: "https://docs.astral.sh/uv/",
  },
  {
    tag: "校验",
    name: "Pydantic · Models",
    note: "入参出参写在一处，422 报错直接可读",
    url: "https://pydantic.dev/docs/validation/latest/concepts/models/",
  },
  {
    tag: "Agent",
    name: "Anthropic · Building Effective Agents",
    note: "工作流与 Agent 的边界，写工具循环前先读这篇",
    url: "https://www.anthropic.com/research/building-effective-agents",
  },
  {
    tag: "协议",
    name: "MCP · 官方文档",
    note: "工具接入的协议标准，p4-7 会碰",
    url: "https://modelcontextprotocol.io/",
  },
  {
    tag: "提示词",
    name: "Prompt Engineering Guide（中文）",
    note: "提示词的系统化写法，比零散技巧靠谱",
    url: "https://www.promptingguide.ai/zh",
  },
  {
    tag: "设计",
    name: "system-design-primer（中文）",
    note: "系统设计入门；被问「用户涨十倍怎么办」时至少知道往哪答",
    url: "https://github.com/donnemartin/system-design-primer/blob/master/README-zh-Hans.md",
  },
];
