---
title: JMeter vs Locust vs K6：压测工具横向对比
tags: [JMeter, Locust, K6, 工具对比]
status: todo
date: "—"
---

# JMeter vs Locust vs K6：压测工具横向对比

> 🚧 待调研

## 对比维度

| 维度 | JMeter | Locust | K6 |
|------|--------|--------|-----|
| 脚本语言 | GUI / XML | Python | JavaScript |
| 分布式支持 | 原生（Master-Slave） | 原生（Master-Worker） | 原生（Grafana Cloud） |
| 报告能力 | 内置图表 / 插件 | Web UI 实时监控 | 内置 + Grafana |
| CI/CD 集成 | Jenkins 插件 | CLI 友好 | 原生支持 |
| 学习曲线 | 中等 | 低（Python 用户） | 低（JS 用户） |
| 协议支持 | HTTP/HTTPS 为主 | HTTP（可扩展） | HTTP/WebSocket/gRPC |
| 资源消耗 | 高（线程模型） | 低（协程） | 低（Go 运行时） |

## 选型建议

> 待基于实际项目验证后输出。

- **传统企业 / 遗留系统**：JMeter（生态成熟、文档丰富）
- **Python 团队**：Locust（代码即测试、灵活扩展）
- **云原生 / DevOps**：K6（轻量、CI/CD 友好）

## 后续计划

- [ ] 用同一场景在三个工具上分别执行并记录数据
- [ ] 评估脚本维护成本和团队上手时间
