---
title: Net13 - 杂
date: 2026-4-7
category:
  - code
tag:
  - Net
  - 八股
# star: true
# sticky: true
order: -0.5
---

## 杂

### Cookie 和 Session

Session 是**基于Cookie 实现**的另一种记录服务端和客户端会话状态的机制。

Session 是存储在服务端，而 SessionId 会被存储在客户端的 Cookie 中。

Session 的**认证过程**：

1. 客户端第一次发送请求到服务端，服务端根据信息创建对应的 Session，并在响应头返回 SessionID
2. 客户端接收到服务端返回的 SessionID 后，会将此信息存储在 Cookie 上，同时会记录这个 SessionID 属于哪个域名
3. 当客户端再次访问服务端时，请求会自动判断该域名下是否存在 Cookie 信息，如果有则发送给服务端，服务端会从 Cookie 中拿到 SessionID，再根据 SessionID 找到对应的 Session，如果有对应的 Session 则通过，继续执行请求，否则就中断

#### Cookie和Session的区别

1. 安全性，因为 Cookie 可以通过客户端修改，而 Session 只能在服务端设置，所以安全性比 Cookie 高，一般会用于验证用户登录状态
2. 适用性，Cookie 只能存储字符串数据，而 Session 可以存储任意类型数据
3. 有效期，Cookie 可以设置任意时间有效，而 Session 一般失效时间短
