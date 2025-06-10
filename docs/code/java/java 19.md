---
title: Java - IO2
date: 2025-02-25
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.84
---

## IO流2

### 缓冲流

虽然普通的文件流读取文件数据非常便捷，但是每次都需要从外部I/O设备去获取数据，由于**外部I/O设备的速度一般都达不到内存的读取速度**，很有可能造成程序**反应迟钝**，因此性能还不够高，而缓冲流正如其名称一样，它能够提供一个缓冲，**提前将部分内容存入内存（缓冲区）**在下次读取时，如果缓冲区中存在此数据，则无需再去请求外部设备。同理，当向外部设备写入数据时，也是由缓冲区处理，而不是直接向外部设备写入。  

![20250225181159](http://myimg.ekkosonya.cn/20250225181159.png)

### 缓冲字节流

#### 缓冲字节读取流 `BufferedInputStream`

要创建一个缓冲字节流，只需要将原本的流作为构造参数传入`BufferedInputStream`即可:  

```java
public static void main(String[] args) {
    try (BufferedInputStream bufferedInputStream = new BufferedInputStream(new FileInputStream("test.txt"))){   
        //传入FileInputStream
        System.out.println((char) bufferedInputStream.read());   //操作和原来的流是一样的
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

#### 缓冲流特性

##### 1. 装饰着模式

实际上进行I/O操作的并不是`BufferedInputStream`，而是我们传入的`FileInputStream`，而`BufferedInputStream`虽然有着同样的方法，但是进行了一些额外的处理然后再调用`FileInputStream`的同名方法，这样的写法称为**装饰者模式**

对应缓冲流的`close`源码：

```java
public void close() throws IOException {
    byte[] buffer;
    while ( (buffer = buf) != null) {
        if (bufUpdater.compareAndSet(this, buffer, null)) {  
            //CAS无锁算法，并发会用到，暂时不需要了解
            InputStream input = in;
            in = null;
            if (input != null)
                input.close();
            return;
        }
        // Else retry in case a new buf was CASed in fill()
    }
}
```

实际上这种模式是父类FilterInputStream提供的规范  

##### 2. 缓冲机制

I/O操作一般不能重复读取内容（比如键盘发送的信号，主机接收了就没了），而缓冲流提供了缓冲机制，一部分内容可以被暂时保存  
`BufferedInputStream` 支持 `reset()` 和 `mark()` 操作  
即通过 `mark` 标记位置, `reset` 可以返回之前标记过的位置。  

当调用 `mark(readlimit)` 之后，输入流会以某种方式保留之后读取的`readlimit` 数量的内容，当读取的内容数量超过 `readlimit` 则之后的内容不会被保留，当调用 `reset()` 之后，会使得当前的读取位置回到 `mark()` 调用时的位置。

```java
public static void main(String[] args) {
    try (BufferedInputStream bufferedInputStream = new BufferedInputStream(new FileInputStream("test.txt"))){
        bufferedInputStream.mark(1);   //只保留之后的1个字符
        System.out.println((char) bufferedInputStream.read());
        System.out.println((char) bufferedInputStream.read());
        bufferedInputStream.reset();   //回到mark时的位置
        System.out.println((char) bufferedInputStream.read());
        System.out.println((char) bufferedInputStream.read());
    }catch (IOException e) {
        e.printStackTrace();
    }
}
```

我们发现虽然后面的部分没有保存，但是依然能够正常读取，其实`mark()`后保存的读取内容是取`readlimit`和`BufferedInputStream`类的缓冲区大小两者中的最大值，而并非完全由`readlimit`确定。

```java
public static void main(String[] args) {
    try (BufferedInputStream bufferedInputStream = new BufferedInputStream(new FileInputStream("test.txt"), 1)){  
        //将缓冲区大小设置为1
        bufferedInputStream.mark(1);   
        //只保留之后的1个字符
        System.out.println((char) bufferedInputStream.read());
        System.out.println((char) bufferedInputStream.read());   
        //已经超过了readlimit，继续读取会导致mark失效
        bufferedInputStream.reset();   
        //mark已经失效，无法reset()
        System.out.println((char) bufferedInputStream.read());
        System.out.println((char) bufferedInputStream.read());
    }catch (IOException e) {
        e.printStackTrace();
    }
}
```

##### 3. 缓冲流可以叠加

即可以进行套娃：  
`BufferedInputStream stream = new BufferedInputStream(new BufferedInputStream(new FileInputStream("test.txt")))`

#### 缓冲字节输出流 `BufferedOutputStream`

其实和`BufferedInputStream`原理差不多，只是反向操作  

```java
try (BufferedOutputStream stream = new BufferedOutputStream(Files.newOutputStream(Paths.get("src/1.txt")))){
            stream.write("Hello Penguin!".getBytes());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
```

### 缓冲字符流

`BufferedReader | BufferedWriter`

#### 缓冲字符读取流 `BufferedReader`

```java
public static void main(String[] args) {
    try (BufferedReader reader = new BufferedReader(new FileReader("test.txt"))){
        System.out.println((char) reader.read());
    }catch (IOException e) {
        e.printStackTrace();
    }
}
```

相比`Reader`更方便的是，它支持按行读取

```java
public static void main(String[] args) {
    try (BufferedReader reader = new BufferedReader(new FileReader("test.txt"))){
        System.out.println(reader.readLine());   //按行读取
    }catch (IOException e) {
        e.printStackTrace();
    }
}
```

读取后直接得到一个字符串，当然，它还能把每一行内容依次转换为集合类提到的Stream流  

```java
public static void main(String[] args) {
    try (BufferedReader reader = new BufferedReader(new FileReader("test.txt"))){
        reader
                .lines()
                .limit(2)
                .distinct()
                .sorted()
                .forEach(System.out::println);
    }catch (IOException e) {
        e.printStackTrace();
    }
}
```

它同样也支持`mark()`和`reset()`操作

#### 缓冲字符输出流 `BufferedWriter`

```java
public static void main(String[] args) {
    try (BufferedWriter reader = new BufferedWriter(new FileWriter("output.txt"))){
        reader.newLine();   //使用newLine进行换行
        reader.write("汉堡做滴彳亍不彳亍");   //可以直接写入一个字符串
        reader.flush();   //清空缓冲区
    }catch (IOException e) {
        e.printStackTrace();
    }
}
```
