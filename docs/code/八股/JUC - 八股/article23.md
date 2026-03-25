---
title: JUC 八股23
date: 2026-03-25
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

## Future类

Future 是为了解决多线程执行任务并获取结果的问题

在传统的同步编程中，我们调用一个方法，必须死死等在这个方法那里，直到它执行完毕返回结果，代码才能继续往下走。

而 Future 代表的是**一个异步计算的结果**。

当你把一个耗时的任务（比如网络请求、复杂计算）扔给线程池（ExecutorService）去后台执行时，线程池会立刻塞给你一张“取餐小票”（也就是一个 Future 对象）。

拿到这张小票后，你的主线程不需要原地死等，可以立刻去干别的活儿。等你需要那个耗时任务的结果时，再拿着这张小票去兑换（调用 get() 方法）

### 核心 API 拆解

| **方法声明** | **核心作用** | **现实生活类比** |
| --- | --- | --- |
| **`get()`** | **获取结果（核心）**。如果任务还没执行完，调用这个方法的线程会被**强行阻塞（挂起）**，直到任务完成才唤醒并返回结果。 | 跑到取餐口等着。如果饭没做好，你就只能傻站在那里死等。 |
| **`get(long, TimeUnit)`** | **超时获取**。最多等一段时间，如果时间到了还没出结果，就抛出 `TimeoutException`，不再死等。 | 在取餐口只等 5 分钟，做不出来我就走人（抛异常）。 |
| **`isDone()`** | **判断任务是否结束**。任务正常完成、抛出异常、被取消，都会返回 `true`。它是一个非阻塞方法。 | 抬头看大屏幕，看看自己的号码有没有变绿（不需要死等）。 |
| **`cancel(boolean)`** | **尝试取消任务**。参数决定是否要给正在执行该任务的线程发送中断信号（Interrupt）。 | 跑去跟后厨说：“这道菜我不要了！” |
| **`isCancelled()`** | **判断任务是否被取消**。如果任务在完成前被成功取消，返回 `true`。 | 看看订单状态是不是“已退单”。 |

### 缺陷

虽然 Future 开启了 Java 的异步时代，但我在回答你时必须坦诚：原生的 Future 其实是一个“半残废”的异步

实际上，它计算的过程是异步的，但获取结果的过程依然是同步阻塞的

当你想要获取结果时，你面临着两难的尴尬境地：

- 直接调用 get()：主线程会被立刻阻塞，原地罚站。这不仅违背了异步非阻塞的初衷，还可能导致主线程假死。

- 用 while(!future.isDone()) 轮询：主线程确实没阻塞，但一直在进行毫无意义的空转，疯狂消耗 CPU 资源（这叫 CPU 忙等待）

所以 java8 引入了 `CompletableFuture`

## `CompletableFuture`

它不仅实现了 Future 接口，还实现了一个极其重要的接口：CompletionStage（完成阶段），这赋予了它强大的流式编排和回调能力

- 旧 Future 的痛点（拉取）：你必须主动调用 get() 去向线程池要结果，哪怕结果没出来，你也得被迫阻塞在那里。
- CompletableFuture 的魔法（推送/回调）：你只需要提前把“任务完成后的下一步动作”编排好。当任务完成时，线程池会主动触发下一步逻辑。你压根不需要调用 get() 去等！

### 基本使用

CompletableFuture 拥有近 50 个方法，但核心套路就这几招，掌握了就能在实际开发中横着走：

#### 第一招：开启异步任务（起步）

不要再用 `new Thread()` 或者老旧的 `submit()` 了，直接用这两个静态方法：

- `CompletableFuture.supplyAsync()`：执行任务，有返回值。（最常用）
- `CompletableFuture.runAsync()`：执行任务，没有返回值。

#### 第二招：链式处理（下一步干嘛）

当上一个任务完成后，把结果无缝传递给下一个任务：

- `thenApply(Function)`：拿到上一步的结果，做个转换/加工，返回一个新的结果。（类似 Stream 的 map）
- `thenAccept(Consumer)`：拿到上一步的结果，纯消费（比如打印、存数据库），没有返回值。
- `thenRun(Runnable)`：不关心上一步的结果，只要上一步执行完了，就继续执行下一段逻辑。

#### 第三招：多任务组合（神仙打架）

这是它碾压传统并发编程的最强杀手锏，轻松解决各种复杂的依赖关系：

- `thenCombine()`：任务 A 和任务 B 同时跑，等它们都完成后，把两者的结果合并起来做下一步。
- `applyToEither()`：任务 A 和任务 B 同时跑，谁先完成就用谁的结果进行下一步（多路备用接口抢答机制）。
- `allOf()`：等待给定的 N 个 CompletableFuture 全部执行完毕。

#### 第四招：优雅的异常兜底

传统的多线程异常处理简直是地狱，而在 `CompletableFuture` 里，极其优雅：

- `exceptionally()`：只有当上面的任务抛出异常时才会触发，相当于 catch，并且可以返回一个默认值进行兜底。
- `handle()`：无论上面成功还是失败都会走到这里，相当于 finally，可以同时拿到正常结果和异常信息进行处理。

### 简单示例

```java
// 假设这是我们自定义的业务线程池
ExecutorService myPool = Executors.newFixedThreadPool(10);

CompletableFuture.supplyAsync(() -> {
    System.out.println("1. 正在去数据库查询用户...");
    return "User123"; 
}, myPool)

.thenApplyAsync(userId -> {
    System.out.println("2. 拿到用户 " + userId + "，正在查询他的订单...");
    // 模拟抛出个异常玩玩
    // if(true) throw new RuntimeException("数据库炸了！");
    return "Order_999"; 
}, myPool)

.thenAcceptAsync(orderId -> {
    System.out.println("3. 拿到订单 " + orderId + "，正在发送邮件...");
}, myPool)

.exceptionally(ex -> {
    System.out.println("⚠️ 发生异常了，执行兜底逻辑: " + ex.getMessage());
    return null; 
});

System.out.println("主线程只管编排完上面的流水线，然后立刻去干别的事了，完全没阻塞！");
```

### 注意点

虽然 CompletableFuture 非常强大，但有一个隐藏的巨坑：如果你在调用 supplyAsync 时没有指定自定义的线程池（就像上面的代码中我传了 myPool），它会默认使用系统自带的 ForkJoinPool.commonPool()。

这个公共线程池的坑非常深，在生产环境稍微有一点阻塞任务，就会导致整个应用的其他异步任务全军覆没
