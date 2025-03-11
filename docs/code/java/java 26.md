---
title: Java - 反射2
date: 2025-03-09
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.78
---

## 反射2

### 创建类对象 `getConstructor | newInstance`

可以通过`Class`对象来创建对象、调用方法、修改变量。  

- 我们通过 `newInstance()` 即可创建对应的对象实例。  

  通过使用`newInstance()`方法来创建对应类型的实例，返回泛型T，注意它会抛出`InstantiationException`和`IllegalAccessException`异常

  当类默认的构造方法被带参构造覆盖时，会出现`InstantiationException`异常，因为`newInstance()`**只适用于默认无参构造**。  

  当默认无参构造的权限不是`public`时，会出现`IllegalAccessException`异常，表示我们**无权去调用默认构造方法**。

  ```java
  public static void main(String[] args) throws InstantiationException, IllegalAccessException {
      Class<Student> clazz = Student.class;
      Student student = clazz.newInstance();
      student.test();
  }

  static class Student{
      public void test(){
          System.out.println("萨日朗");
      }
  }
  ```

- 在JDK9之后，不再推荐使用`newInstance()`方法, 而是通过获取构造器 `getConstructor()`，来实例化对象，通过获取类的构造方法（构造器）来创建对象实例，会更加合理。
  我们可以使用`getConstructor()`方法来获取类的权限为 `public` 的构造方法，同时我们需要向其中填入参数，也就是构造方法需要的**类型**
  
  ```java
    public static void main(String[] args) throws InstantiationException, IllegalAccessException, NoSuchMethodException, InvocationTargetException {
        Class<Student> clazz = Student.class;
        Constructor<Student> constructor = clazz.getConstructor(String.class);
        Student student = constructor.newInstance("penguin");
        student.test();
    }

    public class Student extends Test<String> {
      String name;
      int age;

      public Student(String name){
        this.name = name;
      }

      public void test(){
        System.out.println(this.name);
      }
    }
  ```

- 当访问权限不是`public`的时候, 会无法找到此构造方法, 使用`getDeclaredConstructor()`方法可以找到类中的非public构造方法，但是在使用之前，我们需要先修改访问权限，在修改访问权限之后，就可以使用非public方法了（这意味着，反射可以无视权限修饰符访问类的内容）.  

  ```java
    Class<Student> clazz = Student.class;
    Constructor<Student> constructor = clazz.getDeclaredConstructor(String.class);
    constructor.setAccessible(true);   //修改访问权限
    Student student = constructor.newInstance("what's up");
    student.test();
  ```

### 调用类方法 `getMethod | getDeclaredMethod`

我们可以通过反射来调用类的方法（本质上还是类的实例进行调用）只是利用反射机制实现了方法的调用。  

通过调用`getMethod()`方法，我们可以获取到类中所有声明为`public`的方法，得到一个`Method`对象，我们可以通过`Method`对象的`invoke()`方法（返回值就是方法的返回值，因为这里是void，返回值为null）来调用已经获取到的方法，注意传参。  

```java
// Student.java
package com.test;

public class Student {
    public void test(String str){
        System.out.println("Penguin "+str);
    }
}

// Main.java
public static void main(String[] args) throws ReflectiveOperationException {
    Class<?> clazz = Class.forName("com.test.Student");
    Object instance = clazz.newInstance();   //创建出学生对象
    Method method = clazz.getMethod("test", String.class);   //通过方法名和形参类型获取类中的方法
    
    method.invoke(instance, "!!!");   //通过Method对象的invoke方法来调用方法
}
```

我们发现，利用反射之后，在一个对象从构造到方法调用，没有任何一处需要引用到对象的实际类型，我们也没有导入`Student`类，整个过程都是反射在代替进行操作，使得整个过程被模糊了，过多的使用反射，会极大地降低后期维护性。

同构造方法一样，当出现非`public`方法时，我们可以通过反射来无视权限修饰符，获取非`public`方法并调用, 即通过 `getDeclaredMethod` + `setAccessible` 组合。

```java
// 将test()方法的权限修饰符改为private后
public static void main(String[] args) throws ReflectiveOperationException {
    Class<?> clazz = Class.forName("com.test.Student");
    Object instance = clazz.newInstance();   //创建出学生对象
    Method method = clazz.getDeclaredMethod("test", String.class);   //通过方法名和形参类型获取类中的方法
    method.setAccessible(true);

    method.invoke(instance, "what's up");   //通过Method对象的invoke方法来调用方法
}
```

`Method`和`Constructor`都和`Class`一样，他们存储了方法的信息，包括方法的形式参数列表，返回值，方法的名称等内容，我们可以直接通过`Method`对象来获取这些信息(``)：

```java
// Student.java
public class Student extends Test<String> {
    String name;
    int age;

    public Student(String name){
        this.name = name;
    }

    public void test(String s, int i){
        System.out.println(this.name);
    }
}

// Main.java
public static void main(String[] args) throws InstantiationException, IllegalAccessException, NoSuchMethodException, InvocationTargetException, ClassNotFoundException {
        Class<?> clazz = Class.forName("com.test.Student");
        Constructor<?> constructor = clazz.getConstructor(String.class);
        Object penguin = constructor.newInstance("penguin");
        Method method = clazz.getMethod("test", String.class, int.class);
        method.invoke(penguin, "qq", 123);

        System.out.println(method.getName());   //获取方法名称
        System.out.println(method.getReturnType());   //获取返回值类型
        for (Parameter parameter : method.getParameters()) {
            System.out.println(parameter);
        }
    }
```

![20250312002044](http://myimg.ekkosonya.cn/20250312002044.png)

当方法的参数为可变参数时, 变参数实际上就是一个数组，因此我们可以直接使用数组的class对象表示：

```java
Method method = clazz.getDeclaredMethod("test", String[].class);
```

当方法是静态方法时，`invoke`不需要对象参数，因为是属于类的。

反射非常强大，尤其是我们提到的越权访问，但是请一定谨慎使用，别人将某个方法设置为`private`一定有他的理由，如果实在是需要使用别人定义为private的方法，就必须确保这样做是安全的，在没有了解别人代码的整个过程就强行越权访问，可能会出现无法预知的错误。

### 修改类的属性 `getField()`

通过反射访问一个类中定义的成员字段也可以修改一个类的对象中的成员字段值，通过`getField()`方法来获取一个类定义的指定字段，在得到`Field`之后，我们就可以直接通过`set()`方法为某个对象，设定此属性的值，当访问`private`字段时，同样可以按照上面的操作进行越权访问（JAVA高版本不行，对反射进行了限制）

```java
public static void main(String[] args) throws InstantiationException, IllegalAccessException, NoSuchMethodException, InvocationTargetException, ClassNotFoundException, NoSuchFieldException {
        Integer i = 10;
        Field value = Integer.class.getDeclaredField("value");
        value.setAccessible(true);
        System.out.println(value.get(i));
        value.set(i, 20);
        System.out.println(i);
    }
```

通过反射可以直接将`final`修饰符直接去除

```java
public static void main(String[] args) throws ReflectiveOperationException {
    Integer i = 10;

    Field field = Integer.class.getDeclaredField("value");

    Field modifiersField = Field.class.getDeclaredField("modifiers");  //这里要获取Field类的modifiers字段进行修改
    modifiersField.setAccessible(true);
    modifiersField.setInt(field,field.getModifiers()&~Modifier.FINAL);  //去除final标记

    field.setAccessible(true);
    field.set(i, 100);   //强行设置值

    System.out.println(i);
}
```

我们可以发现，反射非常暴力，就连被定义为final字段的值都能强行修改，几乎能够无视一切阻拦。我们来试试看修改一些其他的类型：

```java
public static void main(String[] args) throws ReflectiveOperationException {
    List<String> i = new ArrayList<>();

    Field field = ArrayList.class.getDeclaredField("size");
    field.setAccessible(true);
    field.set(i, 10);

    i.add("测试");   //只添加一个元素
    System.out.println(i.size());  //大小直接变成11
    i.remove(10);   //瞎移除都不带报错的，淦
}
```

实际上，整个ArrayList体系由于我们的反射操作，导致被破坏，因此它已经无法正常工作了！

再次强调，在进行反射操作时，必须注意是否安全，虽然拥有了创世主的能力，但是我们不能滥用，我们只能把它当做一个不得已才去使用的工具！
