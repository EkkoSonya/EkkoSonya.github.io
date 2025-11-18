---
title: Javassm - item1-12 (缓存商品 + 购物车 1)
date: 2025-11-14
category:
  - code
tag:
  - java_item
# star: true
# sticky: true
order: -0.6
---

## 内容

- 缓存菜品
- 缓存套餐
- 添加购物车
- 查看购物车
- 清空购物车

功能实现：**缓存商品**、**购物车**

## 缓存菜品

### 问题说明

用户端小程序展示的菜品数据都是通过查询数据库获得，如果用户端访问量比较大，数据库访问压力随之增大

### 实现思路

通过Redis来缓存菜品数据，减少数据库查询操作

![alt text](img/51.png)

**缓存逻辑分析**

- 每个分类下的菜品保存一份缓存数据
- 数据库中菜品数据有变更时清理缓存数据

key 为对应分类id, value 为对应菜品列表序列化结果字符串

![alt text](img/52.png)

### 代码开发

#### 1. 修改用户端接口 DishController 的 list 方法，加入缓存处理逻辑

```java
@Autowired
private RedisTemplate redisTemplate;
/**
 * 根据分类id查询菜品
 *
 * @param categoryId
 * @return
 */
@GetMapping("/list")
@ApiOperation("根据分类id查询菜品")
public Result<List<DishVO>> list(Long categoryId) {

  String key = "dish_" + categoryId;
  // 查询 redis 是否存在对应菜品数据
  List<DishVO> list = (List<DishVO>) redisTemplate.opsForValue().get(key);

  // 存在 就直接返回
  if(list != null && !list.isEmpty())
      return Result.success(list);

  // 如果不存在 去对应数据表查找
  Dish dish = new Dish();
  dish.setCategoryId(categoryId);
  dish.setStatus(StatusConstant.ENABLE);//查询起售中的菜品

  list = dishService.listWithFlavor(dish);

  // 将查询数据放入 redis 缓存中
  redisTemplate.opsForValue().set(key, list);

  return Result.success(list);
}
```

#### 2. 数据一致性

为了保证**数据库**和**Redis**中的数据保持一致，修改**管理端接口 DishController** 的相关方法，加入清理缓存逻辑。

需要改造的方法：

- 新增菜品
- 修改菜品
- 批量删除菜品
- 起售、停售菜品

**抽取清理缓存的方法：**

在管理端DishController中添加

```java
@Autowired
  private RedisTemplate redisTemplate;
/**
 * 清理缓存数据
 * @param pattern
 */
private void cleanCache(String pattern){
  Set keys = redisTemplate.keys(pattern);
  redisTemplate.delete(keys);
}
```

然后就是在对应的方法进行缓存删除，一些复杂的就不考虑情况，直接全删了

## 缓存套餐

### `Spring Cache`

Spring Cache 是一个框架，实现了基于注解的缓存功能，只需要简单地加一个注解，就能实现缓存功能。

Spring Cache 提供了一层抽象，底层可以切换不同的缓存实现，例如：

- EHCache
- Caffeine
- Redis(常用)

#### 起步依赖

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-cache</artifactId>
  <version>2.7.3</version> 
</dependency>
```

#### 常用注解

在SpringCache中提供了很多缓存操作的注解，常见的是以下的几个：

| **注解**       | **说明**                                                     |
| -------------- | ------------------------------------------------------------ |
| `@EnableCaching`| 开启缓存注解功能，通常加在启动类上                           |
| `@Cacheable`     | 在方法执行前先查询缓存中是否有数据，如果有数据，则直接返回缓存数据；如果没有缓存数据，调用方法并将方法返回值放到缓存中 |
| `@CachePut`      | 将方法的返回值放到缓存中                                     |
| `@CacheEvict`    | 将一条或多条数据从缓存中删除                                 |

在spring boot项目中，使用缓存技术只需在项目中导入相关缓存技术的依赖包，并在启动类上使用@EnableCaching开启缓存支持即可。

例如，使用Redis作为缓存技术，只需要导入Spring data Redis的maven坐标即可

#### 简单示例

##### 1. 需要启动类开启缓冲支持

```java
package com.itheima;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@Slf4j
@SpringBootApplication
@EnableCaching//开启缓存注解功能
public class CacheDemoApplication {
    public static void maSpringApplication.ruin(String[] args) {
        n(CacheDemoApplication.class,args);
        log.info("项目启动成功...");
    }
}
```

##### `@CachePut`注解

​作用: 将方法返回值，放入缓存

​value: 缓存的名称, 每个缓存名称下面可以有很多key

key: 缓存的key  ----------> 支持Spring的表达式语言SPEL语法

```java
/**
* CachePut：将方法返回值放入缓存
* value：缓存的名称，每个缓存名称下面可以有多个key
* key：缓存的key
*/
@PostMapping
  @CachePut(value = "userCache", key = "#user.id")//key的生成：userCache::1
  public User save(@RequestBody User user){
      userMapper.insert(user);
      return user;
  }
```

##### @Cacheable注解

​作用: 在方法执行前，spring先查看缓存中是否有数据，如果有数据，则直接返回缓存数据；若没有数据，调用方法并将方法返回值放到缓存中

​value: 缓存的名称，每个缓存名称下面可以有多个key

​key: 缓存的key  ----------> 支持Spring的表达式语言SPEL语法

```java
/**
* Cacheable：在方法执行前spring先查看缓存中是否有数据，如果有数据，则直接返回缓存数据；若没有数据，*调用方法并将方法返回值放到缓存中
* value：缓存的名称，每个缓存名称下面可以有多个key
* key：缓存的key
*/
@GetMapping
@Cacheable(cacheNames = "userCache",key="#id")
public User getById(Long id){
    User user = userMapper.getById(id);
    return user;
}
```

##### CacheEvict注解

​作用: 清理指定缓存

​value: 缓存的名称，每个缓存名称下面可以有多个key

​key: 缓存的key  ----------> 支持Spring的表达式语言SPEL语法

```java
@DeleteMapping
@CacheEvict(cacheNames = "userCache",key = "#id")//删除某个key对应的缓存数据
public void deleteById(Long id){
    userMapper.deleteById(id);
}

@DeleteMapping("/delAll")
@CacheEvict(cacheNames = "userCache",allEntries = true)//删除userCache下所有的缓存数据
public void deleteAll(){
    userMapper.deleteAll();
}
```

### 缓存套餐实现

1). 导入Spring Cache和Redis相关maven坐标

```xml
<dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>

<dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

2). 在启动类上加入`@EnableCaching`注解，开启缓存注解功能

3). 在用户端接口`SetmealController`的 list 方法上加入`@Cacheable`注解

4). 在管理端接口`SetmealController`的 `save`、`delete`、`update`、`startOrStop`等方法上加入`CacheEvict`注解
