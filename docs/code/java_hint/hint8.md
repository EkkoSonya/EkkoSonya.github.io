---
title: hint - 注解理解2
date: 2026-04-05
category:
  - code
tag:
  - java hint
# star: true
# sticky: true
order: -0.7482
---

## 注解

### 什么是注解 `@interface`

注解就是一个继承了 `java.lang.annotation.Annotation` 的接口, 而对应的值实际上会被编译成对应的抽象方法

#### 测试

```java
// Penguin.java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface Penguin {
    String value() default "";
}
```

通过 `javac` 编译后得再通过 `javap` 反编译可以等价于

```java
Compiled from "Penguin.java"
public interface com.ekko.Penguin extends java.lang.annotation.Annotation {
  public abstract java.lang.String value();
}
```

### 元注解

元注解就是修饰注解的注解，全在 `java.lang.annotation` 包下已经定义好了

| 元注解 | 作用 |
| --- | --- |
| `@Target` | 限定注解能用在哪些位置 |
| `@Retention` | 注解保留到哪个阶段（SOURCE / CLASS / RUNTIME） |
| `@Documented` | 是否包含在 JavaDoc 中 |
| `@Inherited` | 子类是否继承父类的注解 |
| `@Repeatable` | 是否可以在同一地方重复标注（Java 8+） |
| `@Native` | 标记常量可被本地代码引用（不常用） |

#### `@Target` 决定注解能“贴”在哪（作用域）

通过 `ElementType` 枚举来严格限制你的注解可以修饰哪些代码元素。如果不写 `@Target`，默认可以贴在任何地方。

- `TYPE`：类、接口（包括注解类型）、枚举。
- `METHOD`：方法。
- `FIELD`：成员变量（字段）。
- `PARAMETER`：方法的参数。
- `CONSTRUCTOR`：构造函数。
- *(Java 8 新增)* `TYPE_USE`：任何使用到类型的地方（比如泛型参数、强制类型转换时）

#### `@Retention` 决定注解能“活”多久（生命周期）

通过 `RetentionPolicy` 枚举来控制注解在 Java 生命周期的哪个阶段会被丢弃。如果不写，默认是 `CLASS`。

- **`SOURCE`（源码级）：** 注解只在 `.java` 源码中存在，编译成 `.class` 时就会被编译器无情丢弃（比如 `@Override`、`@SuppressWarnings`，仅仅是给编译器做语法检查用的）。
- **`CLASS`（字节码级）：** 注解会被保留在 `.class` 文件中，但 JVM 加载类时**不会**把它们读进内存。这种多用于字节码增强工具（如 Lombok，在编译期间操纵字节码生成 Getter/Setter）。
- **`RUNTIME`（运行级）：** 注解不仅在 `.class` 中，还会被加载到 JVM 内存中。你可以随时用**反射**读取它们。我们日常开发中自定义的业务注解（如 Spring 的 `@Service`、`@Autowired`）几乎全是 `RUNTIME`。

#### `@Documented` 决定注解是否进入“说明书”

这是一个标记注解（不需要传任何值）。

Java 提供了一个叫 `javadoc` 的工具，可以把你的代码注释生成 API 帮助文档

默认情况下，你贴在类或方法上的注解是不会出现在生成的文档里的

如果你给自定义注解加上了`@Documented`，那么这个注解的信息就会被包含进最终的 Javadoc API 文档中

#### `@Inherited` 决定注解能否“传宗接代”（继承性）

这也是一个标记注解。它稍微有些特殊，**只对贴在“类（Class）”上的注解有效**，对方法、属性无效。

- 假设你定义了一个 `@Role("Admin")` 注解，并用 `@Inherited` 修饰了它。
- 然后你把 `@Role` 贴在了一个父类 `BaseController` 上。
- 当你的子类 `UserController` 继承 `BaseController` 时，就算子类头上什么都没写，它也会**自动继承**父类的 `@Role("Admin")` 注解

### 元注解底层逻辑

既然元注解的作用是给注解“制定规则”，那么负责执行这些规则的各个“裁判”，就必须提前把对这些元注解的处理逻辑死死刻在自己的源代码里

> "硬编码"在这里的意思是：元注解的语义不是靠 Java 代码自身实现的，而是被写死在编译器（javac）和 JVM 里的，你无法用纯 Java 代码去复现它的效果
>
> 元注解是"约定俗成的魔法标记"，它们的效果由编译器和 JVM 内部用 C++/底层代码实现，Java 层面只是声明了接口，你没有办法自己写一个和 @Retention 等价的注解

#### 问题

> 比如我写了一个新注解，然后编译时候看到有个元注解，比如 @Target 那么编译器是会去看 @Target 这个注解在哪里吗，然后去 java.lang.annotation.Target 找到了，然后编译 `java.lang.annotation.Target`, 然后发现这个注解上有个 `@Target`, 就不断循环了

实际上不会发生

##### 第一层：javac 不会去"重新编译" JDK 的类

当你写了一个注解，javac 看到上面有 `@Target`，它的动作是：

```
你的注解上写了 @Target(ElementType.METHOD)
            ↓
javac 去 classpath 找 Target.class，加载进内存
            ↓
         从中提取两类信息
        ↙              ↘
  1. 它的方法签名        2. 它自身的元注解
  value() → ElementType[]    @Retention(RUNTIME)
                             @Target(ANNOTATION_TYPE)
                             @Documented
```

它读的是已编译好的 `.class` 文件，而不是重新编译 `.java` 源文件

**JDK 的这些类在你安装 JDK 时就已经编译好了，javac 只是"读"它，不会触发二次编译**

对应的 Target 字节码：

```plain
Classfile jrt:/java.base/java/lang/annotation/Target.class
  Last modified 2025年7月11日; size 483 bytes
  SHA-256 checksum b0e357338f325d1743a89b608c821a8f60624f53bedf853520affdf730ce8e4f
  Compiled from "Target.java"
public interface java.lang.annotation.Target extends java.lang.annotation.Annotation
  minor version: 0
  major version: 68
  flags: (0x2601) ACC_PUBLIC, ACC_INTERFACE, ACC_ABSTRACT, ACC_ANNOTATION
  this_class: #1                          // java/lang/annotation/Target
  super_class: #3                         // java/lang/Object
  interfaces: 1, fields: 0, methods: 1, attributes: 2
Constant pool:
   #1 = Class              #2             // java/lang/annotation/Target
   #2 = Utf8               java/lang/annotation/Target
   #3 = Class              #4             // java/lang/Object
   #4 = Utf8               java/lang/Object
   #5 = Class              #6             // java/lang/annotation/Annotation
   #6 = Utf8               java/lang/annotation/Annotation
   #7 = Utf8               value
   #8 = Utf8               ()[Ljava/lang/annotation/ElementType;
   #9 = Utf8               SourceFile
  #10 = Utf8               Target.java
  #11 = Utf8               RuntimeVisibleAnnotations
  #12 = Utf8               Ljava/lang/annotation/Documented;
  #13 = Utf8               Ljava/lang/annotation/Retention;
  #14 = Utf8               Ljava/lang/annotation/RetentionPolicy;
  #15 = Utf8               RUNTIME
  #16 = Utf8               Ljava/lang/annotation/Target;
  #17 = Utf8               Ljava/lang/annotation/ElementType;
  #18 = Utf8               ANNOTATION_TYPE
{
  public abstract java.lang.annotation.ElementType[] value();
    descriptor: ()[Ljava/lang/annotation/ElementType;
    flags: (0x0401) ACC_PUBLIC, ACC_ABSTRACT
}
SourceFile: "Target.java"
RuntimeVisibleAnnotations:
  0: #12()
    java.lang.annotation.Documented
  1: #13(#7=e#14.#15)
    java.lang.annotation.Retention(
      value=Ljava/lang/annotation/RetentionPolicy;.RUNTIME
    )
  2: #16(#7=[e#17.#18])
    java.lang.annotation.Target(
      value=[Ljava/lang/annotation/ElementType;.ANNOTATION_TYPE]
    )
```

##### 第二层：编译器对元注解有"硬编码豁免"

javac 看到 Target.class 上有 `@Target(ANNOTATION_TYPE)`，此时它需要确认 `Target` 这个类是否已经加载过：

```
去类加载器缓存里查 java.lang.annotation.Target
        ↓
已经在缓存里了（刚才就是加载它触发的这一步）
        ↓
直接返回缓存，不重新加载
```

**类加载器有缓存机制，同一个类只加载一次**，所以不会循环。
