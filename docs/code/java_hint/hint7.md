---
title: hint - 屏障
date: 2026-3-31
category:
  - code
tag:
  - java hint
# star: true
# sticky: true
order: -0.7482
---

## 屏障

屏障 = 在某个操作前后插入的"检查点"或"钩子"

```plain
想象一个小区门禁：

居民进出 → [门禁屏障] → 记录谁进出了 → 放行

屏障不做"拦截"，只做"记录"或"检查"
```

### 计算机中的屏障

#### 内存屏障

CPU 为了性能会重排序指令，内存屏障告诉 CPU：

```plain
指令1
指令2
[内存屏障] ←  barrier 之前的指令必须先执行完
指令3
指令4
```

在 Java 内存模型（JMM）中，定义了四种基本的内存屏障来处理 Load（读）和 Store（写）操作的组合：

| **屏障类型** | **指令组合** | **原理** |
| --- | --- | --- |
| **LoadLoad** | `Load1; LoadLoad; Load2` | 确保 Load1 的数据装载先于 Load2 及之后的所有装载指令。 |
| **StoreStore** | `Store1; StoreStore; Store2` | 确保 Store1 的数据对其他处理器可见（刷新到内存）先于 Store2。 |
| **LoadStore** | `Load1; LoadStore; Store2` | 确保 Load1 数据装载先于 Store2 及之后的存储指令刷新到内存。 |
| **StoreLoad** | `Store1; StoreLoad; Load2` | **最全能（也最贵）**。确保 Store1 刷新到内存先于 Load2。它同时具备前三种的功能。 |

### JVM 垃圾收集器中的屏障 (软件层面)

可以把它们理解为 JVM 在执行底层 C++ 代码时，对“引用赋值”（写）和“读取引用”（读）操作做的 AOP 切面(拦截器)

#### 写屏障

写屏障是在**对象引用被修改（写入新值）**时触发的一小段额外代码逻辑

写操作前/后插入的代码：

```java
obj.field = value;    // 正常写入
[写屏障]              // 额外逻辑：记录这次写入
```

#### 读屏障

```java
value = obj.field;    // 正常读取
[读屏障]              // 额外逻辑：比如 ZGC 的读屏障用于转发指针
```
