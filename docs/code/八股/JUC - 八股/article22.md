---
title: JUC 八股22 - 线程池3
date: 2026-03-25
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

## 线程池

### 线程池调优

首先我会根据任务类型设置核心线程数参数

比如 IO 密集型任务会设置为 CPU 核心数*2, CPU 密集型任务则设置为 CPU 核心数 + 1

其次我会结合线程池动态调整的能力，在流量波动时通过 `setCorePoolSize` 平滑扩容

结合监控或定时任务自动调整，通过监控指标（队列长度、活跃线程数）判断是否需要调整，然后调用 setCorePoolSize

比如如果工作队列挤压严重，那么就扩容，并且限制最大容量；

如果工作队列美元四超过五分钟就缩小容量

> 或者直接使用 DynamicTp 实现线程池参数的自动化调整

最后，我会通过内置的监控指标建立容量预警机制。比如通过 JMX 监控线程池的运行状态，设置阈值，当线程池的任务队列长度超过阈值时，触发告警

#### 如何知道你设置的线程数多了还是少了

可以通过监控和调试来判断线程数是多还是少

通过 top 命令观察 CPU 的使用率，如果 CPU 使用率较低，可能是线程数过少；如果 CPU 使用率接近 100%，但吞吐量未提升，可能是线程数过多

然后再通过 VisualVM 或 Arthas 分析线程运行情况，查看线程的状态、等待时间、运行时间等信息

> VisualVM: JDK 自带的图形化监控工具，可以看线程状态 `jvisualvm`
>
> Arthas: 阿里开源的在线诊断工具，不用重启应用

可以使用 jstack 命令查看线程堆栈信息，查看线程是否处于阻塞状态

如果有大量的 BLOCKED 线程，说明线程数可能过多，竞争比较激烈

#### 线程池如何实现参数的动态修改

线程池提供的 setter 方法就可以在运行时动态修改参数，比如说 setCorePoolSize 可以用来修改核心线程数、setMaximumPoolSize 可以用来修改最大线程数

需要注意的是，调用 setCorePoolSize() 时如果新的核心线程数比原来的大，线程池会创建新的线程；如果更小，线程池不会立即销毁多余的线程，除非有空闲线程超过 keepAliveTim

当然了，还可以利用 Nacos 配置中心，或者实现自定义的线程池，监听参数变化去动态调整参数

#### 线程设计的注意点

第一个，选择合适的线程池大小。过小的线程池可能会导致任务一直在排队；过大的线程池可能会导致大家都在竞争 CPU 资源，增加上下文切换的开销

第二个，选择合适的任务队列。使用有界队列可以避免资源耗尽的风险，但是可能会导致任务被拒绝；使用无界队列虽然可以避免任务被拒绝，但是可能会导致内存耗尽

比如在使用 LinkedBlockingQueue 的时候，可以传入参数来限制队列中任务的数量，这样就不会出现 OOM

第三个，尽量使用自定义的线程池，而不是使用 Executors 创建的线程池。

因为 newFixedThreadPool 线程池由于使用了 LinkedBlockingQueue，队列的容量默认无限大，任务过多时会导致内存溢出；newCachedThreadPool 线程池由于核心线程数无限大，当任务过多的时候会导致创建大量的线程，导致服务器负载过高宕机。

### 手动设计线程池

线程池的主要目的是为了避免频繁地创建和销毁线程，池化

把线程池看作一个工厂，里面有一群“工人”，也就是线程了，专门用来做任务。

当任务来了，需要先判断有没有空闲的工人，如果有就把任务交给他们；如果没有，就把任务暂存到一个任务队列里，等工人忙完了再去处理。

如果队列满了，还没有空闲的工人，就要考虑扩容，让预备的工人过来干活，但不能超过预定的最大值，防止工厂被挤爆。

如果连扩容也没法解决，就需要一个拒绝策略，可能直接拒绝任务或者报个错。

```java
class CustomThreadPoolExecutor {
  private final int corePoolSize;
  private final int maximumPoolSize;
  private final long keepAliveTime;
  private final TimeUnit unit;
  private final BlockingQueue<Runnable> workQueue;
  private final RejectedExecutionHandler handler;

  private volatile boolean isShutdown = false;
  private int currentPoolSize = 0;

  // 构造方法
  public CustomThreadPoolExecutor(int corePoolSize, int maximumPoolSize, long keepAliveTime, TimeUnit unit,
                                  BlockingQueue<Runnable> workQueue, RejectedExecutionHandler handler) {
      this.corePoolSize = corePoolSize;
      this.maximumPoolSize = maximumPoolSize;
      this.keepAliveTime = keepAliveTime;
      this.unit = unit;
      this.workQueue = workQueue;
      this.handler = handler;
  }

  // 提交任务
  public void execute(Runnable task) {
      if (isShutdown) {
          throw new IllegalStateException("ThreadPool is shutdown");
      }

      synchronized (this) {
          // 如果当前线程数小于核心线程数，直接创建新线程
          if (currentPoolSize < corePoolSize) {
              new Worker(task).start();
              currentPoolSize++;
              return;
          }

          // 尝试将任务添加到队列中
          if (!workQueue.offer(task)) {
              if (currentPoolSize < maximumPoolSize) {
                  new Worker(task).start();
                  currentPoolSize++;
              } else {
                  // 调用拒绝策略
                  handler.rejectedExecution(task, null);
              }
          }
      }
  }

  // 关闭线程池
  public void shutdown() {
      isShutdown = true;
  }

  // 工作线程
  private class Worker extends Thread {
      private Runnable task;

      Worker(Runnable task) {
          this.task = task;
      }

      @Override
      public void run() {
          while (task != null || (task = getTask()) != null) {
              try {
                  task.run();
              } finally {
                  task = null;
              }
          }
      }

      // 从队列中获取任务
      private Runnable getTask() {
          try {
              return workQueue.poll(keepAliveTime, unit);
          } catch (InterruptedException e) {
              return null;
          }
      }
  }
}
```
