---
title: JUC 八股4 - 基础4
date: 2026-03-23
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

## JUC

### 线程通信方式

线程之间传递信息的方式有多种，比如说使用 volatile 和 synchronized 关键字共享对象、使用 wait() 和 notify() 方法实现生产者-消费者模式、使用 Exchanger 进行数据交换、使用 Condition 实现线程间的协调等

| 方式 | 说明 |
| --- | --- |
| **共享变量** | 通过 `volatile`、`synchronized` 保证可见性 |
| **等待/通知** | `wait()` / `notify()` |
| **阻塞队列** | `BlockingQueue` |
| **管道** | `PipedInputStream` / `PipedOutputStream` |
| **并发工具** | `CountDownLatch`、`CyclicBarrier` 等 |

#### volatile 和 synchronized

| 特性 | `volatile` | `synchronized` |
| --- | --- | --- |
| **可见性** | ✓ 保证 | ✓ 保证 |
| **有序性** | ✓ 保证 | ✓ 保证 |
| **原子性** | ✗ 不保证 | ✓ 保证 |

多个线程可以通过 volatile 和 synchronized 关键字访问和修改同一个对象，从而实现信息的传递

- 关键字 volatile 可以用来修饰成员变量，告知程序任何对该变量的访问均需要从共享内存中获取，并同步刷新回共享内存，保证所有线程对变量访问的可见性
- 关键字 synchronized 可以修饰方法，或者同步代码块，确保多个线程在同一个时刻只有一个线程在执行方法或代码块

| 场景 | 推荐方案 |
| --- | --- |
| 状态标志位 | `volatile` |
| 单次发布对象 | `volatile` |
| `count++` | `synchronized` 或 `AtomicInteger` |
| 检查后执行 | `synchronized` |
| 对象安全发布 | `volatile` 或 `synchronized` |

- 只要求可见性 → volatile 就够了
- 要求原子性 → 必须 synchronized 或原子类
- 复合操作 → 必须 synchronized

#### wait 和 notify

一个线程调用共享对象的 wait() 方法时，它会进入该对象的等待池，释放已经持有的锁，进入等待状态

一个线程调用 notify() 方法时，它会唤醒在该对象等待池中等待的一个线程，使其进入锁池，等待获取锁

Condition 也提供了类似的方法，await() 负责阻塞、signal() 和 signalAll() 负责通知。

通常与锁 ReentrantLock 一起使用，为线程提供了一种等待某个条件成真的机制，并允许其他线程在该条件变化时通知等待线程

#### Exchanger

Exchanger 是一个同步点，可以在两个线程之间交换数据。一个线程调用 exchange() 方法，将数据传递给另一个线程，同时接收另一个线程的数据。

```java
class Main {
    public static void main(String[] args) {
        Exchanger<String> exchanger = new Exchanger<>();

        Thread thread1 = new Thread(() -> {
            try {
                String message = "Message from thread1";
                String response = exchanger.exchange(message);
                System.out.println("Thread1 received: " + response);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        Thread thread2 = new Thread(() -> {
            try {
                String message = "Message from thread2";
                String response = exchanger.exchange(message);
                System.out.println("Thread2 received: " + response);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        thread1.start();
        thread2.start();
    }
}
```

#### CompletableFuture

CompletableFuture 是 Java 8 引入的一个类，支持异步编程，允许线程在完成计算后将结果传递给其他线程

```java
class Main {
    public static void main(String[] args) {
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            // 模拟长时间计算
            return "Message from CompletableFuture";
        });

        future.thenAccept(message -> {
            System.out.println("Received: " + message);
        });
    }
}
```
