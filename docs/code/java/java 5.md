---
title: Java - 数组 | 字符串 | 正则表达式
date: 2024-10-24
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.96
---

## 面向对象高级篇 2

### 数组

数组是相同类型数据的有序集合，数组可以代表任何相同类型的一组内容（包括引用类型和基本类型）其中存放的每一个数据称为数组的一个元素。

#### 定义

数组类型比较特殊，**它本身也是类，但是编程不可见**（底层C++写的，在运行时动态创建）  
即使是基本类型的数组，也是以对象的形式存在的，并不是基本数据类型。所以，我们要创建一个数组，同样需要使用 `new` 关键字

```java
public static void main(String[] args) {
    int[] array = new int[10];   //类型[]就表示这个是一个数组类型
    Object obj = array;   //因为同样是类，肯定是继承自Object的，所以说可以直接向上转型
}
```

创建出来的数组每个位置上**都有默认值**，如果是**引用类型，就是null**，如果是**基本数据类型，就是0，或者是false**，跟对象成员变量的默认值是一样的  
其他定义方法:  

```java
类型[] 变量名称 = new 类型[数组大小];
类型 变量名称[] = new 类型[数组大小];  //支持C语言样式，但不推荐！

类型[] 变量名称 = new 类型[]{...};  //静态初始化（直接指定值和大小）
类型[] 变量名称 = {...};   //同上，但是只能在定义时赋值
```

#### 方法

数组的 length 是在一开始就确定的，而且是 **final类型** 的，不允许进行修改，也就是说数组的长度一旦确定，不能随便进行修改，如果需要使用更大的数组，只能重新创建。

```java
  public static void main(String[] args) {
      int[] array = new int[10];
      System.out.println("当前数组长度为："+array.length);   //length属性是int类型的值，表示当前数组长度，长度是在一开始创建数组的时候就确定好的
  }
```

array 虽然是继承于 Object，但是，很遗憾，除了clone()之外，这些方法并没有被重写，也就是说依然是采用的Object中的默认实现，所以可能不满足真实需求。  

#### 访问元素

`for` 或者 `foreach`

```java
  public static void main(String[] args) {
      int[] array = new int[10];
      for (int i = 0; i < array.length; i++) {
          System.out.print(array[i] + " ");
      }
      for (int i : array) {    //int i就是每一个数组中的元素，array就是我们要遍历的数组
        System.out.print(i+" ");   //每一轮循环，i都会更新成数组中下一个元素
    }
  }
```

#### 特性

这里需要特别说一下，对于基本类型的数组来说，是不支持自动装箱和拆箱的：

```java
  public static void main(String[] args) {
      int[] arr = new int[10];
      Integer[] test = arr;  // 这样是不能赋值的 会报错
  }
```

由于基本数据类型和引用类型不同，所以说int类型的数组时不能被Object类型的数组变量接收的, 即 `int[] arr = new int[10]` 是不能 `Object[] arrav = arr` 这样的

但是如果是引用类型的话，是可以的,因为父类都是 `Object`  

```java
  public static void main(String[] args) {
      String[] arr = new String[10];
      Object[] array = arr;    //数组同样支持向上转型

      Object[] arr = new Object[10];
      String[] array = (String[]) arr;   //也支持向下转型
  }
```

#### `final`性质

```java
  public static void main(String[] args) {
      final int[] a = {1,2,3,4};
      // 值还是可以修改，只是数组的地址不准修改
      a[0] = 4;  // 允许
      a = {2,4,8,7};  //不允许
  }
```

#### 多维数组

既然数组可以是任何类型的，那么我们能否创建数组类型的数组呢？答案是可以的  

```java
public static void main(String[] args) {
    int[][] arr = { {1, 2},
                    {3, 4},
                    {5, 6}};   //一个三行两列的数组
    System.out.println(arr[2][1]);   //访问第三行第二列的元素
}
```

#### 可变长参数

`public void function(参数类型...参数名称)`  
这样参数名称所表示的就是一个数组  

```java
public class Person {
    String name;
    int age;
    String sex;

    // 可以传入 0 - N 个类型的实参
    public void test(String... strings){
      //strings这个变量就是一个String[]类型的
      for (String string : strings) {
          System.out.println(string);   //遍历打印数组中每一个元素
      } 
    }
}

public static void main(String[] args) {
    Person person = new Person();
    person.test("1！", "5！", "哥们在这跟你说唱"); //这里我们可以自由传入任意数量的字符串
}
```

注意，如果同时存在其他参数，那么可变长参数只能放在最后：  

```java
public void test(int a, int b, String... strings){
    
}
```

#### `main`函数的 `String[] args`

```java
public static void main(String[] args) {
    for (String arg : args) {
        System.out.println(arg);
    }
}
```

可以看到，默认情况下直接运行什么都没有，但是如果我们在运行时，添加点内容的话：  
`java com/test/Main lbwnb aaaa xxxxx`  
因此会读取命令行中的指令参数进行存储到 `args` 中。

### 字符串

字符串类是一个比较特殊的类，它用于保存字符串。
我们知道，基本类型 char 可以保存一个2字节的Unicode字符，而字符串则是一系列字符的序列（在C中就是一个字符数组）  
Java中没有字符串这种基本类型，因此只能使用类来进行定义。
注意，字符串中的字符一旦确定，无法进行修改，只能重新创建。

#### String 类

String本身也是一个类，只不过它比较特殊，每个用双引号括起来的字符串，都是String类型的一个实例对象, 也可以象征性 `new` 不过没必要  
如果是直接使用双引号创建的字符串，如果内容相同，为了优化效率，那么始终都是同一个对象  
但是如果我们使用构造方法主动创建两个新的对象，那么就是不同的对象了  

```java
public static void main(String[] args) {
    String str1 = "Hello World";
    String str2 = "Hello World";
    System.out.println(str1 == str2);

    // 这样就不同
    String str3 = new String("Hello World");
    String str4 = new String("Hello World");
    System.out.println(str3 == str4);

    System.out.println(str1.equals(str2));   //字符串的内容比较，一定要用equals
}
```

因此，如果我们仅仅是想要判断两个字符串的内容是否相同，不要使用 `==`，  
String类**重载了equals方法**用于**判断和比较内容是否相同**  

**获取长度 str.length()**

```java
public static void main(String[] args) {
    String str = "Hello World";
    System.out.println(str.length());   //length方法可以求字符串长度，这个长度是字符的数量
}
```

字符串类中提供了很多方便我们操作的方法，
比如**字符串的裁剪 (substring)、分割操作 (split)**  

```java
  public static void main(String[] args) {
      String str = "Hello World";
      String sub = str.substring(0, 3);   //分割字符串，并返回一个新的子串对象
      System.out.println(sub);

      String[] strings = str.split(" ");   //使用split方法进行字符串分割，比如这里就是通过空格分隔，得到一个字符串数组
      for (String string : strings) {
          System.out.println(string);
      }
  }
```

字符数组和字符串之间是可以快速进行相互转换的  
**字符串转字符数组**: `char[] chars = str.toCharArray()`
**字符数组转字符串**: `String str = new String(chars)`

#### StringBuilder 类

StringBuilder 就是专门用于构造字符串的，我们可以使用它来对字符串进行拼接、裁剪等操作，它就像一个字符串编辑器，弥补了字符串不能修改的不足  

```java
public static void main(String[] args) {
    StringBuilder builder = new StringBuilder();   //一开始创建时，内部什么都没有
    builder.append("AAA");   //我们可以使用append方法来讲字符串拼接到后面
    builder.append("BBB");
    builder.delete(2, 4);   //删除2到4这个范围内的字符
    System.out.println(builder.toString());   //当我们字符串编辑完成之后，就可以使用toString转换为字符串了
}
```

字符串支持使用 `+` 和 `+=` 进行拼接操作, 但是拼接字符串实际上底层需要进行很多操作，如果程序中大量进行字符串的拼接似乎不太好，编译器是很聪明的，String的拼接会在编译时进行各种优化：  

对于变量来说

```java
public static void main(String[] args) {
    String str1 = "你看";
    String str2 = "这";
    String str3 = "汉堡";
    String str4 = "做滴";
    String str5 = "行不行";
    String result = str1 + str2 + str3 + str4 + str5;   //5个变量连续加
    System.out.println(result);
}
```

如果直接使用加的话，每次运算都会生成一个新的对象，这里进行4次加法运算，那么中间就需要产生4个字符串对象出来，是不是有点太浪费了？
这种情况实际上会被优化为下面的写法：  

```java
public static void main(String[] args) {
    String str1 = "你看";
    String str2 = "这";
    String str3 = "汉堡";
    String str4 = "做滴";
    String str5 = "行不行";
    StringBuilder builder = new StringBuilder();
    builder.append(str1).append(str2).append(str3).append(str4).append(str5);
    System.out.println(builder.toString());
}
```

#### 正则表达式

`str.match(正则表达式)`

正则表达式(regular expression)描述了一种字符串匹配的模式（pattern），可以用来检查一个串是否含有某种子串、将匹配的子串替换或者从某个串中取出符合某个条件的子串等。  

```java
public static void main(String[] args) {
    String str = "oooo";
    //matches方法用于对给定正则表达式进行匹配，匹配成功返回true，否则返回false
    System.out.println(str.matches("o+"));   //+表示对前面这个字符匹配一次或多次，这里字符串是oooo，正好可以匹配
}
```

用于规定给定组件必须要出现多少次才能满足匹配的，我们一般称为限定符，限定符表如下：

| 字符  |                             描述                             |
| :---: | :----------------------------------------------------------: |
|   *   | 匹配前面的子表达式零次或多次。例如，**zo\*** 能匹配 **"z"** 以及 **"zoo"**。***** 等价于 **{0,}**。 |
|   +   | 匹配前面的子表达式一次或多次。例如，**zo+** 能匹配 **"zo"** 以及 "**zoo"**，但不能匹配 **"z"**。**+** 等价于 **{1,}**。 |
|   ?   | 匹配前面的子表达式零次或一次。例如，**do(es)?** 可以匹配 **"do"** 、 **"does"**、 **"doxy"** 中的 **"do"** 。**?** 等价于 **{0,1}**。 |
|  \{n\}  | n 是一个非负整数。匹配确定的 **n** 次。例如，**o{2}** 不能匹配 **"Bob"** 中的 **o**，但是能匹配 **"food"** 中的两个 **o**。 |
| \{n,\}  | n 是一个非负整数。至少匹配n 次。例如，**o{2,}** 不能匹配 **"Bob"** 中的 **o**，但能匹配 **"foooood"** 中的所有 **o**。**o{1,}** 等价于 **o+**。**o{0,}** 则等价于 **o\***。 |
| \{n,m\} | m 和 n 均为非负整数，其中 n <= m。最少匹配 n 次且最多匹配 m 次。例如，**o{1,3}** 将匹配 **"fooooood"** 中的前三个 **o**。**o{0,1}** 等价于 **o?**。请注意在逗号和两个数之间不能有空格。 |

如果我们想要表示一个范围内的字符，可以使用方括号：

```java
public static void main(String[] args) {
    String str = "abcabccaa";
    System.out.println(str.matches("[abc]*"));   //表示abc这几个字符可以出现 0 - N 次
}
```

对于普通字符来说，我们可以下面的方式实现多种字符匹配：

|    字符    |                             描述                             |
| :--------: | :----------------------------------------------------------: |
| **[ABC]**  | 匹配 **[...]** 中的所有字符，例如 **[aeiou]** 匹配字符串 "google runoob taobao" 中所有的 e o u a 字母。 |
| **[^ABC]** | 匹配除了 **[...]** 中字符的所有字符，例如 **[^aeiou]** 匹配字符串 "google runoob taobao" 中除了 e o u a 字母的所有字母。 |
| **[A-Z]**  | [A-Z] 表示一个区间，匹配所有大写字母，[a-z] 表示所有小写字母。 |
|   **.**    |  匹配除换行符（\n、\r）之外的任何单个字符，相等于 \[^\n\r]   |
| **[\s\S]** | 匹配所有。\s 是匹配所有空白符，包括换行，\S 非空白符，不包括换行。 |
|   **\w**   |         匹配字母、数字、下划线。等价于 [A-Za-z0-9_]          |

当然，这里仅仅是对正则表达式的简单使用，实际上正则表达式内容非常多，如果需要完整学习正则表达式，可以到：<https://www.runoob.com/regexp/regexp-syntax.html>

正则表达式并不是只有Java才支持，其他很多语言比如JavaScript、Python等等都是支持正则表达式的。  
