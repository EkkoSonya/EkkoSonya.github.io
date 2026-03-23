---
title: JUC 八股9 - 内存模型2 (voilatile)
date: 2026-03-23
category:
  - code
tag:
  - java
  - juc
  - 八股
# star: true
# sticky: true
order: -0.5
---

## volatile

主要作用：

第一，保证可见性，线程修改 volatile 变量后，其他线程能够立即看到最新值；

第二，防止指令重排，volatile 变量的写入不会被重排序到它之前的代码

> 通过写屏障和读屏障来实现

### 可见性保证 (读写屏障，强制刷新主内存)

当线程对 volatile 变量进行**写操作**时，JVM 会在这个变量写入之后插入一个写屏障指令，这个指令会**强制将本地内存中的变量值刷新到主内存中**

```plain
StoreStore 屏障  ← 保证之前的写操作不会重排到 volatile 写之后
x = 10;          ← 写入 volatile 变量
StoreLoad 屏障   ← 保证写入立即对其他线程可见
```

| 屏障类型 | 作用 |
| --- | --- |
| `StoreStore` | 禁止**之前的普通写**与**volatile 写**重排 |
| `StoreLoad` | 禁止**volatile 写**与**之后的 volatile 读**重排，并强制刷新到主内存 |

当线程对 volatile 变量进行**读操作**时，JVM 会插入一个读屏障指令，这个指令会**强制让本地内存中的变量值失效**，从而重新从主内存中读取最新的值

```plain
LoadLoad 屏障   ← 强制从主内存读取
LoadStore 屏障  ← 禁止 volatile 读与之后的写重排
int value = x;
```

| 屏障类型 | 作用 |
| --- | --- |
| `LoadLoad` | 禁止**之前的 volatile 读**与**之后的普通读**重排，强制刷新本地缓存 |
| `LoadStore` | 禁止**volatile 读**与**之后的普通写**重排 |

---

当我们使用 volatile 关键字来修饰一个变量时，Java 内存模型会插入内存屏障（一个处理器指令，可以对 CPU 或编译器重排序做出约束）来确保以下两点：

- 写屏障（Write Barrier）：当一个 volatile 变量被写入时，写屏障确保在该屏障之前的所有变量的写入操作都提交到主内存。
- 读屏障（Read Barrier）：当读取一个 volatile 变量时，读屏障确保**在该屏障之后的所有读操作都从主内存中读取**。

### 有序性保证

JVM 会在 volatile 变量的读写前后插入 “内存屏障”，以约束 CPU 和编译器的优化行为：

- StoreStore 屏障可以禁止普通写操作与 volatile 写操作的重排
- StoreLoad 屏障会禁止 volatile 写与 volatile 读重排
- LoadLoad 屏障会禁止 volatile 读与后续普通读操作重排，强制从主内存读取
- LoadStore 屏障会禁止 volatile 读与后续普通写操作重排

### 开销问题

volatile 确实会带来一些开销，主要包括：

- 禁止 CPU 缓存优化，每次都要同步到主内存
- 插入内存屏障，防止指令重排序
- 在某些架构上，会导致 CPU 缓存行失效

但是！现代 CPU 和 JVM 都做了大量优化，volatile 的开销已经降低到可以接受的范围。

第一，现代 CPU 都有多级缓存（L1、L2、L3），volatile 变量虽然不能在寄存器中缓存，但还是可以利用 CPU 缓存

只是需要通过缓存一致性协议（MESI）来保证可见性

第二，JVM 会根据不同的 CPU 架构选择最优的内存屏障实现

AQS 的设计非常精妙，只在绝对必要的地方使用 volatile。比如 state 必须是 volatile，因为所有线程都要看到最新值，但 Node 中的 nextWaiter 就不需要，因为它只在持有锁的情况下访问

AQS 大量使用 Unsafe 类进行更细粒度的控制

### volatile 和 synchronized 区别

volatile 关键字用于修饰变量，确保该变量的更新操作对所有线程是可见的，即一旦某个线程修改了 volatile 变量，其他线程会立即看到最新的值。

synchronized 关键字用于修饰方法或代码块，确保同一时刻只有一个线程能够执行该方法或代码块，从而实现互斥访问

### volatile 在基本类型和对象的区别

当 volatile 用于基本数据类型时，能确保该变量的读写操作是直接从主内存中读取或写入的

当 volatile 用于引用类型时，能确保引用本身的可见性，即确保引用指向的对象地址是最新的

但是，volatile 并不能保证引用对象内部状态的线程安全

如果需要保证引用对象内部状态的线程安全，需要使用 synchronized 或 ReentrantLock 等锁机制
