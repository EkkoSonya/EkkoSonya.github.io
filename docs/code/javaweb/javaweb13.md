---
title: javaweb - Mybatis3
date: 2024-06-10
category:
  - code
tag:
  - javaweb
  - mybatis
# star: true
# sticky: true
order: -0.7487
---

## Mybatis3

### Mybatis详解

由于`SqlSessionFactory`一般只需要创建一次，因此我们可以创建一个工具类来集中创建`SqlSession`，这样会更加方便一些：

```java
public class MybatisUtil {

    //在类加载时就进行创建
    private static SqlSessionFactory sqlSessionFactory;
    static {
        try {
            sqlSessionFactory = new SqlSessionFactoryBuilder().build(new FileInputStream("mybatis-config.xml"));
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        }
    }

    /**
     * 获取一个新的会话
     * @param autoCommit 是否开启自动提交（跟JDBC是一样的，如果不自动提交，则会变成事务操作）
     * @return SqlSession对象
     */
    public static SqlSession getSession(boolean autoCommit){
        return sqlSessionFactory.openSession(autoCommit);
    }
}
```

现在我们只需要在main方法中这样写即可查询结果了：

```java
public static void main(String[] args) {
    try (SqlSession sqlSession = MybatisUtil.getSession(true)){
        List<Student> student = sqlSession.selectList("selectStudent");
        student.forEach(System.out::println);
    }
}
```

#### 查询操作

1. `XML`配置sql操作
2. 对应`java`进行调用

查询操作在`XML`配置中使用一个`select`标签进行囊括

假设我们现在需要编写一个根据ID查询用户的操作，首先我们需要指定select操作的id：

```xml
<select id="selectUserById">  
</select>
```

接着是我们需要进行查询的参数，这里我们需要根据用户ID查询，那么传入的参数就是一个int类型的参数，参数也可以是字符串类型的，类型名称：

1. 如果是基本类型，需要使用`_int`这样前面添加下划线。
2. 如果是JDK内置的包装类型或是其他类型，可以直接使用其名称，比如`String`、`int`（Integer的缩写）、`Long`
3. 如果是自己编写的类型，需要完整的包名+类名才可以。

当然也可以直接不填这个属性，Mybatis会自动判断：

```xml
<select id="selectUserById" parameterType="int">
</select>
```

接下来就是编写我们的SQL语句了，由于这里我们需要通过一个参数来查询，所以需要填入一个占位符，通过使用`#{xxx}`或是`${xxx}`来填入我们给定的属性，名称随便：

```xml
<select id="selectUserById" parameterType="int">
    select * from user where id = #{id}
</select>
```

实际上Mybatis也是通过`PreparedStatement`首先进行一次预编译，来有效地防止SQL注入问题，但是如果使用`${xxx}`就不再是通过预编译，而是直接传值，因此对于常见的一些查询参数，我们一般都使用`#{xxx}`来进行操作保证安全性。

最后我们查询到结果后，一般都是将其转换为对应的实体类对象，所以说这里我们之间填写之前建好的实体类名称，使用`resultType`属性来指定：

```xml
<select id="selectUserById" parameterType="int" resultType="com.test.User">
    select * from user where id = #{id}
</select>
```

##### 别名

当然，如果你觉得像这样每次都要写一个完整的类名太累了，也可以为它起个别名，我们只需要在Mybatis的配置文件中进行编写即可：

```xml
<typeAliases>
    <typeAlias type="com.test.User" alias="User"/>
</typeAliases>
```

也可以直接扫描整个包下的所有实体类，自动起别名，默认情况下别名就是类的名称：

```xml
<typeAliases>
    <package name="com.test.entity"/>
</typeAliases>
```

这样，SQL语句映射配置我们就编写好了，接着就是Java这边进行调用了：

```java
//这里我们填写刚刚的id，然后将我们的参数填写到后面
User user = session.selectOne("selectUserById", 1);
System.out.println(user);
```

##### hashmap 转换

当然，如果你不需要转换为实体类，Mybatis也为我们提供了多种转换方案，比如转换为一个`Map`对象：

```xml
<select id="selectUserByIdAndAge" resultType="hashmap">
    select * from user where id = #{id}
</select>
```

```java
//使用Map类型变量进行接受，Key为String类型，Value为Object类型
Map<String, Object> user = session.selectOne("selectUserById", 1);
System.out.println(user);
```

##### 多参数查询

我们可以尝试接着来写一个同时查询ID和年龄的查询操作：

```xml
<select id="selectUserByIdAndAge" resultType="hashmap">
    select * from user where id = #{id} and age = #{age}
</select>
```

因为这里需要多个参数，我们可以使用一个`Map` (`Map.of`是JAVA9的特性)或是具有同样参数的实体类来传递，显然Map用起来更便捷一些，注意key的名称需要与我们编写的SQL语句中占位符一致：

```java
User user = session.selectOne("selectUserByIdAndAge", Map.of("id", 1, "age", 18));
System.out.println(user);
```

##### `resultMap`

下面这种情况，实体类中定义的属性名称和我们数据库中的名称不一样

这会导致Mybatis自动处理出现问题：

```java
@Data
public class User {
    int uid;
    String username;
    int age;
}
```

运行后发现，Mybatis虽然可以查询到对应的记录，但是转换的实体类数据并没有被添加上去，这是因为数据库字段名称与类中字段名称不匹配导致的，我们可以手动配一个`resultMap`来解决这种问题，直接在`Mapper`中添加：

```xml
<select id="selectUserByIdAndAge" resultMap="user">
    select * from user where id = #{id} and age = #{age}
</select>
<resultMap id="user" type="com.test.User">
    <!-- 因为id为主键，这里也可以使用<id>标签，有助于提高性能 -->
    <result column="id" property="uid"/>
    <result column="name" property="username"/>
</resultMap>
```

- `column` 对应数据库字段名
- `property` 对应实体类属性名

这里我们在`resultMap`标签中配置了一些r`esult`标签，每一个`result`标签都可以配置数据库字段和类属性的对应关系，这样Mybatis就可以按照我们的配置来正确找到对应的位置并赋值了，没有手动配置的字段会按照之前默认的方式进行赋值。

配置完成后，最终只需要将`resultType`改为`resultMap`并指定对应id即可，然后就能够正确查询了。

这里有一个`RowBounds`参数，用于实现分页效果，但是其分页功能是对查询到的数据进行划分，非常鸡肋，这里不进行介绍，了解即可。

##### 查询列表操作

我们再来尝试编写一下查询一个列表，查询列表时，resultType无需设置为list这种类型，而是使用List内部所包含的类型

所以这里还是填写`com.test.User`类型或是Map类型：

```xml
<select id="selectUsers" resultType="com.test.User">
    select * from user;
</select>
```

由于返回的结果是一个列表，这里我们需要使用`selectList`方法来执行，如果使用之前的`selectOne`会导致异常：

```java
List<User> user = session.selectList("selectUsers");
System.out.println(user);
```

我们同样可以进行简单的条件查询，比如我们想要查询所有年龄大于等于18岁的用户：

```xml
<select id="selectUsersByAge" resultType="com.test.User">
    select * from user where age &gt; #{age};
</select>
```

注意由于这里是XML配置，其中一些字符被用作标签表示，无法代表其原本的意思，比如小于、大于符号，分别需要使用`&lt;`和`&gt;`来进行转义。

```java
List<User> user = session.selectList("selectUsersByAge", 18);
```

一个比较特殊的选择方法`selectMap`

可以将查询结果以一个Map的形式表示，只不过这和我们之前说的Map不太一样，它返回的Map是使用我们想要的属性作为Key，然后得到的结果作为Value的Map，它适用于单个数据查询或是多行数据查询：

```java
//最后一个参数为我们希望作为key的属性
Map<String, User> user = session.selectMap("selectUserById", 1, "id");
```

可以看到这个Map中确实使用的是id作为Key，然后查询得到的实体对象作为Value。

还有一个比较特殊的选择操作是`selectCursor`

可以得到一个`Cursor`对象，同样是用于列表查询的，只不过使用起来和我们之前JDBC中的ResultSet比较类似，也是通过迭代器的形式去进行数据的读取，官方解释它主要用于惰性获取数据，提高性能：

```java
public interface Cursor<T> extends Closeable, Iterable<T> { ... }
```

可以看到它本身是实现了Iterable接口的，表明它可以获取迭代器或是直接使用foreach来遍历：

```java
Cursor<User> cursor = session.selectCursor("selectUsers");
for (User user : cursor) {
    System.out.println(user);
}
```

只不过这种方式在大部分请情况下还是用的比较少，我们主要还是以`selectOne`和`selectList`为主。

最后还有一个普通的`select`方法，它支持我们使用Lambda的形式进行查询结果的处理：

```java
session.select("selectUsers", context -> {  //使用ResultHandler来处理结果
    System.out.println(context.getResultObject());
});
```

结果会自动进行遍历并依次执行我们传入的Lambda表达式。
