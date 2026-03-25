---
title: JUC 八股11 - 锁2(Lock)
date: 2026-03-24
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

## 锁

### Lock 与 Condition 接口

#### Lock 接口

在JDK 5之后，并发包中新增了Lock接口（以及相关实现类）用来实现锁功能，Lock接口提供了与synchronized关键字类似的同步功能，但需要在使用时手动获取锁和释放锁

Lock 是 JUC 中的一个接口，最常用的实现类包括可重入锁 ReentrantLock、读写锁 ReentrantReadWriteLock 等

当我们需要加锁时，只需要调用lock()方法，而需要释放锁时，只需要调用unlock()方法

程序运行的最终结果和使用synchronized锁是一样的

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

#### Condition 接口

Condition 是 JUC 包中用于实现线程间等待/通知机制的接口，它可以替代传统的 Object.wait() 和 Object.notify() 方法

使用 synchronized 时，每个锁对象都自带一个条件队列

但 ReentrantLock 是一个类，不是 JVM 内置机制，所以需要显式创建条件对象——这就是 Condition 的作用

每个锁只有一个条件队列，一个锁可以绑定多个 Condition

优势：ReentrantLock 可以创建多个 Condition 实例，实现更精细的线程控制（比如读写分离的场景）

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

在调用newCondition()后，会生成一个新的Condition对象，并且同一把锁内是可以存在多个Condition对象的（实际上原始的锁机制等待队列只能有一个，而这里可以创建很多个Condition来实现多等待队列）

如果使用的是不同的Condition对象，只有对同一个Condition对象进行等待和唤醒操作才会有效，而不同的Condition对象是分开计算的

### ReadWriteLock 接口

除了可重入锁之外，还有一种类型的锁叫做读写锁，当然它并不是专门用作读写操作的锁

它和可重入锁不同的地方在于，可重入锁是一种排他锁，当一个线程得到锁之后，另一个线程必须等待其释放锁，否则一律不允许获取到锁

而读写锁在同一时间，是可以让多个线程获取到锁的，它其实就是针对于读写场景而出现的。

读写锁维护了一个读锁和一个写锁，这两个锁的机制是不同的。

- 读锁：在没有任何线程占用写锁的情况下，同一时间可以有多个线程加读锁。
- 写锁：在没有任何线程占用读锁的情况下，同一时间只能有一个线程加写锁。

读锁和写锁是互斥的，并且读锁可以多个加锁，写锁只能有一个

获取读锁要看有没有写锁，没有就可以随便加

获取写锁要看有没有读锁，然后再看有没有写锁，才能加

```java
public interface ReadWriteLock {
    //获取读锁
    Lock readLock();
    //获取写锁
    Lock writeLock();
}
```

此接口有一个实现类ReentrantReadWriteLock（实现的是ReadWriteLock接口，不是Lock接口，它本身并不是锁）

操作ReentrantReadWriteLock时，不能直接上锁，而是需要获取读锁或是写锁，再进行锁操作
