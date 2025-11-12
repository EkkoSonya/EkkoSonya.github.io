---
title: Javassm - item1-8 (营业状态设置2)
date: 2025-11-12
category:
  - code
tag:
  - java_item
# star: true
# sticky: true
order: -0.6
---

## 营业状态设置2

### JAVA操作Redis

我们在java程序中应该如何操作Redis呢？这就需要使用Redis的Java客户端，就如同我们使用JDBC操作MySQL数据库一样。

Redis 的 Java 客户端很多，常用的几种：

- Jedis
- Lettuce
- Spring Data Redis

Spring 对 Redis 客户端进行了整合，提供了 Spring Data Redis，在Spring Boot项目中还提供了对应的Starter，即 spring-boot-starter-data-redis

### Spring Data Redis使用方式

Spring Data Redis 是 Spring 的一部分，提供了在 Spring 应用中通过简单的配置就可以访问 Redis 服务，对 Redis 底层开发包进行了高度封装。在 Spring 项目中，可以使用Spring Data Redis来简化 Redis 操作。

网址：<https://spring.io/projects/spring-data-redis>

Spring Boot提供了对应的Starter，maven坐标：

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

Spring Data Redis中提供了一个高度封装的类：**RedisTemplate**，对相关api进行了归类封装,将同一类型操作封装为`operation`接口，具体分类如下：

- ValueOperations：string数据操作
- SetOperations：set类型数据操作
- ZSetOperations：zset类型数据操作
- HashOperations：hash类型的数据操作
- ListOperations：list类型的数据操作

#### 环境搭建

![alt text](img/37.png)

##### 1. 导入Spring Data Redis的maven坐标

```xml
<dependency>
     <groupId>org.springframework.boot</groupId>
     <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

##### 2. 配置Redis数据源

```yaml
sky:
  redis:
    host: localhost
    port: 6379
    password: 123456
    database: 10
```

在application.yml中添加读取application-dev.yml中的相关Redis配置

```yaml
spring:
  profiles:
    active: dev
  redis:
    host: ${sky.redis.host}
    port: ${sky.redis.port}
    password: ${sky.redis.password}
    database: ${sky.redis.database}
```

##### 3. 编写配置类，创建RedisTemplate对象

```java
@Configuration
@Slf4j
public class RedisConfiguration {

    @Bean
    public RedisTemplate redisTemplate(RedisConnectionFactory redisConnectionFactory){
        log.info("开始创建redis模板对象...");
        RedisTemplate redisTemplate = new RedisTemplate();
        //设置redis的连接工厂对象
        redisTemplate.setConnectionFactory(redisConnectionFactory);
        //设置redis key的序列化器
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        return redisTemplate;
    }
}
```

**解释说明：**

当前配置类不是必须的，因为 Spring Boot 框架会自动装配 RedisTemplate 对象，但是默认的key序列化器为 `JdkSerializationRedisSerializer`，导致我们存到Redis中后的数据和原始数据有差别，故设置 `StringRedisSerializer` 序列化器

##### 4. 通过RedisTemplate对象操作Redis

在test下新建测试类

```java
@SpringBootTest
public class SpringDataRedisTest {
    @Autowired
    private RedisTemplate redisTemplate;

    @Test
    public void testRedisTemplate(){
        System.out.println(redisTemplate);
        //string数据操作
        ValueOperations valueOperations = redisTemplate.opsForValue();
        //hash类型的数据操作
        HashOperations hashOperations = redisTemplate.opsForHash();
        //list类型的数据操作
        ListOperations listOperations = redisTemplate.opsForList();
        //set类型数据操作
        SetOperations setOperations = redisTemplate.opsForSet();
        //zset类型数据操作
        ZSetOperations zSetOperations = redisTemplate.opsForZSet();
    }
}
```

#### 操作常见类型数据

主要流程：

1. 先获取对应的 `xxOperation` 实例通过 `redisTemplate.opsForxx`
2. 再进行对应操作

##### 操作字符串类型数据

```java
/**
  * 操作字符串类型的数据
  */
@Test
public void testString(){
    // set get setex setnx
    redisTemplate.opsForValue().set("name","小明");
    String city = (String) redisTemplate.opsForValue().get("name");
    System.out.println(city);
    redisTemplate.opsForValue().set("code","1234",3, TimeUnit.MINUTES);
    redisTemplate.opsForValue().setIfAbsent("lock","1");
    redisTemplate.opsForValue().setIfAbsent("lock","2");
}
```

##### 操作哈希类型数据

```java
/**
* 操作哈希类型的数据
*/
@Test
public void testHash(){
    //hset hget hdel hkeys hvals
    HashOperations hashOperations = redisTemplate.opsForHash();

    hashOperations.put("100","name","tom");
    hashOperations.put("100","age","20");

    String name = (String) hashOperations.get("100", "name");
    System.out.println(name);

    Set keys = hashOperations.keys("100");
    System.out.println(keys);

    List values = hashOperations.values("100");
    System.out.println(values);

    hashOperations.delete("100","age");
}
```

##### 操作列表类型数据

```java
/**
* 操作列表类型的数据
*/
@Test
public void testList(){
    //lpush lrange rpop llen
    ListOperations listOperations = redisTemplate.opsForList();

    listOperations.leftPushAll("mylist","a","b","c");
    listOperations.leftPush("mylist","d");

    List mylist = listOperations.range("mylist", 0, -1);
    System.out.println(mylist);

    listOperations.rightPop("mylist");

    Long size = listOperations.size("mylist");
    System.out.println(size);
}
```

##### 操作集合类型数据

```java
/**
* 操作集合类型的数据
*/
@Test
public void testSet(){
  //sadd smembers scard sinter sunion srem
  SetOperations setOperations = redisTemplate.opsForSet();

  setOperations.add("set1","a","b","c","d");
  setOperations.add("set2","a","b","x","y");

  Set members = setOperations.members("set1");
  System.out.println(members);

  Long size = setOperations.size("set1");
  System.out.println(size);

  Set intersect = setOperations.intersect("set1", "set2");
  System.out.println(intersect);

  Set union = setOperations.union("set1", "set2");
  System.out.println(union);

  setOperations.remove("set1","a","b");
}
```

##### 操作有序集合类型数据

```java
/**
  * 操作有序集合类型的数据
  */
@Test
public void testZset(){
  //zadd zrange zincrby zrem
  ZSetOperations zSetOperations = redisTemplate.opsForZSet();

  zSetOperations.add("zset1","a",10);
  zSetOperations.add("zset1","b",12);
  zSetOperations.add("zset1","c",9);

  Set zset1 = zSetOperations.range("zset1", 0, -1);
  System.out.println(zset1);

  zSetOperations.incrementScore("zset1","c",10);

  zSetOperations.remove("zset1","a","b");
}
```

##### 通用命令操作

```java
/**
* 通用命令操作
*/
@Test
public void testCommon(){
  //keys exists type del
  Set keys = redisTemplate.keys("*");
  System.out.println(keys);

  Boolean name = redisTemplate.hasKey("name");
  Boolean set1 = redisTemplate.hasKey("set1");

  for (Object key : keys) {
      DataType type = redisTemplate.type(key);
      System.out.println(type.name());
  }

  redisTemplate.delete("mylist");
}
```
