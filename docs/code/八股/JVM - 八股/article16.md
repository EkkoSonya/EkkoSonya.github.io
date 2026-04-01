---
title: JVM 八股16 - 类加载器分析
date: 2026-3-31
category:
  - code
tag:
  - java
  - jvm
  - 八股
order: -0.5
---

## jdk jre | jar

```
┌─────────────────────────────────────────┐
│              JDK                         │
│  ┌────────────────────────────────────┐ │
│  │              JRE                    │ │
│  │  ┌────────────────────────────────┐│ │
│  │  │            JVM                 ││ │
│  │  │  (Java Virtual Machine)        ││ │
│  │  │   - 加载 .class                ││ │
│  │  │   - 执行字节码                 ││ │
│  │  └────────────────────────────────┘│ │
│  │   + 核心类库 (rt.jar)              │ │
│  │   - java.lang.*                    │ │
│  │   - java.util.*                    │ │
│  └────────────────────────────────────┘ │
│   + 开发工具                             │
│   - javac (编译器)                      │
│   - java (运行器)                       │
│   - javadoc (文档生成)                  │
│   - jdb (调试器)                        │
│   - jmap, jstack (性能分析)             │
└─────────────────────────────────────────┘
```

### jar

JAR = Java ARchive（Java 归档文件）

简单说：JAR 就是打包好的 .class 文件 + 资源文件，类似 .zip 格式。

```
my-library.jar
├── META-INF/
│   └── MANIFEST.MF      # 清单文件（描述 jar 信息）
├── com/
│   └── example/
│       ├── MyClass.class
│       └── MyService.class
├── config/
│   └── application.properties
└── ...其他资源文件
```

使用

```
# 编译时指定 classpath
javac -cp "lib/mysql-connector.jar" MyApp.java

# 运行时指定 classpath
java -cp "myapp.jar;lib/mysql-connector.jar" com.example.Main
```

分析

```
主程序
  ↓
运行时扫描 plugins/ 目录
  ↓
发现 plugin-a.jar, plugin-b.jar
  ↓
用 URLClassLoader 加载 jar 中的实现类
  ↓
通过接口调用插件功能
```

## 类加载器分析

> 只有通过反射才能用我们的自定义吗，比如我把.java编译好后，用java命令启动，是用什么类加载器

- 用 java 命令启动时，默认使用的是什么类加载器？ 默认使用的是 `AppClassLoader`（应用程序类加载器，也叫系统类加载器）
- 只有通过反射才能用自定义 ClassLoader 吗？ 不是的。 虽然首次实例化通常需要反射，但在实际开发中，我们通常会结合**接口和隐式加载机制**来完美避开后续繁琐的反射调用

### 用 java 命令启动时的类加载流程

当你编译好代码，在终端输入 `java com.example.Main` 并回车时，JVM 启动并初始化类加载器体系，流程如下：

1. **Bootstrap ClassLoader（引导类加载器）：** 最先启动，由 C/C++ 实现，负责加载 JDK 最核心的类库（如 `java.lang.*`、`rt.jar` 等）。
2. **ExtClassLoader（扩展类加载器）：** 接着启动，负责加载 Java 的扩展库（如 `jre/lib/ext` 目录下的类）。*注：Java 9 模块化之后改名为 PlatformClassLoader。*
3. **AppClassLoader（应用程序类加载器）：** 最后启动。**它就是你用 `java` 命令启动主类的默认加载器。** 它负责去你配置的 `classpath`（或默认的当前目录）下找到 `com.example.Main.class` 并加载执行。

**总结：** 只要是你放在项目 Classpath 里的代码，或者通过 `java -cp` 运行的代码，入口类都是被 AppClassLoader 加载的。

### 只有通过反射才能用自定义加载器吗

如果你的 SecretClass 只存在于外部目录，而在你写代码的当前工程里不存在，编译器（javac）在编译阶段是找不到这个类的。如果你直接写 SecretClass obj = new SecretClass();，代码根本编译不通过。

为了绕过编译期检查，我们才使用了反射。

但实际工程中（如 Tomcat、热部署框架、插件系统），频繁使用反射性能很差且代码丑陋

常见的优雅替代方案有以下两种：

#### 面向接口编程（最常用的最佳实践）

接口由 AppClassLoader 加载，实现类由自定义 ClassLoader 加载

##### 定义一个接口

放在主工程中（编译期可见）

```java
public interface MyPlugin {
  void start();
}
```

##### 编写实现类

并把它编译后的 `.class` 放到外部目录（让自定义类加载器去加载）：

```java
public class MyPluginImpl implements MyPlugin {
  @Override
  public void start() {
      System.out.println("插件启动了！");
  }
}
```

##### 在主程序中调用

只需要在创建实例的那一瞬间使用反射（或 `newInstance`），然后将其强转为接口类型。后续所有的调用都像普通代码一样：

```java
// 1. 加载外部的实现类
Class<?> pluginClass = myCustomLoader.loadClass("com.example.MyPluginImpl");

// 2. 实例化并强转为接口类型（只需这里用一次反射/实例化）
MyPlugin plugin = (MyPlugin) pluginClass.getDeclaredConstructor().newInstance();

// 3. 正常调用方法，无需反射！
plugin.start();
```

#### 利用“隐式加载机制”

JVM 类加载有一个重要特性：**如果类 A 是由某个类加载器加载的，那么类 A 内部引用的所有其他类（包括 new 出来的类），默认都会由加载类 A 的这个类加载器去加载**（前提是这些类还没被加载过）。

这意味着，你只需要用自定义 ClassLoader（结合反射或接口）把**入口类**加载进来，这个入口类内部如果写了 `User user = new User();`，JVM 会自动用你的自定义 ClassLoader 去加载 `User`，全程不需要你写一行反射代码。
