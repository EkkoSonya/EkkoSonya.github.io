---
title: JUC 八股24 (实际场景)
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

## 实际场景

### 多线程打印奇偶数，怎么控制打印的顺序

#### 使用 ReentrantLock + Condition

```java
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

public class OddEvenPrinterLock {
  private int count = 1;
  private final int MAX = 10;
  
  // 主线程创建的锁对象
  private final ReentrantLock lock = new ReentrantLock(); 
  // 创建两个条件变量，相当于两个休息室
  private final Condition oddCondition = lock.newCondition();
  private final Condition evenCondition = lock.newCondition();

  public void printOdd() {
      while (count <= MAX) {
          lock.lock(); // 尝试获取锁
          try {
              while (count % 2 == 0) {
                oddCondition.await(); // 奇数线程去奇数休息室睡觉，并释放锁
              }
              if (count <= MAX) {
                System.out.println(Thread.currentThread().getName() + " 打印奇数: " + count);
                count++;
                evenCondition.signal(); // 明确去偶数休息室叫醒偶数线程
              }
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          } finally {
              lock.unlock(); // 切记在 finally 中释放锁
          }
      }
  }

  public void printEven() {
      while (count <= MAX) {
          lock.lock();
          try {
              while (count % 2 != 0) {
                  evenCondition.await(); // 偶数线程去偶数休息室睡觉，并释放锁
              }
              if (count <= MAX) {
                  System.out.println(Thread.currentThread().getName() + " 打印偶数: " + count);
                  count++;
                  oddCondition.signal(); // 明确去奇数休息室叫醒奇数线程
              }
          } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
          } finally {
              lock.unlock();
          }
      }
  }

  public static void main(String[] args) {
      OddEvenPrinterLock printer = new OddEvenPrinterLock();
      new Thread(printer::printOdd, "Thread-Odd").start();
      new Thread(printer::printEven, "Thread-Even").start();
  }
}
```

#### 使用 synchronized + wait/notify

```java
public class OddEvenPrinterSync {
  private int count = 1;
  private final int MAX = 10;
  private final Object lock = new Object(); // 共享的锁对象

  public void printOdd() {
      while (count <= MAX) {
          synchronized (lock) {
              // 如果当前是偶数，奇数线程就主动挂起等待
              while (count % 2 == 0) {
                  try {
                      lock.wait(); // 释放锁，进入阻塞状态，等待被唤醒
                  } catch (InterruptedException e) {
                      Thread.currentThread().interrupt();
                  }
              }
              if (count <= MAX) {
                  System.out.println(Thread.currentThread().getName() + " 打印奇数: " + count);
                  count++;
                  lock.notify(); // 活干完了，叫醒挂在 lock 上的其他线程（偶数线程）
              }
          }
      }
  }

  public void printEven() {
      while (count <= MAX) {
          synchronized (lock) {
              // 如果当前是奇数，偶数线程就主动挂起等待
              while (count % 2 != 0) {
                  try {
                      lock.wait(); 
                  } catch (InterruptedException e) {
                      Thread.currentThread().interrupt();
                  }
              }
              if (count <= MAX) {
                  System.out.println(Thread.currentThread().getName() + " 打印偶数: " + count);
                  count++;
                  lock.notify(); // 活干完了，叫醒奇数线程
              }
          }
      }
  }

  public static void main(String[] args) {
      OddEvenPrinterSync printer = new OddEvenPrinterSync();
      new Thread(printer::printOdd, "Thread-Odd").start();
      new Thread(printer::printEven, "Thread-Even").start();
  }
}
```
