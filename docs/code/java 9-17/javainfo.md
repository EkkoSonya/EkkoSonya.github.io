---
title: Java8回顾
date: 2025-07-27
category:
  - code
tag:
  - java新特性
# star: true
# sticky: true
order: -0.746
---

## Java8

### Lambda 表达式

#### 匿名内部类

在Java 8之前，我们在某些情况下可能需要用到匿名内部类，比如：

```java
public static void main(String[] args) {
    //现在我们想新建一个线程来搞事情
    Thread thread = new Thread(new Runnable() {   
        //创建一个实现Runnable的匿名内部类
        @Override
        public void run() {   //具体的实现逻辑
            System.out.println("Hello World!");
        }
    });
    thread.start();
}
```

在创建`Thread`时，我们需要传入一个`Runnable`接口的实现类，来指定具体的在新的线程中要执行的任务，相关的逻辑需要我们在`run()`方法中实现，这时为了方便，我们就直接使用匿名内部类的方式传入一个实现，但是这样的写法实在是太过臃肿了。

#### Lambda 使用

在Java 8之后，我们可以对类似于这种匿名内部类的写法，进行缩减。

真正有用的那一部分代码，实际上就是我们对`run()`方法的具体实现，而其他的部分实际上在任何地方编写都是一模一样的，现在只需要一个简短的lambda表达式即可：

```java
public static void main(String[] args) {
    //现在我们想新建一个线程来做事情
    Thread thread = new Thread(() -> {
        System.out.println("Hello World!");  //只需留下我们需要具体实现的方法体
    });
    thread.start();
}
```

即 原本需要完整编写包括类、方法在内的所有内容，全部不再需要，而是直接使用类似于`() ‐> { 代码语句 }`的形式进行替换即可。

这只是一种写法而已，如果各位不好理解，可以将其视为之前匿名内部类写法的一种缩短。

> 但是注意，它的底层其实并不只是**简简单单的语法糖替换**，而是通过`invokedynamic`指令实现的
> 
> 匿名内部类会在编译时**创建一个单独**的class文件，但是lambda却不会，间接说明编译之后lambda并不是**以匿名内部类的形式存在**的：
>
> ```java
> //现在我们想新建一个线程来做事情
> Thread thread = new Thread(() -> {
>     throw new UnsupportedOperationException();   
>     //这里我们拋个异常看看
> });
> thread.start();
> ```
>
> ![alt text](img/1.png)
>
> 可以看到，实际上是Main类中的`lambda$main$0()`方法抛出的异常，但是我们的Main类中压根没有这个方法，很明显是自动生成的。
> 所以，与其说Lambda是匿名内部类的语法糖，不如说是我们为所需要的接口提供了一个方法作为它的实现。
> 比如Runnable接口需要一个方法体对它的`run()`方法进行实现，而这里我们就通过lambda的形式给了它一个方法体，这样就万事具备了，而之后创建实现类就只需要交给JVM去处理就好了。

#### Lambda 具体规范

Lambda表达式的具体规范：

- 标准格式为：`([参数类型 参数名称,]...) ‐> { 代码语句，包括返回值 }`
- 和匿名内部类不同，Lambda仅支持接口，不支持抽象类
- 接口内部必须**有且仅有一个抽象方法**（可以有多个方法，但是必须保证**其他方法有默认实现**，必须留一个抽象方法出来）

Java中接口的方法默认是 `public abstract`, 变量默认是 `public static final`

比如我们之前使用的Runable类：

```java
@FunctionalInterface   
//添加了此注解的接口，都支持lambda表达式，符合函数式接口定义
public interface Runnable {
    public abstract void run();   
    //有且仅有一个抽象方法，此方法返回值为void，且没有参数
}
```

因此，Runable的的匿名内部类实现，就可以简写为：

```java
Runnable runnable = () -> {    };
```

我们也可以写一个：

```java
@FunctionalInterface
public interface Test {   
  //接口类型
    String test(Integer i);    
    //只有这一个抽象方法，且接受一个int类型参数，返回一个String类型结果
}
```

它的Lambda表达式的实现就可以写为：

```java
Test test = (Integer i) -> { return i+""; };  //这里我们就简单将i转换为字符串形式
```

不过还可以进行优化，首先方法参数类型是可以省略的：

```java
Test test = (i) -> { return i+""; };
```

由于只有一个参数，可以不用添加小括号（多个参数时需要）：

```java
Test test = i -> { return i+""; };
```

由于仅有返回语句这一行，所以可以直接写最终返回的结果，并且无需花括号：

```java
Test test = i -> i+"";
```

##### 应用现有的方法函数作为方法体 (方法引用)

Lambda 本质是：我们为所需要的接口**提供了一个方法作为它的实现**

除了我们手动编写接口中抽象方法的方法体之外，如果已经有实现好的方法，是可以直接拿过来用的，比如：

```java
String test(Integer i);   //接口中的定义
```

```java
public static void main(String[] args) {
    Test test = Main::impl;    
    //使用 类名::方法名称 的形式来直接引用一个已有的方法作为实现
}

public static String impl(Integer i){
    return "我是已经存在的实现"+i;
}
```

所以，我们可以直接将此方法，作为lambda表达式的方法体实现（其实这就是一种方法引用，引用了一个方法过来）

#### 方法引用 举例

比如我们现在需要对一个数组进行排序：

```java
public static void main(String[] args) {
    Integer[] array = new Integer[]{4, 6, 1, 9, 2, 0, 3, 7, 8, 5};   //来个数组
    Arrays.sort(array, new Comparator<Integer>() {   //Arrays.sort()可以由我们自己指定排序规则，只需要实现Comparator方法即可
        @Override
        public int compare(Integer o1, Integer o2) {
            return o1 - o2;
        }
    });
    System.out.println(Arrays.toString(array));   //按从小到大的顺序排列
}
```

但是我们发现，Integer类中有一个叫做`compare`的静态方法：

```java
public static int compare(int x, int y) {
    return (x < y) ? -1 : ((x == y) ? 0 : 1);
}
```

返回正数，第二个参数排前面，返回负数，第一个参数排前面

这个方法是一个静态方法，但是它却和`Comparator`需要实现的方法返回值和参数定义一模一样，所以：

```java
public static void main(String[] args) {
    Integer[] array = new Integer[]{4, 6, 1, 9, 2, 0, 3, 7, 8, 5};
    Arrays.sort(array, Integer::compare);   //直接指定一手，效果和上面是一模一样
    System.out.println(Arrays.toString(array));
}
```

#### 非静态方法作为方法引用

##### 默认使用 `类::方法`

如果使用非静态方法，依然采用 `类::方法` 的情况

Lambda 会识别，然后使用相应接口的抽象方参数列表的第一个作为目标对象，后续参数作为目标对象成员方法的参数来尝试调用

我们注意到Comparator要求我们实现的方法为：

```java
public int compare(Integer o1, Integer o2) {
     return o1 - o2;
}
```

其中o1和o2都是Integer类型的，我们发现Integer类中有一个`compareTo`方法：

```java
public int compareTo(Integer anotherInteger) {
    return compare(this.value, anotherInteger.value);
}
```

只不过这个方法并不是静态的，而是对象所有：

```java
Integer[] array = new Integer[]{4, 6, 1, 9, 2, 0, 3, 7, 8, 5};
Arrays.sort(array, new Comparator<Integer>() {
    @Override
    public int compare(Integer o1, Integer o2) {
        return o1.compareTo(o2);   //这样进行比较也行，和上面效果依然是一样的
    }
});
System.out.println(Arrays.toString(array));
```

实际上，当我们使用非静态方法时，会使用抽象方参数列表的第一个作为目标对象，后续参数作为目标对象成员方法的参数，也就是说，此时，`o1`作为目标对象，`o2`作为参数，正好匹配了`compareTo`方法，所以，直接缩写：

```java
public static void main(String[] args) {
    Integer[] array = new Integer[]{4, 6, 1, 9, 2, 0, 3, 7, 8, 5};
    Arrays.sort(array, Integer::compareTo);  //注意这里调用的不是静态方法
    System.out.println(Arrays.toString(array));
}
```

##### `对象::方法`

成员方法也可以让对象本身不成为参与的那一方，仅仅引用方法

通过具体对象，即 `对象::方法`，这样就仿造了静态方法时的情况，此时就不会使用默认的情况(即用参数1调用方法，该方法参数为参数2)

而是类似 静态方法作为方法引用时，两个参数对应。

```java
public static void main(String[] args) {
    Main mainObject = new Main();
    Integer[] array = new Integer[]{4, 6, 1, 9, 2, 0, 3, 7, 8, 5};
    Arrays.sort(array, mainObject::reserve);  
    //使用Main类的成员方法，但是mainObject对象并未参与进来，只是借用了一下刚好匹配的方法
    System.out.println(Arrays.toString(array));
}

public int reserve(Integer a, Integer b){  //现在Main类中有一个刚好匹配的方法
    return b.compareTo(a);
}
```

#### 构造方法作为方法引用

当然，类的构造方法 `类::new` 同样可以作为方法引用传递：

类的构造方法默认返回自身对象

```java
public interface Test {
    String test(String str);   //现在我们需要一个参数为String返回值为String的实现
}
```

我们发现，String类中刚好有一个：

```java
public String(String original) {   
  //由于String类的构造方法返回的肯定是一个String类型的对象，
  //且此构造方法需要一个String类型的对象，所以，正好匹配了接口中的
    this.value = original.value;
    this.coder = original.coder;
    this.hash = original.hash;
}
```

于是：

```java
public static void main(String[] args) {
    Test test = String::new;   
    //没错，构造方法直接使用new关键字就行
}
```

当然除了上面提到的这些情况可以使用方法引用之外，还有很多地方都可以，还请各位小伙伴自行探索了。

Java 8也为我们提供了一些内置的函数式接口供我们使用：Consumer、Function、Supplier等，具体请回顾一下JavaSE篇视频教程。

### Optional类

Java 8中新引入了Optional特性，来让我们更优雅的处理空指针异常。

我们先来看看下面这个例子：

```java
public static void hello(String str){   
  //现在我们要实现一个方法，将传入的字符串转换为小写并打印
    System.out.println(str.toLowerCase());  
    //那太简单了吧，直接转换打印一气呵成
}
```

但是这样实现的话，我们少考虑了一个问题，万一给进来的`str`是`null`呢？

如果是`null`的话，在调用`toLowerCase`方法时岂不是直接空指针异常了？

所以我们还得判空一下：

```java
public static void hello(String str){
    if(str != null) {
        System.out.println(str.toLowerCase());
    }
}
```

但是这样写着就不能一气呵成了，我现在又有强迫症，我就想一行解决

这时，`Optional`来了，我们可以将任何的变量包装进Optional类中使用：

```java
public static void hello(String str){
    Optional
            .ofNullable(str)   //将str包装进Optional
            .ifPresent(s -> {   
              //ifPresent表示只有对象不为null才会执行里面的逻辑，实现一个Consumer（接受一个参数，返回值为void）
                System.out.println(s);   
            });
}
```

由于这里只有一句打印，所以我们来优化一下：

```java
public static void hello(String str){
    Optional
            .ofNullable(str)   //将str包装进Optional
            .ifPresent(System.out::println);  
    //println也是接受一个String参数，返回void，所以这里使用我们前面提到的方法引用的写法
}
```

这样，我们就又可以一气呵成了，是不是感觉比之前的写法更优雅。

除了在不为空时执行的操作外，还可以直接从Optional中获取被包装的对象：

```java
System.out.println(Optional.ofNullable(str).get());
```

不过此时当被包装的对象为null时会直接抛出异常，当然，我们还可以指定如果get的对象为null的替代方案：

```java
System.out.println(Optional.ofNullable(str).orElse("VVV"));
//orElse表示如果为空就返回里面的内容
```
