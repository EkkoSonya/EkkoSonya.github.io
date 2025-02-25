---
title: Java - IO
date: 2025-01-27
category:
  - code
tag:
  - java
# star: true
# sticky: true
order: -0.84
---

## IO流1

一般在`java.io`中

- **字节流**：

    处理单位：以字节（8 位）为单位进行读写操作。

    适用场景：适用于处理所有类型的数据，包括文本、图片、音频、视频等二进制数据。

    主要类：InputStream 和 OutputStream 及其子类，如 FileInputStream 和 FileOutputStream。

    编码处理：不涉及字符编码转换，直接处理原始字节数据。

- **字符流**：

    处理单位：以字符（16 位）为单位进行读写操作。

    适用场景：专门用于处理文本数据，如读取和写入文本文件。

    主要类：Reader 和 Writer 及其子类，如 FileReader 和 FileWriter。

    编码处理：自动处理字符编码转换，适用于处理文本文件。

**主要区别：**
**处理单位**：字节流以字节为单位，字符流以字符为单位。
**适用范围**：字节流适用于所有类型的数据，字符流仅适用于文本数据。
**编码处理**：字节流不处理字符编码，字符流自动处理字符编码转换。
**性能**：字符流在处理文本数据时通常更高效，因为它们直接操作字符，减少了字节到字符的转换时间。

### 文件字节流

#### 输入流 `java.io.FileInputStream`

我们可以通过它来获取文件的输入流：  
在使用完成一个流之后，必须关闭这个流来完成对资源的释放，否则资源会被一直占用  

```java
public static void main(String[] args) {
    FileInputStream inputStream = null;    //定义可以先放在try外部
    try {
        inputStream = new FileInputStream("路径");
    } catch (FileNotFoundException e) {
        e.printStackTrace();
    } finally {
        try {    //建议在finally中进行，因为关闭流是任何情况都必须要执行的！
            if(inputStream != null) inputStream.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

不过上面写法比较繁琐，在JDK1.7新增了try-with-resource语法，用于简化这样的写法：  

```java
public static void main(String[] args) {

    //注意，这种语法只支持实现了AutoCloseable接口的类！
    try(FileInputStream inputStream = new FileInputStream("路径")) {   //直接在try()中定义要在完成之后释放的资源

    } catch (IOException e) {   //这里变成IOException是因为调用close()可能会出现，而FileNotFoundException是继承自IOException的
        e.printStackTrace();
    }
    //无需再编写finally语句块，因为在最后自动帮我们调用了close()
}
```

这种语法**只支持实现了AutoCloseable接口的类**

##### 文件读取

- `read` 方法  
    使用read可以直接读取一个字节的数据，注意，流的内容是有限的，读取一个少一个。我们如果想一次性全部读取的话，可以直接使用一个while循环来完成：

    ```java
    public static void main(String[] args) {
        //test.txt：abcd
        try(FileInputStream inputStream = new FileInputStream("test.txt")) {
            int tmp;
            while ((tmp = inputStream.read()) != -1){   //通过while循环来一次性读完内容
                System.out.println((char)tmp);
            }
        }catch (IOException e){
            e.printStackTrace();
        }
    }
    ```

- `available` 方法  
    使用available方法能查看当前可读的剩余字节数量（注意：并不一定真实的数据量就是这么多，尤其是在网络I/O操作时，这个方法只能进行一个预估也可以说是暂时能一次性可以读取的数量，当然在磁盘IO下，一般情况都是真实的数据量）  
    因此与`read`结合，可以一次直接读取全部数据：  

    ```java
    public static void main(String[] args) {
        //test.txt：abcd
        try(FileInputStream inputStream = new FileInputStream("test.txt")) {
            byte[] bytes = new byte[inputStream.available()];   //我们可以提前准备好合适容量的byte数组来存放
            System.out.println(inputStream.read(bytes));   //一次性读取全部内容（返回值是读取的字节数）
            System.out.println(new String(bytes));   //通过String(byte[])构造方法得到字符串
        }catch (IOException e){
            e.printStackTrace();
        }
    }
    ```

    也可以控制读取的数量：  

    ```java
    System.out.println(inputStream.read(bytes, 1, 2));   //第二个参数是从给定数组的哪个位置开始放入内容，第三个参数是读取流中的字节数
    ```

- `skip` 方法
    可以跳过指定数量的字节

    ```java
    public static void main(String[] args) {
        //test.txt：abcd
        try(FileInputStream inputStream = new FileInputStream("test.txt")) {
            System.out.println(inputStream.skip(1));
            System.out.println((char) inputStream.read());   //跳过了一个字节
        }catch (IOException e){
            e.printStackTrace();
        }
    }
    ```

#### 输出流 `java.io.FileOutputStream`

```java
public static void main(String[] args) {
    //输出流也需要在最后调用close()方法，并且同样支持try-with-resource
    try(FileOutputStream outputStream = new FileOutputStream("output.txt")) {
        //注意：若此文件不存在，会直接创建这个文件！
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

输出流没有`read()`操作而是`write()`操作，使用方法同输入流一样，只不过现在的方向变为我们向文件里写入内容:

```java
public static void main(String[] args) {
    try(FileOutputStream outputStream = new FileOutputStream("output.txt")) {
        outputStream.write('c');   //同read一样，可以直接写入内容
        outputStream.write("lbwnb".getBytes());   //也可以直接写入byte[]
        outputStream.write("lbwnb".getBytes(), 0, 1);  //同上输入流
        outputStream.flush();  //建议在最后执行一次刷新操作（强制写入）来保证数据正确写入到硬盘文件中
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

##### 追加操作

```java
public static void main(String[] args) {
    try(FileOutputStream outputStream = new FileOutputStream("output.txt", true)) {  //true表示开启追加模式
        outputStream.write("lb".getBytes());   //现在只会进行追加写入，而不是直接替换原文件内容
        outputStream.flush();
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

### 文件拷贝操作实现

```java
public static void main(String[] args) {
    try(FileOutputStream outputStream = new FileOutputStream("output.txt");
        FileInputStream inputStream = new FileInputStream("test.txt")) {   //可以写入多个
        byte[] bytes = new byte[10];    //使用长度为10的byte[]做传输媒介
        int tmp;   //存储本地读取字节数
        while ((tmp = inputStream.read(bytes)) != -1){   //直到读取完成为止
            outputStream.write(bytes, 0, tmp);    //写入对应长度的数据到输出流
        }
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

### 文件字符流

`java.io.FileReader` & `java.io.FileWriter`

#### `FileReader`

字符流不同于字节，字符流是以**一个具体的字符**进行读取，因此它只适合读**纯文本**的文件，如果是其他类型的文件不适用.

```java
public static void main(String[] args) {
    try(FileReader reader = new FileReader("test.txt")){
      	reader.skip(1);   //现在跳过的是一个字符
        System.out.println((char) reader.read());   //现在是按字符进行读取，而不是字节，因此可以直接读取到中文字符
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

同理，字符流只支持`char[]`类型作为存储：  

```java
public static void main(String[] args) {
    try(FileReader reader = new FileReader("test.txt")){
        char[] str = new char[10];
        reader.read(str);
        System.out.println(str);   //直接读取到char[]中
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

#### `FileWriter`

`writer`除了`write`方法外，还有一个`append`方法，但效果是一致的

```java
public static void main(String[] args) {
    try(FileWriter writer = new FileWriter("output.txt")){
      	writer.getEncoding();   //支持获取编码（不同的文本文件可能会有不同的编码类型）
       writer.write('牛');
       writer.append('牛');   //其实功能和write一样
      	writer.flush();   //刷新
    }catch (IOException e){
        e.printStackTrace();
    }
}
```

#### `File`类

专门用于表示一个文件或文件夹，只不过它只是代表这个文件，但并不是这个文件本身。通过`File`对象，可以更好地管理和操作硬盘上的文件。  

```java
public static void main(String[] args) {
    File file = new File("test.txt");   //直接创建文件对象，可以是相对路径，也可以是绝对路径
    System.out.println(file.exists());   //此文件是否存在
    System.out.println(file.length());   //获取文件的大小
    System.out.println(file.isDirectory());   //是否为一个文件夹
    System.out.println(file.canRead());   //是否可读
    System.out.println(file.canWrite());   //是否可写
    System.out.println(file.canExecute());   //是否可执行
}
```

通过`File`对象，我们就能快速得到文件的所有信息，如果是文件夹，还可以获取文件夹内部的文件列表等内容:  

```java
File file = new File("/");
System.out.println(Arrays.toString(file.list()));   //快速获取文件夹下的文件名称列表
for (File f : file.listFiles()){   //所有子文件的File对象
    System.out.println(f.getAbsolutePath());   //获取文件的绝对路径
}
```

如果我们希望读取某个文件的内容，可以直接将File作为参数传入字节流或是字符流：  

```java
File file = new File("test.txt");
try (FileInputStream inputStream = new FileInputStream(file)){   //直接做参数
    System.out.println(inputStream.available());
}catch (IOException e){
    e.printStackTrace();
}
```
