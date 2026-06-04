---
title: Locust 分布式压测实践与性能瓶颈定位
tags: [Locust, 压测, 性能调优, Python]
status: progress
date: 2026-05
---

# Locust 分布式压测实践与性能瓶颈定位

> 🚧 调研进行中

## Locust 简介

Locust 是 Python 生态下的开源性能测试工具，使用纯 Python 代码定义用户行为，支持分布式执行。

## 核心概念

- **User 类**：模拟一个用户的行为
- **Task**：用户执行的具体操作（用 `@task` 装饰器标记）
- **wait_time**：用户操作之间的等待时间
- **HttpUser**：内置 HTTP 请求能力的 User 子类

## 分布式架构

```
        Master (Web UI + 任务分发)
           |
   ┌───────┼───────┐
   │       │       │
Worker1  Worker2  Worker3
(执行测试) (执行测试) (执行测试)
```

## 性能瓶颈定位思路

### 1. 观察指标

- **响应时间（Response Time）**：P50、P95、P99
- **吞吐量（RPS）**：每秒请求数
- **错误率**：HTTP 5xx / 超时占比
- **并发用户数**：系统能承载的峰值

### 2. 瓶颈定位（分层排查）

| 层级 | 排查点 | 工具 |
|------|--------|------|
| 应用层 | 慢接口、数据库查询 | APM / 日志 |
| 中间件 | 连接池、队列积压 | Redis Monitor / RabbitMQ |
| 数据库 | 慢查询、锁等待 | EXPLAIN / slow query log |
| 基础设施 | CPU、内存、网络 | top / htop / netstat |

## 后续计划

- [ ] 完成一个真实的分布式压测案例
- [ ] 记录压测→瓶颈定位→优化→验证的完整流程
- [ ] 对比单机和分布式压测的差异
