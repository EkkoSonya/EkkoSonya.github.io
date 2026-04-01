---
title: JVM 八股15 - javac 和 java 命令
date: 2026-3-31
category:
  - code
tag:
  - java
  - jvm
  - 八股
order: -0.5
---

## 编译与运行

```
.java 文件  --javac-->  .class 文件  --java-->  执行
(源代码)    (编译)      (字节码)      (运行)     (程序)
```

- **`javac`**：编译器，将 `.java` 源文件编译成 `.class` 字节码
- **`java`**：运行器，启动 JVM 加载并执行 `.class` 文件

---

## 简单包结构 vs 复杂包结构

### 简单包结构（默认包）

```java
// Hello.java - 没有 package 声明
public class Hello {
    public static void main(String[] args) {}
}
```

```bash
javac Hello.java
java Hello
```

### 复杂包结构

```java
// Hello.java - 必须有 package 声明
package com.example.demo;

public class Hello {
    public static void main(String[] args) {}
}
```

目录结构必须对应：

```
src/
└── com/
    └── example/
        └── demo/
            └── Hello.java
```

```bash
# 编译：指定输出目录
javac -d out src/com/example/demo/Hello.java

# 运行：使用全限定名
java -cp out com.example.demo.Hello
```

---

## javac 编译命令

```bash
# 基本格式
javac [选项] <源文件...>
```

| 命令 | 说明 |
| --- | --- |
| `javac Hello.java` | 编译单个文件 |
| `javac *.java` | 编译当前目录所有 .java 文件 |
| `javac -d ./out src/com/example/*.java` | 指定输出目录 |
| `javac -cp "lib/*" Hello.java` | 指定依赖的 jar 包（Windows 用 `;` 分隔） |
| `javac -cp "lib/*" Hello.java` | 指定依赖的 jar 包（Linux/Mac 用 `:` 分隔） |
| `javac -encoding UTF-8 Hello.java` | 指定源文件编码 |
| `javac -source 8 -target 8 Hello.java` | 指定编译版本 |
| `javac -deprecation Hello.java` | 显示废弃 API 警告 |
| `javac -verbose Hello.java` | 输出详细编译信息 |

---

## java 运行命令

```bash
# 基本格式
java [选项] <类名> [参数...]
```

| 命令 | 说明 |
| --- | --- |
| `java Hello` | 运行主类（不要 .class 后缀） |
| `java -cp ./out Hello` | 指定 classpath |
| `java -jar app.jar` | 运行 jar 包 |
| `java -Xms512m -Xmx1024m Hello` | 设置堆内存初始/最大值 |
| `java -Dfile.encoding=UTF-8 Hello` | 设置系统属性 |
| `java -verbose:class Hello` | 显示类加载信息 |
| `java -agentlib:jdwp=... Hello` | 启用远程调试 |
| `java -jar app.jar arg1 arg2` | 传递程序参数 |

---

## sourcepath 和 classpath 区别

| | **sourcepath** | **classpath** |
| --- | --- | --- |
| **作用** | 指定 `.java` 源文件搜索路径 | 指定 `.class` 字节码搜索路径 |
| **谁用** | `javac` 编译时用 | `javac` 编译时 + `java` 运行时都用 |
| **默认值** | 当前目录 | 当前目录 (`.`) |
| **典型场景** | 编译依赖源码、生成文档 | 依赖第三方 jar、运行项目 |

### 示例

```bash
# sourcepath：告诉编译器去哪里找源码
javac -sourcepath src -d out src/com/example/Main.java

# classpath：告诉 JVM 去哪里找字节码和依赖
javac -cp "lib/*" -d out src/com/example/Main.java
java -cp "out;lib/*" com.example.Main
```

---

## 默认类路径

当你运行 `javac` 或 `java` 时，JVM 会自动加载 JDK 标准库：

- **Java 8 及以前**：`rt.jar`（包含所有标准库类）
- **Java 9+**：模块化标准库

这些类位于：

```
$JAVA_HOME/jre/lib/rt.jar          (Java 8)
$JAVA_HOME/lib/jrt-fs.jar          (Java 9+)
$JAVA_HOME/jmods/java.base.jmod    (Java 9+ 模块)
```

所以 `java.util.List`、`java.lang.String` 等类不需要手动指定 classpath。

---

## 什么时候需要指定 classpath

只有当你使用了**第三方库**或**自定义类**时，才需要指定：

```bash
# 使用第三方库（如 Gson）
javac -cp "./lib/gson.jar" MyApp.java

# 使用自己编译的类
javac -cp "./out" src/com/example/Main.java

# 同时使用多个依赖
javac -cp "./lib/*;./out" src/com/example/Main.java
```

| 类型 | 示例 | 需要指定 classpath 吗？ |
| --- | --- | --- |
| JDK 标准类 | `java.util.List`, `java.lang.String` | ❌ 不需要 |
| 第三方库 | `com.google.gson.Gson` | ✅ 需要 |
| 自己的类 | `com.example.Person` | ✅ 需要（如果不在当前目录） |

---

## 完整示例

### 1. 简单项目

```bash
javac Hello.java
java Hello
```

### 2. 带包名的项目

```bash
javac -d out src/com/example/*.java
java -cp out com.example.Hello
```

### 3. 有依赖的项目

```bash
# 编译
javac -cp "lib/*" -d out src/com/example/*.java

# 运行
java -cp "out;lib/*" com.example.Hello
```

### 4. 设置内存

```bash
java -Xms256m -Xmx512m -jar app.jar
```

### 5. 查看类加载过程

```bash
java -verbose:class Hello
```
