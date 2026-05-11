---
title: hint - 拦截器 vs 过滤器
date: 2026-04-05
category:
  - code
tag:
  - java hint
# star: true
# sticky: true
order: -0.7482
---

## 拦截器 vs 过滤器

拦截器（Interceptor）和过滤器（Filter）都是 Java Web 应用中实现 AOP（面向切面编程）思想的重要组件，它们都可以用来在请求处理前后执行特定的逻辑。但在底层机制、归属规范和应用场景上有非常显著的区别。

在以 Spring Boot 为核心的后端架构中，理解这两者的差异是设计优雅请求处理链路的关键。

### 核心对比

| **维度** | **过滤器 (Filter)** | **拦截器 (Interceptor)** |
| --- | --- | --- |
| **规范与归属** | Servlet 规范的一部分，由 Servlet 容器（如 Tomcat）管理。 | Spring MVC 框架的一部分，由 Spring 容器管理。 |
| **触发机制** | 基于函数回调（`chain.doFilter()`）。 | 基于 Java 反射机制（动态代理）和 Spring 的 `HandlerExecutionChain`。 |
| **拦截范围** | 几乎拦截所有进入容器的请求（包括静态资源、JSP 等）。 | 通常只拦截发往 Controller（Handler）的请求。 |
| **上下文感知能力** | 只能获取到 `ServletRequest`、`ServletResponse`。感知不到 Spring 的 Bean 和具体的 Controller 方法。 | 可以注入 Spring Bean，并且能通过参数获取到即将执行的 Controller 方法（`HandlerMethod`）。 |
| **执行时机** | 在请求进入 `DispatcherServlet` 之前执行。 | 在 `DispatcherServlet` 之后，到达具体 Controller 之前执行。 |

### 执行链路与生命周期

当一个 HTTP 请求到达 Spring MVC 应用时，它就像穿过一个洋葱，执行顺序如下：

1. **Client 发起请求**
2. ➡️ **Filter** `doFilter()` (前置逻辑)
3. ➡️ **DispatcherServlet** (Spring 核心分发器接收请求)
4. ➡️ **Interceptor** `preHandle()`
5. ➡️ **Controller** (你的业务逻辑)
6. ⬅️ **Interceptor** `postHandle()` (只有当 `preHandle` 返回 true 且未抛出异常时执行)
7. ⬅️ **DispatcherServlet** (处理视图渲染)
8. ⬅️ **Interceptor** `afterCompletion()` (无论是否发生异常都会执行，常用于资源清理)
9. ⬅️ **Filter** `doFilter()` (后置逻辑)
10. **响应 Client**

### 深入：过滤器 (Filter)

过滤器是最外层的防线。因为它在 Spring 上下文之外（虽然可以通过 `DelegatingFilterProxy` 将其交由 Spring 管理），所以它处理的是最原始的 HTTP 请求。

- **核心方法：**
  - `init()`: 容器启动时初始化。
  - `doFilter()`: 处理请求，必须调用 `FilterChain.doFilter()` 才能让请求继续传递。
  - `destroy()`: 容器销毁前执行。
- **典型应用场景：**
  - **全局安全与防护：** XSS 防护、CSRF 过滤、请求体加密/解密。
  - **字符集编码：** 全局设置请求和响应的字符编码（Spring 的 `CharacterEncodingFilter`）。
  - **CORS 跨域处理：** 在最外层拒绝不合法的跨域请求。
  - **敏感词过滤 / 流量限制：** 作用于所有访问路径的底层过滤。

### 深入：拦截器 (Interceptor)

拦截器深入 Spring MVC 框架内部。当你需要对特定的业务路由进行精细化控制，且需要调用 Spring 容器中的其他组件时，拦截器是最佳选择。

- **核心方法（实现 `HandlerInterceptor` 接口）：**
  - `preHandle()`: 预处理，返回 `boolean`。如果为 `false`，请求将被中断。
  - `postHandle()`: Controller 执行后，视图渲染前执行（对于前后端分离的 Rest 接口，此方法多用于修改返回状态）。
  - `afterCompletion()`: 整个请求完成后执行，主要用于清理 `ThreadLocal` 变量，防止 JVM 内存泄漏，尤其是在高并发或者基于 AQS 自定义同步器时，线程池复用导致的上下文污染问题。
- **典型应用场景：**
  - **细粒度权限校验：** 判断当前用户是否有权限访问某个 Controller（可以通过 `handler` 参数获取到 Controller 上的注解）。
  - **业务上下文传递：** 解析请求头中的 Token，将用户信息存入 `ThreadLocal` 供后续链路使用。
  - **接口防刷与限流：** 结合 Redis 和自定义注解，实现接口级别的访问频次控制。
  - **性能监控：** 在 `preHandle` 记录开始时间，在 `afterCompletion` 计算并记录请求处理总耗时。

### 总结建议

- **选 Filter：** 如果你的逻辑是**脱离具体业务的全局操作**，或者需要处理静态资源，再或者需要在请求进入 Spring 之前就将其拦截（例如全局的黑名单过滤、修改 HttpServletRequest Wrapper）。
- **选 Interceptor：** 如果你的逻辑**与特定 Controller 紧密相关**，需要读取 Controller 上的元数据（如自定义注解），或者需要依赖 Spring 容器内部的 Bean（如操作数据库或缓存）来完成业务校验。
