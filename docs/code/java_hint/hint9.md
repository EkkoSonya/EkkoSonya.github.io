---
title: hint - 注解理解3
date: 2026-04-05
category:
  - code
tag:
  - java hint
# star: true
# sticky: true
order: -0.7482
---

## 注解3

### 自定义注解流程

#### 自定义注解

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface Penguin {
    String value() default "";
}
```

#### 测试类

然后在 `Main.java` 使用

```java
import com.ekko.annotation.Penguin;

public class Main {
    @Penguin("123")
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}
```

#### 编译

编译 `Penguin.java` 时，javac 看到它上面有 `@Target` 和 `@Retention`，会依次做这些事：

```
javac 编译 Penguin.java
        ↓
发现 @Target({ElementType.TYPE, ElementType.METHOD})
        ↓
去 classpath 找 Target.class，加载进内存，提取两类信息：
  ① value() → ElementType[]            （用来校验你传的值类型合不合法）
  ② Target 自身的 @Retention(RUNTIME)  （说明 Target 运行时可见）
        ↓
发现 @Retention(RetentionPolicy.RUNTIME)
        ↓
去 classpath 找 Retention.class，同样提取信息
        ↓
校验通过，将注解信息写入 Penguin.class
  - 设置 ACC_ANNOTATION | ACC_INTERFACE 标志位
  - 隐式添加 implements java.lang.annotation.Annotation
  - 在 RuntimeVisibleAnnotations 属性中记录 @Target 和 @Retention 的值
```

用 `javap -v Penguin.class` 可以看到生成结果：

```plain
public interface com.ekko.annotation.Penguin extends java.lang.annotation.Annotation
  flags: ACC_PUBLIC, ACC_INTERFACE, ACC_ABSTRACT, ACC_ANNOTATION

  public abstract java.lang.String value();

RuntimeVisibleAnnotations:
  0: java.lang.annotation.Target(
       value=[TYPE, METHOD]
     )
  1: java.lang.annotation.Retention(
       value=RUNTIME
     )
```

编译 `Main.java` 时，javac 看到 `@Penguin("123")` 用在了 `main` 方法上：

```
发现 @Penguin("123") 标注在方法上
        ↓
加载 Penguin.class，读取它的 @Target → 允许 METHOD ✓
        ↓
读取 value() 的返回类型 → String，检查传入的 "123" 类型是否匹配 ✓
        ↓
读取 @Retention(RUNTIME) → 需要写入 .class 且运行时可见
        ↓
将注解信息写入 Main.class 的 RuntimeVisibleAnnotations 属性
```

#### 运行时读取

注解标注了 `@Retention(RetentionPolicy.RUNTIME)`，所以可以在运行时通过反射读取：

```java
import com.ekko.annotation.Penguin;
import java.lang.reflect.Method;

public class Main {
    @Penguin("123")
    public static void main(String[] args) throws Exception {
        Method method = Main.class.getMethod("main", String[].class);

        if (method.isAnnotationPresent(Penguin.class)) {
            Penguin penguin = method.getAnnotation(Penguin.class);
            System.out.println(penguin.value()); // 输出: 123
        }
    }
}
```

反射读取流程：

```
method.getAnnotation(Penguin.class)
        ↓
JVM 去 Main.class 的 RuntimeVisibleAnnotations 属性里查找
        ↓
找到 @Penguin，value = "123"
        ↓
JVM 动态生成一个实现了 Penguin 接口的代理对象返回
        ↓
调用 penguin.value() → 返回 "123"
```

### SOURCE 级别

`SOURCE` 级注解在编译后就被丢弃，它靠的是 **APT（Annotation Processing Tool，注解处理器）** 在编译期处理，典型代表是 Lombok 的 `@Data`、`@Getter`。

```
你的 .java 源文件
        ↓
javac 启动，先运行所有注册的注解处理器（APT）
        ↓
APT 读取 AST（抽象语法树），发现 @Data 注解
        ↓
APT 自动生成 getter/setter/toString 等方法，插入 AST
        ↓
javac 继续编译（此时 AST 里已经有生成的代码了）
        ↓
输出 .class 文件（@Data 注解本身不写入）
```

自己写一个最简单的 APT，在编译时打印所有被 `@Penguin` 标注的方法：

```java
import javax.annotation.processing.*;
import javax.lang.model.element.*;
import java.util.Set;

@SupportedAnnotationTypes("com.ekko.annotation.Penguin")
@SupportedSourceVersion(javax.lang.model.SourceVersion.RELEASE_17)
public class PenguinProcessor extends AbstractProcessor {

    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        for (Element element : roundEnv.getElementsAnnotatedWith(Penguin.class)) {
            processingEnv.getMessager().printMessage(
                javax.tools.Diagnostic.Kind.NOTE,
                "发现 @Penguin 标注的元素: " + element.getSimpleName()
            );
        }
        return true;
    }
}
```

编译时会看到：

```
注意: 发现 @Penguin 标注的元素: main
```

### CLASS 级别

`CLASS` 注解会写入 `.class` 文件，但 JVM 加载时**不读入内存**，无法用反射获取。它的使用者是**字节码操作工具**，在 `.class` 文件加载进 JVM 之前直接修改字节码。

```
.class 文件（含 CLASS 级注解）
        ↓
字节码工具（ASM / Javassist）读取
        ↓
发现注解标记，按规则修改字节码（插入代码、替换方法体等）
        ↓
修改后的字节码交给 JVM 加载
        ↓
JVM 运行（注解已不可见，效果已生效）
```

典型代表：AspectJ 的编译期织入

### 三种处理时机对比

| | SOURCE + APT | CLASS + 字节码工具 | RUNTIME + 反射 |
| --- | --- | --- | --- |
| **处理时机** | 编译期 | 编译后 / 加载前 | 运行时 |
| **处理者** | 注解处理器（APT） | ASM / Javassist 等 | 你自己的代码 |
| **典型代表** | Lombok `@Data` | AspectJ 编译期织入 | Spring `@Autowired` |
| **性能** | 零运行时开销 | 很低开销 | 有反射开销 |
| **注解写入 .class** | ❌ | ✅ | ✅ |
| **运行时可见** | ❌ | ❌ | ✅ |
