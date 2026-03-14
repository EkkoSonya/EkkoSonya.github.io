---
title: Java面试题 - java基础8 (杂)
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

### Java 21

#### 语言新特性

##### Switch 语句的模式匹配

##### 数组模式

将模式匹配扩展到数组中，使开发者能够在条件语句中更高效地解构和检查数组内容。例如，if (arr instanceof int[] {1, 2, 3})，可以直接判断数组arr是否匹配指定的模式

##### 字符串模板（预览版）

提供了一种更可读、更易维护的方式来构建复杂字符串，支持在字符串字面量中直接嵌入表达式。例如，以前可能需要使用"hello " + name + ", welcome to the geeksforgeeks!"这样的方式来拼接字符串，在 Java 21 中可以使用hello {name}, welcome to the geeksforgeeks!这种更简洁的写法

#### 新并发特性方面

##### 虚拟线程

这是 Java 21 引入的一种轻量级并发的新选择。它通过共享堆栈的方式，大大降低了内存消耗，同时提高了应用程序的吞吐量和响应速度。可以使用静态构建方法、构建器或ExecutorService来创建和使用虚拟线程

##### Scoped Values（范围值）

提供了一种在线程间共享不可变数据的新方式，避免使用传统的线程局部存储，促进了更好的封装性和线程安全，可用于在不通过方法参数传递的情况下，传递上下文信息，如用户会话或配置设置

### 设计模式

#### volatile和sychronized如何实现单例模式

单例模式（Singleton Pattern）是一种创建型设计模式，确保一个类**只有一个实例**，并提供一个全局访问点

- 唯一实例：整个应用中只有一个对象实例
- 自我实例化：类自己创建自己的实例
- 全局访问：提供全局访问点获取实例

单例模式的核心：

- 创建私有静态实例变量，并用 volatile 关键字修饰
- 私有化构造函数，防止外部实例化
- 提供公共静态方法获取实例，getInstance

```java
public class SingleTon {
  // volatile 关键字修饰变量 防止指令重排序
  private static volatile SingleTon instance = null;
  private SingleTon(){}
    
  public static SingleTon getInstance(){
    if(instance == null){
      // 同步代码块 只有在第一次获取对象的时候会执行到
      // 第二次及以后访问时 instance变量均非null故不会往下执行了 直接返回啦
      synchronized(SingleTon.class){
          if(instance == null){
              instance = new SingleTon();
          }
      }
    }
    return instance;
  }
}
```

这样子，只有在第一次调用时才会生成新的实例，即使第一次可能并发，通过 `synchronize` 来避免，其他情况下通过 `SingleTon.getInstance()` 获得的都是已经创建好的实例

> 为什么需要 volatile

```java
// instance = new Singleton() 实际上分为三步：
// 1. 分配内存空间
// 2. 初始化对象
// 3. 将 instance 指向内存地址

// 问题：JVM 可能会指令重排序，变成：
// 1. 分配内存空间
// 3. 将 instance 指向内存地址（此时对象还未初始化！）
// 2. 初始化对象

// 场景：
// 线程 A 执行到步骤 3，instance 已经不为 null，但对象还未初始化
// 线程 B 此时调用 getInstance()，第一次检查发现 instance != null
// 直接返回 instance，但这是一个未初始化的对象！

// volatile 的作用：
// 1. 禁止指令重排序
// 2. 保证可见性（一个线程修改后，其他线程立即可见）
```

#### 代理模式和适配器模式有什么区别

- 目的不同：代理模式主要关注**控制对对象的访问**，而适配器模式则用于接口转换，使不兼容的类能够一起工作。
- 结构不同：代理模式一般包含**抽象主题、真实主题和代理**三个角色，适配器模式包含**目标接口、适配器和被适配者**三个角色。
- 应用场景不同：代理模式常用于添**加额外功能或控制对对象的访问**，适配器模式常用于**让不兼容的接口协同工作**

##### 代理模式

代理模式为其他对象提供一种代理以控制对这个对象的访问

代理是不想让别人接触我这个类，那我写一个类把这个类包装起来，用这个类操作

```java
// 1. 抽象主题接口
interface Subject {
    void request();
}

// 2. 真实主题（被代理对象）
class RealSubject implements Subject {
    @Override
    public void request() {
        System.out.println("RealSubject: 处理请求");
    }
}

// 3. 代理类
class Proxy implements Subject {
    private RealSubject realSubject;
    
    @Override
    public void request() {
        // 前置处理
        System.out.println("Proxy: 前置处理");
        
        // 调用真实对象
        if (realSubject == null) {
            realSubject = new RealSubject();
        }
        realSubject.request();
        
        // 后置处理
        System.out.println("Proxy: 后置处理");
    }
}

// 使用
public class Main {
    public static void main(String[] args) {
        Subject proxy = new Proxy();
        proxy.request();
    }
}
```

##### 适配器模式

适配器模式将一个类的接口转换成客户希望的另一个接口，使得原本由于接口不兼容而不能一起工作的类可以一起工作

就是我想让这个类实现某个接口方法，但是我不能动这个类的结构，所以我要创造一个新的类(适配器)，通过它实现那个接口方法，里面new这个类，然后在方法里写逻辑

```java
// 目标接口（客户期望的接口）
interface Target {
    void request();
}

// 被适配者（已存在的类，接口不兼容）
class Adaptee {
    public void specificRequest() {
        System.out.println("Adaptee: 特殊请求");
    }
}

// 适配器
class Adapter implements Target {
    private Adaptee adaptee;
    
    public Adapter(Adaptee adaptee) {
        this.adaptee = adaptee;
    }
    
    @Override
    public void request() {
        // 转换调用
        adaptee.specificRequest();
    }
}

// 使用
public class Main {
    public static void main(String[] args) {
        Adaptee adaptee = new Adaptee();
        Target target = new Adapter(adaptee);
        target.request(); // 通过适配器调用
    }
}
```
