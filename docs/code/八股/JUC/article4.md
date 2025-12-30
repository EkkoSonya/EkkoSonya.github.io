---
title: JUC4 - AQS队列同步器
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

## JUC4

源码分析是 JDK 1.8 的，之后的版本是有改动的，JDK 17 就跟 JDK 1.8 对应的获取锁等操作有一些不同

### 队列同步器 AQS

前一部分了解了可重入锁和读写锁，这一章来分析下如何实现，它们的底层实现原理是怎么样的

比如对于`ReentrantLock`的`lock()`方法，其具体实现为：

```java
public void lock() {
    sync.lock();
}
```

可以看到，它的内部实际上啥都没做，而是交给了`Sync`对象在进行，并且，不只是这个方法，其他的很多方法都是依靠Sync对象在进行：

```java
public void unlock() {
    sync.release(1);
}
```

那么这个Sync对象是干什么的呢？

可以看到，在 `ReentrantLock` 的源码里，公平锁和非公平锁都是继承自Sync，而Sync是继承自`AbstractQueuedSynchronizer`，简称队列同步器 (AQS)：

```java
abstract static class Sync extends AbstractQueuedSynchronizer {
   //...
}

static final class NonfairSync extends Sync {}
static final class FairSync extends Sync {}
```

所以，要了解它的底层到底是如何进行操作的，还得看队列同步器

#### AQS源码分析

AbstractQueuedSynchronizer(AQS) 是实现锁机制的基础，它的内部封装了包括锁的获取、释放、以及等待队列。

一个锁（排他锁为例）的基本功能就是获取锁、释放锁、当锁被占用时，其他线程来争抢会进入等待队列

AQS已经将这些基本的功能封装完成了，其中**等待队列**是核心内容，等待队列是由**双向链表**数据结构实现的，**每个等待状态下的线程都可以被封装进结点**中并放入双向链表中，而对于双向链表是以队列的形式进行操作的，它像这样：

![alt text](img/10.png)

AQS中有一个`head`字段和一个`tail`字段分别记录双向链表的头结点和尾结点，而之后的一系列操作都是围绕此队列来进行的。

每个线程都会被封装为一个 `Node` 作为链表的操作节点

##### 静态内部类 `Node`

我们先来了解一下每个结点都包含了哪些内容：

```java
// 每个处于等待状态的线程都可以是一个节点，并且每个节点是有很多状态的
static final class Node {
   // 每个节点都可以被分为独占模式节点或是共享模式节点，分别适用于独占锁和共享锁
    static final Node SHARED = new Node();
    static final Node EXCLUSIVE = null;

   // 等待状态，这里都定义好了
   // 唯一一个大于0的状态，表示已失效，可能是由于超时或中断，此节点被取消。
    static final int CANCELLED =  1;
   // 此节点后面的节点被挂起（进入等待状态）
    static final int SIGNAL    = -1; 
   // 在条件队列中的节点才是这个状态
    static final int CONDITION = -2;
   // 传播，一般用于共享锁
    static final int PROPAGATE = -3;

    volatile int waitStatus;    // 等待状态值
    volatile Node prev;   // 双向链表基操，标记前一个节点
    volatile Node next;
    volatile Thread thread;   // 每一个线程都可以被封装进一个节点进入到等待队列
  
    Node nextWaiter;   // 在等待队列中表示模式，条件队列中作为下一个结点的指针

    final boolean isShared() {
        return nextWaiter == SHARED;
    }

    final Node predecessor() throws NullPointerException {
        Node p = prev;
        if (p == null)
            throw new NullPointerException();
        else
            return p;
    }

    Node() {
    }

    Node(Thread thread, Node mode) {
        this.nextWaiter = mode;
        this.thread = thread;
    }

    Node(Thread thread, int waitStatus) {
        this.waitStatus = waitStatus;
        this.thread = thread;
    }
}
```

##### AQS初始化

`state`就表示的是我们当前锁的一个状态

在一开始的时候，`head`和`tail`都是`null`，`state`为默认值`0`：

```java
private transient volatile Node head;

private transient volatile Node tail;

private volatile int state;
```

不用担心双向链表不会进行初始化，初始化是在实际使用时才开始的，先不管，我们接着来看其他的初始化内容：

```java
// 直接使用Unsafe类进行操作
private static final Unsafe unsafe = Unsafe.getUnsafe();
// 记录类中属性的在内存中的偏移地址，方便Unsafe类直接操作内存进行赋值等（直接修改对应地址的内存）

// 这里对应的就是AQS类中的state成员字段
private static final long stateOffset;
// 这里对应的就是AQS类中的head头结点成员字段
private static final long headOffset;
private static final long tailOffset;
private static final long waitStatusOffset;
private static final long nextOffset;

static {   
    // 静态代码块，在类加载的时候就会自动获取偏移地址
    try {
        // 先通过反射 AbstractQueuedSynchronizer.class.getDeclaredField("state") 得到对应的 Filed对象
        // 然后再基于此找到对应的属性偏移量
        stateOffset = unsafe.objectFieldOffset
            (AbstractQueuedSynchronizer.class.getDeclaredField("state"));
        headOffset = unsafe.objectFieldOffset
            (AbstractQueuedSynchronizer.class.getDeclaredField("head"));
        tailOffset = unsafe.objectFieldOffset
            (AbstractQueuedSynchronizer.class.getDeclaredField("tail"));
        waitStatusOffset = unsafe.objectFieldOffset
            (Node.class.getDeclaredField("waitStatus"));
        nextOffset = unsafe.objectFieldOffset
            (Node.class.getDeclaredField("next"));

    } catch (Exception ex) { throw new Error(ex); }
}

//通过CAS操作来修改头结点
private final boolean compareAndSetHead(Node update) {
    //调用的是Unsafe类的compareAndSwapObject方法，通过CAS算法比较对象并替换
    return unsafe.compareAndSwapObject(this, headOffset, null, update);
}

/**
 * CAS tail field. Used only by enq.
 */
private final boolean compareAndSetTail(Node expect, Node update) {
    return unsafe.compareAndSwapObject(this, tailOffset, expect, update);
}

/**
 * CAS waitStatus field of a node.
 */
private static final boolean compareAndSetWaitStatus(Node node,
                                                        int expect,
                                                        int update) {
    return unsafe.compareAndSwapInt(node, waitStatusOffset,
                                    expect, update);
}

/**
 * CAS next field of a node.
 */
private static final boolean compareAndSetNext(Node node,
                                                Node expect,
                                                Node update) {
    return unsafe.compareAndSwapObject(node, nextOffset, expect, update);
}
```

可以发现，队列同步器由于要使用到CAS算法，所以，直接使用了Unsafe工具类，Unsafe类中提供了CAS操作的方法（Java无法实现，底层由C++实现）所有对AQS类中成员字段的修改，都有对应的CAS操作封装

CAS就是不会强行加锁(无锁算法 乐观锁)，需要在替换值的时候进行比较，只有在赋值前发现原始值是我们预期的值才会进行赋值

通过 静态代码块 在加载时就获得对应的 `head` `tail` 以及 `state` 对应的内存地址偏移量，然后再通过 `Unsafe` 来直接操作对应内存地址赋值

##### 如何使用AQS

它提供了一些可重写的方法（根据不同的锁类型和机制，可以自由定制规则，并且为独占式和非独占式锁都提供了对应的方法），以及一些已经写好的模板方法（模板方法会调用这些可重写的方法），使用此类只需要将可重写的方法进行重写，并调用提供的模板方法，从而实现锁功能（学习过设计模式会比较好理解一些）

总共5个

我们首先来看可重写方法：

```java
//独占式获取同步状态，查看同步状态是否和参数一致，如果返没有问题，那么会使用CAS操作设置同步状态并返回true
protected boolean tryAcquire(int arg) {
    throw new UnsupportedOperationException();
}

//独占式释放同步状态
protected boolean tryRelease(int arg) {
    throw new UnsupportedOperationException();
}

//共享式获取同步状态，返回值大于0表示成功，否则失败
protected int tryAcquireShared(int arg) {
    throw new UnsupportedOperationException();
}

//共享式释放同步状态
protected boolean tryReleaseShared(int arg) {
    throw new UnsupportedOperationException();
}

//是否在独占模式下被当前线程占用（锁是否被当前线程持有）
protected boolean isHeldExclusively() {
    throw new UnsupportedOperationException();
}
```

可以看到，这些需要重写的方法默认是直接抛出`UnsupportedOperationException`，也就是说根据不同的锁类型，我们需要去实现对应的方法

#### `ReentrantLock`源码分析 (公平锁分析)

我们可以来看一下ReentrantLock（此类是全局独占式的）中的公平锁是如何借助AQS实现的

##### 公平锁 `Lock` 实现

```java
static final class FairSync extends Sync {
    private static final long serialVersionUID = -3000897897090466540L;

   // 加锁操作调用了模板方法acquire
   // 为了防止各位绕晕，请时刻记住
   // lock方法一定是在某个线程下为了加锁而调用的，并且同一时间可能会有其他线程也在调用此方法
    final void lock() {
        acquire(1);
    }

    ...
}
```

###### 调用 `acquire()`

直接调用了AQS提供的模板方法`acquire()`，我们来看看它在AQS类中的实现细节：

```java
@ReservedStackAccess 
// 这个是JEP 270添加的新注解，它会保护被注解的方法，通过添加一些额外的空间，防止在多线程运行的时候出现栈溢出，下同
// arg 是锁的次数
// arg == 1
public final void acquire(int arg) {
    // tryAcquire 尝试获取锁
    // 如果未成功 
    // addWaiter(Node.EXCLUSIVE)
    // 然后 acquireQueued()
    if (!tryAcquire(arg) &&
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))   
        // 节点为独占模式Node.EXCLUSIVE
        selfInterrupt();
}
```

首先会调用`tryAcquire()`方法（这里是由FairSync类实现的），如果尝试加独占锁失败（返回false了）说明可能这个时候有其他线程持有了此独占锁

那么当前线程需要放入等待队列，所以会用 `addWaiter(Node.EXCLUSIVE)`

###### `addWaiter()`

当尝试获取锁失败了，就需要将当前线程节点放到AQS的等待队列里，返回的是当前线程节点

所以当前线程得先等着，那么会调用`addWaiter()`方法将线程加入等待队列中：

> `mode == Node.EXCLUSIVE == null` 独占模式，应该就是一个 `Node` 节点就一个线程排队，要是共享可能有多个

```java
private Node addWaiter(Node mode) {
    Node node = new Node(Thread.currentThread(), mode);
    // 先尝试使用CAS直接入队，如果这个时候其他线程也在入队（就是不止一个线程在同一时间争抢这把锁）就进入enq()
    Node pred = tail;
    // 如果 pred (tail) 不是 null 就表示AQS里面至少有一个等待节点
    // 那么直接把当前节点放到队尾就行了
    if (pred != null) {
        node.prev = pred;
        // 可能这时候也有其他也同时加入
        // 通过CAS保证只有一个线程可以成功
        if (compareAndSetTail(pred, node)) {
            pred.next = node;
            return node;
        }
    }
    // 否则 说明此时队里是空的，或者别人先抢了 你创建失败
    // 此方法是CAS快速入队失败时调用
    // 那只能 enq 了
    enq(node);
    return node;
}

private Node enq(final Node node) {
   // 自旋形式入队，可以看到这里是一个无限循环
    for (;;) {
        Node t = tail;
        if (t == null) {  
            // 这种情况只能说明头结点和尾结点都还没初始化
            // 初始化头结点和尾结点
            // 也要通过 CAS 来保证只有一个线程来初始化就行
            // 头结点相当于 虚拟头结点，其 next 是第一个有效节点
            if (compareAndSetHead(new Node()))   
                tail = head;
        } else {
            // 说明AQS队列有值，或者你这个线程不行，CAS抢失败了
            // 那就下来再试试吧
            node.prev = t;
            // 先将自己的 prev 指向尾节点
            // 即使 后面 CAS 失败了也无所谓
            // 下次就 prev 也变了
            if (compareAndSetTail(t, node)) {
                t.next = node;
                return t;   
                // 只有CAS成功的情况下，才算入队成功
                // 如果CAS失败，那说明其他线程同一时间也在入队，并且手速还比当前线程快，刚好走到CAS操作的时候，其他线程就先入队了
                // 那么这个时候node.prev就不是我们预期的节点了，而是另一个线程新入队的节点
                // 所以说得进下一次循环再来一次CAS，这种形式就是自旋
            }
        }
    }
}
```

在了解了`addWaiter()`方法会将节点加入等待队列之后，我们接着来看，`addWaiter()`会返回已经加入的节点

###### `acquireQueued()`

`acquireQueued(addWaiter(Node.EXCLUSIVE), arg)`

目的就是我已经在AQS等待队列里了，通过 `acquireQueued` 来不断尝试按照队列顺序去获取锁

`acquireQueued()`在得到返回的节点时，也会进入自旋状态，等待唤醒（也就是开始进入到拿锁的环节了）：

```java
@ReservedStackAccess
final boolean acquireQueued(final Node node, int arg) {
    boolean failed = true;
    try {
        boolean interrupted = false;
        // 无限循环 自旋
        for (;;) {
            final Node p = node.predecessor();
            if (p == head && tryAcquire(arg)) {   
                // 可以看到当此节点位于队首(node.prev == head)时，会再次调用tryAcquire方法获取锁
                // 即 node.prev == head 说明它 node 已经是第一个等待节点了
                // 如果获取成功，会返回此过程中是否被中断的值
                
                setHead(node);    
                // 新的头结点设置为当前结点，并且将其的 next 和 prev 清空

                p.next = null; 
                // 原有的头结点没有存在的意义了
                
                failed = false;   //没有失败
                return interrupted;   //直接返回等待过程中是否被中断
            } 
            // 依然没获取成功
            // 可能当前节点不是第一个 或者 锁还没有释放
            // 那么就要开始尝试将线程挂起

            // shouldParkAfterFailedAcquire(p, node)
            // 将当前节点的前驱节点等待状态设置为SIGNAL，如果失败将直接开启下一轮循环，直到成功为止，如果成功接着往下

            // 只有成功将前驱结点的等待状态设为 SIGNAL, 才会将当前线程挂起
            // 表示开始等待了

            // parkAndCheckInterrupt()
            // 挂起线程进入等待状态，等待被唤醒
            // 如果在等待状态下被中断，那么会返回true，直接将中断标志设为true，否则就是正常唤醒，继续自旋
            if (shouldParkAfterFailedAcquire(p, node) &&  parkAndCheckInterrupt())   
                // 意思只有在等待状态下被中断才会进入
                interrupted = true;
        }
    } finally {
        if (failed)
            cancelAcquire(node);
    }
}

private final boolean parkAndCheckInterrupt() {
    LockSupport.park(this);   
    // 通过unsafe类操作底层挂起线程（会直接进入阻塞状态）
    return Thread.interrupted();
}

private void setHead(Node node) {
    head = node;
    node.thread = null;
    node.prev = null;
}
```

```java
private static boolean shouldParkAfterFailedAcquire(Node pred, Node node) {
    int ws = pred.waitStatus;
    if (ws == Node.SIGNAL)
        return true;   // 已经是SIGNAL，直接true
    if (ws > 0) {   // 不能是已经取消的节点，必须找到一个没被取消的
        do {
            node.prev = pred = pred.prev;
        } while (pred.waitStatus > 0);
        pred.next = node;   //直接抛弃被取消的节点
    } else {
        // 不是SIGNAL，先CAS设置为SIGNAL（这里没有返回true因为CAS不一定成功，需要下一轮再判断一次）
        compareAndSetWaitStatus(pred, ws, Node.SIGNAL);
    }
    return false;   // 返回false，马上开启下一轮循环
}
```

所以，`acquire()`中的if条件如果为true，那么只有一种情况，就是等待过程中被中断了，其他任何情况下都是成功获取到独占锁，所以当等待过程被中断时，会调用`selfInterrupt()`方法：

```java
static void selfInterrupt() {
    Thread.currentThread().interrupt();
}
```

这里就是直接向当前线程发送中断信号了。

上面提到了LockSupport类，它是一个工具类，我们也可以来玩一下这个`park`和`unpark`:

```java
public static void main(String[] args) throws InterruptedException {
    Thread t = Thread.currentThread();  //先拿到主线程的Thread对象
    new Thread(() -> {
        try {
            TimeUnit.SECONDS.sleep(1);
            System.out.println("主线程可以继续运行了！");
            LockSupport.unpark(t);
           //t.interrupt();   发送中断信号也可以恢复运行
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }).start();
    System.out.println("主线程被挂起！");
    LockSupport.park();
    System.out.println("主线程继续运行！");
}
```

这里我们就把公平锁的`lock()`方法实现讲解完毕了

##### 尝试获取锁方法 `tryAcquire()`

可重入独占锁: 如果你是第一个节点才会把锁给你，或者队列中没有等待节点

(可重入独占锁的公平实现) 接着我们来看公平锁的`tryAcquire()`方法：

```java
static final class FairSync extends Sync {
    // 可重入独占锁的公平实现
    @ReservedStackAccess
    protected final boolean tryAcquire(int acquires) {
        final Thread current = Thread.currentThread();   
        // 先获取当前线程的Thread对象
        int c = getState();     
        // 获取当前AQS对象状态（独占模式下0为未占用，大于0表示已占用）
        
        if (c == 0) {       
            // 如果是0，那就表示没有占用，现在我们的线程就要来尝试占用它

            // hasQueuedPredecessors()
            // true if there is a queued thread preceding the current thread, and false if the current thread is at the head of the queue or the queue is empty
            // 逻辑是当AQS存在队列 (tail != head) 且 (第一个结点为空 (恰好在插入第二个节点) 或者 第一个节点的线程不是当前线程) 
            // 返回true，说明你不是第一个等待的人，接着排队
            // 如果没必要排队，就说明可以直接获取锁
            // compareAndSetState(0, acquires)
            // 锁上 尝试+1 因为有可能好多线程过了 !hasQueuedPredecessors() 所以也需要 CAS
            // CAS设置状态，如果成功则说明成功拿到了这把锁，失败则说明可能这个时候其他线程在争抢，并且还比你先抢到
            if (!hasQueuedPredecessors() &&    
                compareAndSetState(0, acquires)) {   
                setExclusiveOwnerThread(current);    
                // 成功拿到锁，会将独占模式所有者线程设定为当前线程（这个方法是父类AbstractOwnableSynchronizer中的，就表示当前这把锁已经是这个线程的了）
                return true;   
                // 占用锁成功，返回true
            }
        }
        // 如果不是0，那就表示被线程占用了，这个时候看看是不是自己占用的，如果是，由于是可重入锁，可以继续加锁
        else if (current == getExclusiveOwnerThread()) {   
            int nextc = c + acquires;    
            // 多次加锁会将状态值进行增加，状态值就是加锁次数
            if (nextc < 0)   //加到int值溢出了？
                throw new Error("Maximum lock count exceeded");
            setState(nextc);   //设置为新的加锁次数
            return true;
        }

        // 其他任何情况都是加锁失败
        return false;
    }
}
```

```java
public final boolean hasQueuedPredecessors() {
    // The correctness of this depends on head being initialized
    // before tail and on head.next being accurate if the current
    // thread is first in queue.
    Node t = tail; // Read fields in reverse initialization order
    Node h = head;
    Node s;
    return h != t &&
        ((s = h.next) == null || s.thread != Thread.currentThread());
}
```

在了解了公平锁的实现之后，是不是感觉有点恍然大悟的感觉，虽然整个过程非常复杂，但是只要理清思路，还是比较简单的。

##### 公平锁 `unlock()` 实现

加锁过程已经OK，我们接着来看，它的解锁过程，`unlock()`方法是在AQS中实现的：

```java
public void unlock() {
    sync.release(1);    
    // 直接调用了AQS中的release方法，参数为1表示解锁一次state值-1
}
```

```java
@ReservedStackAccess
public final boolean release(int arg) {
    // 和tryAcquire一样，也得子类去重写，释放锁操作
    if (tryRelease(arg)) {
        // 当解锁成功
        // 释放锁成功后，获取新的头结点
        // 所以加锁的时候，只是把node的thread和prev清空，但 waitStatus 还是保留
        Node h = head;

        // 根据头结点的 waitStatus 来判断第一个等待节点是否开始等待了
        if (h != null && h.waitStatus != 0)   
        //如果新的头结点不为空并且不是刚刚建立的结点（初始状态下status为默认值0，而上面在进行了shouldParkAfterFailedAcquire之后，会被设定为SIGNAL状态，值为-1）
            unparkSuccessor(h);   //唤醒头节点下一个节点中的线程
        return true;
    }
    return false;
}
```

###### `tryRelease` 尝试释放锁

那么我们来看看`tryRelease()`方法是怎么实现的，具体实现在Sync中：

```java
@ReservedStackAccess
protected final boolean tryRelease(int releases) {
    int c = getState() - releases;   
    // 先计算本次解锁之后的状态值
    if (Thread.currentThread() != getExclusiveOwnerThread())   
    // 因为是独占锁，那肯定这把锁得是当前线程持有才行
        throw new IllegalMonitorStateException();   //否则直接抛异常
    
    boolean free = false;
    if (c == 0) {  
        // 如果解锁之后的值为0，表示已经完全释放此锁
        free = true;
        setExclusiveOwnerThread(null);  
        // 将独占锁持有线程设置为null
    }
    setState(c);   // 状态值设定为c
    // 如果不是0表示此锁还没完全释放，返回false，是0就返回true
    return free;
}
```

如果已经将锁释放了，那么就要去 AQS 找下一个等待节点线程来进行唤醒

###### `unparkSuccessor` 唤醒下一个节点

```java
private void unparkSuccessor(Node node) {
    // 将等待状态waitStatus设置为初始值0
    int ws = node.waitStatus;
    if (ws < 0)
        compareAndSetWaitStatus(node, ws, 0);

    //获取下一个结点
    Node s = node.next;
    // 如果下一个结点为空或是等待状态是已取消，那肯定是不能通知unpark的
    if (s == null || s.waitStatus > 0) {   
        // 这时就要遍历所有节点再另外找一个符合unpark要求的节点了
        s = null;

        // 这里是从队尾向前
        // 因为enq()方法中的t.next = node是在CAS之后进行的
        // 而 node.prev = t 是CAS之前进行的，所以从后往前一定能够保证遍历所有节点
        for (Node t = tail; t != null && t != node; t = t.prev)   
            if (t.waitStatus <= 0)
                s = t;
    }
    if (s != null)   //要是找到了，就直接unpark，要是还是没找到，那就算了
        LockSupport.unpark(s.thread);
}
```

为什么要从队尾找

因为在加锁被放到等待队列时，会有 `addWaiter` 以及 `enq` 方法，其中需要把当前节点放到队列的末尾，但此时也有可能会有好多线程一起放入末尾，为了避免并行错误, 先将自己的 prev 指向尾节点，然后来一次 CAS 看看能不能让 尾节点变成当前节点，只有成功了，才会把之前的尾节点的 next 指向当前节点 `t.next = node;`

所以存在这么一种可能，在当前队列中，你刚好把一个节点变成尾节点，但是还没来得及将上一个的尾节点指向它 `t.next = node;`, 然后此时又刚好持有锁的线程在找唤醒节点，就有可能漏掉

```java
node.prev = t;
// 先将自己的 prev 指向尾节点
// 即使 后面 CAS 失败了也无所谓
// 下次就 prev 也变了
if (compareAndSetTail(t, node)) {
    t.next = node;
    return t; 
}
```

#### 总结

综上，我们来画一个完整的流程图：

![alt text](img/11.png)

还有非公平锁和读写锁

### AQS：next 指针的不可靠性

在 `unparkSuccessor` 方法中，之所以要从后往前（tail -> prev）遍历查找下一个需要唤醒的节点，正是为了解决 addWaiter 或 enq 过程中，CAS 操作与 next 指针赋值之间的时间差问题

在 `enq(Node node)` 方法中，新节点入队的代码如下：

```java
node.prev = t;           // 1. 第一步：设置 prev
if (compareAndSetTail(t, node)) { // 2. 第二步：CAS 设置尾节点
    t.next = node;       // 3. 第三步：设置 next
    return t;
}
```

这三步不是原子的。在多线程环境下，会出现以下极端的“断裂”瞬间：

节点已关联 prev：新节点 node 已经把自己的 prev 指向了老尾部 t。

CAS 成功：tail 已经更新为新节点 node 了。

还没来得及执行 `t.next = node`：就在这一刻，持有锁的线程释放了锁，进入 unparkSuccessor

如果一个节点刚好被取消，同时又有新节点入队，next 指针的链路可能是不完整的、或者是瞬时错乱的。而 prev 链在 AQS 中具有更强的保证（因为 cancelAcquire 也会处理 prev 指针的重新连接）

- `next 指针`：是一种优化，大部分情况下它是好的，但不保证实时准确。

- `prev 指针 + CAS`：是强一致性的保证。只要节点进了队列（成为了 tail），它的 prev 就一定是稳固的
