---
title: Java - 反射1
date: 2025-03-09
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.78
---

## 反射1

### 反射

反射就是把Java类中的各个成分映射成一个个的Java对象。即在运行状态中，**对于任意一个类，都能够知道这个类所有的属性和方法**，对于任意一个对象，都能调用它的任意一个方法和属性。**这种动态获取信息及动态调用对象方法**的功能叫Java的反射机制。

简而言之，我们可以通过反射机制，获取到类的一些属性，包括类里面有哪些字段，有哪些方法，继承自哪个类，甚至还能获取到泛型！它的权限非常高，慎重使用！

### JAVA 类加载机制

![20250310160214](http://myimg.ekkosonya.cn/20250310160214.png)

在Java程序启动时，JVM会将一部分类（**class文件**）先加载（并不是所有的类都会在一开始加载），通过`ClassLoader`将类加载，在加载过程中，会将类的信息提取出来（存放在元空间中，JDK1.8之前存放在永久代），同时也会生成一个**Class对象**存放在**内存（堆内存）**，注意此Class对象**只会存在一个**，与加载的类唯一对应！  

简单理解为： 默认情况下（**仅使用默认类加载器**）每个类都**有且只有一个唯一的Class对象**存放在JVM中，我们无论通过什么方式访问，都是**始终是那一个对象**。  

Class对象中包含我们类的一些信息，包括类里面有哪些方法、哪些变量等等。

### Class 类

在类加载过程的同时，会提取一个类的信息生成**Class对象存放在内存中**，而反射机制其实就是利用这些存放的类信息，来**获取类的信息和操作类**。  

#### 获取相应类的Class对象

共有三种方法，无论哪种方法所获取到的 Class 对象始终是相同的。  
所以类锁本质上就是对应的类的 Class 对象。

```java
public static void main(String[] args) throws ClassNotFoundException {
    Class<String> clazz = String.class;   
    //使用class关键字，通过类名获取
    Class<?> clazz2 = Class.forName("java.lang.String");   
    //使用Class类静态方法forName()，通过包名.类名获取，注意返回值是Class<?>
    Class<?> clazz3 = new String("cpdd").getClass();  
    //通过实例对象获取
}
```

#### 基本数据类型的 Class 对象

基本数据类型也有对应的`Class`对象（反射操作可能需要用到），而且我们不仅可以通过`class`关键字获取，其实本质上是定义在**对应的包装类**中的.  

```java
/**
 * The {@code Class} instance representing the primitive type
 * {@code int}.
 *
 * @since   JDK1.1
 */
@SuppressWarnings("unchecked")
public static final Class<Integer>  TYPE = (Class<Integer>) Class.getPrimitiveClass("int");

/*
 * Return the Virtual Machine's Class object for the named
 * primitive type
 */
static native Class<?> getPrimitiveClass(String name);   //C++实现，并非Java定义
```

每个包装类中（包括Void），都有一个获取原始类型Class方法，注意，`getPrimitiveClass`获取的是原始类型，并不是包装类型，只是可以使用包装类来表示。  

包装类型都有一个`TYPE`，其实也就是基本类型的`Class`，但包装类的`Class`和基本类的`Class`显然是不同的。

```java
public static void main(String[] args) {
    System.out.println(Integer.TYPE == Integer.class);
}
```

#### 数组的 Class 对象

数组类型也是一种类型，只是编程不可见

```java
public static void main(String[] args) {
    Class<String[]> clazz = String[].class;
    System.out.println(clazz.getName());  
    //获取类名称（得到的是包名+类名的完整名称）
    System.out.println(clazz.getSimpleName());
    System.out.println(clazz.getTypeName());
    System.out.println(clazz.getClassLoader());   
    //获取它的类加载器
    System.out.println(clazz.cast(new Integer("10")));   
    //强制类型转换（会报错）
}
```

### Class 对象与多态

#### 类型比较

正常情况下，我们使用`instanceof`进行类型比较, 它可以判断一个对象是否为此接口或是类的实现或是子类：  

```java
public static void main(String[] args) {
    String str = "";
    System.out.println(str instanceof String);
}
```

有了 `Class` 后，可以有其他方式判断类型：  

```java
public static void main(String[] args) {
    String str = "";
    System.out.println(str.getClass() == String.class);   
    //直接判断是否为这个类型
}
```

- `asSubClass()`，判断是否为子类或是接口/抽象类的实现
  
  ```java
    public static void main(String[] args) {
        Integer i = 10;
        i.getClass().asSubclass(Number.class);   
        //当Integer不是Number的子类时，会产生异常
    }
  ```

- `getSuperclass()`，可以获取到父类的`Class`对象
  
  ```java
    public static void main(String[] args) {
        Integer i = 10;
        System.out.println(i.getClass().getSuperclass());
    }
  ```

- `getGenericSuperclass()`，获取父类的原始类型的`Type`
  
  ```java
    public static void main(String[] args) {
        Integer i = 10;
        Type type = i.getClass().getGenericSuperclass();
        System.out.println(type);
        System.out.println(type instanceof Class);
    }
  ```

  我们发现`Type`实际上是`Class`类的父接口，但是获取到的`Type`的**实现**并不一定是`Class`

  ```java
    public static void main(String[] args) {
        Integer i = 10;
        for (Class<?> anInterface : i.getClass().getInterfaces()) {
            System.out.println(anInterface.getName());
        }
    
        for (Type genericInterface : i.getClass().getGenericInterfaces()) {
            System.out.println(genericInterface.getTypeName());
        }
    }
  ```

- 泛型的参数获取 `ParameterizedType | TypeVariableImpl`
  
  如果一个类的父类是泛型，其对应的 `class` 就不是正常的 `class`， 而是一个参数化类型:  

  `class sun.reflect.generics.reflectiveObjects.TypeVariableImpl`
  
  对应地，我们从 参数化类型中可以获取到泛型在定义过程中的参数类型 `getActualTypeArguments`。

  ```java
    public static void main(String[] args) {
        ParameterizedType type = (ParameterizedType) ArrayList.class.getGenericSuperclass();
        Type[] types = type.getActualTypeArguments();
        for (Type type1 : types) {
            System.out.println(type1);
            System.out.println(type1.getClass());
        }
    }
  ```

  在这种情况下，对应的 `type` 由于泛型中未定义，所以是 `E`, 对应的`class` 类型为 `TypeVariableImpl`

  ![20250310165216](http://myimg.ekkosonya.cn/20250310165216.png)

  如果我们已经明确了继承的泛型的类型，那么对应返回的就是确定的类型 `class`

  ```java
    <!-- Test.java -->
    public class Test <T> {
    }

    <!-- Student.java -->
    public class Student extends Test<String> {
        String name;
        int age;
    }

    <!-- Main.java -->
    public static void main(String[] args) {
        ParameterizedType type = (ParameterizedType) Student.class.getGenericSuperclass();
        System.out.println(type);
        Type[] types = type.getActualTypeArguments();
        for (Type type1 : types) {
            System.out.println(type1);
            System.out.println(type1.getClass());
        }
    }
  ```

  ![20250310170039](http://myimg.ekkosonya.cn/20250310170039.png)

  此外，如果这种情况，由于类型擦除机制，仍然是获取不到具体的 `class` 的, 返回的仍然是 `E`

  ```java
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(Arrays.asList("ASDF"));

        ParameterizedType type = (ParameterizedType) list.getClass().getGenericSuperclass();
        System.out.println(type);
        Type[] types = type.getActualTypeArguments();
        for (Type type1 : types) {
            System.out.println(type1);
            System.out.println(type1.getClass());
        }
    }
  ```

  ![20250310170551](http://myimg.ekkosonya.cn/20250310170551.png)
