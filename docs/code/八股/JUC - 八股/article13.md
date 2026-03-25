---
title: JUC 八股13 - 锁4(ReentrantLock)
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

## ReentrantLock

### lock() 分析

ReentrantLock 对象使用 `lock()` 方法时，本质是调用其内部的属性 `sync` 执行 `lock`，而 `sync` 就是内部继承了 AQS 的对象

然后进一步，在初始化时，根据对应的构造函数决定采用公平锁 `NonfairSync` 还是 `FairSync`, 这两个是继承 `Sync`，来决定具体的 `lock` 逻辑

```java
public class ReentrantLock implements Lock, java.io.Serializable {
  ...
  private final Sync sync;
  ...
  abstract static class Sync extends AbstractQueuedSynchronizer {
    ...
  }
  ...
  /**
   * Sync object for non-fair locks
   */
  static final class NonfairSync extends Sync {
      private static final long serialVersionUID = 7316153563782823691L;

      /**
       * Performs lock.  Try immediate barge, backing up to normal
       * acquire on failure.
       */
      @ReservedStackAccess
      final void lock() {
          if (compareAndSetState(0, 1))
              setExclusiveOwnerThread(Thread.currentThread());
          else
              acquire(1);
      }

      protected final boolean tryAcquire(int acquires) {
          return nonfairTryAcquire(acquires);
      }
  }

  /**
   * Sync object for fair locks
   */
  static final class FairSync extends Sync {
    private static final long serialVersionUID = -3000897897090466540L;

    final void lock() {
      acquire(1);
    }

    /**
     * Fair version of tryAcquire.  Don't grant access unless
     * recursive call or no waiters or is first.
     */
    @ReservedStackAccess
    protected final boolean tryAcquire(int acquires) {
      final Thread current = Thread.currentThread();
      int c = getState();
      if (c == 0) {
          if (!hasQueuedPredecessors() &&
              compareAndSetState(0, acquires)) {
              setExclusiveOwnerThread(current);
              return true;
          }
      }
      else if (current == getExclusiveOwnerThread()) {
          int nextc = c + acquires;
          if (nextc < 0)
              throw new Error("Maximum lock count exceeded");
          setState(nextc);
          return true;
      }
      return false;
    }
  }
  ...
  public void lock() {
    sync.lock();
  }
  ...
}
```

#### 以非公平锁为例

其调用了 `sync.lock()`, 会先进行一次 CAS 尝试获取，看此时锁是否空着，如果空着，就直接抢到锁了(非公平性体现)

```java
 final void lock() {
  if (compareAndSetState(0, 1))
    setExclusiveOwnerThread(Thread.currentThread());
  else
    acquire(1);
}
```

如果失败，那么就会通过 `acquire(1)` 开始加入等待队列，也就是 AQS 实现的方法

```java
//AbstractQueuedSynchronizer.java
public final void acquire(int arg) {
  if (!tryAcquire(arg) &&
    acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
    selfInterrupt();
}
```

##### `tryAcquire(arg)` (尝试获取锁，失败就扔进等待队列)

`acquire()` 中的 `tryAcquire(arg)` 是交给子类去实现的，来自定义不同的尝试锁方法

后面的 `addWaiter()` 以及 `acquireQueued()` 则是自带的

对于 非公平锁 而言, `tryAcquire(arg)` 实现：

```java
static final class NonfairSync extends Sync {
  ...
  protected final boolean tryAcquire(int acquires) {
      return nonfairTryAcquire(acquires);
  }
}
```

其 `nonfairTryAcquire` 是 `Sync` 对象直接写好的

主要思路：如果 state = 0，那就尝试一下 cas，如果成功就获取了；此外判断下当前占有锁的线程是不是自己，是的话就 state 加对应的 acquires 值，并且需要避免溢出

如果都失败了，那么就返回 false，表示需要放入等待队列中

```java
abstract static class Sync extends AbstractQueuedSynchronizer {
  private static final long serialVersionUID = -5179523762034025860L;

  /**
   * Performs {@link Lock#lock}. The main reason for subclassing
   * is to allow fast path for nonfair version.
   */
  abstract void lock();

  /**
   * Performs non-fair tryLock.  tryAcquire is implemented in
   * subclasses, but both need nonfair try for trylock method.
   */
  @ReservedStackAccess
  final boolean nonfairTryAcquire(int acquires) {
      final Thread current = Thread.currentThread();
      int c = getState();
      if (c == 0) {
          if (compareAndSetState(0, acquires)) {
              setExclusiveOwnerThread(current);
              return true;
          }
      }
      else if (current == getExclusiveOwnerThread()) {
          int nextc = c + acquires;
          if (nextc < 0) // overflow
              throw new Error("Maximum lock count exceeded");
          setState(nextc);
          return true;
      }
      return false;
  }
  ...
}
```

##### `acquireQueued(addWaiter(Node.EXCLUSIVE), arg)` (非公平/公平锁一样)

都是在 AQS 中提供的

###### `addWaiter(Node.EXCLUSIVE)`

节点属性是 `EXCLUSIVE`，表示独家占有，不会和别人共享的

加入等待队列中

同样这里也有 CAS 操作来让新建的节点入到链表的末尾 `compareAndSetTail(pred, node)`

如果此时 `pred == tail`, 那么表明没被修改 ok，就把 `tail` set `node` 即可

在这之前因为已经 `node.prev = pred;` 所以没事

但如果 cas 一次失败了，那么就通过 `enq` 不断自旋尝试加入等待队列

```java
private Node addWaiter(Node mode) {
  Node node = new Node(Thread.currentThread(), mode);
  // Try the fast path of enq; backup to full enq on failure
  Node pred = tail;
  if (pred != null) {
      node.prev = pred;
      if (compareAndSetTail(pred, node)) {
          pred.next = node;
          return node;
      }
  }
  // CAS 失败后，调用 enq 确保入队
  enq(node);
  return node;
}

private Node enq(final Node node) {
  for (;;) {
    Node t = tail;
    if (t == null) { // Must initialize
      if (compareAndSetHead(new Node()))
          tail = head;
    } else {
      node.prev = t;
      if (compareAndSetTail(t, node)) {
          t.next = node;
          return t;
      }
    }
  }
}
```

###### `acquireQueued(node, arg)`

当该节点通过 `addWaiter()` 成功入队后，那么就会开始自旋来不断尝试获取锁

> AQS 的 head 节点不持有实际线程，只是一个占位符，用来标记队列的起始位置
>
> head.next 才是真正持有锁的线程（或即将获得锁的线程）
> 当 head.next 的线程释放锁后，它会成为新的 head（被丢弃）

所以，只有当 node 的前驱节点是 head 了，那么表示ok，node可以去获取锁了

> 但此时并一定100%获取到锁

所以开始 `tryAcquire(arg)` (子类自己定义的获取锁逻辑)

如果获取成功了，那么该节点就放到头结点下，并把之前那个头结点next=null

```java
final boolean acquireQueued(final Node node, int arg) {
  // 标记是否失败，用于 finally 清理
  boolean failed = true;
  try {
    // 记录线程是否被中断过
    boolean interrupted = false;
    // 自旋
    for (;;) {
      final Node p = node.predecessor();
      // 核心判断：前驱是 head 且抢锁成功
      if (p == head && tryAcquire(arg)) {
        // 当前节点成为新 head
        setHead(node);
        // help GC
        p.next = null;
        // 标记成功
        failed = false;
        return interrupted;
      }
      // 抢锁失败，判断是否需要挂起
      if (shouldParkAfterFailedAcquire(p, node) &&
        parkAndCheckInterrupt())
        interrupted = true;
    }
  } finally {
    if (failed)
      cancelAcquire(node);
  }
}
```

但并不是不断自旋空转，如果抢锁失败了，那么会将这个线程挂起, 来避免CPU空转消耗 (双重确认)

- 第一次将前驱节点的 `waitStatus` 设为 `Node.SIGNAL`, 表示我ok了
- 第二次因为 `waitStatus` 设为 `Node.SIGNAL`, 就开始执行 `parkAndCheckInterrupt()`, 挂起
- 只有被打断了，才会 `interrupted = true`

```java
if (shouldParkAfterFailedAcquire(p, node) &&
  parkAndCheckInterrupt())
  interrupted = true;
```

通过 `parkAndCheckInterrupt()` 内部调用的 `LockSupport.park()`，线程会被阻塞挂起

```java
private final boolean parkAndCheckInterrupt() {
  LockSupport.park(this);
  return Thread.interrupted();
}
```

- 挂起操作相当于线程主动告诉操作系统：“我现在拿不到必需的资源，请把我休眠，暂时不要给我分配 CPU 时间片了”

> 如果挂起了，怎么知道什么时候该醒来继续抢锁呢
>
> 在真正执行挂起之前，AQS 会做一套严谨的准备工作

`shouldParkAfterFailedAcquire(p, node)`:

- 当前节点（node）会检查它的前驱节点（p）的状态, 它会强行把前驱节点的 waitStatus 设置为 SIGNAL (-1)
- 这个 SIGNAL 状态本质上就是定了一个闹钟。它告诉前驱节点：“老哥，我在你后面睡着了，你用完锁释放的时候，务必记得叫醒（unpark）我”。
- 只有当这个“闹钟”设置成功后，线程才会安心地调用 parkAndCheckInterrupt() 进入休眠

> 闹钟设置失败情况

`shouldParkAfterFailedAcquire` 返回 false 意味着**现在还不能挂起，你得再去外层循环重试一次**

具体来说，只有在以下 两种情况 下，它会返回 false：

- 前驱节点被取消了（waitStatus > 0）
  - 在 AQS 中，节点的 waitStatus 大于 0（通常是 1，即 CANCELLED 状态），意味着排在当前线程前面的那个线程因为超时或被中断，已经放弃抢锁了
  - AQS 的动作： 既然前面的兄弟已经放弃了，当前节点就不能指望它来叫醒自己。于是，AQS 会执行一段类似于链表删除的操作：不断向前找，跳过所有被取消的节点，直到找到一个状态正常的节点，并排在它后面
- 前驱节点状态正常，但还没设置“闹钟”（waitStatus <= 0 且不等于 -1）
  - 虽然闹钟设置成功了，但 AQS 的设计理念非常“勤奋”且谨慎。它认为：“在我设置闹钟的这段极短的时间里，占用锁的线程说不定刚好把锁释放了。所以，为了极致的性能，我在真正躺下挂起之前，必须再最后去确认一次能不能抢到锁。” 因此它返回 false，让代码回到外层 for (;;) 循环，再执行一次 tryAcquire

```java
private static boolean shouldParkAfterFailedAcquire(Node pred, Node node) {
  int ws = pred.waitStatus;
  if (ws == Node.SIGNAL)
    /*
      * This node has already set status asking a release
      * to signal it, so it can safely park.
      */
    return true;
  if (ws > 0) {
    /*
      * Predecessor was cancelled. Skip over predecessors and
      * indicate retry.
      */
    do {
        node.prev = pred = pred.prev;
    } while (pred.waitStatus > 0);
    pred.next = node;
  } else {
    /*
    * waitStatus must be 0 or PROPAGATE.  Indicate that we
    * need a signal, but don't park yet.  Caller will need to
    * retry to make sure it cannot acquire before parking.
    */
    compareAndSetWaitStatus(pred, ws, Node.SIGNAL);
  }
  return false;
}
```

需要重复两遍操作才可以被挂起

> 被打断的情况

- 线程在 parkAndCheckInterrupt() 中被 LockSupport.park() 挂起休眠。
- 其他线程调用了该线程的 interrupt() 方法。
- 重点： 处于 park 状态的线程一旦被打断，会立刻醒来（不再休眠）。
- 醒来后，parkAndCheckInterrupt() 会检查到自己被打断了，并返回 true。
- 代码执行 interrupted = true;，仅仅是在一个小本本上记下“我曾经被打断过”。
- 然后呢？它会继续回到 for (;;) 死循环中，继续尝试抢锁或者再次休眠！它绝不会抛出异常放弃排队。
- 直到最后它终于抢到了锁，它才会把这个 interrupted 状态返回给上层，上层会调用 selfInterrupt() 补发一个中断信号，让业务代码自己去决定怎么处理这个打断

### unlock() 分析

ReentrantLock 对象使用 `unlock()` 方法时，本质是调用其内部的属性 `sync` 执行 `release`

```java
// ReentrantLock.java
public void unlock() {
  sync.release(1);
}
```

`release()` 直接由 AQS 实现

```java
@ReservedStackAccess
public final boolean release(int arg) {
  if (tryRelease(arg)) {
    Node h = head;
    if (h != null && h.waitStatus != 0)
        unparkSuccessor(h);
    return true;
  }
  return false;
}
```

#### `tryRelease()`

> 在 AQS 的 release 中，同样的 `tryRelease()` 方法是交给子类实现的

在 `ReentrantLock` 中统一给 `Sync` 直接实现

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

#### 唤醒节点

```java
@ReservedStackAccess
public final boolean release(int arg) {
  if (tryRelease(arg)) {
    Node h = head;
    if (h != null && h.waitStatus != 0)
        unparkSuccessor(h);
    return true;
  }
  return false;
}
```

成功释放了锁之后，就会开始去唤醒第一个等待节点 `unparkSuccessor(h);`

通常就是直接唤醒 `head.next`，但如果这个节点是 null 或者被取消了，那就要找另一个最新的等待节点

此时需要采用从尾部寻找，然后唤醒

> 因为加入节点是尾插，会改变next节点，且不是原子性
>
> 存在这么一种可能，在当前队列中，你刚好把一个节点变成尾节点，但是还没来得及将上一个的尾节点指向它 t.next = node;, 然后此时又刚好持有锁的线程在找唤醒节点，就有可能漏掉

```java
private void unparkSuccessor(Node node) {
  /*
  * If status is negative (i.e., possibly needing signal) try
  * to clear in anticipation of signalling.  It is OK if this
  * fails or if status is changed by waiting thread.
  */
  int ws = node.waitStatus;
  if (ws < 0)
    compareAndSetWaitStatus(node, ws, 0);

  /*
  * Thread to unpark is held in successor, which is normally
  * just the next node.  But if cancelled or apparently null,
  * traverse backwards from tail to find the actual
  * non-cancelled successor.
  */
  Node s = node.next;
  if (s == null || s.waitStatus > 0) {
    s = null;
    for (Node t = tail; t != null && t != node; t = t.prev)
      if (t.waitStatus <= 0)
          s = t;
  }
  if (s != null)
    LockSupport.unpark(s.thread);
}
```
