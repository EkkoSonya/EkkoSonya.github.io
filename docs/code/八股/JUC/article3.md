---
title: JUC3 - 多线程编程核心1
date: 2025-12-27
category:
  - code
tag:
  - java
  - juc
# star: true
# sticky: true
order: -0.5
---

## JUC3

在JDK5之前，我们只能选择`synchronized`关键字来实现锁，而JDK5之后，由于`volatile`关键字得到了升级，所以并发框架包便出现了

`Java.util.concurrent` —— `JUC`

相比传统的`synchronized`关键字，我们对于锁的实现，有了更多的选择

### 锁框架

在JDK 5之后，并发包中新增了Lock接口（以及相关实现类）用来实现锁功能，Lock接口提供了与synchronized关键字类似的同步功能，但需要在使用时手动获取锁和释放锁

#### `Lock`和`Condition`接口

使用并发包中的锁和我们传统的`synchronized`锁不太一样，这里的锁我们可以认为是一把真正意义上的锁，每个锁都是一个对应的锁对象，我只需要向锁对象获取锁或是释放锁即可

##### `Lock`

```java
public interface Lock {
   //获取锁，拿不到锁会阻塞，等待其他线程释放锁，获取到锁后返回
    void lock();
   //同上，但是等待过程中会响应中断
    void lockInterruptibly() throws InterruptedException;
   //尝试获取锁，但是不会阻塞，如果能获取到会返回true，不能返回false
    boolean tryLock();
   //尝试获取锁，但是可以限定超时时间，如果超出时间还没拿到锁返回false，否则返回true，可以响应中断
    boolean tryLock(long time, TimeUnit unit) throws InterruptedException;
   //释放锁
    void unlock();
   //暂时可以理解为替代传统的Object的wait()、notify()等操作的工具
    Condition newCondition();
}
```

对应的实现类 可重入锁 `ReentrantLock`

可以演示一下，如何使用Lock类来进行加锁和释放锁操作：

```java
public class Main {
    private static int i = 0;
    public static void main(String[] args) throws InterruptedException {
        Lock testLock = new ReentrantLock();   
        // 可重入锁ReentrantLock类是Lock类的一个实现，我们后面会进行介绍
        Runnable action = () -> {
            for (int j = 0; j < 100000; j++) {   //还是以自增操作为例
                testLock.lock();    //加锁，加锁成功后其他线程如果也要获取锁，会阻塞，等待当前线程释放
                i++;
                testLock.unlock();  //解锁，释放锁之后其他线程就可以获取这把锁了（注意在这之前一定得加锁，不然报错）
            }
        };
        new Thread(action).start();
        new Thread(action).start();
        Thread.sleep(1000);   //等上面两个线程跑完
        System.out.println(i);
    }
}
```

可以看到，和我们之前使用`synchronized`相比，我们这里是真正在操作一个"锁"对象

当我们需要加锁时，只需要调用`lock()`方法，而需要释放锁时，只需要调用`unlock()`方法

程序运行的最终结果和使用`synchronized`锁是一样的

##### `Condition`接口来实现`wait`和`notify`方法

并发包提供了Condition接口：

```java
public interface Condition {
   // 与调用锁对象的wait方法一样，会进入到等待状态
   // 但是这里需要调用Condition的signal或signalAll方法进行唤醒（感觉就是和普通对象的wait和notify是对应的）
   // 同时，等待状态下是可以响应中断的
   void await() throws InterruptedException;

   // 同上，但不响应中断（看名字都能猜到）
   void awaitUninterruptibly();

   // 等待指定时间，如果在指定时间（纳秒）内被唤醒，会返回剩余时间，如果超时，会返回0或负数，可以响应中断
   long awaitNanos(long nanosTimeout) throws InterruptedException;
   
   // 等待指定时间（可以指定时间单位），如果等待时间内被唤醒，返回true，否则返回false，可以响应中断
   boolean await(long time, TimeUnit unit) throws InterruptedException;
   
   // 可以指定一个明确的时间点，如果在时间点之前被唤醒，返回true，否则返回false，可以响应中断
   boolean awaitUntil(Date deadline) throws InterruptedException;
   
   // 唤醒一个处于等待状态的线程，注意还得获得锁才能接着运行
   void signal();
   
   // 同上，但是是唤醒所有等待线程
   void signalAll();
}
```

一个简单的例子来演示一下：

```java
public static void main(String[] args) throws InterruptedException {
    Lock testLock = new ReentrantLock();
    Condition condition = testLock.newCondition();
    new Thread(() -> {
        testLock.lock();   
        // 和synchronized一样，必须持有锁的情况下才能使用await
        System.out.println("线程1进入等待状态！");
        try {
            condition.await();   //进入等待状态
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println("线程1等待结束！");
        testLock.unlock();
    }).start();
    Thread.sleep(100); 
    // 防止线程2先跑
    new Thread(() -> {
        testLock.lock();
        System.out.println("线程2开始唤醒其他等待线程");
        condition.signal();   
        // 唤醒线程1，但是此时线程1还必须要拿到锁才能继续运行
        System.out.println("线程2结束");
        testLock.unlock();   
        // 这里释放锁之后，线程1就可以拿到锁继续运行了
    }).start();
}
```

可以发现，Condition对象使用方法和传统的对象使用差别不是很大

在调用`newCondition()`后，会生成一个新的Condition对象，并且同一把锁内是可以存在多个Condition对象的（实际上原始的锁机制等待队列只能有一个，而这里可以创建很多个Condition来实现多等待队列）

如果使用的是不同的Condition对象，只有对同一个Condition对象进行等待和唤醒操作才会有效，而不同的Condition对象是分开计算的

##### 时间单位工具类 `TimeUtil`

时间单位，这是一个枚举类，也是位于`java.util.concurrent`包下：

```java
public enum TimeUnit {
    /**
     * Time unit representing one thousandth of a microsecond
     */
    NANOSECONDS {
        public long toNanos(long d)   { return d; }
        public long toMicros(long d)  { return d/(C1/C0); }
        public long toMillis(long d)  { return d/(C2/C0); }
        public long toSeconds(long d) { return d/(C3/C0); }
        public long toMinutes(long d) { return d/(C4/C0); }
        public long toHours(long d)   { return d/(C5/C0); }
        public long toDays(long d)    { return d/(C6/C0); }
        public long convert(long d, TimeUnit u) { return u.toNanos(d); }
        int excessNanos(long d, long m) { return (int)(d - (m*C2)); }
    },
   //....
}
```

可以看到时间单位有很多的，比如`DAY`、`SECONDS`、`MINUTES`等，我们可以直接将其作为时间单位，比如我们要让一个线程等待3秒钟，可以像下面这样编写：

```java
public static void main(String[] args) throws InterruptedException {
    Lock testLock = new ReentrantLock();
    new Thread(() -> {
        testLock.lock();
        try {
            System.out.println("等待是否未超时："+testLock.newCondition().await(1, TimeUnit.SECONDS));
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        testLock.unlock();
    }).start();
}
```

#### 可重入锁 `ReentrantLock`

`ReentrantLock`，它其实是锁的一种，叫做可重入锁

##### 可以多次加锁

简单来说，就是同一个线程，可以反复进行加锁操作：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantLock lock = new ReentrantLock();
    lock.lock();
    lock.lock();   
    //连续加锁2次
    new Thread(() -> {
        System.out.println("线程2想要获取锁");
        lock.lock();
        System.out.println("线程2成功获取到锁");
    }).start();
    lock.unlock();
    System.out.println("线程1释放了一次锁");
    TimeUnit.SECONDS.sleep(1);
    lock.unlock();
    System.out.println("线程1再次释放了一次锁"); 
    //释放两次后其他线程才能加锁
}
```

可以看到，主线程连续进行了两次加锁操作（此操作是不会被阻塞的），在当前线程持有锁的情况下继续加锁不会被阻塞，并且，加锁几次，就必须要解锁几次，否则此线程依旧持有锁

##### `getHoldCount()`

我们可以使用`getHoldCount()`方法查看当前线程的加锁次数：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantLock lock = new ReentrantLock();
    lock.lock();
    lock.lock();
    System.out.println("当前加锁次数："+lock.getHoldCount()+"，是否被锁："+lock.isLocked());
    TimeUnit.SECONDS.sleep(1);
    lock.unlock();
    System.out.println("当前加锁次数："+lock.getHoldCount()+"，是否被锁："+lock.isLocked());
    TimeUnit.SECONDS.sleep(1);
    lock.unlock();
    System.out.println("当前加锁次数："+lock.getHoldCount()+"，是否被锁："+lock.isLocked());
}
```

可以看到，当锁不再被任何线程持有时，值为`0`，并且通过`isLocked()`方法查询结果为`false`。

##### `getQueueLength()`

实际上，如果存在线程持有当前的锁，那么其他线程在获取锁时，是会暂时进入到等待队列的，我们可以通过`getQueueLength()`方法获取等待中线程数量的预估值：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantLock lock = new ReentrantLock();
    lock.lock();
    Thread t1 = new Thread(lock::lock), t2 = new Thread(lock::lock);;
    t1.start();
    t2.start();
    TimeUnit.SECONDS.sleep(1);
    System.out.println("当前等待锁释放的线程数："+lock.getQueueLength());
    System.out.println("线程1是否在等待队列中："+lock.hasQueuedThread(t1));
    System.out.println("线程2是否在等待队列中："+lock.hasQueuedThread(t2));
    System.out.println("当前线程是否在等待队列中："+lock.hasQueuedThread(Thread.currentThread()));
}
```

##### `hasQueuedThread()`

我们可以通过`hasQueuedThread()`方法来判断某个线程是否正在等待获取锁状态。

同样的，Condition也可以进行判断：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantLock lock = new ReentrantLock();
    Condition condition = lock.newCondition();
    new Thread(() -> {
       lock.lock();
        try {
            condition.await();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        lock.unlock();
    }).start();
    TimeUnit.SECONDS.sleep(1);
    lock.lock();
    System.out.println("当前Condition的等待线程数："+lock.getWaitQueueLength(condition));
    condition.signal();
    System.out.println("当前Condition的等待线程数："+lock.getWaitQueueLength(condition));
    lock.unlock();
}
```

通过使用`getWaitQueueLength()`方法能够查看同一个Condition目前有多少线程处于等待状态

### 公平锁与非公平锁

前面我们了解了如果线程之间争抢同一把锁，会暂时进入到等待队列中，那么多个线程获得锁的顺序是不是一定是根据线程调用`lock()`方法时间来定的呢，

在`ReentrantLock`的构造方法中，是这样写的：

```java
public ReentrantLock() {
    sync = new NonfairSync();   //看名字貌似是非公平的
}
```

其实锁分为公平锁和非公平锁，默认我们创建出来的`ReentrantLock`是采用的**非公平锁**作为底层锁机制

- 公平锁：多个线程按照**申请锁的顺序**去获得锁，线程会**直接进入队列去排队**，永远都是队列的第一位才能得到锁。
- 非公平锁：多个线程去获取锁的时候，**会直接去尝试获取**，获取不到，再去进入等待队列，如果能获取到，就直接获取到锁。

简单来说，公平锁不让插队，都老老实实排着；非公平锁让插队，但是排队的人让不让你插队就是另一回事了

即非公平锁在线程创建开始执行`lock()`就会尝试获取下锁，而公平锁则不会，直接扔到等待队列里

`ReentrantLock` 的构造方法可以通过 布尔值 来设计是否为公平锁

```java
public ReentrantLock(boolean fair) {
    sync = fair ? new FairSync() : new NonfairSync();
}
```

### 读写锁

除了可重入锁之外，还有一种类型的锁叫做读写锁，当然它并不是专门用作读写操作的锁

它和可重入锁不同的地方在于，可重入锁是一种排他锁，当一个线程得到锁之后，另一个线程必须等待其释放锁，否则一律不允许获取到锁

而读写锁在同一时间，是可以让多个线程获取到锁的，它其实就是针对于读写场景而出现的。

读写锁维护了一个读锁和一个写锁，这两个锁的机制是不同的。

- 读锁：在没有任何线程占用写锁的情况下，同一时间可以有多个线程加读锁。
- 写锁：在没有任何线程占用读锁的情况下，同一时间只能有一个线程加写锁。

读锁和写锁是互斥的，并且读锁可以多个加锁，写锁只能有一个

#### `ReadWriteLock`接口

读写锁也有一个专门的接口：

```java
public interface ReadWriteLock {
    //获取读锁
    Lock readLock();

  	//获取写锁
    Lock writeLock();
}
```

#### `ReentrantReadWriteLock`实现类

此接口有一个实现类ReentrantReadWriteLock（实现的是ReadWriteLock接口，不是Lock接口，它本身并不是锁）

注意我们操作ReentrantReadWriteLock时，不能直接上锁，而是需要**获取读锁或是写锁，再进行锁操作**：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    lock.readLock().lock();
    new Thread(lock.readLock()::lock).start();
}
```

##### 读写锁操作

这里我们对读锁加锁，可以看到可以多个线程同时对读锁加锁。

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    lock.readLock().lock();
    new Thread(lock.writeLock()::lock).start();
}
```

有读锁状态下无法加写锁，反之亦然：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    lock.writeLock().lock();
    new Thread(lock.readLock()::lock).start();
}
```

并且，`ReentrantReadWriteLock`不仅具有读写锁的功能，还保留了可重入锁和公平/非公平机制

##### 可重入

比如同一个线程可以重复为写锁加锁，并且必须全部解锁才真正释放锁：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    lock.writeLock().lock();
    lock.writeLock().lock();
    new Thread(() -> {
        lock.writeLock().lock();
        System.out.println("成功获取到写锁！");
    }).start();
    System.out.println("释放第一层锁！");
    lock.writeLock().unlock();
    TimeUnit.SECONDS.sleep(1);
    System.out.println("释放第二层锁！");
    lock.writeLock().unlock();
}
```

##### 可以设置是否公平锁

通过之前的例子来验证公平和非公平：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock(true);

    Runnable action = () -> {
        System.out.println("线程 "+Thread.currentThread().getName()+" 将在1秒后开始获取锁...");
        lock.writeLock().lock();
        System.out.println("线程 "+Thread.currentThread().getName()+" 成功获取锁！");
        lock.writeLock().unlock();
    };
    for (int i = 0; i < 10; i++) {   //建立10个线程
        new Thread(action, "T"+i).start();
    }
}
```

#### 锁降级和锁升级

锁降级指的是写锁降级为读锁

当一个线程持有写锁的情况下，虽然其他线程不能加读锁，但是线程自己是可以加读锁的：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    lock.writeLock().lock();
    lock.readLock().lock();
    System.out.println("成功加读锁！");
}
```

那么，如果我们在同时加了写锁和读锁的情况下，释放写锁，是否其他的线程就可以一起加读锁了呢？

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    lock.writeLock().lock();
    lock.readLock().lock();
    new Thread(() -> {
        System.out.println("开始加读锁！");
        lock.readLock().lock();
        System.out.println("读锁添加成功！");
    }).start();
    TimeUnit.SECONDS.sleep(1);
    lock.writeLock().unlock();    //如果释放写锁，会怎么样？
}
```

可以看到，一旦写锁被释放，那么主线程就只剩下读锁了，因为读锁可以被多个线程共享，所以这时第二个线程也添加了读锁。而这种操作，就被称之为"锁降级"（注意不是先释放写锁再加读锁，而是持有写锁的情况下申请读锁再释放写锁）

注意在仅持有读锁的情况下去申请写锁，属于"锁升级"，ReentrantReadWriteLock是不支持的：

```java
public static void main(String[] args) throws InterruptedException {
    ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    lock.readLock().lock();
    lock.writeLock().lock();
    System.out.println("所升级成功！");
}
```

可以看到线程直接卡在加写锁的那一句了
