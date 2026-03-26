---
title: Java面试题 - java基础9 (lambda闭包)
date: 2026-3-15
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.5
---

## Java 基础

### 我在主线程创建了一个锁对象，然后对应的子线程为什么可以得到这个锁

在主线程中通过 new 关键字（例如 new Object() 或 new ReentrantLock()）创建一个锁对象时，这个对象是被分配在 JVM 的**堆（Heap）**内存中的

在 Java 内存模型中，每个线程有自己私有的虚拟机栈（用于存储局部变量表、方法出口等），但堆内存是所有线程共享的。只要子线程能够拿到这个对象的内存地址（引用），它就可以访问这个对象。

#### 传递的是对象引用

当主线程启动子线程时，通常会将这个锁对象的引用（相当于这把锁在堆内存中的真实地址）通过某种方式传递给子线程：

- 作为参数传递： 通过构造函数传给 Runnable 或 Thread 类。
- 匿名内部类/Lambda **闭包捕获**： 子线程的代码块直接引用了外部主线程的局部变量（该变量通常需要是 final 或事实上的 final）。
- 共享变量： 锁对象被定义为类的成员变量或静态变量，子线程直接访问该属性

#### 锁状态绑定在“对象”上，而不是“创建它的线程”上

锁机制（无论是 synchronized 还是 JUC 包下的 Lock）认的是“对象”，而不是“谁创建了对象”。

- 对于 synchronized： 锁的信息（如持有该锁的线程 ID、锁状态标志）记录在这个锁对象的**对象头（Object Header）**的 Mark Word 中。当子线程尝试进入 synchronized(lock) 块时，JVM 会去检查堆中这个 lock 对象的对象头状态。只要当前没有任何线程占用它，子线程就可以成功修改对象头，从而获取锁。

- 对于 ReentrantLock： 它是基于 AQS（AbstractQueuedSynchronizer）实现的。锁的状态保存在 AQS 内部的 volatile int state 变量中，而这个 AQS 实例本身就是 ReentrantLock 对象的内部组件，同样存在于堆内存中。子线程通过 CAS 操作去修改这个 state，修改成功即代表获取了锁

#### 示例

```java
public static void main(String[] args) {
    ReentrantLock lock = new ReentrantLock();  // 主线程创建
    
    new Thread(() -> {
        lock.lock();  // 子线程能用
        // ...
    }).start();
}
```

> Java 编译器在背后为你做了一层**变量捕获（Variable Capture）的魔法，也就是我们常说的闭包（Closure）**机制

#### 编译机制 (闭包)

当你在 Lambda 表达式（或匿名内部类）中使用了外部方法的局部变量时，编译器在**编译阶段会发现这件事**

为了让子线程能拿到这个变量，编译器会自动把这个局部变量作为参数，传递给 Lambda 表达式生成的那个类的实例中

如果你把上面的 Lambda 表达式还原成 JDK 1.8 之前的匿名内部类写法，底层逻辑其实等价于下面这样：

```java
// 你写的代码在 JVM 看来，逻辑上被转换成了类似这样的结构：

// 1. 编译器自动帮你生成了一个实现了 Runnable 的类
class SynthesizedRunnable implements Runnable {
    // 自动生成一个成员变量，用来保存外部传进来的锁引用
    private final ReentrantLock capturedLock; 

    // 自动生成一个构造函数，接收外部的锁
    public SynthesizedRunnable(ReentrantLock lock) {
        this.capturedLock = lock;
    }

    @Override
    public void run() {
        // 在这里使用的是内部保存的那个引用
        this.capturedLock.lock(); 
        // ...
    }
}

public static void main(String[] args) {
    ReentrantLock lock = new ReentrantLock(); // 主线程创建
    
    // 2. 启动线程时，实际上是把主线程的 lock 引用当做参数传了进去！
    new Thread(new SynthesizedRunnable(lock)).start(); 
}
```

子线程并不是直接去主线程的栈帧里“偷”变量，而是主线程在创建子线程任务时，把 lock 的引用（内存地址）偷偷“塞”给了子线程的任务对象

#### 捕获的条件：“事实上的 final” (Effectively Final)

ava 有一个严格的规定：被 Lambda 表达式捕获的局部变量，必须是 final 的，或者是“事实上的 final” (Effectively Final)

所谓“事实上的 final”，就是指这个变量在初始化之后，再也没有被重新赋值过。在你的代码中，lock 被 new ReentrantLock() 赋值后，再也没变过，所以它可以被合法捕获。
