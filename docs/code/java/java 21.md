---
title: Java - 多线程与反射1
date: 2025-02-26
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.82
---

## 多线程

### 进程与线程概念

**进程**是程序执行的实体，每一个进程都是一个应用程序（比如我们运行QQ、浏览器、LOL、网易云音乐等软件），都有自己的内存空间，**CPU一个核心同时只能处理一件事情**，当出现多个进程需要同时运行时，CPU一般通过**时间片轮转调度算法**，来实现多个进程的同时运行。  

![20250226173747](http://myimg.ekkosonya.cn/20250226173747.png)

在早期的计算机中，进程是拥有资源和独立运行的最小单位，也是程序执行的最小单位。但是，如果我希望两个任务同时进行，就必须运行两个进程，由于每个进程都有一个自己的内存空间，进程之间的通信就变得非常麻烦（比如要共享某些数据）而且执行不同进程会产生上下文切换，非常耗时。

**线程**横空出世，**一个进程可以有多个线程**，线程是程序执行中一个单一的顺序控制流程，现在**线程才是程序执行流的最小单元**，**各个线程之间共享程序的内存空间（也就是所在进程的内存空间**），上下文切换速度也高于进程。  

在Java中，我们从开始，一直以来编写的都是**单线程应用程序**(运行`main()`方法的内容), 也就是说只能同时执行一个任务（无论你是调用方法、还是进行计算，始终都是依次进行的，也就是同步的），而如果我们希望同时执行多个任务（两个方法同时在运行或者是两个计算同时在进行，也就是异步的），就需要用到**Java多线程框架**。实际上一个Java程序启动后，会创建很多线程，不仅仅只运行一个主线程:  

```java
public static void main(String[] args) {
    ThreadMXBean bean = ManagementFactory.getThreadMXBean();
    long[] ids = bean.getAllThreadIds();
    ThreadInfo[] infos = bean.getThreadInfo(ids);
    for (ThreadInfo info : infos) {
        System.out.println(info.getThreadName());
    }
}
```

### 线程的创建和启动

**线程之间是同时运行的**
通过创建`Thread`对象来创建一个新的线程，`Thread`构造方法中需要传入一个`Runnable`接口的实现（其实就是编写要在另一个线程执行的内容逻辑）同时`Runnable`只有一个未实现方法，**因此可以直接使用lambda表达式**

```java
    /**
     * Creates a new Thread that inherits the given AccessControlContext.
     * This is not a public constructor.
     */
    Thread(Runnable target, AccessControlContext acc) {
        init(null, target, "Thread-" + nextThreadNum(), 0, acc, false);
    }

    //Runnable
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

#### `start`方法

![20250226175843](http://myimg.ekkosonya.cn/20250226175843.png)

创建好后，通过调用`start()`方法来运行此线程:

```java
public static void main(String[] args) {
    Thread t = new Thread(() -> {    
        //直接编写逻辑
        System.out.println("我是另一个线程！");
    });
    t.start();   
    //调用此方法来开始执行此线程
}
```

```java
Thread.currentThread()  // 获取当前线程对象

Thread t = new Thread(() -> {    //自定义线程名称
    System.out.println("我是另一个线程！");
}, "name");

Thread.currentThread().getName() // 获取线程名称
```

#### `run`方法

`run`方法，也能执行线程里面定义的内容，但是`run`是直接在当前线程执行，并不是创建一个线程执行！  

#### `sleep`方法

实际上，线程和进程差不多，也会等待获取CPU资源，一旦获取到，就开始按顺序执行我们给定的程序，当需要等待外部IO操作（比如Scanner获取输入的文本），就会暂时处于休眠状态，等待通知，或是调用`sleep()`方法来让当前线程休眠一段时间

```java
Thread.sleep(1000);    //休眠时间，以毫秒为单位，1000ms = 1s
```

我们也可以使用`stop()`方法来强行终止此线程  

```java
public static void main(String[] args) throws InterruptedException {
    Thread t = new Thread(() -> {
        Thread me = Thread.currentThread();   //获取当前线程对象
        for (int i = 0; i < 50; i++) {
            System.out.println("打印:"+i);
            if(i == 20) me.stop();  //此方法会直接终止此线程
        }
    });
    t.start();
}
```

虽然`stop()`方法能够终止此线程，但是并不是所推荐的做法，有关线程中断相关问题，我们会在后面继续了解。  

### 线程的休眠和中断

![20250226175843](http://myimg.ekkosonya.cn/20250226175843.png)

一个线程处于运行状态下，线程的下一个状态会出现以下情况：

- 当CPU给予的运行时间结束时，会从运行状态回到就绪（可运行）状态，等待下一次获得CPU资源。
- 当线程进入休眠 / 阻塞(如等待IO请求) / 手动调用`wait()`方法时，会使得线程处于等待状态，**当等待状态结束后会回到就绪状态**。
- 当线程出现异常或错误 / 被 `stop()` 方法强行停止 / 所有代码执行结束时，会使得线程的运行终止。

通过调用`sleep()`方法可以将当前线程进入休眠，使得线程处于等待状态一段时间。

在`sleep`代码中可以发现，显示声明了会抛出一个`InterruptedException`异常  

```java
public static native void sleep(long millis) throws InterruptedException;
```

#### 中断

每一个`Thread`对象中，都有一个`interrupt()`方法，调用此方法后，会给指定线程添加一个中断标记以告知线程需要立即停止运行或是进行其他操作，由线程来响应此中断并进行相应的处理，我们前面提到的`stop()`方法是**强制终止线程**，这样的做法虽然简单粗暴，但是很有可能导致资源不能完全释放，而类似这样的发送通知来告知线程需要中断，让线程自行处理后续，会更加合理一些，也是更加推荐的做法。  

`interrupt`用法：  

```java
public static void main(String[] args) {
    Thread t = new Thread(() -> {
        System.out.println("线程开始运行！");
        while (true){   //无限循环
            if(Thread.currentThread().isInterrupted()){   //判断是否存在中断标志
                break;   //响应中断
            }
        }
        System.out.println("线程被中断了！");
    });
    t.start();
    try {
        Thread.sleep(3000);   //休眠3秒，一定比线程t先醒来
        t.interrupt();   //调用t的interrupt方法
    } catch (InterruptedException e) {
        e.printStackTrace();
    }
}
```

通过`isInterrupted()`可以判断线程是否存在中断标志，如果存在，说明外部希望当前线程立即停止，也有可能是给当前线程发送一个其他的信号，如果我们并不是希望收到中断信号就是结束程序，而是通知程序做其他事情，我们可以在收到中断信号后，复位中断标记，然后继续做我们的事情：  

```java
Thread.interrupted(); /复位中断标记（返回值是当前是否有中断标记）
```

### 线程优先级

Java程序中的每个线程并不是平均分配CPU时间的，为了使得线程资源分配更加合理，Java采用的是**抢占式调度方式**，**优先级越高的线程，优先使用CPU资源！**  
我们希望CPU花费更多的时间去处理更重要的任务，而不太重要的任务，则可以先让出一部分资源。线程的优先级一般分为以下三种：

- `MIN_PRIORITY` 最低优先级
- `MAX_PRIORITY` 最高优先级
- `NOM_PRIORITY` 常规优先级

```java
public static void main(String[] args) {
    Thread t = new Thread(() -> {
        System.out.println("线程开始运行！");
    });
    t.start();
    t.setPriority(Thread.MIN_PRIORITY);  //通过使用setPriority方法来设定优先级
}
```

优先级越高的线程，**获得CPU资源的概率会越大，并不是说一定优先级越高的线程越先执行！**  

#### 线程的礼让和加入

##### `yield()` 主动让出CPU资源

我们还可以在当前线程的工作不重要时，将CPU资源让位给其他线程，通过使用`yield()`方法来将当前资源让位给其他同优先级线程：  

```java
public static void main(String[] args) {
    Thread t1 = new Thread(() -> {
        System.out.println("线程1开始运行！");
        for (int i = 0; i < 50; i++) {
            if(i % 5 == 0) {
                System.out.println("让位！");
                Thread.yield();
            }
            System.out.println("1打印："+i);
        }
        System.out.println("线程1结束！");
    });
    Thread t2 = new Thread(() -> {
        System.out.println("线程2开始运行！");
        for (int i = 0; i < 50; i++) {
            System.out.println("2打印："+i);
        }
    });
    t1.start();
    t2.start();
}
```

观察结果，我们发现，在让位之后，尽可能多的在执行线程2的内容。

##### `join()`

当我们希望一个线程等待另一个线程执行完成后再继续进行，我们可以使用`join()`方法来实现线程的加入:  

```java
public static void main(String[] args) {
    Thread t1 = new Thread(() -> {
        System.out.println("线程1开始运行！");
        for (int i = 0; i < 50; i++) {
            System.out.println("1打印："+i);
        }
        System.out.println("线程1结束！");
    });
    Thread t2 = new Thread(() -> {
        System.out.println("线程2开始运行！");
        for (int i = 0; i < 50; i++) {
            System.out.println("2打印："+i);
            if(i == 10){
                try {
                    System.out.println("线程1加入到此线程！");
                    t1.join();    
                    //在i==10时，让线程1加入，先完成线程1的内容，在继续当前内容
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }
    });
    t1.start();
    t2.start();
}
```

我们发现，线程1加入后，线程2等待线程1待执行的内容全部执行完成之后，再继续执行的线程2内容。注意，**线程的加入只是等待另一个线程的完成，并不是将另一个线程和当前线程合并！**
