# 静态站点文件路径使用非 ASCII 字符导致 fetch 404

一句话：
静态站点（GitHub Pages 等）上，`fetch()` 请求包含中文字符的文件路径可能因 URL 编码差异导致 404，应使用纯 ASCII 路径。

实践：
- 所有静态资源目录和文件名使用英文（如 `testing/api/` 替代 `测试/接口测试/`）
- manifest / 配置文件中用英文 ID 作为数据键，展示文本可保留中文
- JS 中的默认值（如 `currentCategory`）也使用英文 ID，与 manifest 保持一致

注意：
- Windows 本地 `file://` 协议可能正常，但部署到 HTTP 服务器后才暴露编码问题
- 不同服务器对非 ASCII URL 的编码处理不一致（Apache vs Nginx vs GitHub Pages）

最佳实践：
- 静态资源路径始终保持 ASCII-only：小写字母、数字、短横线
- 用 manifest 做数据层解耦：ID 用英文，展示标题用中文，两者不冲突

限制：
- 本项目仅涉及路径重命名，不涉及数据库或 API 设计

---

# DOM 结构重复闭合标签导致页面渲染异常

一句话：
生成 HTML 时，if/else 分支中重复关闭父级 div 会导致 DOM 结构错乱，浏览器自动纠偏后部分内容可能消失。

实践：
`buildSidebar()` 函数中，`sidebar-category` 的闭合 `</div>` 在 `else if` 和 `else` 分支中各多写了一次（与 if/else 块外的统一 `</div>` 重复），导致 categories without subcategories 的 DOM 节点提前关闭。

修复：
移除 `else if` 和 `else` 分支中的重复 `</div>`，统一由 if/else 块外的 `</div>` 闭合所有分支的 `sidebar-category` 容器。

注意：
- 视觉上看不出错误（浏览器会纠偏），但 sidebar-item 的 click 事件可能绑定到错误节点
- 用 validator 或 DOM inspector 检查实际渲染出的节点层级，不要仅看源码

最佳实践：
- 字符串拼接 HTML 时，用注释标明每个 `</div>` 对应哪个容器
- 让所有分支共享同一个闭合标签，避免分支内关闭

---

# Manifest 驱动的 ID/展示名分离模式

一句话：
静态站点的配置文件用英文 ID 作为数据键（URL 安全），通过 `name` 字段保存中文展示名，页面渲染时优先使用 `name`。

实践：
- manifest.json 中 `id` 保持 ASCII（`"api"`），`name` 存中文（`"接口测试"`）
- JS 中所有 `find()` / `filter()` 用 `id` 匹配，DOM 渲染用 `cat.name || cat.id` 兜底
- 同样模式适用于 categories / subcategories / sections / tags

注意：
- 不要在 JS 中硬编码中文映射表——映射关系应只存在于 manifest 中
- 默认值（`currentCategory = 'testing'`）与 manifest id 保持一致

---

# 内容分类侧边栏（Section Filter）模式

一句话：
在文章列表左侧增加垂直分类筛选器，通过 manifest 中的 `sections` 字段驱动，点击后过滤文章卡片。

实践：
- 每个 subcategory 或 category 定义 `sections: [...]` 数组
- 每篇文章标记 `section` 字段归属
- 筛选器通过 `filteredArticles = articles.filter(a => a.section === currentSection)` 实现
- `currentSection = null` 时显示全部
- URL hash 中用 `~` 前缀区分 section 和 subcategory（如 `#testing/api/~工具选型`）

注意：
- 侧边栏点击导航时重置 section，但从文章返回列表时保留 section
- 需要在移动端隐藏 section filter（屏幕太窄）
