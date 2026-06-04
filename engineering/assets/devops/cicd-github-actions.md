---
title: CI/CD 流水线搭建：GitHub Actions 实践
tags: [CI/CD, GitHub Actions, 自动化]
status: progress
date: 2026-05
---

# CI/CD 流水线搭建：GitHub Actions 实践

> 🚧 调研进行中

## GitHub Actions 核心概念

### Workflow
定义在 `.github/workflows/` 目录下的 YAML 文件，描述自动化流程。

### 触发事件（Event）
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 9 * * 1'  # 每周一早 9 点
```

### Job 与 Step
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Run tests
        run: |
          pip install -r requirements.txt
          pytest --cov=./
```

## 测试流水线设计

```
Push / PR
  │
  ├──→ Lint & Format Check     (parallel)
  ├──→ Unit Tests               (parallel)
  │
  └──→ [All pass]
        │
        ├──→ Integration Tests
        ├──→ E2E Tests (Playwright)
        │
        └──→ Build & Deploy to Staging
              │
              └──→ Smoke Tests
```

## 实践经验

### 1. 缓存加速
```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
```

### 2. 测试报告集成
- 使用 `pytest --junitxml=report.xml` 输出 JUnit 格式
- 通过 `dorny/test-reporter` 在 PR 上直接展示测试结果

### 3. 矩阵测试
```yaml
strategy:
  matrix:
    python-version: ['3.10', '3.11', '3.12']
    os: [ubuntu-latest, windows-latest]
```

## 后续计划

- [ ] 完成一个完整的 CI/CD 流水线示例
- [ ] 集成 Playwright E2E 测试
- [ ] 探索自托管 Runner 的使用场景
