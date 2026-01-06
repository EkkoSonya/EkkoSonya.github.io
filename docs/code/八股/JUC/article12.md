---
title: JUC12 - 并发工具类
date: 2026-01-06
category:
  - code
tag:
  - java
  - juc
# star: true
# sticky: true
order: -0.5
---

## 并发工具类

### 计数器锁 CountDownLatch

多任务同步神器。它允许一个或多个线程，等待其他线程完成再工作

比如现在我们有这样的一个需求：

- 有20个计算任务，我们需要先将这些任务的结果全部计算出来，每个任务的执行时间未知
- 当所有任务结束之后，立即整合统计最终结果

要实现这个需求，那么有一个很麻烦的地方，我们不知道任务到底什么时候执行完毕，那么可否将最终统计延迟一定时间进行呢？

但是最终统计无论延迟多久进行，要么不能保证所有任务都完成，要么可能所有任务都完成了而这里还在等。

所以说，我们需要一个能够实现子任务同步的工具。

```java
public static void main(String[] args) throws InterruptedException {
    // 创建一个初始值为20的计数器锁
    // 也就是初始化时就直接锁了20次
    CountDownLatch latch = new CountDownLatch(20);  
    for (int i = 0; i < 20; i++) {
        int finalI = i;
        new Thread(() -> {
            try {
                Thread.sleep((long) (2000 * new Random().nextDouble()));
                System.out.println("子任务"+ finalI +"执行完成！");
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            latch.countDown();   
            // 每执行一次计数器都会-1
            // 相当于解一次锁
        }).start();
    }

    // 开始等待所有的线程完成，当计数器为0时，恢复运行
    // 显然只有锁被解锁了，才能获取(共享锁)
    // 这个操作可以同时被多个线程执行，一起等待，这里只演示了一个
    latch.await();
    System.out.println("所有子任务都完成！任务完成！！！");
  
    // 注意这个计数器只能使用一次，用完只能重新创一个，没有重置的说法
}
```

我们在调用`await()`方法之后，实际上就是一个等待计数器衰减为0的过程，而进行自减操作则由各个子线程来完成，当子线程完成工作后，那么就将计数器-1，所有的子线程完成之后，计数器为0，结束等待。

#### 实现原理

传播机制

实现原理非常简单：

```java
public class CountDownLatch {
    // 同样是通过内部类实现AbstractQueuedSynchronizer
    private static final class Sync extends AbstractQueuedSynchronizer {
        
        Sync(int count) {   
            // 这里直接使用AQS的state作为计数器
            // 也就是说一开始就加了count把共享锁
            // 当线程调用countdown时，就解一层锁
            setState(count);
        }

        int getCount() {
            return getState();
        }

        // 采用共享锁机制，因为可以被不同的线程countdown (解锁)
        // 所以实现的tryAcquireShared和tryReleaseShared
        // 获取这把共享锁其实就是去等待state被其他线程减到0
        protected int tryAcquireShared(int acquires) {
            return (getState() == 0) ? 1 : -1;
        }

        // 释放共享锁的逻辑
        protected boolean tryReleaseShared(int releases) {
            // 每次执行都会将state值-1，直到为0
            for (;;) {
                int c = getState();

                // 如果已经是0了，那就false
                if (c == 0)
                    return false;
                int nextc = c-1;

                // CAS设置state值，失败直接下一轮循环
                if (compareAndSetState(c, nextc))
                    return nextc == 0;    
                    // 返回c-1之后
                    // 判断是不是0，如果是那就true，否则false
                    // 也就是说只有刚好减到0的时候才会返回true
            }
        }
    }

    private final Sync sync;

    public CountDownLatch(int count) {
        if (count < 0) throw new IllegalArgumentException("count < 0");  
        // count那肯定不能小于0啊
        this.sync = new Sync(count);   
        // 构造Sync对象，将count作为state初始值
    }

    // 通过acquireSharedInterruptibly方法获取共享锁
    // 但是如果state不为0，那么会被持续阻塞，详细原理下面讲
    public void await() throws InterruptedException {
        sync.acquireSharedInterruptibly(1);
    }

    // 同上，但是会超时
    public boolean await(long timeout, TimeUnit unit)
        throws InterruptedException {
        return sync.tryAcquireSharedNanos(1, unit.toNanos(timeout));
    }

    // countDown其实就是解锁一次
    public void countDown() {
        sync.releaseShared(1);
    }

    // 获取当前的计数，也就是AQS中state的值
    public long getCount() {
        return sync.getCount();
    }

    public String toString() {
        return super.toString() + "[Count = " + sync.getCount() + "]";
    }
}
```

##### 主要流程

在深入讲解之前，我们先大致了解一下CountDownLatch的基本实现思路：

- 利用共享锁实现

- 在一开始的时候就是已经上了count层锁的状态，也就是`state = count`

- `await()`就是(加)获取共享锁，但是必须`state`为`0`才能(加)获取锁成功，否则按照AQS的机制，会进入等待队列阻塞，(加)获取锁成功后结束阻塞

- `countDown()`就是解`1`层锁，也就是靠这个方法一点一点把`state`的值减到`0`

因为他只有在初始化的时候才会给 `state` 赋值，而加锁时并不会改变 `state`，所以不影响，当 `state` 减为0时，就其他`await`的线程就同时都可以获取到计数器锁

也因此它只能用一次，因为减到0了就没有任何手段给他恢复回去

##### `CountDownLatch`解锁过程

本质是共享锁（Shared Lock），也叫 S 锁 或 读锁

也就是你可以修改锁n次，直到`state`变为0了，那么修改不了了，就会通知

当特定任务线程结束，就用一次 `latch.countDown()` 表示当前自己的任务结束，那么默认是尝试去给 `sync` 的 `state` 减1

首先在 `CountDownLatch` 类的 `countDown` 方法：

```java
public void countDown() {
    sync.releaseShared(1);
}
```

对应 `sync` 本质继承的是 `AQS`，对应的 `releaseShared` 方法

```java
public final boolean releaseShared(int arg) {
    if (tryReleaseShared(arg)) {   
        // 直接尝试释放锁，如果成功返回true
        // 在CountDownLatch中只有state减到0的那一次，会返回true
        
        // 如果此时刚好是state释放完==0
        // 那么有必要调用 doReleaseShared 来通知和唤醒等待队列后面的结点
        doReleaseShared();
        return true;
    }
    // 其他情况false
    // 但也是将state减1 
    return false;   
    // 不过这里countdown并没有用到这些返回值
}
```

对应的 `tryReleaseShared` 方法需要`sync`自己实现，来尝试释放锁的逻辑

```java
protected boolean tryReleaseShared(int releases) {
    // Decrement count; signal when transition to zero
    for (;;) {
        int c = getState();
        if (c == 0)
            return false;
        int nextc = c-1;
        // 通过 unsafe 直接修改内存对应的 state 值
        // 先比较是否值 == c
        // 然后再修改为 nextc
        if (compareAndSetState(c, nextc))
            return nextc == 0;
    }
}
```

唤醒节点：

```java
private void doReleaseShared() {
    for (;;) {   
        // 无限循环
        // 获取头结点
        Node h = head;
        // 如果头结点不为空且头结点不是尾结点
        // 那么说明等待队列中存在节点
        if (h != null && h != tail) {
            // 取一下头结点的等待状态    
            int ws = h.waitStatus;
            
            if (ws == Node.SIGNAL) {    
                // 如果是SIGNAL, 表示其后继节点是等待状态
                // 那么就CAS将头结点的状态设定为初始值
                if (!compareAndSetWaitStatus(h, Node.SIGNAL, 0))
                    continue;            // 失败就开下一轮循环重来
                
                unparkSuccessor(h);
                // 和独占模式一样
                // 当锁被释放 都会唤醒头结点的后继节点
                // doAcquireShared循环继续
                // 如果成功，那么根据setHeadAndPropagate，又会继续调用当前方法，不断地传播下去，让后面的线程一个一个地获取到共享锁，直到不能再继续获取为止
            }
            // 如果等待状态是默认值0，那么说明后继节点已经被唤醒
            // 直接将状态设定为PROPAGATE，它代表在后续获取资源的时候，可以向后面传播
            else if (ws == 0 &&
                     !compareAndSetWaitStatus(h, 0, Node.PROPAGATE))
                continue;                //失败就开下一轮循环重来
        }
        if (h == head)                   
            // 如果头结点发生了变化，不会break，而是继续循环
            // 否则直接break退出
            break;
    }
}
```

##### `await`获取锁过程

设置了一个计数器锁后，可以在别的线程通过 `latch.await()` 来等待锁结束，也就是 `state == 0`

对应的首先在 `CountDownLatch`类中的实现方法

```java
public void await() throws InterruptedException {
    sync.acquireSharedInterruptibly(1);
}
```

进一步，同样是父类`AQS`定义的解锁方法

```java
// 可以被打断地获取锁
public final void acquireSharedInterruptibly(int arg) 
    throws InterruptedException {
    if (Thread.interrupted())
        throw new InterruptedException();
    // 上来就调用tryAcquireShared尝试以共享模式获取锁，小于0则失败
    // 判断的是state==0返回1，否则-1，也就是说如果计数器不为0，那么这里会判断成功
    if (tryAcquireShared(arg) < 0)
        // 因为计数器不为0 说明还没释放锁 就可以等了
        // 就尝试获取锁
        // 对应这个线程被阻塞了
        doAcquireSharedInterruptibly(arg);
}
```

`tryAcquireShared(arg)` 是尝试获取锁，是`AQS`交给我们来自定义的，对应的 `sync`

```java
protected int tryAcquireShared(int acquires) {
    return (getState() == 0) ? 1 : -1;
}
```

表明显然只有 `state == 0` 才能获取锁

接着就是 `AQS` 实现的共享锁获取

```java
private void doAcquireSharedInterruptibly(int arg)
    throws InterruptedException {
    // 向等待队列中添加一个新的共享模式结点
    final Node node = addWaiter(Node.SHARED);
    boolean failed = true;

    // 无限循环 尝试获取锁
    try {
        for (;;) {
            // 获取当前节点的前驱的结点
            final Node p = node.predecessor();
            // 如果p就是头结点，那么说明当前结点就是第一个等待节点
            if (p == head) {
                // 那么会再次尝试获取共享锁
                int r = tryAcquireShared(arg);
                if (r >= 0) {
                    // 要是获取成功
                    // 那么就将当前节点设定为新的头结点，并且会继续唤醒后继节点
                    setHeadAndPropagate(node, r);
                    p.next = null; // help GC
                    failed = false;
                    return;
                }
            }
            // 和独占模式下一样的操作
            if (shouldParkAfterFailedAcquire(p, node) &&
                parkAndCheckInterrupt())
                throw new InterruptedException();
        }
    } finally {
        // 如果最后都还是没获取到，那么就cancel
        if (failed)
            cancelAcquire(node);
    }
}
```

对应的出队以及唤醒后面节点的操作：

```java
private void setHeadAndPropagate(Node node, int propagate) {
    // 取出头结点并将当前节点设定为新的头结点
    Node h = head;
    setHead(node);
    
    // 因为一个线程成功获取到共享锁之后
    // 有可能剩下的等待中的节点也有机会拿到共享锁

    // 如果propagate大于0（表示共享锁还能继续获取）
    // 或是h.waitStatus < 0，这是由于在其他线程释放共享锁
    // doReleaseShared会将状态设定为PROPAGATE表示可以传播唤醒
    if (propagate > 0 || h == null || h.waitStatus < 0 ||
        (h = head) == null || h.waitStatus < 0) {   
        Node s = node.next;
        if (s == null || s.isShared())
            // 通过 doReleaseShared 继续唤醒下一个等待节点
            doReleaseShared();
    }
}
```

#### 分析

当最后一个工作线程结束了，然后调用了 `latch.countDown()` 对应 `state == 0` 返回 `true`，则这个工作线程的 `countDown` 不会立即结束，而是进一步去 `doReleaseShared` 需要尝试唤醒等待队列的线程的第一个节点

而另一边，一些线程在等这些工作线程结束而阻塞 `await`，正一直排队等待，当最后一个工作线程结束，从而唤醒了队列里的第一个线程节点，然后它也开始获取锁，也尝试唤醒下一个，直到所有的线程都唤醒，才会结束

这种方式利用了多核 CPU 的优势。由于每个线程醒来后都会帮着唤醒下一个，整个队列会以极快的速度清空

#### 总结

可能看完之后还是有点乱，我们再来理一下：

- 共享锁是线程共享的，同一时刻能有多个线程拥有共享锁。

- 如果一个线程刚获取了共享锁，那么在其之后等待的线程也很有可能能够获取到锁，所以得传播下去继续尝试唤醒后面的结点，不像独占锁，独占的压根不需要考虑这些。

- 如果一个线程刚释放了锁，不管是独占锁还是共享锁，都需要唤醒后续等待结点的线程。

### 循环屏障 CyclicBarrier

只有线程数量达到指定数量时，就会统一一起运行，且可以服用，但如果等待时某个线程中断，则不能再加线程，会抛出异常，需要 `reset` 后重新开始

好比一场游戏，我们必须等待房间内人数足够之后才能开始，并且游戏开始之后玩家需要同时进入游戏以保证公平性。

假如现在游戏房间内一共5人，但是游戏开始需要10人，所以我们必须等待剩下5人到来之后才能开始游戏，并且保证游戏开始时所有玩家都是同时进入，那么怎么实现这个功能呢？

我们可以使用`CyclicBarrier`，翻译过来就是循环屏障，那么这个屏障正式为了解决这个问题而出现的。

#### 示例

```java
public static void main(String[] args) {
    // 创建一个初始值为10的循环屏障
    CyclicBarrier barrier = new CyclicBarrier(10,
                () -> System.out.println("begin!"));
    
    // 人等够之后执行的任务
    for (int i = 0; i < 10; i++) {
        int finalI = i;
        new Thread(() -> {
            try {
                Thread.sleep((long) (2000 * new Random().nextDouble()));
                System.out.println("线程 "+ finalI +" 进行等待... ("+barrier.getNumberWaiting()+"/10)");

                // 调用await方法进行等待，直到等待的线程足够多为止
                barrier.await();

                //开始游戏，所有玩家一起进入游戏
                System.out.println("线程 "+ finalI +"工作");
            } catch (InterruptedException | BrokenBarrierException e) {
                e.printStackTrace();
            }
        }).start();
    }
}
```

可以看到，循环屏障会不断阻挡线程，直到被阻挡的线程足够多时，才能一起冲破屏障，并且在冲破屏障时，我们也可以做一些其他的任务。

##### 可循环

当然，屏障由于是可循环的，所以它在被冲破后，会重新开始计数，继续阻挡后续的线程：

```java
public static void main(String[] args) {
    // 创建一个初始值为5的循环屏障
    CyclicBarrier barrier = new CyclicBarrier(5);
    for (int i = 0; i < 10; i++) {   
        int finalI = i;
        new Thread(() -> {
            try {
                Thread.sleep((long) (2000 * new Random().nextDouble()));
                System.out.println("线程 "+ finalI +" 进行等待... ("+barrier.getNumberWaiting()+"/5)");

                barrier.await();    
                // 调用await方法进行等待，直到等待线程到达5才会一起继续执行

                System.out.println("线程 "+ finalI +" 开始工作");
            } catch (InterruptedException | BrokenBarrierException e) {
                e.printStackTrace();
            }
        }).start();
    }
}
```

可以看到，通过使用循环屏障，我们可以对线程进行一波一波地放行，每一波都放行5个线程

##### 手动重置计数

当然除了自动重置之外，我们也可以调用`reset()`方法来手动进行重置操作，同样会重新计数：

```java
public static void main(String[] args) throws InterruptedException {
    CyclicBarrier barrier = new CyclicBarrier(5);  
    // 创建一个初始值为10的计数器锁

    for (int i = 0; i < 3; i++)
        new Thread(() -> {
            try {
                barrier.await();
            } catch (InterruptedException | BrokenBarrierException e) {
                e.printStackTrace();
            }
        }).start();

    Thread.sleep(500);   // 等一下上面的线程开始运行
    System.out.println("当前屏障前的等待线程数："+barrier.getNumberWaiting());

    barrier.reset();
    System.out.println("重置后屏障前的等待线程数："+barrier.getNumberWaiting());
}
```

可以看到，在调用`reset()`之后，处于等待状态下的线程，全部被中断并且抛出`BrokenBarrierException`异常，循环屏障等待线程数归零。

##### 等待线程被中断情况

那么要是处于等待状态下的线程被中断了呢？屏障的线程等待数量会不会自动减少？

```java
public static void main(String[] args) throws InterruptedException {
    CyclicBarrier barrier = new CyclicBarrier(10);
    Runnable r = () -> {
        try {
            barrier.await();
        } catch (InterruptedException | BrokenBarrierException e) {
            e.printStackTrace();
        }
    };
    Thread t = new Thread(r);
    t.start();
    t.interrupt();
    new Thread(r).start();
}
```

可以看到，当`await()`状态下的线程被中断，那么屏障会直接变成损坏状态，一旦屏障损坏，那么这一轮就无法再做任何等待操作了，只能进行`reset()`重置操作进行重置才能恢复正常。

#### 区分

感觉和前面的`CountDownLatch`有点像, 不同之处：

- `CountDownLatch`
  1. 它只能使用一次，是一个一次性的工具
  2. 它是一个或多个线程用于等待其他线程完成的同步工具

- `CyclicBarrier`
  1. 它可以反复使用，允许自动或手动重置计数
  2. 它是让一定数量的线程在同一时间开始运行的同步工具

#### 源码分析

我们接着来看循环屏障的实现细节：

```java
public class CyclicBarrier {
    // 内部类，存放broken标记，表示屏障是否损坏，损坏的屏障是无法正常工作的
    // 每一轮都会生成新的Generation，表示是新的一轮
    private static class Generation {
        boolean broken = false;
    }

    /** 内部维护一个可重入锁 */
    private final ReentrantLock lock = new ReentrantLock();
    /** 再维护一个Condition */
    private final Condition trip = lock.newCondition();
    /** 这个就是屏障的最大阻挡容量，就是构造方法传入的初始值 */
    private final int parties;
    /* 在屏障破裂时做的事情 */
    private final Runnable barrierCommand;
    /** 当前这一轮的Generation对象，每一轮都有一个新的，用于保存broken标记 */
    private Generation generation = new Generation();

    // 默认为最大阻挡容量，每来一个线程-1，和CountDownLatch挺像
    // 当屏障破裂或是被重置时，都会将其重置为最大阻挡容量
    private int count;

   // 构造方法
   public CyclicBarrier(int parties, Runnable barrierAction) {
        if (parties <= 0) throw new IllegalArgumentException();
        this.parties = parties;
        this.count = parties;
        this.barrierCommand = barrierAction;
    }
  
    public CyclicBarrier(int parties) {
        this(parties, null);
    }
  
    // 开启下一轮屏障，一般屏障被冲破之后，就自动重置了，进入到下一轮
    // 会在这里唤醒所有在 trip 条件队列里的线程
    private void nextGeneration() {
        // 唤醒所有等待状态的线程
        trip.signalAll();
        // 重置count的值
        count = parties;
        // 创建新的Generation对象
        generation = new Generation();
    }

    // 破坏当前屏障，变为损坏状态，之后就不能再使用了，除非重置
    private void breakBarrier() {
        generation.broken = true;
        count = parties;
        // 这里也会唤醒所有线程
        trip.signalAll();
    }
  
   // 开始等待
   public int await() throws InterruptedException, BrokenBarrierException {
        try {
            return dowait(false, 0L);
        } catch (TimeoutException toe) {
            throw new Error(toe); 
            // 因为这里没有使用定时机制，不可能发生异常，如果发生怕是出了错误
        }
    }
    
   // 可超时的等待
    public int await(long timeout, TimeUnit unit)
        throws InterruptedException,
               BrokenBarrierException,
               TimeoutException {
        return dowait(true, unit.toNanos(timeout));
    }

    //这里就是真正的等待流程了，让我们细细道来
    private int dowait(boolean timed, long nanos)
        throws InterruptedException, BrokenBarrierException,
               TimeoutException {
        final ReentrantLock lock = this.lock;
        lock.lock();   
        // 加锁，注意，因为多个线程都会调用await方法
        // 因此只有一个线程能进，其他都被卡着了
        try {
            // 获取当前这一轮屏障的Generation对象
            final Generation g = generation;

            // 如果这一轮屏障已经损坏，那就没办法使用了
            if (g.broken)
                throw new BrokenBarrierException();

            if (Thread.interrupted()) {   
                // 如果当前等待状态的线程被中断，那么会直接破坏掉屏障
                // 并抛出中断异常（破坏屏障的第1种情况）
                breakBarrier();
                throw new InterruptedException();
            }

            // 如果上面都没有出现不正常，那么就走正常流程
            // 首先count自减并赋值给index，index表示当前是等待的第几个线程
            int index = --count;
            if (index == 0) {  
                // 如果自减之后就是0了，那么说明来的线程已经足够，可以冲破屏障了
                boolean ranAction = false;
                try {
                    final Runnable command = barrierCommand;
                    if (command != null)
                        command.run();   
                        // 执行冲破屏障后的任务，如果这里抛异常了，那么会进finally
                    ranAction = true;
                    nextGeneration();   
                    // 一切正常，开启下一轮屏障
                    // 方法进入之后会唤醒所有等待的线程，这样所有的线程都可以同时继续运行了
                    // 然后返回0，注意最下面finally中会解锁，不然其他线程唤醒了也拿不到锁啊
                    return 0;
                } finally {
                    if (!ranAction)   
                        // 如果是上面出现异常进来的，那么也会直接破坏屏障（破坏屏障的第2种情况）
                        breakBarrier();
                }
            }

            // 能走到这里，那么说明当前等待的线程数还不够多，不足以冲破屏障
            for (;;) {   
                // 无限循环，一直等，等到能冲破屏障或是出现异常为止
                try {
                    if (!timed)
                        // 如果不是定时的，那么就直接永久等待
                        trip.await();
                    else if (nanos > 0L)
                        // 否则最多等一段时间
                        nanos = trip.awaitNanos(nanos);
                } catch (InterruptedException ie) {    
                    // 等的时候会判断是否被中断（依然是破坏屏障的第1种情况）
                    if (g == generation && ! g.broken) {
                        breakBarrier();
                        throw ie;
                    } else {
                        Thread.currentThread().interrupt();
                    }
                }

                // 到这里 说明线程被唤醒了
                // 如果线程被唤醒之后发现屏障已经被破坏，那么直接抛异常
                if (g.broken)
                    throw new BrokenBarrierException();   

                // 成功冲破屏障开启下一轮，那么直接返回当前是第几个等待的线程。
                if (g != generation)
                    return index;

                if (timed && nanos <= 0L) {   
                    // 线程等待超时，也会破坏屏障（破坏屏障的第3种情况）
                    // 然后抛异常
                    breakBarrier();
                    throw new TimeoutException();
                }
            }
        } finally {
            lock.unlock();    //最后别忘了解锁，不然其他线程拿不到锁
        }
    }

    // 不多说了
    public int getParties() {
        return parties;
    }

    // 判断是否被破坏，也是加锁访问，因为有可能这时有其他线程正在执行dowait
    public boolean isBroken() {
        final ReentrantLock lock = this.lock;
        lock.lock();
        try {
            return generation.broken;
        } finally {
            lock.unlock();
        }
    }

    // 重置操作，也要加锁
    public void reset() {
        final ReentrantLock lock = this.lock;
        lock.lock();
        try {
            breakBarrier();   // 先破坏这一轮的线程，注意这个方法会先破坏再唤醒所有等待的线程，那么所有等待的线程会直接抛BrokenBarrierException异常（详情请看上方dowait倒数第13行）
            nextGeneration(); // 开启下一轮
        } finally {
            lock.unlock();
        }
    }
 
    // 获取等待线程数量，也要加锁
    public int getNumberWaiting() {
        final ReentrantLock lock = this.lock;
        lock.lock();
        try {
            return parties - count;   //最大容量 - 当前剩余容量 = 正在等待线程数
        } finally {
            lock.unlock();
        }
    }
}
```
