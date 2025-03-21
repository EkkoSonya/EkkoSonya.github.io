---
title: Java - 内部类
date: 2024-10-26
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.95
---

# 面向对象高级篇 3

静态 属于 类， 成员 属于 对象。

## 内部类

内部类顾名思义，就是创建在内部的类。  

### 成员内部类 (属于 对象)

成员内部类其实在某些情况下使用起来比较麻烦，对于这种成员内部类，我们一般只会在类的内部自己使用  

成员内部类和成员方法、成员变量一样，**是对象所有的**，而**不是类所有的**，
如果我们要使用成员内部类，那么就需要创造一个对象，才能去 `new` 一个成员内部类。

- 我们可以直接在类的内部定义成员内部类：

  ```java
  public class Test {
      public class Inner {   
        //内部类也是类，所以说里面也可以有成员变量、方法等，甚至还可以继续套娃一个成员内部类
          public void test(){
              System.out.println("我是成员内部类！");
          }
      }
  }
  ```

  ```java
  public static void main(String[] args) {
      Test test = new Test();   //我们首先需要创建对象
      Test.Inner inner = test.new Inner();   //成员内部类的类型名称就是 外层.内部类名称
      inner.test();
  }
  ```

  注意，成员内部类也可以使用访问权限控制，如果我们我们将其权限改为private，那么就像我们把成员变量访问权限变成私有一样，外部是无法访问到这个内部类的.  

- 这里我们需要特别注意一下，在成员内部类中，是**可以访问到外层的变量的**  

  ```java
  public class Test {
      private final String name;
      
      public Test(String name){
          this.name = name;
      }
      public class Inner {
          public void test(){
              System.out.println("我是成员内部类："+name);
              //成员内部类可以访问到外部的成员变量
              //因为成员内部类本身就是某个对象所有的，每个对象都有这样的一个类定义，这里的name是其所依附对象的
          }
      }
  }
  ```

- 每个类可以创建一个对象，**每个对象中都有一个单独的类定义**，可以通过这个成员内部类又创建出更多对象，套娃了属于是。  

  ![20241027012950](../../img/java/4.png)

  ```java
  public static void main(String[] args) {
      Test a = new Test("小明");
      Test.Inner inner1 = a.new Inner();   //依附于a创建的对象，那么就是a的
      inner1.test();

      Test b = new Test("小红");
      Test.Inner inner2 = b.new Inner();  //依附于b创建的对象，那么就是b的
      inner2.test();
  }
  ```

- 那么如果内部类中也定义了同名的变量，此时我们怎么去明确要使用的是哪一个 (**就近原则**)
  如果需要指定为外部的对象，那么需要**在前面添加外部类型名称** `Test.this.`

  ```java
  public class Test {
    private final String name;

    public Test(String name){
        this.name = name;
    }
    public class Inner {

        String name;
        public void test(String name){
            System.out.println("方法参数的name = "+name);    
            //依然是就近原则，最近的是参数，那就是参数了
            System.out.println("成员内部类的name = "+this.name);   
            //在内部类中使用this关键字，只能表示内部类对象
            System.out.println("成员内部类的name = "+Test.this.name);
            //如果需要指定为外部的对象，那么需要在前面添加外部类型名称
        }
    }
  ```

  包括对方法的调用和super关键字的使用，也是一样的：

  ```java
  public class Inner {
      String name;
      public void test(String name){
          this.toString();    //内部类自己的toString方法
          super.toString();    //内部类父类的toString方法
          Test.this.toString();   //外部类的toSrting方法
          Test.super.toString();  //外部类父类的toString方法
      }
  }
  ```

### 静态内部类 (属于 类)

静态内部类就像静态方法和静态变量一样，是属于类的，不需要，依附任何对象我们可以直接创建使用。  

```java
public class Test {
  private final String name;

  public Test(String name){
      this.name = name;
  }

  public static class Inner {
      public void test(){
          System.out.println("我是静态内部类！");
      }
  }
}
```

不需要依附任何对象，我们可以直接创建静态内部类的对象：

```java
public static void main(String[] args) {
  Test.Inner inner = new Test.Inner();   //静态内部类的类名同样是之前的格式，但是可以直接new了
  inner.test();
}
```

静态内部类由于是静态的，所以相对外部来说，整个内部类中都处于静态上下文（注意只是相当于外部来说）是无法访问到**外部类的非静态内容的**  

### 局部内部类

(这种局部内部类的形式，使用频率很低，基本上不会用到)  
局部内部类就像局部变量一样，可以在**方法**中定义。  
基本定义是：(不需要声明访问权限，因为它作用范围就只是**方法**内)

```java
public 方法名(){
  class 局部内部类名 {
    内容
  }
}
```

既然是在方法中声明的类，那**作用范围也就只能在方法中**了

```java
public class Test {
    private final String name;

    public Test(String name){
        this.name = name;
    }

    public void hello(){
        class Inner {    
          //直接在方法中创建局部内部类
          public void test(){
              System.out.println("我是局部内部类");
          }
        }
        Inner inner = new Inner();   //局部内部类直接使用类名就行
        inner.test();
    }
}
```

### 静态内部类编译特性

```java
package com.test;
import com.test.entity.Test;

public class Main {
    public static void main(String[] args) {
        Test.Inner.test();
    }
}
```

```java
package com.test.entity;

public class Test {
    static {
        System.out.println("外部类初始化");
    }

    public static class Inner {
        static {
            System.out.println("内部类初始化");
        }

        public static void test(){
            System.out.println("内部类静态方法");
        }
    }
}
```

结果是：  

![20241027015244](../../img/java/5.png)

说明这种情况下，只是初始化了内部类的，并没有初始化内部类，因为并没有使用到外部类的任何静态变量，所以只初始化了内部类。  
因为在编译的时候，类的内部类它会单独生成一个 `.class`，当你使用内部类静态方法，不会调用外部类的 `class`  
![20241027015627](../../img/java/6.png)
只有在你使用到外部类的静态变量或方法后，才会初始化外部类, 但还是先初始化内部类。  

```java
package com.test.entity;

public class Test {
    public static String name = "penguin";
    
    static {
        System.out.println("外部类初始化");
    }

    public static class Inner {
        static {
            System.out.println("内部类初始化");
        }

        public static void test(){
            System.out.println("使用外部静态变量" + name);
            System.out.println("内部类静态方法");
        }
    }
}
```

输出为：  

![20241027015718](../../img/java/7.png)

### 匿名内部类

匿名内部类是我们使用频率非常高的一种内部类，它是**局部内部类的简化版**。  

不能直接通过 `new` 的方式去创建一个抽象类或是接口对象，正常情况下，要创建一个抽象类的实例对象，只能对其**进行继承**，先**实现未实现的方法**，然后**创建子类对象**。  

但我们可以在方法中**使用匿名内部类**，将其中的抽象方法实现，并**直接创建实例对象**  

```java
public abstract class Student {
    public abstract void test();
}
```

```java
public static void main(String[] args) {
    Student student = new Student() {   
        //在new的时候，后面加上花括号，把未实现的方法实现了
        @Override
        public void test() {
            System.out.println("我是匿名内部类的实现!");
        }
    };
    student.test();
}
```

此时这里创建出来的Student对象，就是一个已经实现了抽象方法的对象，这个抽象类直接就定义好了，甚至连名字都没有，就可以直接就创出对象。  
匿名内部类中同样可以使用类中的属性（因为它本质上就相当于是对应类型的子类）

同样的，接口也可以通过这种匿名内部类的形式，直接创建一个**匿名的接口实现类**  
这样就是一个实现 接口 中方法 的匿名类，但类名必须与接口一致。

```java
package com.test.entity;

public interface Study {
    void study();
}
```

```java
public class Main {
    public static void main(String[] args) {
        Study ss = new Study() {
            @Override
            public void study() {
                System.out.println("penguin");
            }
        };
        ss.study();
    }
}
```

- 匿名对象本身不能定义新的属性。匿名对象的类是在创建时匿名生成的，但它继承自一个现有的类或实现了一个接口。因此，匿名类只能访问其父类的属性或方法，无法直接定义新的属性.
- 在 Java 中，匿名对象通常不能直接给属性赋值，因为匿名对象没有类名，**无法显式定义构造函数或初始化块**  
  因此，为了在创建匿名对象时进行属性初始化，Java 提供了一种特殊的语法，即使用初始化块 `{}`。

当然，并不是说只有抽象类和接口才可以像这样创建匿名内部类，普通的类也可以，只不过意义不大，一般情况下只是为了进行一些额外的初始化工作而已。
类似：  

```java
package com.test.entity;

public class Penguin {
    protected String apple;
    public void test(){
        System.out.println(apple);
    }
}
```

```java
public class Main {
    public static void main(String[] args) {
        Penguin pp = new Penguin(){
            {
                apple = "ppp";
            }
        };
        pp.test();
    }
}
```

### 匿名内部类特性

对于 匿名内部类 或者 Lambda 中，如果想用外部变量，只能使用 `final` 的变量，如果不是 `final`，会隐式修改为 `final` 即之后不能修改
```java
public static void main(String[] args) {
    int a = 10;
    // a = 20;
    // 如果修改了a 就会报错
    Study pp = new Study{
      @Override
      public void study(){
        System.out.println(a);
      }
    }
    pp.test();
}
```

### Lambda表达式

如果一个接口中**有且只有一个待实现的抽象方法**，那么我们**可以将匿名内部类简写为Lambda表达式**

```java
public static void main(String[] args) {
    Study study = () -> System.out.println("我是学习方法！");   //是不是感觉非常简洁！
  	study.study();
}
```

Lambda表达式的具体规范：  

- 标准格式为：`([参数类型 参数名称,]...) ‐> { 代码语句，包括返回值 }`
- 和匿名内部类不同，Lambda **仅支持接口**，**不支持抽象类**
- 接口内部必须有且仅有一个抽象方法（可以有多个方法，但是必须保证其他方法有默认实现，必须留一个抽象方法出来）

如果有一个参数和返回值的话：  

```java
public static void main(String[] args) {
    Study study = (a) -> {
        System.out.println("我是学习方法");
        return "今天学会了"+a;    //实际上这里面就是方法体，该咋写咋写
    };
    System.out.println(study.study(10));
}
```

如果参数只有一个，那么可以省去小括号  
如果方法体中只有一个返回语句，可以直接省去花括号和return关键字

```java
Study study = (a) -> {
    return "今天学会了"+a;   //这种情况是可以简化的
};
====================================
Study study = (a) -> "今天学会了"+a;
====================================
Study study = a -> "今天学会了"+a;
```

如果一个方法的参数需要的是一个接口的实现:  

```java
public static void main(String[] args) {
    test(a -> "今天学会了"+a);   //参数直接写成lambda表达式
}

private static void test(Study study){
    study.study(10);
}
```

对于已经实现的方法，如果我们想直接作为接口抽象方法的实现，我们还可以使用方法引用。

### 方法引用

方法引用 `类名::方法名` 就是将一个已实现的方法，直接作为接口中抽象方法的实现（当然前提是方法定义 **参数一样，返回值一样** 一样才行）  

```java
public interface Study {
    int sum(int a, int b);   //待实现的求和方法
}
```

- 那么使用时候，可以直接使用Lambda表达式：

  ```java
  public static void main(String[] args) {
      Study study = (a, b) -> a + b;
  }
  ```

- 只不过还能更简单，因为Integer类中默认提供了求两个int值之和的**静态方法**：
  
  ```java
  public static void main(String[] args) {
      Study study = (a, b) -> Integer.sum(a, b);   
      //直接使用Integer为我们通过好的求和方法
      System.out.println(study.sum(10, 20));
  }
  ================= 方法引用 类名::方法名 =========================
  public static void main(String[] args) {
      Study study = Integer::sum;    
      //使用双冒号来进行方法引用，静态方法使用 类名::方法名 的形式
      System.out.println(study.sum(10, 20));
  }
  ```

方法引用其实本质上就相当于**将其他方法的实现，直接作为接口中抽象方法的实现**。  

任何方法都可以通过方法引用作为实现：

```java
public interface Study {
    String study();
}
```

如果是**普通成员方法 (成员方法只能通过 对象 调用，不是静态方法)，我们同样需要使用对象来进行方法引用**：

```java
public static void main(String[] args) {
    Main main = new Main();
    Study study = main::lbwnb;   
    //成员方法因为需要具体对象使用，所以说只能使用 对象::方法名 的形式
}

public String lbwnb(){
    return "卡布奇诺今犹在，不见当年倒茶人。";
}
```

因为现在只需要一个String类型的返回值，由于String的**构造方法**在创建对象时也会得到一个String类型的结果，所以说：

```java
public static void main(String[] args) {
    Study study = String::new;    //没错，构造方法也可以被引用，使用new表示
}
```

反正只要是符合接口中方法的定义的，都可以直接进行方法引用。
