---
title: JUC11 - 线程池源码解析
date: 2025-01-04
category:
  - code
tag:
  - java
  - juc
# star: true
# sticky: true
order: -0.5
---

## `ThreadPoolExecutor`源码分析

### `ctl`变量

需要首先介绍一下ctl变量，an atomic integer packing two conceptual fields

![alt text](img/25.png)

分别记录了工作的线程数量 (后29位) 以及 运行状态 (前3位)，用了原子类来避免多线程情况

通过拆分32个bit位来保存数据的，前3位保存状态，后29位保存工作线程数量

```java
public class ThreadPoolExecutor extends AbstractExecutorService {
    /**
     * The main pool control state, ctl, is an atomic integer packing
     * two conceptual fields
     *   workerCount, indicating the effective number of threads
     *   runState,    indicating whether running, shutting down etc
     *
     * In order to pack them into one int, we limit workerCount to
     * (2^29)-1 (about 500 million) threads rather than (2^31)-1 (2
     * billion) otherwise representable. If this is ever an issue in
     * the future, the variable can be changed to be an AtomicLong,
     * and the shift/mask constants below adjusted. But until the need
     * arises, this code is a bit faster and simpler using an int.
     *
     * The workerCount is the number of workers that have been
     * permitted to start and not permitted to stop.  The value may be
     * transiently different from the actual number of live threads,
     * for example when a ThreadFactory fails to create a thread when
     * asked, and when exiting threads are still performing
     * bookkeeping before terminating. The user-visible pool size is
     * reported as the current size of the workers set.
     *
     * The runState provides the main lifecycle control, taking on values:
     *
     *   RUNNING:  Accept new tasks and process queued tasks
     *   SHUTDOWN: Don't accept new tasks, but process queued tasks
     *   STOP:     Don't accept new tasks, don't process queued tasks,
     *             and interrupt in-progress tasks
     *   TIDYING:  All tasks have terminated, workerCount is zero,
     *             the thread transitioning to state TIDYING
     *             will run the terminated() hook method
     *   TERMINATED: terminated() has completed
     *
     * The numerical order among these values matters, to allow
     * ordered comparisons. The runState monotonically increases over
     * time, but need not hit each state. The transitions are:
     *
     * RUNNING -> SHUTDOWN
     *    On invocation of shutdown(), perhaps implicitly in finalize()
     * (RUNNING or SHUTDOWN) -> STOP
     *    On invocation of shutdownNow()
     * SHUTDOWN -> TIDYING
     *    When both queue and pool are empty
     * STOP -> TIDYING
     *    When pool is empty
     * TIDYING -> TERMINATED
     *    When the terminated() hook method has completed
     *
     * Threads waiting in awaitTermination() will return when the
     * state reaches TERMINATED.
     *
     * Detecting the transition from SHUTDOWN to TIDYING is less
     * straightforward than you'd like because the queue may become
     * empty after non-empty and vice versa during SHUTDOWN state, but
     * we can only terminate if, after seeing that it is empty, we see
     * that workerCount is 0 (which sometimes entails a recheck -- see
     * below).
     */

    private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));

    // Integer.SIZE == 32
    // 29位，线程数量位
    private static final int COUNT_BITS = Integer.SIZE - 3;

    // 计算得出最大容量(1左移29位然后减1，即后28位全为1，最大容量为2的29次方-1)
    private static final int CAPACITY   = (1 << COUNT_BITS) - 1;
    
    // 所有的运行状态，注意都是只占用前3位，不会占用后29位，共五个
    
    // 接收新任务，并等待执行队列中的任务
    // 111 | 0000... (后29数量位，下同)
    private static final int RUNNING    = -1 << COUNT_BITS;
    
    // 不接收新任务，但是依然等待执行队列中的任务
    // 000 | 数量位
    private static final int SHUTDOWN   =  0 << COUNT_BITS;

    // 不接收新任务，也不执行队列中的任务，并且还要中断正在执行中的任务
    // 001 | 数量位
    private static final int STOP       =  1 << COUNT_BITS;   
    
    // 所有的任务都已结束，线程数量为0，即将完全关闭
    // 010 | 数量位
    private static final int TIDYING    =  2 << COUNT_BITS;
    
    // 完全关闭
    // 011 | 数量位
    private static final int TERMINATED =  3 << COUNT_BITS;

    // 封装和解析ctl变量的一些方法
    // 这里的 c 其实就是 ctl 的快照
    // 传入 c 是为了利用局部变量的高效性和原子快照的一致性

    // CAPACITY 是 32位 前3为 000 后29为 全是1
    // 对CAPACITY取反就是后29位全部为0，前三位全部为1，接着与c进行与运算
    // 这样就可以只得到前三位的结果了，所以这里是取运行状态
    // 取前3位运行状态
    private static int runStateOf(int c) { return c & ~CAPACITY; }

    //同上，这里是为了得到后29位的结果，所以这里是取线程数量
    private static int workerCountOf(int c)  { return c & CAPACITY; }

    private static int ctlOf(int rs, int wc) { return rs | wc; }   
    // 比如上面的ctlOf(RUNNING, 0)，进行与运算之后：
    // 111 | 0000000000000000000000000

    ...
}
```

### `execute`方法分析

调用`execute`方法之后，也就是给线程池中发布了一个任务

对应源码：

```java
// 这个是我们指定的阻塞队列
private final BlockingQueue<Runnable> workQueue;

// 再次提醒，这里没加锁！！ 需要避免多线程的情况
// 所以ctl才会使用原子类。
public void execute(Runnable command) {
    if (command == null)
        // 如果任务为null，那执行个寂寞，所以说直接空指针
        throw new NullPointerException();
    
    // 获取ctl的值，一会要读取信息的
    int c = ctl.get();
    
    // 判断工作线程数量是否小于核心线程数
    if (workerCountOf(c) < corePoolSize) {
        // 如果是，直接尝试加入新的线程执行
        // 因为可能有多个线程同时尝试 add
        // 所以需要判断是否加入成功
        // 成功就直接返回即可
        if (addWorker(command, true))
            return;

        // 如果线程添加失败（有可能其他线程也在对线程池进行操作），那就更新一下c的值
        c = ctl.get();
    }

    // 到这说明核心线程数满了
    // 继续判断，如果当前线程池是运行状态
    // 那就尝试向阻塞队列中添加一个新的等待任务
    // 判断加执行，先看如果线程池状态是运行，那么就去 workQueue 尝试塞任务
    if (isRunning(c) && workQueue.offer(command)) {
        // 线程池在运行 且 成功放入 工作队列

        // 再次获取ctl的值 (因为可能有任务结束了)
        int recheck = ctl.get();
        if (!isRunning(recheck) && remove(command))
            // 这里是再次确认当前线程池是否关闭
            // 如果添加等待任务后线程池关闭了，那就把刚刚加进去任务的又拿出来
            reject(command);   
            // 然后直接拒绝当前任务的提交
            // (会根据我们的拒绝策略决定如何进行拒绝操作)
        else if (workerCountOf(recheck) == 0)   
            // 如果这个时候线程池依然在运行状态，那么就检查一下当前工作线程数是否为0
            // 如果是那就直接添加新线程执行
            addWorker(null, false);
            // 创建一个初始任务为 null 的新线程，它启动后会去队列里拿刚才存进去的任务
            // 添加一个新的非核心线程，但是注意没添加任务
       
       //其他情况就啥也不用做了
    }

    // 判断加执行，尝试放入非核心线程
    else if (!addWorker(command, false))
        // 这种情况要么就是线程池没有运行，要么就是队列满了
        // 按照我们之前的规则，核心线程数已满且队列已满，那么会直接添加新的非核心线程，但是如果已经添加到最大数量，这里肯定是会失败的
        reject(command);   //确实装不下了，只能拒绝
}
```

#### `addWorker`分析

`addWorker`会在 `workerCountOf(c) < corePoolSize` 以及 核心数满且阻塞队列也满再次尝试

接着来看`addWorker`是怎么创建和执行任务的：

```java
/**
 Checks if a new worker can be added with respect to current pool state and the given bound (either core or maximum). If so, the worker count is adjusted accordingly, and, if possible, a new worker is created and started, running firstTask as its first task. This method returns false if the pool is stopped or eligible to shut down. It also returns false if the thread factory fails to create a thread when asked. If the thread creation fails, either due to the thread factory returning null, or due to an exception (typically OutOfMemoryError in Thread.start()), we roll back cleanly.
**/
private boolean addWorker(Runnable firstTask, boolean core) {
    // 这里给最外层循环打了个标签，方便一会的跳转操作
    retry:

    // 这里的目的是给 ctl 线程尝试 +1
    // 如果失败就一直尝试
    for (;;) {    
        // 无限循环，老套路了，注意这里全程没加锁
        int c = ctl.get();     // 获取ctl值
        int rs = runStateOf(c);    // 解析当前的运行状态

        // Check if queue empty only if necessary.
        // 判断线程池是否不是处于运行状态
        // 如果不是运行状态，则如果 线程是SHUTDOWN状态且任务不为null以及等待队列不为空，则可以继续
        // 否则直接返回false，添加失败
        if (rs >= SHUTDOWN &&
            ! (rs == SHUTDOWN && firstTask == null && !workQueue.isEmpty()))
            return false;

        // 内层for 来将线程计数+1
        for (;;) {   
            //内层又一轮无限循环，这个循环是为了将线程计数增加
            // 然后才可以真正地添加一个新的线程
            
            // 解析当前的工作线程数量
            int wc = workerCountOf(c);

            // 判断一下还装得下不
            // 如果装得下，看看是核心线程还是非核心线程
            // 如果是核心线程，不能大于核心线程数的限制，如果是非核心线程，不能大于最大线程数限制
            if (wc >= CAPACITY ||
                wc >= (core ? corePoolSize : maximumPoolSize))
                return false;
            if (compareAndIncrementWorkerCount(c))
                // CAS自增线程计数，如果增加成功，任务完成，直接跳出继续
                // 注意这里要直接跳出最外层循环，所以用到了标签（类似于goto语句）
                break retry;

            c = ctl.get();  // 如果CAS失败，更新一下c的值
            if (runStateOf(c) != rs)    
                // 如果CAS失败的原因是因为线程池状态和一开始的不一样了，那么就重新从外层循环再来一次
                // 注意这里要直接从最外层循环继续，所以用到了标签
                continue retry;    
            // 如果是其他原因导致的CAS失败，那只可能是其他线程同时在自增，所以重新再来一次内层循环
        }
    }

    // 线程计数自增也完了，接着就是添加新的工作线程
    boolean workerStarted = false;   // 工作线程是否已启动
    boolean workerAdded = false;    // 工作线程是否已添加
    Worker w = null;     // 暂时理解为工作线程 Worker类
    try {
        // 创建新的工作线程，传入我们提交的任务
        w = new Worker(firstTask);
        // 拿到工作线程中封装的Thread对象
        final Thread t = w.thread;
        
        if (t != null) {      
            // 如果线程不为null，那就可以安排干活了
            final ReentrantLock mainLock = this.mainLock;      
            // 又是ReentrantLock加锁环节，这里开始就是只有一个线程能进入了
            mainLock.lock();
            try {
                // Recheck while holding lock.
                // Back out on ThreadFactory failure or if
                // shut down before lock acquired.
                int rs = runStateOf(ctl.get());  // 获取当前线程的运行状态

                if (rs < SHUTDOWN ||
                    (rs == SHUTDOWN && firstTask == null)) {    
                    // 只有当前线程池是正在运行状态
                    // 或是SHUTDOWN状态且firstTask为空，那么就继续
                    
                    if (t.isAlive())
                        // 检查一下线程是否正在运行状态
                        throw new IllegalThreadStateException();   
                        // 如果是那肯定是不能运行我们的任务的
                    
                    // 直接将新创建的Work丢进 workers 集合中
                    workers.add(w);
                    // 看看当前workers的大小
                    int s = workers.size();
                    
                    if (s > largestPoolSize)   
                        // 这里是记录线程池运行以来，历史上的最多线程数
                        largestPoolSize = s;
                    workerAdded = true;
                    // 工作线程已添加
                }
            } finally {
                mainLock.unlock();   // 解锁
            }
            if (workerAdded) {
                t.start();   // 启动线程
                workerStarted = true;  // 工作线程已启动
            }
        }
    } finally {
        if (!workerStarted)    
            // 如果线程在上面的启动过程中失败了
            addWorkerFailed(w);    
            // 将w移出workers并将计数器-1，最后如果线程池是终止状态，会尝试加速终止线程池
    }
    return workerStarted;   //返回是否成功
}
```

##### `Worker`类

`Worker`类是 `ThreadPoolExecutor` 的一个内部类

接着来看Worker类是如何实现的，它继承自`AbstractQueuedSynchronizer`，也就是说，它本身就是一把锁：

```java
// 每个Worker实例是可以复用的
private final class Worker
    extends AbstractQueuedSynchronizer
    implements Runnable {
    // 用来干活的线程
    final Thread thread;
    // 要执行的第一个任务，构造时就确定了的
    Runnable firstTask;
    // 干活数量计数器，也就是这个线程完成了多少个任务
    volatile long completedTasks;

    Worker(Runnable firstTask) {
        setState(-1); // 执行Task之前不让中断，将AQS的state设定为-1
        this.firstTask = firstTask;
        this.thread = getThreadFactory().newThread(this);
        // 通过预定义或是我们自定义的线程工厂创建线程
    }

    // 当 thread.start() 被调用时，最终会运行到这里
    public void run() {
        // 真正开始干活，包括当前活干完了又要等新的活来
        // 即一个 worker 开始 run 了，就会不断地工作
        runWorker(this);
    }

    // 0就是没加锁，1就是已加锁
    protected boolean isHeldExclusively() {
        return getState() != 0;
    }

    ...

    // 后面就是一些锁的实现
}
```

##### `runWorker`

这是在 `ThreadPoolExecutor` 的实现方法，即一个Worker如何工作：

```java
final void runWorker(Worker w) {
    // 获取当前线程
    Thread wt = Thread.currentThread();
    // 取出要执行的任务
    Runnable task = w.firstTask;
    w.firstTask = null;   // 然后把Worker中的任务设定为null
    
    // 因为一开始为-1，这里是通过unlock操作将其修改回0，只有state大于等于0才能响应中断
    w.unlock();
    boolean completedAbruptly = true;
    try {
       //只要任务不为null
       // 或是任务为空但是可以从等待队列中取出任务不为空，那么就开始执行这个任务
       // 注意这里是无限循环
       // 也就是说如果当前没有任务了，那么会在getTask方法中卡住，因为要从阻塞队列中等着取任务
        while (task != null || (task = getTask()) != null) {
            w.lock();    
            // 对当前Worker加锁，这里其实并不是防其他线程，而是在shutdown时保护此任务的运行
            
            // 由于线程池在STOP状态及以上会禁止新线程加入并且中断正在进行的线程
            // 只要线程池是STOP及以上的状态，那肯定是不能开始新任务的
            // 线程是否已经被打上中断标记并且线程一定是STOP及以上
            if ((runStateAtLeast(ctl.get(), STOP) ||
                 (Thread.interrupted() && runStateAtLeast(ctl.get(), STOP))) &&
                !wt.isInterrupted())   // 再次确保线程被没有打上中断标记
                wt.interrupt();     // 打中断标记
            try {
                // 开始之前的准备工作，这里暂时没有实现
                // 可以自定义
                beforeExecute(wt, task);
                Throwable thrown = null;
                try {
                    task.run();    // OK，开始执行任务
                } catch (RuntimeException x) {
                    thrown = x; throw x;
                } catch (Error x) {
                    thrown = x; throw x;
                } catch (Throwable x) {
                    thrown = x; throw new Error(x);
                } finally {
                    // 执行之后的工作，也没实现
                    // 可以自定义
                    afterExecute(task, thrown);
                }
            } finally {
                task = null;    // 任务已完成，不需要了
                w.completedTasks++;   // 任务完成数++
                w.unlock();    // 解锁
            }
        }
        completedAbruptly = false;
    } finally {
       // 如果能走到这一步，那说明上面的循环肯定是跳出了
       // 也就是说这个Worker可以丢弃了
       // 即 worker 没有任务 且 等待队列里也没有任务
       // 所以这里会直接将 Worker 从 workers 里删除掉
        processWorkerExit(w, completedAbruptly);
    }
}
```

##### `getTask`

那么它是怎么从阻塞队列里面获取任务的呢：

```java
private Runnable getTask() {
    boolean timedOut = false; // Did the last poll() time out?

    // 无限循环获取
    for (;;) {
        int c = ctl.get();   // 获取ctl 
        int rs = runStateOf(c);      // 解析线程池运行状态

        // Check if queue empty only if necessary.
        if (rs >= SHUTDOWN && (rs >= STOP || workQueue.isEmpty())) {      
            // 判断是不是没有必要再执行等待队列中的任务了
            // 也就是处于关闭线程池的状态了
            decrementWorkerCount();     // 直接减少一个工作线程数量
            return null;    // 返回null，这样上面的runWorker就直接结束了，下同
        }

        
        // 如果线程池运行正常，那就获取当前的工作线程数量
        int wc = workerCountOf(c);

        // Are workers subject to culling?
        // 如果设置了允许核心线程超时，或者当前线程数已经超过了核心线程数（存在非核心线程）
        // 那么这个线程就是可回收的
        boolean timed = allowCoreThreadTimeOut || wc > corePoolSize;   

        // 条件 A：你是不是该走？ (wc > maximumPoolSize || (timed && timedOut))
        // 1. 线程数超标了：wc > maximumPoolSize（通常发生在动态调小了最大线程数时）
        // 2. 你等太久了：timed && timedOut（你是个可回收线程，且在规定的 keepAliveTime 内没拿到任务）

        // 条件 B：你走了活儿谁干？ (wc > 1 || workQueue.isEmpty())
        // 还有别人在：wc > 1
        // 根本没活了：workQueue.isEmpty()
        if ((wc > maximumPoolSize || (timed && timedOut))
            && (wc > 1 || workQueue.isEmpty())) {
            if (compareAndDecrementWorkerCount(c))   
                // 如果CAS减少工作线程成功
                return null;    //返回null
            continue;   //否则开下一轮循环
        }

        try {
            // 如果可超时，那么最多等到超时时间
            // 如果不可超时，那就一直等着拿任务
            Runnable r = timed ?
                workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS) : workQueue.take();

            // 如果成功拿到任务，ok，返回
            if (r != null)
                return r;
            
            // 否则就是超时了，下一轮循环将直接返回null
            timedOut = true;
        } catch (InterruptedException retry) {
            timedOut = false;
        }
    }
}
```

#### 总结&思考

##### `Worker`啥时候运行的

可以看到在`Woker`类中是有一个 `runWorker` 方法没错，然后通过 `while` 不断执行任务，但是在前面的 `execute`都没有调用 `runWorker` 这个方法

在 `Worker` 构造方法里：

```java
Worker(Runnable firstTask) {
    setState(-1); // inhibit interrupts until runWorker
    this.firstTask = firstTask;
    this.thread = getThreadFactory().newThread(this);
}
```

`newThread(this)` 的意思是：创建一个新线程，并将当前的 Worker 对象作为这个线程的"任务源" (Worker 实现了 `Runnable`!)

`Worker` 本身就实现了 `Runnable` 接口, 当你把 `this`（当前的 Worker 对象）传给 `newThread` 时，你实际上是在告诉新创建的线程：当你启动（执行 start()）时，请去调用我（`Worker` 对象）里面的 `run()` 方法

所以对应的 `run` 进一步就是 `runWorker` 方法

而在 `execute` 时，最终 `addWorker()` 方法会 `t.start();` 从而启动

##### 默认的线程工厂

默认的 `Executors.defaultThreadFactory()`

```java
public static ThreadFactory defaultThreadFactory() {
    return new DefaultThreadFactory();
}
```

对应最终源码

```java
static class DefaultThreadFactory implements ThreadFactory {
    private static final AtomicInteger poolNumber = new AtomicInteger(1);
    private final ThreadGroup group;
    private final AtomicInteger threadNumber = new AtomicInteger(1);
    private final String namePrefix;

    DefaultThreadFactory() {
        SecurityManager s = System.getSecurityManager();
        group = (s != null) ? s.getThreadGroup() :
                                Thread.currentThread().getThreadGroup();
        namePrefix = "pool-" +
                        poolNumber.getAndIncrement() +
                        "-thread-";
    }

    public Thread newThread(Runnable r) {
        Thread t = new Thread(group, r,
                                namePrefix + threadNumber.getAndIncrement(),
                                0);
        if (t.isDaemon())
            t.setDaemon(false);
        if (t.getPriority() != Thread.NORM_PRIORITY)
            t.setPriority(Thread.NORM_PRIORITY);
        return t;
    }
}
```

### 线程关闭方法分析

接着我们来看当线程池关闭时会做什么事情

#### `shutdown()`

普通的`shutdown`会继续将等待队列中的线程执行完成后再关闭线程池

```java
// 普通的shutdown会继续将等待队列中的线程执行完成后再关闭线程池
public void shutdown() {
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        // 判断是否有权限终止
        checkShutdownAccess();
        // CAS将线程池运行状态改为SHUTDOWN状态，还算比较温柔，详细过程看下面
        advanceRunState(SHUTDOWN);
        // 让闲着的线程（比如正在等新的任务）中断
        // 但是并不会影响正在运行的线程
        interruptIdleWorkers();
        onShutdown(); 
        // 给ScheduledThreadPoolExecutor提供的钩子方法
        // 就是等ScheduledThreadPoolExecutor去实现的，当前类没有实现
    } finally {
        mainLock.unlock();
    }
    tryTerminate();   // 最后尝试终止线程池
}
```

##### `advanceRunState`

将线程池的状态设置为 `SHUTDOWN`

```java
private void advanceRunState(int targetState) {
    for (;;) {
        int c = ctl.get();    // 获取ctl

        // 是否大于等于指定的状态 || CAS设置ctl的值成功
        if (runStateAtLeast(c, targetState) ||    
            ctl.compareAndSet(c, ctlOf(targetState, workerCountOf(c))))
            break;   // 任意一个条件OK就可以结束了
    }
}
```

##### `interruptIdleWorkers`

让闲着的线程（比如正在等新的任务）中断，但不会影响正在运行的任务(因为加锁了)

```java
private void interruptIdleWorkers() {
    interruptIdleWorkers(false);
}

private void interruptIdleWorkers(boolean onlyOne) {
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        for (Worker w : workers) {
            // 拿到Worker中的线程
            Thread t = w.thread;
            // 先判断一下线程是不是没有被中断
            // 然后尝试加锁
            // 但是通过前面的runWorker()源代码我们得知
            // 开始之后是让Worker加了锁的，所以如果线程还在执行任务，那么这里肯定会false
            if (!t.isInterrupted() && w.tryLock()) {   
                try {
                    t.interrupt();    
                    // 如果走到这里，那么说明线程肯定是一个闲着的线程，直接给中断吧
                } catch (SecurityException ignore) {
                } finally {
                    w.unlock();    // 解锁
                }
            }
            if (onlyOne)   // 如果只针对一个Worker，那么就结束循环
                break;
        }
    } finally {
        mainLock.unlock();
    }
}
```

#### `shutdownNow()`

而`shutdownNow()`方法也差不多，但是这里会更直接一些，对应 `Worker` 中还在运行的任务会直接中断

```java
// shutdownNow开始后，不仅不允许新的任务到来，也不会再执行等待队列的线程
// 而且会终止正在执行的线程
public List<Runnable> shutdownNow() {
    List<Runnable> tasks;
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        checkShutdownAccess();
        // 这里就是直接设定为STOP状态了，不再像shutdown那么温柔
        advanceRunState(STOP);
        // 直接中断所有工作线程，详细过程看下面
        interruptWorkers();
        // 取出仍处于阻塞队列中的线程
        tasks = drainQueue();
    } finally {
        mainLock.unlock();
    }
    tryTerminate();
    return tasks;   // 最后返回还没开始的任务
}
```

##### `interruptWorkers`

```java
private void interruptWorkers() {
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        for (Worker w : workers)   //遍历所有Worker
            w.interruptIfStarted();   //无差别对待，一律加中断标记
    } finally {
        mainLock.unlock();
    }
}
```

#### `tryTerminate()` — 如何终止线程池

最后的最后，我们再来看看`tryTerminate()`是怎么完完全全终止掉一个线程池的：

```java
final void tryTerminate() {
    for (;;) {     
        // 无限循环
        // 先获取一下ctl值
        int c = ctl.get();
       
        // 只要是正在运行 
        // 或是 线程池基本上关闭了 (TIDYING) (表示别的线程正在关闭，你就别管了)
        // 或是 处于SHUTDOWN状态且工作队列不为空
        // 那么这时还不能关闭线程池，返回
        if (isRunning(c) ||
            runStateAtLeast(c, TIDYING) ||
            (runStateOf(c) == SHUTDOWN && ! workQueue.isEmpty()))
            return;
      
        // 走到这里，要么处于SHUTDOWN状态且等待队列为空
        // 或是STOP状态
        if (workerCountOf(c) != 0) { 
            // 如果工作线程数不是0，这里也会中断空闲状态下的线程
            interruptIdleWorkers(ONLY_ONE);   
            // 这里最多只中断一个空闲线程，然后返回
            return;
        }

        // 走到这里，工作线程也为空了，可以终止线程池了
        // 先上锁
        final ReentrantLock mainLock = this.mainLock;
        mainLock.lock();
        try {
            // 先CAS将状态设定为TIDYING表示基本终止，正在做最后的操作
            if (ctl.compareAndSet(c, ctlOf(TIDYING, 0))) {
                try {
                    terminated();   // 终止，暂时没有实现
                } finally {
                    ctl.set(ctlOf(TERMINATED, 0));   
                    // 最后将状态设定为TERMINATED，线程池结束了它年轻的生命
                    termination.signalAll();    
                    // 如果有线程调用了awaitTermination方法，会等待当前线程池终止，到这里差不多就可以唤醒了
                }
                return;   // 结束
            }
           // 注意如果CAS失败会直接进下一轮循环重新判断
        } finally {
            mainLock.unlock();
        }
        // else retry on failed CAS
    }
}
```

这个 `terminated` 方法默认没内容，所以 `tryTerminate` 实际就是尝试去改下 线程池的状态，然后通知下调用了 `awaitTermination` 方法的线程

```java
/**
 * Method invoked when the Executor has terminated. Default implementation does nothing. Note: To properly nest multiple overridings, subclasses should generally invoke super.terminated within this method.
**/
protected void terminated() { }
```

OK，有关线程池的实现原理，我们就暂时先介绍到这里，关于更高级的定时任务线程池，这里就不做讲解了。
