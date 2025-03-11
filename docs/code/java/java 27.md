---
title: Java - 反射3
date: 2025-03-12
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.77
---

## 反射3

### 类加载器 `AppClassLoader | ExtClassLoader | BootstarpClassLoader`

类加载器就是用于加载一个类的，但是类加载器并不是只有一个。  

**思考**： 既然说Class对象和加载的类唯一对应，那如果我们手动创建一个与JDK包名一样，同时类名也保持一致，JVM会加载这个类吗？  

```java
package java.lang;

public class String {    //JDK提供的String类也是
    public static void main(String[] args) {
        System.out.println("我姓🐴，我叫🐴nb");
    }
}
```

会出现以下报错：  

```java
错误: 在类 java.lang.String 中找不到 main 方法, 请将 main 方法定义为:
   public static void main(String[] args)
```

但是我们明明在自己写的`String`类中定义了`main`方法，为什么会找不到此方法呢？实际上这是`ClassLoader`的双亲委派机制在保护Java程序的正常运行  

![20250312005934](http://myimg.ekkosonya.cn/20250312005934.png)

实际上类最开始是由`BootstarpClassLoader`进行加载，`BootstarpClassLoader`用于加载JDK提供的类，而我们自己编写的类实际上是`AppClassLoader`加载的，只有`BootstarpClassLoader`都没有加载的类，才会让`AppClassLoader`来加载，因此我们自己编写的同名包同名类不会被加载，而实际要去启动的是真正的`String`类，也就自然找不到`main方`法了。  

```java
public class Main {
    public static void main(String[] args) {
        System.out.println(Main.class.getClassLoader());   //查看当前类的类加载器
        System.out.println(Main.class.getClassLoader().getParent());  //父加载器
        System.out.println(Main.class.getClassLoader().getParent().getParent());  //爷爷加载器
        System.out.println(String.class.getClassLoader());   //String类的加载器
    }
}
```

#### 自己编译的类加载到 JVM 中

既然通过ClassLoader就可以加载类，那么我们可以自己手动将class文件加载到JVM中吗？先写好我们定义的类：

```java
package com.test;

public class Test {
    public String text;

    public void test(String str){
        System.out.println(text+" > 我是测试方法！"+str);
    }
}
```

通过javac命令，手动编译一个.class文件：  

```java
javac src/main/java/com/test/Test.java
```

编译后，得到一个class文件，我们把它放到根目录下，然后编写一个我们自己的ClassLoader，因为普通的ClassLoader无法加载二进制文件，因此我们编写一个自定义的来让它支持：

```java
//定义一个自己的ClassLoader
static class MyClassLoader extends ClassLoader{
    public Class<?> defineClass(String name, byte[] b){
        return defineClass(name, b, 0, b.length);   //调用protected方法，支持载入外部class文件
    }
}

public static void main(String[] args) throws IOException {
    MyClassLoader classLoader = new MyClassLoader();
    FileInputStream stream = new FileInputStream("Test.class");
    byte[] bytes = new byte[stream.available()];
    stream.read(bytes);
    Class<?> clazz = classLoader.defineClass("com.test.Test", bytes);   //类名必须和我们定义的保持一致
    System.out.println(clazz.getName());   //成功加载外部class文件
}
```

现在，我们就将此class文件读取并解析为Class了，现在我们就可以对此类进行操作了（注意，我们无法在代码中直接使用此类型，因为它是我们直接加载的），我们来试试看创建一个此类的对象并调用其方法：

```java
try {
    Object obj = clazz.newInstance();
    Method method = clazz.getMethod("test", String.class);   //获取我们定义的test(String str)方法
    method.invoke(obj, "哥们这瓜多少钱一斤？");
}catch (Exception e){
    e.printStackTrace();
}
```

我们来试试看修改成员字段之后，再来调用此方法：

```java
try {
    Object obj = clazz.newInstance();
    Field field = clazz.getField("text");   //获取成员变量 String text;
    field.set(obj, "华强");
    Method method = clazz.getMethod("test", String.class);   //获取我们定义的test(String str)方法
    method.invoke(obj, "哥们这瓜多少钱一斤？");
}catch (Exception e){
    e.printStackTrace();
}
```

通过这种方式，我们就可以实现外部加载甚至是网络加载一个类，只需要把类文件传递即可，这样就无需再将代码写在本地，而是动态进行传递，不仅可以一定程度上防止源代码被反编译（只是一定程度上，想破解你代码有的是方法），而且在更多情况下，我们还可以对byte[]进行加密，保证在传输过程中的安全性。
