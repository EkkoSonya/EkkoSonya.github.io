---
title: JVM 八股3 - 内存管理2 (native 介绍)
date: 2026-3-28
category:
  - code
tag:
  - java
  - jvm
  - 八股
# star: true
# sticky: true
order: -0.5
---

## JVM3

当 Java 应用需要与操作系统底层或硬件交互时，通常会用到本地方法栈。

### native 方法

native 方法是在 Java 中通过 native 关键字声明的，用于调用非 Java 语言，如 C/C++ 编写的代码。Java 可以通过 JNI，也就是 Java Native Interface 与底层系统、硬件设备、或者本地库进行交互

Java 的 native 方法本身没有 Java 代码实现，而是交给本地代码实现

```java
public native void test();
```

这个方法真正的逻辑可能写在 C/C++ 里，然后编译成一个 .dll。

Java 运行时通过：

```java
System.loadLibrary("xxxx");
```

把这个动态库加载进来，再去调用里面对应的本地函数

你可以把它想成：

- Java 代码：负责声明“我要调用这个方法”
- .dll：真正存放底层实现
- JVM：负责把 .dll 加载进来并完成调用

不同系统名字不一样：

- Windows：.dll
- Linux：.so
- macOS：.dylib

#### JNI (Java Native Interface)

一般情况下，我们完全可以使用 Java 语言编写程序，但某些情况下，Java 可能满足不了需求，或者不能更好的满足需求，比如：

- 标准的 Java 类库不支持。
- 我们已经用另一种语言，比如说 C/C++ 编写了一个类库，如何用 Java 代码调用呢？
- 某些运行次数特别多的方法，为了加快性能，需要用更接近硬件的语言（比如汇编）编写

上面这三种需求，说到底就是如何用 Java 代码调用不同语言编写的代码。那么 JNI 应运而生了。

从 Java 1.1 开始，Java Native Interface (JNI)标准就成为 Java 平台的一部分，它允许 Java 代码和其他语言编写的代码进行交互

JNI 一开始是为了本地已编译语言，尤其是 C 和 C++而设计的，但是它并不妨碍你使用其他语言，只要调用约定受支持就可以了

使用 Java 与本地已编译的代码交互，通常会**丧失平台可移植性**，但是，有些情况下这样做是可以接受的，甚至是必须的

比如，使用一些旧的库，与硬件、操作系统进行交互，或者为了提高程序的性能。JNI 标准至少保证本地代码能工作能在任何 Java 虚拟机实现下

通过 JNI，我们就可以通过 Java 程序（代码）调用到操作系统相关的技术实现的库函数，从而与其他技术和系统交互；同时其他技术和系统也可以通过 JNI 提供的相应原生接口调用 Java 应用系统内部实现的功能

##### 缺点

- 程序不再跨平台。要想跨平台，必须在不同的系统环境下重新编译本地语言部分。
- 程序不再是绝对安全的，本地代码的不当使用可能导致整个程序崩溃。一个通用规则是，你应该让本地方法集中在少数几个类当中。这样就降低了 Java 和 C/C++ 之间的耦合性。

#### 具体使用

- 编写带有 native 方法的 Java 类，生成.java 文件；
- 使用 javac 命令编译所编写的 Java 类，生成.class 文件；
- 使用 javah -jni java 类名 生成扩展名为 h 的头文件，也即生成 .h 文件；
- 使用 C/C++（或者其他编程想语言）实现本地方法，创建 .h 文件的实现，也就是创建 .cpp 文件实现.h 文件中的方法；
- 将 C/C++ 编写的文件生成动态连接库，生成 dll 文件；

> dll 是 Dynamic Link Library，中文一般叫 动态链接库。
>
> 在 Windows 里，它本质上是一个可被其他程序在运行时加载的二进制库文件，扩展名就是 .dll

```java
// 只要 Java 语法没问题，就能编译通过。
// 这时候 没有 hello.dll 也没关系。
public class HelloJNI {
  static {
      System.loadLibrary("hello"); // 加载名为 libhello.dylib 的动态链接库 (dylib 是 macOS 的动态链接库)
  }

  // 定义本地方法
  private native void helloJNI();

  public static void main(String[] args) {
      new HelloJNI().helloJNI(); // 调用本地方法
  }
}
```

- ative 方法声明：像是在 Java 里先留了个“接口”
- dll：真正的实现
- 编译时只检查声明
- 运行时才检查实现

##### 编译 `HelloJNI.java`

在命令行通过 `javac HelloJNI.java` 来编译源代码

执行完毕后，会在 `HelloJNI.java` 所在目录下生成一个名为 `HelloJNI.h` 的头文件

##### 使用 c语言实现本地方法

创建一个 C 文件 HelloJNI.c，实现本地方法 sayHello

```c
#include <stdio.h>
#include <jni.h>
#include "HelloJNI.h"

JNIEXPORT void JNICALL Java_HelloJNI_helloJNI(JNIEnv *env, jobject obj) {
    printf("Hello, JNI!\n");
    return;
}
```

注意，这里需要引入 JNI 头文件，并且实现的方法名称需要与在 Java 中声明的名称一致（HelloJNI_helloJNI HelloJNI 类的 helloJNI 方法）

##### 对应编译脚本

```shell
#!/bin/bash

# 编译 HelloJNI.c 文件
gcc -I"$JAVA_HOME/include" -I"$JAVA_HOME/include/darwin" -shared -o libhello.dylib HelloJNI.c

# 把生成的 libhello.dylib 文件拷贝到当前目录
cp libhello.dylib .
```

- $JAVA_HOME 是 JDK 的安装路径，需要根据实际情况修改。
- 在 macOS 上，动态链接库（hello）的后缀是 .dylib，而不是 Linux 上的 .so。

这里的 -I 选项是为了告诉编译器头文件的位置，$JAVA_HOME 是 Java 安装目录的路径

之后执行即可

![alt text](img/7.png)
