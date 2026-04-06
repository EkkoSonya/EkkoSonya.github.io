---
title: Spring系列八股21 - SpringBoot4
date: 2026-4-6
category:
  - code
tag:
  - java
  - spring
  - 八股
# star: true
# sticky: true
order: -0.5
---

## SpringBoot4

### 自动装配面试回答

目的： 根据引入的 Starter 依赖，自动把相关的 Bean 注册到容器，省去手动配置

**`@SpringBootApplication`** 是入口，它是个组合注解，其中 **`@EnableAutoConfiguration`** 负责开启自动配置。

`@EnableAutoConfiguration` 内部通过 **`@Import(AutoConfigurationImportSelector.class)`** 引入了核心选择器。

---

Spring 容器启动时会调用它的 **`selectImports()`** 方法，该方法内部调用 **`getAutoConfigurationEntry()`**，主要做这几件事：

1. **判断开关** — 检查 `spring.boot.enableautoconfiguration` 是否为 true（默认开启）
2. **读取候选配置类** — 通过 `ClassLoader.getResources()` 扫描 classpath 下**所有 jar 包**里的 `META-INF/spring/...AutoConfiguration.imports` 文件，把文件里登记的配置类全名收集起来
3. **去重 & 排除** — 去掉重复的，移除 `@EnableAutoConfiguration(exclude=...)` 指定的类
4. **条件过滤** — 用 `@ConditionalOnClass`、`@ConditionalOnMissingBean` 等注解判断，不满足条件的配置类直接丢弃
5. **注册** — 剩下的配置类作为 Bean 定义导入 Spring 容器

---

**为什么能跨 jar 读取？**

所有依赖的 jar 启动时都被展平进同一个 Classpath，`getResources()` 是**复数方法**，会遍历每一个 jar，把所有同名文件都找出来合并，所以不管加了多少个 Starter 都能被发现。

---

**一句话概括：**

> `@EnableAutoConfiguration` → 读取所有 jar 的 `.imports` 文件 → 条件过滤 → 符合条件的配置类注册进容器。

### 启动分析问题

#### 为什么 Spring Boot 在启动的时候能够找到 main 方法上的@SpringBootApplication 注解

其实 Spring Boot 并不是自己找到 @SpringBootApplication 注解的，而是我们通过程序告诉它的

```java
@SpringBootApplication
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

我们把 `Application.class` 作为参数传给了 run 方法

这个 `Application` 类标注了 `@SpringBootApplication` 注解，用来告诉 Spring Boot：请用这个类作为配置类来启动。

然后，SpringApplication 在运行时就会把这个类注册到 Spring 容器中

#### Spring Boot 默认的包扫描路径是什么

Spring Boot 默认的包扫描路径是主类所在的包及其子包

### SpringBoot 和 SpringMVC 的区别

SpringMVC 是 Spring 的一个模块，专门用来做 Web 开发，处理 HTTP 请求和响应

而Spring Boot 的目标是简化 Spring 应用的开发过程，可以通过 starter 的方式快速集成 SpringMVC

传统的 Web 项目通常需要手动配置很多东西，比如 DispatcherServlet、ViewResolver、HandlerMapping 等等。而 Spring Boot 则通过自动装配的方式，帮我们省去了这些繁琐的配置

Spring Boot 还内置了一个嵌入式的 Servlet 容器，比如 Tomcat，这样我们就不需要像传统的 Web 项目那样需要配置 Tomcat 容器，然后导出 war 包再运行。只需要打包成一个 JAR 文件，就可以直接通过 java -jar 命令运行

### Spring Boot 和 Spring 有什么区别

从定位上来说，Spring 是一个完整的应用开发框架，提供了 IoC 容器、AOP 等各种功能模块

Spring Boot 不是一个独立的框架，而是基于 Spring 框架的脚手架，它的目标是让 Spring 应用的开发和部署变得简单高效

Spring 项目需要我们手动管理每个 jar 包的版本，经常会遇到版本冲突的问题。比如我们要用 Spring MVC，需要引入 spring-webmvc、jackson-databind、hibernate-validator 等一堆依赖，还要确保版本兼容

Spring Boot 通过 starter 机制解决了这个问题，只需要引入 spring-boot-starter-web 这一个依赖就