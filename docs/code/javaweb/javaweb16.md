---
title: javaweb - Mybatis6
date: 2025-06-15
category:
  - code
tag:
  - javaweb
  - mybatis
# star: true
# sticky: true
order: -0.7484
---

## Mybatis详解4

### DML 操作

前面我们介绍了**查询操作**，我们接着来看修改相关操作(**增、删、改**)。

`Mybatis`为我们的`DML`操作提供了几个预设方法：

```java
int insert(String statement);
int insert(String statement, Object parameter);
int update(String statement);
int update(String statement, Object parameter);
int delete(String statement);
int delete(String statement, Object parameter);
```

可以看到，这些方法默认情况下返回的结果都是`int`类型的，这与我们之前JDBC中是一样的，它代表**执行`SQL`后受影响的行数**。

#### 插入 `insert`标签

我们来尝试编写一个插入操作

`Mybatis`为我们提供的插入操作非常快捷，我们可以直接让一个`User`对象作为参数传入

即可在配置中直接解析其属性到`insert`语句中，这里需要用到`insert`标签：

```xml
<insert id="addUser" parameterType="com.test.entity.User">
    insert into user (name, age) values (#{name}, #{age})
</insert>
```

这里我们将`parameterType`类型设置为我们的实体类型，这样下面在使用`#{name}`时`Mybatis`就会自动调用类中对应的Get方法来获取结果

不过，即使这里不指定具体类型，`Mybatis`也能完成自动推断，非常智能(**参数名称要与实体类参数对应**)。

和之前一样，我们也可以直接将其绑定到一个接口上：

```java
public interface TestMapper {
    int addUser(User user);
}
```

**注意返回类型必须是`int`或是`long`这类数字类型**，表示生效的行数，然后这里我们传入的参数直接写成对应的类型即可。

##### 自增主键ID `useGeneratedKeys`

有些时候，我们的数据插入后使用的是一个自增主键ID，那么这个自增的主键值我们该如何获取到呢？

Mybatis为我们提供了一些参数用于处理这种问题：

```xml
<insert id="addUser" parameterType="com.test.entity.User" useGeneratedKeys="true" keyProperty="id" keyColumn="id">
    insert into user (name, age) values (#{name}, #{age})
</insert>
```

这里`useGeneratedKeys`设置为`true`表示我们希望获取数据库生成的键

`keyProperty`设置为User类中的需要获取自增结果的属性名，`keyColumn`为数据库中自增的字段名称

但是一般情况下不需要手动设置，但是某些数据库（像 PostgreSQL）中，当主键列不是表中的第一列的时候，必须设置。

这样我们就可以获取到自增后的值了，接着我们什么都不需要做，Mybatis会在查询完后自动为我们的User对象赋值：

#### 修改 `update`标签

我们接着来看修改操作，比如要根据ID修改用户的年龄：

```xml
<update id="setUserAgeById">
    update user set age = #{age} where id = #{id}
</update>
```

```java
int setUserAgeById(User user);
```

这里的参数我们依然选择使用`User`，和之前`insert`一样，`Mybatis`会从传入的对象中自动获取需要的参数，当然我们也可以将此方法设计为两个参数的形式：

```java
int setUserAgeById(@Param("age") int age, @Param("id") int id);
```

#### 删除

删除操作则更为简单，假设我们要根据用户的id进行数据的删除：

```xml
<delete id="deleteUserById">
    delete from user where id = #{id}
</delete>
```

这些操作相比查询操作来说非常简单就可以实现，这里就不多做介绍了。

### 事务操作

我们可以在获取`SqlSession`关闭自动提交来开启事务模式，和JDBC其实都差不多

在创建`SqlSession`的时候不填写参数默认使用的就是事务模式：

```java
try (SqlSession session = sqlSessionFactory.openSession(false)) { ... }
```

我们发现，在关闭自动提交后，我们的内容是没有进入到数据库的：

```java
try(SqlSession session = MybatisUtils.openSession(false)) {
    TestMapper mapper = session.getMapper(TestMapper.class);
    mapper.deleteUserById(1);   //虽然日志中已经提示生效1行，但是并没有提交
}
```

`SqlSession`接口中为我们提供了事务操作相关的方法，这里我们可以直接尝试进行事务的提交：

```java
TestMapper mapper = session.getMapper(TestMapper.class);
mapper.deleteUserById(7);
session.commit();   //通过SqlSession进行事务提交
```

注意，如果我们在提交事务之前，没有进行任何的DML操作，也就是删除、更新、插入的其中任意一种操作，那么调用`commit`方法则不会进行提交，当然如果仍然需要提交的话也可以使用`commit(true)`来强制提交。

我们接着来测试一下回滚操作：

```java
TestMapper mapper = session.getMapper(TestMapper.class);
mapper.deleteUserById(1);
System.out.println(mapper.selectUserById(1));   //此时由于数据被删除，无法查到
session.rollback();   //进行回滚操作
System.out.println(mapper.selectUserById(1));   //之前被删除的数据回来了
```

事务相关操作非常简单，这里就暂时先介绍这么多。
