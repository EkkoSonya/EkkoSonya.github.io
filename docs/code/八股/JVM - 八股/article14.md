---
title: JVM 八股 14 - IDEA 运行流程
date: 2026-3-31
category:
  - code
tag:
  - java
  - jvm
  - 八股
order: -0.5
---

## IDEA 点击运行后的流程

```
.java 文件  --javac-->  .class 文件  --java-->  执行
(源代码)    (编译)      (字节码)      (运行)     (程序)
```

`java` 是用来运行 `.class` 文件的，所以在用 `java` 之前，需要先用 `javac` 编译。

IDEA 帮我们自动处理了这个过程。

### 1. 保存与读取配置

- **自动保存未保存的文件：** IDEA 会把编辑器里所有修改过但还未保存到磁盘的文件进行落盘。这是为什么你在 IDEA 里几乎不需要手动 `Ctrl + S` 的原因。
- **读取运行配置：** IDEA 会读取你当前选中的 **Run/Debug Configuration**，包括：
  - Main Class（主类）
  - 环境变量
  - JVM 参数（比如 `-Xmx`、`-Xms`）
  - Program arguments（程序参数）

### 2. 构建与编译

在真正运行之前，代码必须被编译成字节码（`.class` 文件）。

- **判断构建委派：**
  - 如果配置了将构建和运行委派给 Maven 或 Gradle（Spring Boot 项目常见），IDEA 会直接调用对应命令（如 `mvn clean compile` 或 `gradlew classes`）。
  - 如果没有委派，IDEA 会使用自带的增量编译器（JPS - Java Project System）。
- **增量编译：** IDEA 不会每次都全量编译整个项目。它通过内部的依赖图分析出哪些 `.java` 文件被修改过，以及哪些依赖它们的文件需要重新编译，然后仅将这些文件交给 `javac` 编译成 `.class` 文件，输出到 `target/classes` 或 `out/production` 目录下。

### 3. 组装启动命令

编译完成后，IDEA 开始拼装启动 JVM 所需的命令。

- **构建 Classpath：** 这是最庞大的一步。IDEA 会遍历你项目的依赖树，把所有第三方 `.jar` 包的绝对路径、你自己模块的 `classes` 输出目录，全部用分号（Windows）或冒号（Linux/macOS）拼接起来。
- **拼接完整命令：** 结合第 1 步读取到的配置，IDEA 会生成一条类似这样的命令：

```text
/path/to/jdk/bin/java.exe -Xmx1024m -javaagent:/idea/lib/idea_rt.jar
-classpath /your/project/out/classes;/m2/repo/spring.jar...
com.your.package.MainClass arg1 arg2
```

> `idea_rt.jar` 是 IDEA 注入的一个代理，用于捕获控制台输出和优雅地停止进程。

### 4. 启动进程

- **Fork 新进程：** IDEA 向操作系统发出请求，根据刚才拼接好的命令，Fork 出一个新的子进程来运行 `java` 应用程序。
- **启动 JVM：** 操作系统启动 JVM 实例，分配初始内存（堆、栈、方法区等）。

### 5. 类加载与执行

到这一步，接力棒正式交给了 JVM。

- **加载主类：** JVM 的应用程序类加载器（Application ClassLoader）会根据 IDEA 传过来的 Classpath，去磁盘里找到主类的 `.class` 文件，并将其加载到内存中。
- **执行 `main` 方法：** JVM 找到主类中的 `public static void main(String[] args)` 方法，将 IDEA 传过来的程序参数作为 `args` 传入，正式开始执行业务逻辑（例如启动 Spring 容器、初始化 Tomcat 等）。

### 6. 控制台输出绑定

- **重定向输入输出：** JVM 运行时产生的标准输出（`System.out`）和标准错误输出（`System.err`）会被 IDEA 捕获。
- **渲染日志：** IDEA 将这些日志流渲染到你底部的 Run 窗口中。如果你在控制台输入了文字，IDEA 也会通过标准输入（`System.in`）传回给运行中的 JVM 进程。

---

## 总结

简而言之，IDEA 点击运行的过程，本质上就是：

> **保存代码 → 增量编译 → 拼装 Classpath 和启动参数 → 启动新进程运行 `java` 命令 → 监控输出**
