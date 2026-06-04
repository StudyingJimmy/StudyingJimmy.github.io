---
title: Playwright vs Selenium：浏览器自动化方案对比
tags: [Playwright, Selenium, 浏览器自动化]
status: done
date: 2026-05
---

# Playwright vs Selenium：浏览器自动化方案对比

## 核心差异

| 维度 | Selenium | Playwright |
|------|----------|------------|
| 发布时间 | 2004 | 2020 |
| 语言支持 | Java, Python, JS, C#, Ruby... | JS/TS, Python, Java, .NET |
| 浏览器支持 | Chrome, Firefox, Safari, Edge, IE | Chrome, Firefox, Safari, Edge |
| 自动等待 | ❌ 需要显式等待 | ✅ 内置自动等待 |
| 网络拦截 | ❌ 需额外工具 | ✅ 内置 route API |
| 移动端模拟 | ❌ Appium | ✅ 内置设备模拟 |
| 调试工具 | 基础 | Trace Viewer + Codegen |
| 执行速度 | 中 | 快（WebSocket 协议） |

## Playwright 优势

1. **自动等待**：元素可操作后才执行，告别 `sleep()` 和显式等待折磨
2. **网络拦截**：`page.route()` 原生支持 Mock API 响应
3. **Trace Viewer**：完整的执行回放，方便失败的用例排查
4. **并行执行**：browser context 隔离，多个测试文件可独立并行

## Selenium 仍然适用的场景

1. **遗留系统**：需要支持 IE 或旧版浏览器
2. **已有大量 Selenium 用例**：迁移成本高于收益
3. **团队技术栈**：团队以 Java 为主且无意愿切换
4. **Selenium Grid**：已有成熟的分布式执行基础设施

## 结论

- **新项目 / 从零搭建**：选 Playwright
- **已有 Selenium 基础设施**：评估迁移成本，小步迁移
- **需要支持 IE**：只能用 Selenium

## 迁移成本评估

- 核心 API 相似（定位元素、点击、输入）
- Playwright 的自动等待机制可能掩盖原有的时序 Bug（需注意）
- Pytest + Playwright 的整合比 Pytest + Selenium 更简洁
