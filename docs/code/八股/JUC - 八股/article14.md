---
title: JUC 八股14 - 锁5(ReentrantLock)
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

### Condition 分析

Condition类实际上就是用于代替传统对象的wait/notify操作的，同样可以实现等待/通知模式，并且同一把锁下可以创建多个Condition对象

**Condition** 是一个接口，用于替代传统的 `Object.wait()` 和 `Object.notify()`，与 `Lock`（如 `ReentrantLock`）配合使用，实现线程间的等待与唤醒机制。

如果说 `Lock` 是为了解决**互斥**问题，那么 `Condition` 就是为了解决线程间的**通信与同步**问题

#### 面试总结

> 请描述一下 Condition 的 await 和 signal 是怎么工作的？

Condition 依赖于 AQS。它内部维护了一个单向的等待队列。
当线程调用 await() 时，会把自己加入等待队列，释放持有的锁，并挂起自己。
当其他线程调用 signal() 时，会将等待队列头部的节点转移到 AQS 的同步队列尾部，让它重新参与锁的竞争。当它在同步队列中排到队并再次获取锁后，await() 才会返回。

#### 1. 核心概念：为什么需要 Condition？

在没有 `Condition` 之前，我们使用 `synchronized` 配合 `Object` 的监视器方法。但它有一个致命的缺点：**一个锁对象只能有一个等待队列**。

当多个线程因为不同的条件在同一个锁上等待时，`notifyAll()` 会唤醒所有线程，导致大量的“无效竞争”和“上下文切换”。

**Condition 的优势：**

- **多等待队列**：一个 `Lock` 可以创建多个 `Condition` 实例。例如，在阻塞队列中，可以定义 `notFull`（不满）和 `notEmpty`（空）两个条件，生产者只唤醒消费者，消费者只唤醒生产者。
- **响应中断**：支持不可中断、可中断及超时的等待。
- **更灵活**：支持多个等待集，逻辑更清晰。

---

#### 2. 常用方法对比

`Condition` 的操作与 `Object` 方法一一对应，但语义更丰富：

| **Condition 方法** | **对应 Object 方法** | **说明** |
| --- | --- | --- |
| **`await()`** | `wait()` | 当前线程释放锁并进入等待状态，直到被唤醒或中断。 |
| **`signal()`** | `notify()` | 唤醒一个等待在该 Condition 上的线程。 |
| **`signalAll()`** | `notifyAll()` | 唤醒所有等待在该 Condition 上的线程。 |
| **`awaitNanos(long)`** | 无直接对应 | 等待指定纳米数，超时自动唤醒。 |
| **`awaitUninterruptibly()`** | 无 | 等待过程中不响应中断。 |

---

#### 3. 实现原理

`Condition` 的具体实现通常是 `ReentrantLock` 的内部类 **`ConditionObject`**。它维护了一个**单向链表（等待队列）**。

1. **等待 (await)**：
    - 当前线程获取锁后，调用 `await()`。
    - 将当前线程封装成 Node，放入 `Condition` 的**等待队列**。
    - 释放锁，并唤醒 AQS **同步队列**中的后继节点。
    - 线程挂起。
2. **唤醒 (signal)**：
    - 其他线程调用 `signal()`。
    - 将 `Condition` 等待队列中首位的 Node 转移到 AQS 的**同步队列**中。
    - 该节点开始竞争锁，获取成功后从 `await()` 处返回。

---

#### 4. 经典代码示例：生产者-消费者

这是 `Condition` 最典型的应用场景。通过两个条件变量，精准控制线程唤醒。

```Java
public class BoundBuffer {
  private final Lock lock = new ReentrantLock();
  // 定义两个条件：队列不满、队列不空
  private final Condition notFull  = lock.newCondition(); 
  private final Condition notEmpty = lock.newCondition(); 

  private final Object[] items = new Object[100];
  private int putptr, takeptr, count;

  // 生产者调用
  public void put(Object x) throws InterruptedException {
      lock.lock();
      try {
          while (count == items.length) 
              notFull.await(); // 队列满了，生产者等待“不满”的信号
          items[putptr] = x;
          if (++putptr == items.length) putptr = 0;
          ++count;
          notEmpty.signal(); // 生产了东西，唤醒消费者
      } finally {
          lock.unlock();
      }
  }

  // 消费者调用
  public Object take() throws InterruptedException {
      lock.lock();
      try {
          while (count == 0) 
              notEmpty.await(); // 队列空了，消费者等待“不空”的信号
          Object x = items[takeptr];
          if (++takeptr == items.length) takeptr = 0;
          --count;
          notFull.signal(); // 消费了东西，唤醒生产者
          return x;
      } finally {
          lock.unlock();
      }
  }
}
```

#### 5. 使用注意事项

- **必须在锁内使用**：调用 `await()` 或 `signal()` 必须先获得关联的 `Lock`，否则抛出 `IllegalMonitorStateException`。
- **使用 while 而非 if**：为了防止“虚假唤醒”（Spurious Wakeup），必须在循环中检查条件。

### await 源码执行流程

在 AQS 中，有两种队列同时存在：

- **同步队列（Sync Queue）**：AQS 本身维护的**双向链表**。存放的是**竞争锁失败**的线程。
- **等待队列（Wait Queue）**：`ConditionObject` 内部维护的**单向链表**。存放的是获取了锁，但因为**条件不满足而主动挂起**的线程。

当一个线程调用 condition.await() 时，它必然已经拿到了锁。这时的主要目标是：释放锁、进入等待队列、挂起自己

- **`addConditionWaiter()` 加入等待队列**：
将当前线程包装成一个 `Node`（状态为 `CONDITION`），并插入到 `Condition` 等待队列的尾部。
- **`fullyRelease(node)` 完全释放锁**：
因为锁可能是可重入的（`ReentrantLock`），所以当前线程可能加了多次锁（`state > 1`）。`fullyRelease` 会将 `state` 一次性清零，释放锁，并**唤醒同步队列中的下一个等待线程**去竞争锁。同时记录下释放前的 `state` 值（为了以后恢复）。
- **`isOnSyncQueue(node)` 阻塞与判断**：
进入一个 `while` 循环，判断当前节点是否已经被转移到了**同步队列**中。
  - 如果没有：调用 `LockSupport.park(this)` 将自己**挂起**（阻塞）。
  - 如果已经被转移了（说明被其他线程 `signal` 唤醒了）：跳出循环。
- **`acquireQueued(node, savedState)` 重新竞争锁**：
线程被唤醒并跳出 `while` 循环后，说明它已经回到了**同步队列**。此时调用 AQS 的标准抢锁方法 `acquireQueued`，带着之前保存的 `state` 值去重新竞争锁。竞争成功后，`await()` 方法才真正返回。

### signal 源码拆解

当另一个线程调用 `condition.signal()` 时，它的目标不是立刻唤醒线程让它跑，而是**把等待队列中的节点转移到同步队列中去抢锁**。

核心源码步骤如下：

1. **`isHeldExclusively()` 校验锁状态**：
首先检查调用 `signal()` 的线程是否持有当前的排他锁。如果没有，直接抛出 `IllegalMonitorStateException`。
2. **`doSignal(first)` 转移头节点**：
从等待队列的头部（`firstWaiter`）取下第一个节点，准备转移。
3. **`transferForSignal(node)` 执行转移**：
    - 利用 CAS 将节点的状态从 `CONDITION` 修改为 `0`（初始状态）。
    - 调用 AQS 的 **`enq(node)`** 方法，将该节点尾插到**同步队列**中。
    - *注意：此时被转移的线程大多仍然是挂起状态（parked），它只是换了个队列排队而已。*
    - 如果同步队列的前驱节点被取消，或者设置前驱节点状态为 `SIGNAL` 失败，才会作为兜底调用 `LockSupport.unpark()` 真正唤醒该线程。正常情况下，它会等着同步队列前面的节点释放锁时来唤醒它。

*(注：`signalAll()` 的逻辑基本相同，只不过是一个循环，把等待队列里的所有节点全部 `enq` 到同步队列中。)*
