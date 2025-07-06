---
title: javaweb - JUL日志1
date: 2025-07-04
category:
  - code
tag:
  - javaweb
  - JUL
# star: true
# sticky: true
order: -0.7478
---

## JUL日志系统

JDK为我们提供了一个自带的日志框架，位于`java.util.logging`包下，我们可以使用此框架来实现日志的规范化打印，使用起来非常简单：

```java
public class Main {
    public static void main(String[] args) {
        // 首先获取日志打印器，名称随意
        Logger logger = Logger.getLogger("test");
        // 调用info来输出一个普通的信息，直接填写字符串即可
        logger.info("我是普通的日志");
    }
}
```

我们可以在主类中使用日志打印，得到日志的打印结果：

```
十一月 15, 2021 12:55:37 下午 com.test.Main main
信息: 我是普通的日志
```

我们发现，通过日志输出的结果会更加规范，在后续的学习中，日志将时刻伴随我们左右。

### JUL基本使用

日志的打印并不是简单的输出，有些时候我们可以会打印一些比较重要的日志信息，或是一些非常紧急的日志信息，根据不同类型的信息进行划分

#### 级别划分

日志一般分为7个级别，详细信息我们可以在`Level`类中查看：

```java
public class Level implements java.io.Serializable {
  ...
  
    //出现严重故障的消息级别，值为1000，也是可用的日志级别中最大的
    public static final Level SEVERE = new Level("SEVERE",1000, defaultBundle);
    //存在潜在问题的消息级别，比如边充电边打电话就是个危险操作，虽然手机爆炸的概率很小，但是还是会有人警告你最好别这样做，这是日志级别中倒数第二大的
    public static final Level WARNING = new Level("WARNING", 900, defaultBundle);
    //所有常规提示日志信息都以INFO级别进行打印
    public static final Level INFO = new Level("INFO", 800, defaultBundle);
    //以下日志级别依次降低，不太常用
    public static final Level CONFIG = new Level("CONFIG", 700, defaultBundle);
    public static final Level FINE = new Level("FINE", 500, defaultBundle);
    public static final Level FINER = new Level("FINER", 400, defaultBundle);
    public static final Level FINEST = new Level("FINEST", 300, defaultBundle);
 
  ...
}
```

之前通过`info`方法直接输出的结果就是使用的默认级别的日志，实际上每个级别都有一个对应的方法用于打印：

```java
public static void main(String[] args) {
    Logger logger = Logger.getLogger(Main.class.getName());
    logger.severe("severe");  //最高日志级别
    logger.warning("warning");
    logger.info("info"); //默认日志级别
    logger.config("config");
    logger.fine("fine");
    logger.finer("finer");
    logger.finest("finest");   //最低日志级别
}
```

#### 自定义级别设置 `logger.log`

当然，如果需要更加灵活地控制日志级别

我们也可以通过`log`方法来主动设定该条日志的输出级别：

```java
Logger logger = Logger.getLogger(Main.class.getName());
logger.log(Level.SEVERE, "严重的错误", new NullPointerException("祝你明天就遇到我"));
logger.log(Level.WARNING, "警告的内容");
logger.log(Level.INFO, "普通的信息");
logger.log(Level.CONFIG, "级别低于普通信息");
```

`Logger`默认情况下只会打印INFO级别以上的日志，而INFO级别以下的日志则会直接省略，我们可以通过配置来进行调整。

#### 修改日志的默认打印级别

我们知道日志的默认打印级别为INFO，此时低于INFO的所有日志都是被屏蔽的，而要修改日志的默认打印级别，我们需要同时调整`Handler`和`Logger`的`level`属性：

```java
handler.setLevel(Level.FINEST);   
//注意，填写的日志打印级别是什么，高于等于此级别的所有日志都会被打印
logger.setLevel(Level.FINEST);
logger.fine("Hello World");
```

现在我们再次打印低于INFO级别的日志就可以正确得到结果了。

`Logger`类还为我们提供了两个比较特殊的日志级别，它们专门用于配置特殊情况：

```java
//表示直接关闭所有日志信息，值为int的最大值
public static final Level OFF = new Level("OFF",Integer.MAX_VALUE, defaultBundle);
//表示开启所有日志信息，无论是什么级别都进行打印
public static final Level ALL = new Level("ALL", Integer.MIN_VALUE, defaultBundle);
```

因为这这里OFF的值为int的最大值，也就是说没有任何日志级别的值大于它，因此，如果将打印等级配置为OFF，那么所有类型的日志信息都不会被打印了，而ALL则相反。
