---
title: Java - IO3
date: 2025-02-25
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.83
---

## IO流3

### 转换流

有时会遇到这样一个很麻烦的问题：我这里读取的是一个字符串或是一个个字符，但是我只能往一个`OutputStream`里输出，但是`OutputStream`又只支持`byte类型`，如果要往里面写入内容，进行数据转换就会很麻烦  

```java
public static void main(String[] args) {
    try(OutputStreamWriter writer = new OutputStreamWriter(new FileOutputStream("test.txt"))){  
        //虽然给定的是FileOutputStream，但是现在支持以Writer的方式进行写入
        writer.write("lbwnb");   //以操作Writer的样子写入OutputStream
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

同样的，我们现在只拿到了一个`InputStream`，但是我们希望能够按**字符的方式**读取，我们就可以使用`InputStreamReader`来帮助我们实现

```java
public static void main(String[] args) {
    try(InputStreamReader reader = new InputStreamReader(new FileInputStream("test.txt"))){  //虽然给定的是FileInputStream，但是现在支持以Reader的方式进行读取
        System.out.println((char) reader.read());
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

`InputStreamReader` 和 `OutputStreamWriter` 本质也是**Reader**和**Writer**，因此可以直接放入 `BufferedReader` 来实现更加方便的操作。

### 打印流 `PrintStream`

打印流其实我们从一开始就在使用了，比如`System.out`就是一个`PrintStream`，`PrintStream`也继承自`FilterOutputStream`类  

```java
public final static PrintStream out = null;
```

因此依然是装饰我们传入的输出流，但是它存在**自动刷新机制**，例如当向`PrintStream`流中写入一个字节数组后自动调用`flush`()方法。  

`PrintStream`也永远不会抛出异常，而是使用内部检查机制`checkError()`方法进行错误检查。最方便的是，它能够格式化任意的类型，将它们以字符串的形式写入到输出流。

可以看到`System.out`也是`PrintStream`，不过默认是向控制台打印，我们也可以让它向文件中打印：

```java
public static void main(String[] args) {
    try(PrintStream stream = new PrintStream(new FileOutputStream("test.txt"))){
        stream.println("penguin");   //其实System.out就是一个PrintStream
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

我们平时使用的`println`方法就是`PrintStream`中的方法，它会直接打印基本数据类型或是调用对象的`toString()`方法得到一个字符串，并将字符串转换为字符，放入缓冲区再经过转换流输出到给定的输出流上。

![20250225192918](http://myimg.ekkosonya.cn/20250225192918.png)

### 输入流

之前使用的`Scanner`，使用的是系统提供的输入流

```java
public static void main(String[] args) {
    Scanner scanner = new Scanner(System.in);   //系统输入流，默认是接收控制台输入
}
```

我们也可以使用Scanner来扫描其他的输入流：

```java
public static void main(String[] args) throws FileNotFoundException {
    Scanner scanner = new Scanner(new FileInputStream("秘制小汉堡.txt"));  //将文件内容作为输入流进行扫描
}
```

### 数据流 `DataInputStream`

数据流`DataInputStream`也是`FilterInputStream`的子类，同样采用**装饰者模式**，最大的不同是它**支持基本数据类型的直接读取**：  

```java
public static void main(String[] args) {
    try (DataInputStream dataInputStream = new DataInputStream(new FileInputStream("test.txt"))){
        System.out.println(dataInputStream.readBoolean());   //直接将数据读取为任意基本数据类型
    }catch (IOException e) {
        e.printStackTrace();
    }
}
```

用于写入基本数据类型:  

```java
public static void main(String[] args) {
    try (DataOutputStream dataOutputStream = new DataOutputStream(new FileOutputStream("output.txt"))){
        dataOutputStream.writeBoolean(false);
    }catch (IOException e) {
        e.printStackTrace();
    }
}
```

注意，写入的是二进制数据，并不是写入的字符串，**使用`DataInputStream`可以读取，一般他们是配合一起使用的。**

### 对象流

`ObjectOutputStream`不仅支持基本数据类型，而且通过对对象的序列化操作，以某种格式保存对象，来支持对象类型的IO，注意：**它不是继承自FilterInputStream的。**

#### 对象序列化

自己定义的类要序列化保存，则必须实现`Serializable`接口才能被序列化

```java
public static void main(String[] args) {
    try (ObjectOutputStream outputStream = new ObjectOutputStream(new FileOutputStream("output.txt"));
         ObjectInputStream inputStream = new ObjectInputStream(new FileInputStream("output.txt"))){
        People people = new People("penguin");
        outputStream.writeObject(people);
        outputStream.flush();
        people = (People) inputStream.readObject();
        System.out.println(people.name);
    }catch (IOException | ClassNotFoundException e) {
        e.printStackTrace();
    }
}

static class People implements Serializable{   
    //必须实现Serializable接口才能被序列化
    String name;

    public People(String name){
        this.name = name;
    }
}
```

#### `serialVersionUID`

在我们后续的操作中，有可能会使得这个类的一些结构发生变化，而原来保存的数据只适用于之前版本的这个类，因此我们需要一种方法来区分类的不同版本：  

```java
static class People implements Serializable{
    private static final long serialVersionUID = 123456;   
    //在序列化时，会被自动添加这个属性，它代表当前类的版本，我们也可以手动指定版本。

    String name;

    public People(String name){
        this.name = name;
    }
}
```

#### `transient`关键字

如果我们不希望某些属性参与到序列化中进行保存，我们可以添加`transient`关键字：  

```java
public static void main(String[] args) {
    try (ObjectOutputStream outputStream = new ObjectOutputStream(new FileOutputStream("output.txt"));
         ObjectInputStream inputStream = new ObjectInputStream(new FileInputStream("output.txt"))){
        People people = new People("lbw");
        outputStream.writeObject(people);
        outputStream.flush();
        people = (People) inputStream.readObject();
        System.out.println(people.name);  //虽然能得到对象，但是name属性并没有保存，因此为null
    }catch (IOException | ClassNotFoundException e) {
        e.printStackTrace();
    }
}

static class People implements Serializable{
    private static final long serialVersionUID = 1234567;

    transient String name;

    public People(String name){
        this.name = name;
    }
}
```

其实我们可以看到，在一些JDK内部的源码中，也存在大量的transient关键字，使得某些属性不参与序列化，取消这些不必要保存的属性，可以节省数据空间占用以及减少序列化时间。
