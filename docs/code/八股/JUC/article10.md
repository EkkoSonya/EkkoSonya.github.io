---
title: JUC10 - 线程池2
date: 2025-12-31
category:
  - code
tag:
  - java
  - juc
# star: true
# sticky: true
order: -0.5
---

## 线程池2

### 使用 `Executors` 创建线程池 (工具类 `Executors`)

除了我们自己创建线程池之外，官方也提供了很多的线程池定义

可以使用`Executors`工具类来快速创建线程池

#### 固定线程量的线程池 - `newFixedThreadPool()`

固定线程量的线程池，本质就是一个 `ThreadPoolExecutor()` 方法

```java
public static void main(String[] args) throws InterruptedException {
    ExecutorService executor = Executors.newFixedThreadPool(2);   
    // 直接创建一个固定容量的线程池
}
```

对应的内部实现为：

```java
public static ExecutorService newFixedThreadPool(int nThreads) {
    return new ThreadPoolExecutor(nThreads, nThreads,
                                  0L, TimeUnit.MILLISECONDS,
                                  new LinkedBlockingQueue<Runnable>());
}
```

这里直接将最大线程和核心线程数量设定为一样的

并且等待时间为0，因为压根不需要，不会存在非核心的线程，因为要么在执行(核心线程)，要么就是在等待队列里

采用的是一个无界的`LinkedBlockingQueue`作为等待队列, 默认容量为 `Integer.MAX_VALUE`

可以看到 return 是一个 `ThreadPoolExecutor`, 但在函数返回的类型是 `ExecutorService`，不过没事，因为 `ThreadPoolExecutor` 是 `ExecutorService` 的一个实现类

#### 只有一个线程的线程池 - `newSingleThreadExecutor()`

使用`newSingleThreadExecutor`来创建只有一个线程的线程池：

```java
public static void main(String[] args) throws InterruptedException {
    ExecutorService executor = Executors.newSingleThreadExecutor();
    // 创建一个只有一个线程的线程池
}
```

##### 源码分析

原理如下：

```java
public static ExecutorService newSingleThreadExecutor() {
    return new FinalizableDelegatedExecutorService
        (new ThreadPoolExecutor(1, 1,
                                0L, TimeUnit.MILLISECONDS,
                                new LinkedBlockingQueue<Runnable>()));
}
```

可以看到这里并不是直接创建的一个`ThreadPoolExecutor`对象，而是套了一层`FinalizableDelegatedExecutorService`

##### `FinalizableDelegatedExecutorService`

- `Finalizable`: 指它重写了 Object.finalize() 方法（或使用了类似的清理机制），确保在对象被垃圾回收（GC）时能自动执行某些清理操作。

- `Delegated`: 指它使用了委派模式（Delegation Pattern）。它本身不实现线程池逻辑，而是内部持有一个真正的线程池对象，并将所有操作转发给它。

```java
static class FinalizableDelegatedExecutorService
    extends DelegatedExecutorService {
    FinalizableDelegatedExecutorService(ExecutorService executor) {
        super(executor);
    }
    protected void finalize() {    
        // 在GC时，会执行finalize方法，此方法中会关闭掉线程池，释放资源
        super.shutdown();
    }
}
```

对应的 `DelegatedExecutorService` 构造方法：

```java
static class DelegatedExecutorService extends AbstractExecutorService {
    // 被委派对象
    private final ExecutorService e;
    DelegatedExecutorService(ExecutorService executor) { e = executor; }   //实际上所以的操作都是让委派对象执行的，有点像代理
    public void execute(Runnable command) { e.execute(command); }
    public void shutdown() { e.shutdown(); }
    public List<Runnable> shutdownNow() { return e.shutdownNow(); }
}
```

所以，下面两种写法的区别在于：

```java
public static void main(String[] args) throws InterruptedException {
    ExecutorService executor1 = Executors.newSingleThreadExecutor();
    ExecutorService executor2 = Executors.newFixedThreadPool(1);
}
```

前者实际上是被代理了，我们没办法直接修改前者的相关属性，显然使用前者创建只有一个线程的线程池更加专业和安全（可以防止属性被修改）一些。

#### 全非核心线程池 - `newCachedThreadPool()`

最后我们来看`newCachedThreadPool`方法：

```java
public static void main(String[] args) throws InterruptedException {
    ExecutorService executor = Executors.newCachedThreadPool();
    //它是一个会根据需要无限制创建新线程的线程池
}
```

我们来看看它的实现：

```java
public static ExecutorService newCachedThreadPool() {
    return new ThreadPoolExecutor(0, Integer.MAX_VALUE,
                                  60L, TimeUnit.SECONDS,
                                  new SynchronousQueue<Runnable>());
}
```

可以看到，核心线程数为0，那么也就是说所有的线程都是`非核心线程`，也就是说线程空闲时间超过1秒钟，一律销毁。但是它的最大容量是`Integer.MAX_VALUE`，也就是说，它可以无限制地增长下去，所以这玩意一定要慎用。

### 执行带返回值的任务 `Future<>`

一个多线程任务不仅仅可以是void无返回值任务，比如我们现在需要执行一个任务，但是我们需要在任务执行之后得到一个结果，这个时候怎么办呢？

#### `ExecutorService`

```java
public interface ExecutorService extends Executor {

    void shutdown();

    List<Runnable> shutdownNow();

    boolean isShutdown();

    boolean isTerminated();

    boolean awaitTermination(long timeout, TimeUnit unit)
        throws InterruptedException;

    <T> Future<T> submit(Callable<T> task);

    <T> Future<T> submit(Runnable task, T result);

    Future<?> submit(Runnable task);

    <T> List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks)
        throws InterruptedException;

    <T> List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks,
                                  long timeout, TimeUnit unit)
        throws InterruptedException;

    <T> T invokeAny(Collection<? extends Callable<T>> tasks)
        throws InterruptedException, ExecutionException;

    <T> T invokeAny(Collection<? extends Callable<T>> tasks,
                    long timeout, TimeUnit unit)
        throws InterruptedException, ExecutionException, TimeoutException;
}
```

在使用自带的 `Executors` 工具类创建对应线程池时，可以看到其使用的是接口 `ExecutorService`，其执行任务的方法从 `execute()` 转为 `submit()`

并且可以看到在 `ExecutorService` 的源码里有大量的返回为 `Future<T>` 的泛型

#### `Future`

接受任务返回的结果，可以使用`Future`

它可以返回任务的计算结果，我们可以通过它来获取任务的结果以及任务当前是否完成

##### `Runnable` 与 `Callable`

`Runnable` 是没有返回值，`Callable`是有返回值

```java
public static void main(String[] args) throws InterruptedException, ExecutionException {
    // 直接用Executors创建
    ExecutorService executor = Executors.newSingleThreadExecutor();

    // 使用submit提交任务，会返回一个Future对象
    // 注意提交的对象可以是Runable也可以是Callable
    // 这里使用的是Callable能够自定义返回值
    Future<String> future = executor.submit(() -> "我是字符串!");
    
    // 如果任务未完成，get会被阻塞
    // 任务完成返回Callable执行结果返回值
    System.out.println(future.get());
    executor.shutdown();
}
```

当然结果也可以一开始就定义好，然后等待`Runnable`执行完之后再返回：

```java
public static void main(String[] args) throws InterruptedException, ExecutionException {
    ExecutorService executor = Executors.newSingleThreadExecutor();
    Future<String> future = executor.submit(() -> {
        try {
            TimeUnit.SECONDS.sleep(3);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }, "我是字符串！");
    System.out.println(future.get());
    executor.shutdown();
}
```

##### `FutureTask`

还可以通过传入`FutureTask`对象的方式：

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    ExecutorService service = Executors.newSingleThreadExecutor();
    FutureTask<String> task = new FutureTask<>(() -> "我是字符串！");
    service.submit(task);
    System.out.println(task.get());
    executor.shutdown();
}
```

还可以通过`Future`对象获取当前任务的一些状态：

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    ExecutorService executor = Executors.newSingleThreadExecutor();
    Future<String> future = executor.submit(() -> "都看到这里了，不赏UP主一个一键三连吗？");
    System.out.println(future.get());
    System.out.println("任务是否执行完成："+future.isDone());
    System.out.println("任务是否被取消："+future.isCancelled());
    executor.shutdown();
}
```

我们来试试看在任务执行途中取消任务：

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    ExecutorService executor = Executors.newSingleThreadExecutor();
    Future<String> future = executor.submit(() -> {
        TimeUnit.SECONDS.sleep(10);
        return "这次一定！";
    });
    System.out.println(future.cancel(true));
    System.out.println(future.isCancelled());
    executor.shutdown();
}
```

#### `Future`构造函数分析

`FutureTask`即继承了 `Runnable` 和 `Future<V>`， 接受 `Callable` 和 `Runnable`

其构造方法会把`Runnable`的参数转为`Callable`

```java
public class FutureTask<V> implements RunnableFuture<V> {
    ...
    public FutureTask(Callable<V> callable) {
        if (callable == null)
            throw new NullPointerException();
        this.callable = callable;
        this.state = NEW;       // ensure visibility of callable
    }
    
    public FutureTask(Runnable runnable, V result) {
        this.callable = Executors.callable(runnable, result);
        this.state = NEW;       // ensure visibility of callable
    }
    ...
}

public interface RunnableFuture<V> extends Runnable, Future<V> {
    /**
     * Sets this Future to the result of its computation
     * unless it has been cancelled.
     */
    void run();
}
```

此外，发现其将 `Runnable` 转换为 `Callable`

```java
public FutureTask(Runnable runnable, V result) {
    this.callable = Executors.callable(runnable, result);
    this.state = NEW;       // ensure visibility of callable
}
```

本质是调用了 `Executors.callable(runnable, result);`

##### `Executors.callable`

对应实现为

```java
public static <T> Callable<T> callable(Runnable task, T result) {
    if (task == null)
        throw new NullPointerException();
    return new RunnableAdapter<T>(task, result);
}
```

实际上就是返回了一个 `RunnableAdapter<T>` 的类，他实现了 `Callable` 接口，因此上面就定义类型是 `Callable`

##### `RunnableAdapter<T>`

```java
static final class RunnableAdapter<T> implements Callable<T> {
    final Runnable task;
    final T result;
    RunnableAdapter(Runnable task, T result) {
        this.task = task;
        this.result = result;
    }
    public T call() {
        task.run();
        return result;
    }
}
```

定义了 `RunnableAdapter<T>` 的 `call` 方法就行了

##### `Callable<T>` 与 `Runnable`

`Callable`:

```java
@FunctionalInterface
public interface Callable<V> {
    /**
     * Computes a result, or throws an exception if unable to do so.
     *
     * @return computed result
     * @throws Exception if unable to compute a result
     */
    V call() throws Exception;
}
```

`Runnable`:

```java
@FunctionalInterface
public interface Runnable {
    /**
     * When an object implementing interface <code>Runnable</code> is used
     * to create a thread, starting the thread causes the object's
     * <code>run</code> method to be called in that separately executing
     * thread.
     * <p>
     * The general contract of the method <code>run</code> is that it may
     * take any action whatsoever.
     *
     * @see     java.lang.Thread#run()
     */
    public abstract void run();
}
```

### 执行定时任务 `ScheduledThreadPoolExecutor`

既然线程池怎么强大，那么线程池能不能执行定时任务呢？

我们之前如果需要执行一个定时任务，那么肯定会用到`Timer`和`TimerTask`，但是它只会创建一个线程处理我们的定时任务，无法实现多线程调度，并且它无法处理异常情况一旦抛出未捕获异常那么会直接终止，显然我们需要一个更加强大的定时器。

JDK5之后，我们可以使用`ScheduledThreadPoolExecutor`来提交定时任务，它继承自`ThreadPoolExecutor`

#### 构造函数

所有的构造方法都必须要求最大线程池容量为`Integer.MAX_VALUE`，采用的都是`DelayedWorkQueue`作为等待队列

```java
public ScheduledThreadPoolExecutor(int corePoolSize) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue());
}

public ScheduledThreadPoolExecutor(int corePoolSize,
                                   ThreadFactory threadFactory) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue(), threadFactory);
}

public ScheduledThreadPoolExecutor(int corePoolSize,
                                   RejectedExecutionHandler handler) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue(), handler);
}

public ScheduledThreadPoolExecutor(int corePoolSize,
                                   ThreadFactory threadFactory,
                                   RejectedExecutionHandler handler) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue(), threadFactory, handler);
}
```

#### 示例

我们来测试一下它的方法，这个方法可以提交一个延时任务，只有到达指定时间之后才会开始：

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    // 直接设定核心线程数为1
    ScheduledThreadPoolExecutor executor = new ScheduledThreadPoolExecutor(1);
    // 计划在3秒后执行
    executor.schedule(() -> System.out.println("HelloWorld!"), 3, TimeUnit.SECONDS);

    executor.shutdown();
}
```

##### 可以接受返回值 `ScheduledFuture`

我们也可以像之前一样，传入一个Callable对象，用于接收返回值：

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    ScheduledThreadPoolExecutor executor = new ScheduledThreadPoolExecutor(2);
    
    // 这里使用ScheduledFuture
    ScheduledFuture<String> future = executor.schedule(() -> "????", 3, TimeUnit.SECONDS);
    
    System.out.println("任务剩余等待时间："+future.getDelay(TimeUnit.MILLISECONDS) / 1000.0 + "s");
    
    System.out.println("任务执行结果："+future.get());
    executor.shutdown();
}
```

可以看到`schedule`方法返回了一个ScheduledFuture对象，和Future一样，它也支持返回值的获取、包括对任务的取消同时还支持获取剩余等待时间。

#### 重复执行任务

那么如果我们希望按照一定的频率不断执行任务呢？

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    ScheduledThreadPoolExecutor executor = new ScheduledThreadPoolExecutor(2);
    executor.scheduleAtFixedRate(() -> System.out.println("Hello World!"),
            3, 1, TimeUnit.SECONDS);
    // 三秒钟延迟开始，之后每隔一秒钟执行一次
}
```

##### `.scheduleAtFixedRate()`

其对应参数表示 `public ScheduledFuture<?> scheduleAtFixedRate(Runnable command, long initialDelay, long period, TimeUnit unit)`

第二个是初始延迟，第三个为间隔时间

该方法以固定的时间间隔执行任务，而不关心上一次任务执行了多久。

- 从任务开始执行的那一刻起，就开始计算下一次执行的时间。

- 适用于对执行频率有严格要求的任务（例如：每隔 1 小时同步一次数据）。

- 如果任务执行的时间超过了设定的周期（period），下一次任务会在当前任务结束后立即开始，而不会并发执行。

```java
/**
 * @throws RejectedExecutionException {@inheritDoc}
 * @throws NullPointerException       {@inheritDoc}
 * @throws IllegalArgumentException   {@inheritDoc}
 */
public ScheduledFuture<?> scheduleAtFixedRate(Runnable command,
    long initialDelay,
    long period,
    TimeUnit unit) {
    if (command == null || unit == null)
        throw new NullPointerException();
    if (period <= 0)
        throw new IllegalArgumentException();
    ScheduledFutureTask<Void> sft =
        new ScheduledFutureTask<Void>(command,
                                        null,
                                        triggerTime(initialDelay, unit),
                                        unit.toNanos(period));
    RunnableScheduledFuture<Void> t = decorateTask(command, sft);
    sft.outerTask = t;
    delayedExecute(t);
    return t;
}
```

##### `.scheduleWithFixedDelay()`

该方法在任务结束和下一次任务开始之间保持固定的延迟。

- 只有当任务完全执行完毕后，才开始计算延迟时间（delay）。

- 适用于需要确保两次任务之间有足够资源缓冲或休息时间的场景（例如：清理日志、扫描数据库）。

- 实际的执行频率是 任务耗时 + 设定延迟

```java
public ScheduledFuture<?> scheduleWithFixedDelay(Runnable command,
    long initialDelay,
    long delay,
    TimeUnit unit) {
    if (command == null || unit == null)
        throw new NullPointerException();
    if (delay <= 0)
        throw new IllegalArgumentException();
    ScheduledFutureTask<Void> sft =
        new ScheduledFutureTask<Void>(command,
                                        null,
                                        triggerTime(initialDelay, unit),
                                        unit.toNanos(-delay));
    RunnableScheduledFuture<Void> t = decorateTask(command, sft);
    sft.outerTask = t;
    delayedExecute(t);
    return t;
}
```

##### 分析

导致不同的是因为 `unit.toNanos(period)` 和 `unit.toNanos(-delay)`

然后就会进 `delayedExecute()` 延迟执行

`ScheduledThreadPoolExecutor` 使用的不是普通的 `LinkedBlockingQueue`，而是一个定制的 `DelayedWorkQueue`

基于小顶堆（Min-Heap）结构的优先级队列 | 排序依据: 任务的 time 属性（即下一次执行的纳秒时间点）

队列头部永远是那个“最快到期”的任务。线程池里的线程会去取这个头部的任务，如果时间还没到，线程就会进入等待状态。

```java
private void delayedExecute(RunnableScheduledFuture<?> task) {
    if (isShutdown())
        reject(task);
    else {
        super.getQueue().add(task);
        if (isShutdown() &&
            !canRunInCurrentRunState(task.isPeriodic()) &&
            remove(task))
            task.cancel(false);
        else
            ensurePrestart();
    }
}
```

如果任务执行，会调用 `ScheduledThreadPoolExecutor` 的内部类 `ScheduledFutureTask` 的 `run` 方法

```java
/**
 * 位于 ScheduledThreadPoolExecutor.ScheduledFutureTask 类中
 */
public void run() {
    // 1. 判断是否是周期性任务 (period != 0)
    boolean periodic = isPeriodic();

    // 2. 如果当前状态下不能运行，则取消任务
    if (!canRunInCurrentRunState(periodic))
        cancel(false);
    // 3. 如果不是周期性任务，直接调用父类的 run (只运行一次)
    else if (!periodic)
        ScheduledFutureTask.super.run();
    
    // 4. 【重点】如果是周期性任务，先执行任务
    else if (ScheduledFutureTask.super.runAndReset()) {
        // 执行成功后，设置下一次执行的时间
        setNextRunTime();
        // 将任务重新放回队列，等待下次调度
        reExecutePeriodic(outerTask);
    }
}

private void setNextRunTime() {
    long p = period;
    if (p > 0)
        // 【Fixed Rate】
        // 下次时间 = 上次计划的时间 + 周期
        time += p; 
    else
        // 【Fixed Delay】
        // 下次时间 = 当前时间(now) + 延迟(取绝对值)
        // triggerTime 内部会做: System.nanoTime() + (-p)
        // p 是负数 ———— -p 正数
        time = triggerTime(-p); 
}
```

```java
long triggerTime(long delay) {
    // 预防性保险
    // 如果你传入的延迟超过了 Long 最大值的一半，那么 now() + delay 就有极高的风险超过 Long.MAX_VALUE，导致结果变成负数（溢出）
    return now() +
        ((delay < (Long.MAX_VALUE >> 1)) ? delay : overflowFree(delay));
}
```

#### `Executors`对应工具类

Executors也为我们预置了`newScheduledThreadPool`方法用于创建线程池：

```java
public static void main(String[] args) throws ExecutionException, InterruptedException {
    ScheduledExecutorService service = Executors.newScheduledThreadPool(1);
    service.schedule(() -> System.out.println("Hello World!"), 1, TimeUnit.SECONDS);
}
```
