---
title: Java - 多线程与反射
date: 2025-03-09
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.79
---

## 多线程4

### 守护线程

`t.setDaemon(true);`

- 守护进程在后台运行运行，不需要和用户交互，本质和普通进程类似。
- 而守护线程就不一样了，当其他所有的非守护线程结束之后，守护线程自动结束，也就是说，**Java中所有的线程都执行完毕后，守护线程自动结束**，因此守护线程不适合进行IO操作，只适合打打杂。
  
```java
public static void main(String[] args) throws InterruptedException{
    Thread t = new Thread(() -> {
        while (true){
            try {
                System.out.println("程序正常运行中...");
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    });
    t.setDaemon(true);   //设置为守护线程（必须在开始之前，中途是不允许转换的）
    t.start();
    for (int i = 0; i < 5; i++) {
        Thread.sleep(1000);
    }
}
```

在守护线程中产生的新线程也是守护的：  

```java
public static void main(String[] args) throws InterruptedException{
    Thread t = new Thread(() -> {
        Thread it = new Thread(() -> {
            while (true){
                try {
                    System.out.println("程序正常运行中...");
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        });
        it.start();
    });
    t.setDaemon(true);   //设置为守护线程（必须在开始之前，中途是不允许转换的）
    t.start();
    for (int i = 0; i < 5; i++) {
        Thread.sleep(1000);
    }
}
```

### 集合类

java中也有些使用并行来进行操作的  

集合类中有一个东西是Java8新增的`Spliterator`接口，翻译过来就是：可拆分迭代器（Splitable Iterator）和Iterator一样，`Spliterator`也用于遍历数据源中的元素，但它是为了并行执行而设计的。Java 8已经为集合框架中包含的所有数据结构提供了一个默认的`Spliterator`实现。在集合跟接口`Collection`中提供了一个`spliterator()`方法用于获取可拆分迭代器。  

- 并行流 `parallelStream()`
  
  ```java
    default Stream<E> parallelStream() {
        return StreamSupport.stream(spliterator(), true); //parallelStream就是利用了可拆分迭代器进行多线程操作
    }
  ```
  
  并行流，其实就是一个多线程执行的流，它通过默认的ForkJoinPool实现（这里不讲解原理），它可以提高你的多线程任务的速度。

  ```java
    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>(Arrays.asList(1, 4, 5, 2, 9, 3, 6, 0));
        list
                .parallelStream()    //获得并行流
                .forEach(i -> System.out.println(Thread.currentThread().getName()+" -> "+i));
    }
  ```

  我们发现，`forEach`操作的顺序，并不是我们实际List中的顺序，同时每次打印也是不同的线程在执行！我们可以通过调用`forEachOrdered()`方法来使用单线程维持原本的顺序。

- 在`Arrays`数组工具类中，也包含大量的并行方法：
  
  ```java
    public static void main(String[] args) {
        int[] arr = new int[]{1, 4, 5, 2, 9, 3, 6, 0};
        Arrays.parallelSort(arr);   //使用多线程进行并行排序，效率更高
        System.out.println(Arrays.toString(arr));
    }
  ```

- 集合类，并没有考虑到多线程运行的情况，如果两个线程同时执行，那么有可能两个线程同一时间都执行同一个方法，这种情况下就很容易出问题

### 生产者与消费者

所谓的生产者消费者模型，是通过一个容器来解决生产者和消费者的强耦合问题。通俗的讲，就是生产者在不断的生产，消费者也在不断的消费，可是消费者消费的产品是生产者生产的，这就必然存在一个中间容器，我们可以把这个容器想象成是一个货架，当货架空的时候，生产者要生产产品，此时消费者在等待生产者往货架上生产产品，而当货架有货物的时候，消费者可以从货架上拿走商品，生产者此时等待货架出现空位，进而补货，这样不断的循环。

通过多线程编程，来模拟一个餐厅的2个厨师和3个顾客，假设厨师炒出一个菜的时间为3秒，顾客吃掉菜品的时间为4秒。

```java
public class Main {

    private static final Queue<Object> queue = new LinkedList<>();

    public static void main(String[] args) {
        new Thread(Main::add, "厨师1").start();
        new Thread(Main::add, "厨师2").start();

        new Thread(Main::take, "顾客1").start();
        new Thread(Main::take, "顾客2").start();
        new Thread(Main::take, "顾客3").start();
    }

    private static void add(){
        while (true){
            try {
                Thread.sleep(3000);
                synchronized (queue) {
                    String name = Thread.currentThread().getName();
                    System.out.println(new Date() + " " + name + "put menu");
                    queue.offer(new Object());
                    queue.notifyAll();
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    private static void take(){
        while (true) {
                try {
                    synchronized (queue){
                        while(queue.isEmpty())queue.wait();
                        queue.poll();
                        String name = Thread.currentThread().getName();
                        System.out.println(new Date() + " " + name + "eat");
                    }
                    Thread.sleep(4000);
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                }
        }
    }
}
```