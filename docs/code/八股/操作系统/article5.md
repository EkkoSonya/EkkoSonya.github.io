---
title: OS5 - 进程管理3
date: 2026-3-26
category:
  - code
tag:
  - java
  - CS
# star: true
# sticky: true
order: -0.5
---

## OS

### Java 线程状态

Java 没有 Ready 状态，线程状态有 6 种：

```plain
NEW              新建
RUNNABLE         可运行（包含 Ready + Running）
BLOCKED          阻塞（等待锁）
WAITING          等待（wait/join/park 等）
TIMED_WAITING    限时等待
TERMINATED       终止
```

相应操作下的不同：

```plain
操作系统层面：
Running → 发起IO → Sleeping/Blocked → IO完成 → Ready → Running

Java 层面：
RUNNABLE → 发起IO → RUNNABLE（底层在等）→ IO完成 → RUNNABLE
                   ↑
             Java 看起来还是 RUNNABLE
             但实际在操作系统层面是 Sleeping
```

### IO 密集 / CPU 密集

| 任务类型 | 线程状态 | CPU 使用 | 多线程效果 |
| --- | --- | --- | --- |
| CPU 密集型 | RUNNABLE | 高 | 可能更慢（切换开销） |
| IO 密集型 | WAITING | 低 | 更快（等待时间重叠） |

IO 操作时线程在等待，CPU 空闲

```java
// 读文件的过程
String data = readFile();  // 线程状态：WAITING
                           // CPU：几乎不占用
                           // 时间：大部分在等磁盘
```

#### 数据读取的过程

磁盘/网卡自己干活，不需要 CPU 参与：

```plain
线程发起读取请求
       ↓
CPU 发指令给磁盘控制器，然后线程进入等待
       ↓
磁盘控制器（DMA）把数据读到内存缓冲区   ← 不占用 CPU
       ↓
磁盘控制器通知 CPU：读完了
       ↓
线程被唤醒，数据已经在内存里了
```

```java
// Java 代码
FileInputStream fis = new FileInputStream("data.txt");
byte[] data = new byte[1024];
fis.read(data);  // 线程等待，但不是 CPU 在读

// 实际过程：
// 1. CPU 发指令给磁盘控制器
// 2. CPU 切换去执行其他线程
// 3. 磁盘控制器通过 DMA 把数据直接写入内存
// 4. 完成后中断通知 CPU
// 5. 线程被唤醒，data 数组里已经有数据了
```

CPU 只需要发完这个指令，表示我要读取数据了，就可以切换到别的线程

#### 那我写入了内存，但是线程此时被CPU切换掉了，等轮到他的时候，怎么知道数据咋样了

线程不会"检查"数据，是被操作系统"唤醒"的

```plain
整个流程：

1. 线程发起 read() 请求
       ↓
2. 线程状态变为 WAITING，被移出 CPU 调度队列
       ↓
3. CPU 切换到其他线程
       ↓
4. DMA 把数据写入内存缓冲区
       ↓
5. 磁盘控制器发送"中断信号"给 CPU
       ↓
6. 操作系统把线程状态改为 RUNNABLE，放回调度队列
       ↓
7. CPU 调度到这个线程，read() 返回，数据已经在变量里
```
