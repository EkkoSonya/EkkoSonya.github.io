---
title: JVM 八股17 - JVM 调优
date: 2026-3-31
category:
  - code
tag:
  - java
  - jvm
  - 八股
# star: true
# sticky: true
order: -0.5
---

## JVM 调优

### 性能检测工具

- 系统层面 (可以监控系统整体的资源使用情况，比如说内存、CPU、IO 使用情况、网络使用情况)
  - top
  - iostat
  - netstat
  - vmstat
- JDK 自带的命令行工具层面
  - jps
  - jstat
  - jinfo
  - jmap
  - jhat
  - jstack
  - jcmd
  - 可以查看 JVM 运行时信息、内存使用情况、堆栈信息等

#### jmap 使用

- 一般会使用 `jmap -heap <pid>` 查看堆内存摘要，包括新生代、老年代、元空间等
- 或者使用 `jmap -histo <pid>` 查看对象分布

### 可视化的性能监控工具

- JConsole：JDK 自带的监控工具，可以用来监视 Java 应用程序的运行状态，包括内存使用、线程状态、类加载、GC 等
- VisualVM：一个基于 NetBeans 的可视化工具，在很长一段时间内，VisualVM 都是 Oracle 官方主推的故障处理工具。集成了多个 JDK 命令行工具的功能，非常友好
- Java Mission Control：JMC 最初是 JRockit VM 中的诊断工具，但在 Oracle JDK7 Update 40 以后，就绑定到了 HotSpot VM 中。不过后来又被 Oracle 开源出来作为了一个单独的产品

### JVM 的常见参数配置

一个是堆的大小设置，然后是垃圾收集器的选择和时间，加上日志输出等

主要有 -Xms 设置初始堆大小，-Xmx 设置最大堆大小，-XX:+UseG1GC 使用 G1 垃圾收集器，-XX:MaxGCPauseMillis=n 设置最大垃圾回收停顿时间，-XX:+PrintGCDetails 输出 GC 详细日志等

#### 配置堆内存大小的参数

- `-Xms`：初始堆大小
- `-Xmx`：最大堆大小
- `-XX:NewSize=n`：设置年轻代大小
- `-XX:NewRatio=n`：设置年轻代和年老代的比值。如：n 为 3 表示年轻代和年老代比值为 1：3，年轻代占总和的 1/4
- `-XX:SurvivorRatio=n`：年轻代中 Eden 区与两个 Survivor 区的比值。如 n=3 表示 Eden 占 3 Survivor 占 2，一个 Survivor

#### 配置 GC 收集器的参数

- `-XX:+UseSerialGC`：设置串行收集器
- `-XX:+UseParallelGC`：设置并行收集器
- `-XX:+UseParalledlOldGC`：设置并行老年代收集器
- `-XX:+UseConcMarkSweepGC`：设置并发收集器

#### 配置并行收集的参数

- `-XX:MaxGCPauseMillis=n`：设置最大垃圾回收停顿时间
- `-XX:GCTimeRatio=n`：设置垃圾回收时间占程序运行时间的比例
- `-XX:+CMSIncrementalMode`：设置增量模式，适合单 CPU 环境
- `-XX:ParallelGCThreads=n`：设置并行收集器的线程数

#### 打印 GC 回收的过程日志信息的参数

- `-XX:+PrintGC`：输出 GC 日志
- `-XX:+PrintGCDetails`：输出 GC 详细日志
- `-XX:+PrintGCTimeStamps`：输出 GC 的时间戳（以基准时间的形式）
- `-Xloggc:filename`：日志文件的输出路径

### CPU 占用过高怎么排查

使用 top 命令查看 CPU 占用情况，找到占用 CPU 较高的进程 ID

接着，使用 jstack 命令查看对应进程的线程堆栈信息

然后再使用 top 命令查看进程中线程的占用情况，找到占用 CPU 较高的线程 ID

接着在 jstack 的输出中搜索这个十六进制的线程 ID，找到对应的堆栈信息。最后，根据堆栈信息定位到具体的业务方法，查看是否有死循环、频繁的垃圾回收、资源竞争导致的上下文频繁切换等问题

> 先找是哪个进程占用 CPU，然后进一步看这个进程有哪些线程，再看看到底是哪一个线程占用率高，就是分析该线程的堆栈信息

### 内存飙高问题

内存飚高一般是因为创建了大量的 Java 对象导致的，如果持续飙高则说明垃圾回收跟不上对象创建的速度，或者内存泄漏导致对象无法回收

第一，先观察垃圾回收的情况，可以通过 jstat -gc PID 1000 查看 GC 次数和时间。或者使用 jmap -histo PID | head -20 查看堆内存占用空间最大的前 20 个对象类型。

第二步，通过 jmap 命令 dump 出堆内存信息。

第三步，使用可视化工具分析 dump 文件，比如说 VisualVM，找到占用内存高的对象，再找到创建该对象的业务代码位置，从代码和业务场景中定位具体问题。

### 频繁 minor gc 怎么办

频繁的 Minor GC 通常意味着新生代中的对象频繁地被垃圾回收，可能是因为**新生代空间设置的过小**，或者是**因为程序中存在大量的短生命周期对象**（如临时变量）

可以使用 GC 日志进行分析，查看 GC 的频率和耗时，找到频繁 GC 的原因

```shell
-XX:+PrintGCDetails -Xloggc:gc.log
```

如果是因为新生代空间不足，可以通过 -Xmn 增加新生代的大小，减缓新生代的填满速度

如果对象需要长期存活，但频繁从 Survivor 区晋升到老年代，可以通过 -XX:SurvivorRatio 参数调整 Eden 和 Survivor 的比例。默认比例是 8:1，表示 8 个空间用于 Eden，1 个空间用于 Survivor 区

### 频繁 Full GC 怎么办

频繁的 Full GC 通常意味着老年代中的对象频繁地被垃圾回收，可能是因为老年代空间设置的过小，或者是因为程序中存在大量的长生命周期对象。

- 假如是因为大对象直接分配到老年代导致的 Full GC 频繁，可以通过 -XX:PretenureSizeThreshold 参数设置大对象直接进入老年代的阈值。
  - 或者将大对象拆分成小对象，减少大对象的创建。比如说分页。
- 假如是因为内存泄漏导致的频繁 Full GC，可以通过分析堆内存 dump 文件找到内存泄漏的对象，再找到内存泄漏的代码位置。
- 假如是因为长生命周期的对象进入到了老年代，要及时释放资源，比如说 ThreadLocal、数据库连接、IO 资源等。
- 假如是因为 GC 参数配置不合理导致的频繁 Full GC，可以通过调整 GC 参数来优化 GC 行为。或者直接更换更适合的 GC 收集器，如 G1、ZGC 等。
