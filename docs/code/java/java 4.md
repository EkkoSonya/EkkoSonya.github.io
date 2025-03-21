---
title: Java - 类与对象4
date: 2024-10-22
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.97
---

## 面向对象高级篇1

### 基本类型包装类

Java并不是纯面向对象的语言，虽然Java语言是一个面向对象的语言，但是Java中的基本数据类型却不是面向对象的。Java中的基本类型，如果想通过对象的形式去使用他们，Java提供的基本类型包装类，使得Java能够更好的体现面向对象的思想，同时也使得基本类型能够支持对象操作！  

#### 所有包装类如下

![20241017002218](../../img/java/3.png)  

其中能够表示数字的基本类型包装类，继承自Number类，对应关系如下表：

- byte -> Byte
- boolean -> Boolean
- short -> Short
- char -> Character
- int -> Integer
- long -> Long
- float -> Float
- double -> Double

**包装类型的自动装箱和拆箱机制**  
包装类实际上就是将我们的基本数据类型，封装成一个类（运用了封装的思想）  
包装类型支持自动装箱，我们可以直接将一个对应的基本类型值作为对应包装类型引用变量的值：

```java
  public static void main(String[] args) {
      Integer i = 10;    //将int类型值作为包装类型使用
      // 不需要 Integer i = new Integer(10)
      // 这里本质上就是被自动包装成了一个Integer类型的对象，
      // 只是语法上为了简单，就支持像这样编写。既然能装箱，也是支持拆箱的
      Integer i = 10;
      int a = i;
  }
```

因为包装类是一个类，不是基本类型，所以说两个不同的对象，那么是不相等的：  

```java
   public static void main(String[] args) {
    Integer a = new Integer(10);
    Integer b = new Integer(10);

    System.out.println(a == b);    //虽然a和b的值相同，但是并不是同一个对象，所以说==判断为假
    }
```

那么自动装箱的呢？  

```java
    public static void main(String[] args) {
        Integer a = 128, b = 128;
        System.out.println(a == b);
    }
```

我们发现，通过自动装箱转换的Integer对象，如果值相同，得到的会是同一个对象，这是因为：

```java
public static Integer valueOf(int i) {
    if (i >= IntegerCache.low && i <= IntegerCache.high)   //这里会有一个IntegerCache，如果在范围内，那么会直接返回已经提前创建好的对象
        return IntegerCache.cache[i + (-IntegerCache.low)];
    return new Integer(i);
}
```

**IntegerCache**会默认**缓存-128~127之间**的所有值，将这些值提前做成包装类放在数组中存放，虽然我们目前还没有学习数组，但是各位小伙伴只需要知道，我们如果直接让 -128~127之间的值自动装箱为Integer类型的对象，那么始终都会得到同一个对象，这是为了提升效率，因为小的数使用频率非常高，有些时候并不需要创建那么多对象，创建对象越多，内存也会消耗更多。  

但是如果超出这个缓存范围的话，就会得到不同的对象了：

```java
public static void main(String[] args) {
    Integer a = 128, b = 128;
    System.out.println(a == b);
}
```

这样就不会得到同一个对象了，因为超出了缓存的范围。同样的，Long、Short、Byte类型的包装类也有类似的机制。  

#### 包装类的方法

包装类支持字符串直接转换
  
  ```java
    public static void main(String[] args) {
      Integer i = new Integer("666");   //直接将字符串的666，转换为数字666
      System.out.println(i);
      // 字符串转Integer有多个方法：
      Integer i = Integer.valueOf("5555");
      Integer i = Integer.decode("0xA6");
      Integer.toHexString(166)
  }
  ```

#### 特殊包装类

BigInteger 和 BigDecimal 都在 `java.math` 中

1. Void类 没啥意义 不能 `new` 只能 `Void v = null`
2. BigInteger
  `import java.math.BigInteger`
  用于计算超大数字，即使是最大的long类型，也只能表示64bit的数据，无法表示一个非常大的数，但是BigInteger没有这些限制，我们可以让他等于一个非常大的数字。  
  但**不支持 自动装箱|拆箱机制**，计算的话也只能通过 `BigInteger` 提供的方法进行计算。  
  一般情况，对于非常大的整数计算，我们就可以使用BigInteger来完成。

  ```java
    public static void main(String[] args) {
        BigInteger i = BigInteger.valueOf(Long.MAX_VALUE);    //表示Long的最大值，轻轻松松
        System.out.println(i);
        BigInteger h = BigInteger.valueOf(100)
        // 乘法
        BigInteger a = h.multiply(BigInteger.TEN)
    }
  ```

3. BigDecimal
  `import java.math.BigDecimal`
  浮点类型精度有限，对于需要精确计算的场景，就没办法了，而BigDecimal可以实现小数的精确计算

  ```java
  public static void main(String[] args) {
      BigDecimal i = BigDecimal.valueOf(10);
      i = i.divide(BigDecimal.valueOf(3), 100, RoundingMode.CEILING);
      //计算10/3的结果，精确到小数点后100位
      //RoundingMode是舍入模式，就是精确到最后一位时，该怎么处理，这里CEILING表示向上取整
      System.out.println(i);
  }
  ```
