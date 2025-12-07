---
title: JVM2 - 内存管理1
date: 2025-12-1
category:
  - code
tag:
  - java
  - jvm
# star: true
# sticky: true
order: -0.5
---

## JVM内存管理

在传统的C/C++开发中，我们经常通过使用申请内存的方式来创建对象或是存放某些数据，但是这样也带来了一些额外的问题，我们要在何时释放这些内存，怎么才能使得内存的使用最高效

因此，内存管理是一个非常严肃的问题。

比如我们就可以通过C语言动态申请内存，并用于存放数据：

```c
#include <stdlib.h>
#include <stdio.h>

int main(){
    //动态申请4个int大小的内存空间
    int* memory = malloc(sizeof(int) * 4);
    //修改第一个int空间的值
    memory[0] = 10;
    //修改第二个int空间的值
    memory[1] = 2;
    //遍历内存区域中所有的值
    for (int i = 0;i < 4;i++){
        printf("%d ", memory[i]);
    }
    //释放指针所指向的内存区域
    free(memory);
    //最后将指针赋值为NULL
    memory = NULL;
}
```

而在Java中，这种操作实际上是不允许的，Java只支持**直接使用基本数据类型和对象类型**

至于内存到底如何分配，并不是由我们来处理，而是JVM帮助我们进行控制

这样就帮助我们节省很多内存上的工作，虽然带来了很大的便利，但是，一旦出现内存问题，我们就无法像C/C++那样对所管理的内存进行合理地处理，因为所有的内存操作都是由JVM在进行

只有了解了JVM的内存管理机制，我们才能够在出现内存相关问题时找到解决方案

## 内存区域划分

![alt text](img/1.png)

内存区域一共分为5个区域

其中方法区和堆是所有线程共享的区域，随着虚拟机的创建而创建，虚拟机的结束而销毁

而虚拟机栈、本地方法栈、程序计数器都是线程之间相互隔离的

每个线程都有一个自己的区域，并且线程启动时会自动创建，结束之后会自动销毁。

内存划分完成之后，我们的JVM执行引擎和本地库接口，也就是Java程序开始运行之后就会根据分区合理地使用对应区域的内存了

### 大致划分

#### 程序计数器

首先我们来介绍一下程序计数器，它和我们的传统8086 CPU中PC寄存器的工作差不多，因为JVM虚拟机目的就是实现物理机那样的程序执行。

在8086 CPU中，PC作为程序计数器，负责储存内存地址，该地址指向下一条即将执行的指令，每解释执行完一条指令，PC寄存器的值就会自动被更新为下一条指令的地址，进入下一个指令周期时，就会根据当前地址所指向的指令，进行执行。

而JVM中的程序计数器可以看做是**当前线程所执行字节码的行号指示器**

而行号正好就指的是某一条指令，字节码解释器在工作时也会改变这个值，来指定下一条即将执行的指令。

因为Java的多线程也是依靠**时间片轮转算法**进行的，因此一个CPU同一时间也只会处理一个线程，当某个线程的时间片消耗完成后，会自动切换到下一个线程继续执行

而当前线程的执行位置会**被保存到当前线程的程序计数器中**，当下次轮转到此线程时，又继续根据之前的执行位置继续向下执行。

程序计数器因为只需要记录很少的信息，所以只占用很少一部分内存。

#### 虚拟机栈

![alt text](img/2.png)

虚拟机栈就是一个非常关键的部分，看名字就知道它是一个栈结构，每个方法被执行的时候，Java虚拟机都会同步创建一个栈帧（其实就是栈里面的一个元素）

##### 栈帧组成

栈帧中包括了当前方法的一些信息，比如局部变量表、操作数栈、动态链接、方法出口等

其中局部变量表就是我们方法中的局部变量，实际上局部变量表在class文件中就已经定义好了

操作数栈就是我们之前字节码执行时使用到的栈结构；

每个栈帧还保存了一个**可以指向当前方法所在类**的运行时常量池

目的是：当前方法中如果需要调用其他方法的时候，能够从运行时常量池中找到对应的符号引用，然后将符号引用转换为直接引用，然后就能直接调用对应方法，这就是动态链接

最后是方法出口，也就是方法该如何结束，是抛出异常还是正常返回

##### 模拟分析

这里我们来模拟一下整个虚拟机栈的运作流程，我们先编写一个测试类：

```java
public class Main {
    public static void main(String[] args) {
        int res = a();
        System.out.println(res);
    }

    public static int a(){
        return b();
    }

    public static int b(){
        return c();
    }

    public static int c(){
        int a = 10;
        int b = 20;
        return a + b;
    }
}
```

当我们的主方法执行后，会依次执行三个方法`a() -> b() -> c() -> 返回`，我们首先来观察一下反编译之后的结果：

```
{
  public com.test.Main();   #这个是构造方法
    descriptor: ()V
    flags: ACC_PUBLIC
    Code:
      stack=1, locals=1, args_size=1
         0: aload_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: return
      LineNumberTable:
        line 3: 0
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       5     0  this   Lcom/test/Main;

  public static void main(java.lang.String[]);    #主方法
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=2, locals=2, args_size=1
         0: invokestatic  #2                  // Method a:()I
         3: istore_1
         4: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
         7: iload_1
         8: invokevirtual #4                  // Method java/io/PrintStream.println:(I)V
        11: return
      LineNumberTable:
        line 5: 0
        line 6: 4
        line 7: 11
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0      12     0  args   [Ljava/lang/String;
            4       8     1   res   I

  public static int a();
    descriptor: ()I
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=1, locals=0, args_size=0
         0: invokestatic  #5                  // Method b:()I
         3: ireturn
      LineNumberTable:
        line 10: 0

  public static int b();
    descriptor: ()I
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=1, locals=0, args_size=0
         0: invokestatic  #6                  // Method c:()I
         3: ireturn
      LineNumberTable:
        line 14: 0

  public static int c();
    descriptor: ()I
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=2, locals=2, args_size=0
         0: bipush        10
         2: istore_0
         3: bipush        20
         5: istore_1
         6: iload_0
         7: iload_1
         8: iadd
         9: ireturn
      LineNumberTable:
        line 18: 0
        line 19: 3
        line 20: 6
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            3       7     0     a   I
            6       4     1     b   I
}

```

可以看到在编译之后，我们整个方法的最大操作数栈深度、局部变量表都是已经确定好的，当我们程序开始执行时，会根据这些信息封装为对应的栈帧，我们从`main`方法开始看起：

![alt text](img/3.png)

接着我们继续往下，到了`0: invokestatic  #2  // Method a:()I`时，需要调用方法`a()`

这时当前方法就不会继续向下运行了，而是去执行方法`a()`，那么同样的，将此方法也入栈，注意是放入到栈顶位置，`main`方法的栈帧会被压下去

这时，进入方法a之后，又继而进入到方法b，最后在进入c，因此，到达方法c的时候，我们的虚拟机栈变成了：

![alt text](img/4.png)

现在我们依次执行方法c中的指令，最后返回a+b的结果，在方法c返回之后，也就代表方法c已经执行结束了，栈帧4会自动出栈，这时栈帧3就得到了上一栈帧返回的结果，并继续执行，但是由于紧接着马上就返回，所以继续重复栈帧4的操作，此时栈帧3也出栈并继续将结果交给下一个栈帧2，最后栈帧2再将结果返回给栈帧1，然后栈帧1就可以继续向下运行了，最后输出结果。

![alt text](img/5.png)

#### 本地方法栈

本地方法栈与虚拟机栈作用差不多
