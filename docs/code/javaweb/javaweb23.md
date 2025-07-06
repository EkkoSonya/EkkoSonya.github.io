---
title: javaweb - JUL日志4
date: 2025-07-06
category:
  - code
tag:
  - javaweb
  - JUL
# star: true
# sticky: true
order: -0.7476
---

## JUL日志系统4

### 日志默认配置

#### `Properties` 格式

`Properties`格式的文件是Java的一种配置文件，我们之前在学习Mybatis的时候学习了XML，但是我们发现XML配置文件读取实在是太麻烦，那么能否有一种简单一点的配置文件呢？

此时就可以使用`Properties`文件，它的格式如下：

```properties
name=Test
desc=Description
```

该文件配置很简单，格式**类似于我们Java中的Map键值对**，中间使用**等号**进行连接。

当然，**键的名称我们也可以分为多级进行配置**，每一级使用`.`进行划分，比如我们现在要配置数据库的连接信息，就可以编写为这种形式：

```properties
jdbc.datasource.driver=com.cj.mysql.Driver
jdbc.datasource.url=jdbc:mysql://localhost:3306/test
jdbc.datasource.username=test
jdbc.datasource.password=123456
```

##### JAVA读取`Properties`

JDK为我们提供了一个叫做`Properties`的类型，它继承自`Hashtable`类（是HashMap的**同步加锁版**）

使用起来和`HashMap`是差不多的：

```java
public class Properties extends Hashtable<Object,Object> {}
```

相关操作：

```java
Properties properties = new Properties();
properties.load(new FileReader("test.properties"));   //使用load方法读取本地文件中的所有配置到Map中
System.out.println(properties);
properties.get(xxx);
```

##### 获取系统数据`getProperties`

实际上，我们也可以通过这种方式来获取我们的一些系统属性

`System`类中有一个`getProperties`方法用于存储所有系统相关的属性值，这里我们打印一下系统名称和版本：

```java
Properties properties = System.getProperties();
System.out.println(properties.get("os.name"));
System.out.println(properties.get("os.version"));
```

当然，程序中的Properties对象也可以快速保存为一个对应的`.properties`文件：

```java
Properties properties = System.getProperties();
properties.store(new FileWriter("system.properties"), "系统属性");
```

#### JUL设置默认配置 `LogManger`

实际上JUL也可以通过进行**配置文件来规定日志打印器的一些默认值**

比如我们现在想配置默认的日志打印级别：

```properties
# RootLogger 的默认处理器为
handlers=java.util.logging.ConsoleHandler
# RootLogger 的默认的日志级别
.level=ALL
# 配置ConsoleHandler的默认level
java.util.logging.ConsoleHandler.level=ALL
```

接着我们需要在程序开始之前加载这里的配置：

```java
LogManager manager = LogManager.getLogManager();   
//获取LogManager读取配置文件
manager.readConfiguration(new FileInputStream("test.properties"));
Logger logger = Logger.getLogger("test");
logger.config("Hello World");
```

这样就可以通过配置文件的形式修改一些功能的默认属性了，而不需要我们再使用代码进行配置。

实际上在JUL的这类内部也有着对应的配置处理操作，如果发现有默认配置优先使用配置里面的，比如Handler的构造方法：

```java
Handler(Level defaultLevel, Formatter defaultFormatter,
        Formatter specifiedFormatter) {

    LogManager manager = LogManager.getLogManager();
    String cname = getClass().getName();

    final Level level = manager.getLevelProperty(cname + ".level", defaultLevel);
    final Filter filter = manager.getFilterProperty(cname + ".filter", null);
    final Formatter formatter = specifiedFormatter == null
                                ? manager.getFormatterProperty(cname + ".formatter", defaultFormatter)
                                : specifiedFormatter;
    final String encoding = manager.getStringProperty(cname + ".encoding", null);
    ...
}
```

关于使用配置文件的形式修改JUL部分内容的默认值就先讲解到这里。
