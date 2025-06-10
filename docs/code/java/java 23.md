---
title: Java - 多线程与反射3
date: 2025-03-09
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.80
---

## 多线程3

### `wait` 和 `notify` 方法

`Object` 类还有三个方法我们从来没有使用过，分别是`wait()`、`notify()`以及`notifyAll()`  

他们其实是需要配合`synchronized`来使用的，平常环境下是无法使用的，只有当对象作为锁时，才能用这三个方法。  

实际上**锁就是依附于对象存在**的，**每个对象都应该有针对于锁的一些操作**，所以说就这样设计了。  

- `wait()`方法会暂时使得此线程进入**等待状态**，同时会释放当前代码块持有的锁，这时其他线程可以获取到此对象的锁。`wait`需要捕获 `InterruptedException`终止异常。
  
- 当其他线程调用对象的`notify()`方法后，会唤醒刚才变成**等待状态的线程**（这时并没有立即释放锁）。注意，必须是在持有锁（同步代码块内部）的情况下使用，否则会抛出异常！
  
- `notifyAll`其实和`notify`一样，也是用于唤醒，但是前者是**唤醒所有**调用wait()后处于等待的线程，而后者是看运气**随机选择**一个。
  
- `wait()`方法是让该线程从 运行态 -> 等待(waiting)态;
  `notify()`则是让处于 `等待态`的线程变为 `阻塞态`，所以仍然需要等在运行的线程结束才会转为`运行态`。

- `wait()`支持参数，可以给他传一个时间参数进去的，是一种**自动唤醒**机制：在指定时间内，如果没有其他线程唤醒自己，则主动唤醒自己。
  
- 如果是 `wait() | wait(0)` 则表示永久等待，必须要有 `notify()`才会转换

```java
public static void main(String[] args) throws InterruptedException {
    Object o1 = new Object();
    Thread t1 = new Thread(() -> {
        synchronized (o1){
            try {
                System.out.println("开始等待");
                o1.wait();     //进入等待状态并释放锁
                System.out.println("等待结束！");
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    });
    Thread t2 = new Thread(() -> {
        synchronized (o1){
            System.out.println("开始唤醒！");
            o1.notify();     //唤醒处于等待状态的线程
            for (int i = 0; i < 50; i++) {
                System.out.println(i);   
            }
            //唤醒后依然需要等待这里的锁释放之前等待的线程才能继续
        }
    });
    t1.start();
    Thread.sleep(1000);
    t2.start();
}
```

### `ThreadLocal`

专门创建一个独属于某个线程的变量  

![20250309155822](http://myimg.ekkosonya.cn/20250309155822.png)

我们可以使用`ThreadLocal`类，来创建工作内存中的变量，它将我们的变量值存储在内部**只能存储一个变量**，不同的线程访问到`ThreadLocal`对象时，都只能获取到**当前线程所属的变量**。  

`ThreadLocal`定义在主线程中  

```java
public static void main(String[] args) throws InterruptedException {
    ThreadLocal<String> local = new ThreadLocal<>();  //注意这是一个泛型类，存储类型为我们要存放的变量类型
    Thread t1 = new Thread(() -> {
        local.set("penguin");   //将变量的值给予ThreadLocal
        System.out.println("线程1变量值已设定！");
        try {
            Thread.sleep(2000);    //间隔2秒
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println("线程1读取变量值：");
        System.out.println(local.get());   //尝试获取ThreadLocal中存放的变量
    });
    Thread t2 = new Thread(() -> {
        local.set("pig");   //将变量的值给予ThreadLocal
        System.out.println("线程2变量值已设定！");
    });
    t1.start();
    Thread.sleep(1000);    //间隔1秒
    t2.start();
}
```

不同线程向`ThreadLocal`存放数据，只会存放在线程自己的工作空间中，而不会直接存放到主内存中，因此各个线程直接存放的内容互不干扰。  

#### `InheritableThreadLocal`

为子线程的 local 设置初始值，如果子线程修改了也是可以

```java
public static void main(String[] args) {
    ThreadLocal<String> local = new InheritableThreadLocal<>();
    Thread t = new Thread(() -> {
       local.set("lbwnb");
        new Thread(() -> {
            System.out.println(local.get());
        }).start();
    });
    t.start();
}
```

### 定时器 `Timer`

#### 自己定义的定时器

```java
public static void main(String[] args) {
    new TimerTask(() -> System.out.println("我是定时任务！"), 3000).start();   //创建并启动此定时任务
}

static class TimerTask{
    Runnable task;
    long time;

    public TimerTask(Runnable runnable, long time){
        this.task = runnable;
        this.time = time;
    }

    public void start(){
        new Thread(() -> {
            try {
                Thread.sleep(time);
                task.run();   //休眠后再运行
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
    }
}
```

```java
public static void main(String[] args) {
    new TimerLoopTask(() -> System.out.println("我是定时任务！"), 3000).start();   //创建并启动此定时任务
}

static class TimerLoopTask{
    Runnable task;
    long loopTime;

    public TimerLoopTask(Runnable runnable, long loopTime){
        this.task = runnable;
        this.loopTime = loopTime;
    }

    public void start(){
        new Thread(() -> {
            try {
                while (true){   //无限循环执行
                    Thread.sleep(loopTime);
                    task.run();   //休眠后再运行
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
    }
}
```

#### `Timer`

我们可以通过创建一个`Timer`类来让它进行定时任务调度，我们可以通过此对象来创建任意类型的定时任务，包延时任务、循环定时任务等  

```java
public static void main(String[] args) {
    Timer timer = new Timer();    //创建定时器对象
    timer.schedule(new TimerTask() {   //注意这个是一个抽象类，不是接口，无法使用lambda表达式简化，只能使用匿名内部类
        @Override
        public void run() {
            System.out.println(Thread.currentThread().getName());    //打印当前线程名称
        }
    }, 1000, 500);    //执行一个延时任务
    // 运行函数，延迟，循环间隔
}
```

#### `Timer` 不会终止

虽然任务执行完成了，但是我们的程序并没有停止，这是因为`Timer`内存维护了一个任务队列和一个工作线程：  

```java
public class Timer {
    /**
     * The timer task queue.  This data structure is shared with the timer
     * thread.  The timer produces tasks, via its various schedule calls,
     * and the timer thread consumes, executing timer tasks as appropriate,
     * and removing them from the queue when they're obsolete.
     */
    private final TaskQueue queue = new TaskQueue();

    /**
     * The timer thread.
     */
    private final TimerThread thread = new TimerThread(queue);
        ...
}
```

`TimerThread`继承自`Thread`，是一个新创建的线程，在构造时自动启动：  

```java
public Timer(String name) {
    thread.setName(name);
    thread.start();
}
```

而它的`run`方法会循环地读取队列中是否还有任务，如果有任务依次执行，没有的话就暂时处于休眠状态：  

```java
public void run() {
    try {
        mainLoop();
    } finally {
        // Someone killed this Thread, behave as if Timer cancelled
        synchronized(queue) {
            newTasksMayBeScheduled = false;
            queue.clear();  // Eliminate obsolete references
        }
    }
}

/**
 * The main timer loop.  (See class comment.)
 */
private void mainLoop() {
  try {
       TimerTask task;
       boolean taskFired;
       synchronized(queue) {
            // Wait for queue to become non-empty
          while (queue.isEmpty() && newTasksMayBeScheduled)   //当队列为空同时没有被关闭时，会调用wait()方法暂时处于等待状态，当有新的任务时，会被唤醒。
                queue.wait();
          if (queue.isEmpty())
             break;    //当被唤醒后都没有任务时，就会结束循环，也就是结束工作线程
                      ...
       }
    }
}
```

我们可以通过调用`cancel()`方法来关闭它的工作线程：

```java
public static void main(String[] args) {
    Timer timer = new Timer();
    timer.schedule(new TimerTask() {
        @Override
        public void run() {
            System.out.println(Thread.currentThread().getName());
            timer.cancel();  //结束
        }
    }, 1000);
}
```
