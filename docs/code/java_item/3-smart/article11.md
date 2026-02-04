---
title: item3 - 11 聊天模块
date: 2026-2-4
category:
  - code
tag:
  - java_item
  - PaiSmart
# star: true
# sticky: true
order: -0.6
---

聊天模块通过 WebSocket 协议实现双向通信，支持大语言模型（接入了 DeepSeek）输出内容的流式返回；为支持多轮连续对话，该模块集成了 Redis 用于存储和维护用户会话上下文，确保大模型在生成回答时能够“记住”前文内容，维持语义连贯性

为了更好地引导大语言模型生成高质量回答，系统特别强化了 Prompt 构建与模板管理能力：

- 根据检索结果动态生成 Prompt；
- 支持多种 Prompt 模板配置与调优；
- 确保内容组织清晰、有重点，引导模型围绕核心信息生成响应

## 功能实现

![alt text](img/16.png)

## 技术选型

| 功能模块 | 技术选型 | 备注 |
| --- | --- | --- |
| 实时通信 | WebSocket（基于Spring WebSocket） | 支持STOMP子协议 |
| 对话上下文存储 | Redis（使用Spring Data Redis） | 高性能缓存，支持TTL |
| 本地知识库（当前） | Elasticsearch | 支持混合检索 |
| 本地知识库（规划） | Faiss | 提升向量检索性能 |
| 语言模型调用 | DeepSeek API | 通过WebClient调用 |
| Prompt管理 | 自研模板引擎 | 支持动态模板和变量替换 |
| 异步处理 | Spring WebFlux | 支持响应式编程 |
| 安全认证 | JWT | 确保WebSocket连接安全 |
