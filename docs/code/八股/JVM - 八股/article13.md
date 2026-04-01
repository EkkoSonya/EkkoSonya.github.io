---
title: JVM 八股13 - 类加载分析
date: 2026-3-31
category:
  - code
tag:
  - java
  - jvm
  - 八股
order: -0.5
---

## 怎么使用自定义 ClassLoader

类加载器是在运行时动态决定的，不是编译时指定的。

当你写 `new MyClass()` 时，JVM 会使用**定义当前类的同一个 ClassLoader**去加载 `MyClass`。

所以如果你想让某个类用自定义 ClassLoader 加载，有两种方式：

### 1. 直接使用自定义 ClassLoader（反射方式）

```java
// 创建自定义类加载器
MyClassLoader classLoader = new MyClassLoader();

// 用它加载类（返回 Class<?>，不能用强类型）
Class<?> clazz = classLoader.loadClass("com.example.MyClass");

// 用反射创建实例
Object obj = clazz.newInstance();
```

**缺点**：返回的是 `Class<?>`，编译时无法知道具体类型，只能用反射。

### 2. 线程上下文类加载器（TCCL）

这是 Java 提供的"父加载器反向委托给子加载器"的机制。

```java
// 保存原来的 ClassLoader
ClassLoader oldLoader = Thread.currentThread().getContextClassLoader();

try {
    // 设置当前线程的 ClassLoader 为自定义的
    Thread.currentThread().setContextClassLoader(new MyClassLoader());

    // 某些框架会通过 TCCL 获取 ClassLoader 来加载类
    // 比如 SPI、JDBC、Spring 等
    Class.forName("com.example.MyClass", true,
                  Thread.currentThread().getContextClassLoader());
} finally {
    // 恢复原来的 ClassLoader
    Thread.currentThread().setContextClassLoader(oldLoader);
}
```

---

## 类加载器的自举问题

一个经典问题：**ClassLoader 这个类本身是谁加载的？**

### JVM 启动时的加载顺序

```
1. JVM 启动
   ↓
2. Bootstrap ClassLoader 创建（C++ 代码，不是 Java 类）
   ↓
3. Bootstrap ClassLoader 加载核心类：
   - java.lang.Object
   - java.lang.Class
   - java.lang.ClassLoader
   - java.lang.String
   - ... 等 rt.jar 中的类
   ↓
4. Extension ClassLoader 创建（Java 类，由 Bootstrap 加载）
   ↓
5. Application ClassLoader 创建（Java 类，由 Extension 加载）
```

**关键**：第一个加载器必须"凭空出现"，这是典型的**自举（Bootstrap）**问题。

```
┌─────────────────────────────────────┐
│   Bootstrap ClassLoader (C++ 原生)   │ ← 最底层，JVM 内置
│   加载：Object, Class, ClassLoader   │
└─────────────────────────────────────┘
                 ↓ 加载
┌─────────────────────────────────────┐
│   Extension ClassLoader (Java 类)    │
│   由 Bootstrap 加载                  │
└─────────────────────────────────────┘
                 ↓ 加载
┌─────────────────────────────────────┐
│   Application ClassLoader (Java 类)  │
│   由 Extension 加载                  │
└─────────────────────────────────────┘
```

### 验证

```java
public class Test {
    public static void main(String[] args) {
        Class<?> clazz = ClassLoader.class;
        System.out.println(clazz.getClassLoader());
        // 输出：null
    }
}
```

输出 `null` 不是因为没人加载它，而是因为 **Bootstrap ClassLoader 是原生代码（C/C++）**，不是 Java 对象。

---

## 自定义 ClassLoader 是谁加载的

### 类 vs 实例

```java
// 你写的这个类
public class MyClassLoader extends ClassLoader {
    ...
}
```

要分清两个概念：

| | **MyClassLoader 这个类** | **MyClassLoader 这个实例** |
| --- | --- | --- |
| **谁加载的** | AppClassLoader（假设在 classpath 下） | 是你 `new` 出来的，不是谁加载的 |
| **类比** | 就像 `MyClass.class` | 就像 `new MyClass()` |

### 代码验证

```java
public class Test {
    public static void main(String[] args) {
        // MyClassLoader 这个类是谁加载的？
        // → AppClassLoader
        System.out.println(MyClassLoader.class.getClassLoader());

        // 创建一个实例
        MyClassLoader loader = new MyClassLoader();
        // 这个实例是你 new 出来的，不是谁"加载"的

        // 用这个实例去加载其他类
        Class<?> clazz = loader.loadClass("com.example.MyClass");

        // MyClass 是由 loader 这个实例加载的
        System.out.println(clazz.getClassLoader());  // MyClassLoader@xxx
    }
}
```

### 完整链条

```
┌─────────────────────────────────────┐
│ Bootstrap ClassLoader               │
│ 加载：ClassLoader 类、Object 类等     │
└─────────────────────────────────────┘
             ↓ 加载
┌─────────────────────────────────────┐
│ Application ClassLoader             │
│ 加载：你的 MyClassLoader 类、Main 类  │
└─────────────────────────────────────┘
             ↓ 你 new
┌─────────────────────────────────────┐
│ MyClassLoader 实例                   │
│ 加载：你指定的类（如 MyClass）        │
└─────────────────────────────────────┘
             ↓ 加载
┌─────────────────────────────────────┐
│ MyClass                             │
└─────────────────────────────────────┘
```

---

## new 对象时的类加载时机

第一次 `new` 一个对象时，会触发类加载：

```java
MyClassLoader loader = new MyClassLoader();
```

**执行过程：**

```
1. JVM 发现要用 MyClassLoader 这个类
   ↓
2. 检查：这个类加载了吗？
   ↓
3. 没加载过 → 触发类加载流程
   ↓
4. AppClassLoader 加载 MyClassLoader.class
   ↓
5. 执行静态代码块（如果有）
   ↓
6. 然后才能 new 出实例
```

### 关键点

- **类加载只发生一次**：第二次 `new MyClassLoader()` 就不会再加载了
- **类加载是惰性的**：没用到的类不会加载

```java
new MyClassLoader();  // 第一次：加载 + 实例化
new MyClassLoader();  // 第二次：只实例化，不加载
new MyClassLoader();  // 第三次：只实例化，不加载
```

### 主动引用才会触发

以下操作会触发类加载：

| 代码 | 是否触发 |
| --- | --- |
| `new MyClass()` | ✅ |
| `MyClass.staticVar` | ✅ |
| `MyClass.staticMethod()` | ✅ |
| `Class.forName("com.example.MyClass")` | ✅ |

---

## import 会触发类加载吗？

**不会！**

`import` 只是**编译期的语法糖**，方便你写代码时不用写全限定名。

### 编译前后对比

```java
// 源代码
import com.example.MyClass;
public class Test {
    MyClass obj = new MyClass();
}

// 编译后的字节码（javap）
public class Test {
    com.example.MyClass obj;  // import 消失了，变成全限定名
}
```

`import` 在编译成 `.class` 文件后就不存在了，它只是告诉编译器："我写的 `MyClass` 指的是 `com.example.MyClass`"。

### 什么情况下触发

```java
import com.example.MyClass;

public class Test {
    // 这里不会触发！因为只是声明类型
    MyClass obj1;

    // 这里会触发！因为 new 创建了实例
    MyClass obj2 = new MyClass();

    // 或者这里也会触发
    void method() {
        MyClass obj3 = new MyClass();
    }
}
```

### 总结

| 代码 | 是否触发加载 |
| --- | --- |
| `import com.example.MyClass;` | ❌ |
| `MyClass obj;` | ❌ |
| `new MyClass();` | ✅ |
| `MyClass.staticMethod();` | ✅ |
| `Class.forName("com.example.MyClass");` | ✅ |

**`import` 只是编译时的"别名"，真正触发类加载的是运行时的主动引用。**
