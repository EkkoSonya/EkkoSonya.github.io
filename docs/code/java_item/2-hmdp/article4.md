---
title: item2-4 (商户查询缓存1)
date: 2025-12-2
category:
  - code
tag:
  - java_item
# star: true
# sticky: true
order: -0.6
---

## 商户查询缓存

**缓存(**Cache),就是数据交换的**缓冲区**,俗称的缓存就是**缓冲区内的数据**

缓存数据存储于代码中,而代码运行在内存中,内存的读写性能远高于磁盘,缓存可以大大降低**用户访问并发量带来的**服务器读写压力

但是缓存也会增加代码复杂度和运营的成本

### 缓存使用

实际开发中,会构筑多级缓存来使系统运行速度进一步提升,例如:本地缓存与redis中的缓存并发使用

**浏览器缓存**：主要是存在于浏览器端的缓存

**应用层缓存：**可以分为tomcat本地缓存，比如之前提到的map，或者是使用redis作为缓存

**数据库缓存：**在数据库中有一片空间是 buffer pool，增改查数据都会先加载到mysql的缓存中

**CPU缓存：**当代计算机最大的问题是 cpu性能提升了，但内存读写速度没有跟上，所以为了适应当下的情况，增加了cpu的L1，L2，L3级的缓存

### 1. 添加商户缓存

在我们查询商户信息时，我们是直接操作从数据库中去进行查询的，大致逻辑是这样，直接查询数据库那肯定慢咯，所以我们需要增加缓存

```java
@GetMapping("/{id}")
public Result queryShopById(@PathVariable("id") Long id) {
    //这里是直接查询数据库
    return shopService.queryById(id);
}
```

#### 思路

标准的操作方式就是查询数据库之前先查询缓存，如果缓存数据存在，则直接从缓存中返回，如果缓存数据不存在，再查询数据库，然后将数据存入redis

![alt text](img/11.png)

如果缓存有，则直接返回，如果缓存不存在，则查询数据库，然后存入redis

在 mybatis-plus 中 `BaseMapper`、`IService`和`ServiceImpl` 是三个联合工作的重要接口，分别用在对应的 Mapper 层，Service 层接口 以及 Service 层实现类。

##### `Controller`层

```java
/**
 * 根据id查询商铺信息
 * @param id 商铺id
 * @return 商铺详情数据
 */
@GetMapping("/{id}")
public Result queryShopById(@PathVariable("id") Long id) {
    return shopService.queryById(id);
}
```

##### `Service`层

```java
@Service
public class ShopServiceImpl extends ServiceImpl<ShopMapper, Shop> implements IShopService {
    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Override
    public Result queryById(Long id) {
        String key = CACHE_SHOP_KEY + id;
        // 从 redis 查询缓存
        String shopJson = stringRedisTemplate.opsForValue().get(key);

        // 判断是否存在
        if(StrUtil.isNotBlank(shopJson)){
            // 存在 直接返回
            Shop shop = JSONUtil.toBean(shopJson, Shop.class);
            return Result.ok(shop);
        }

        // 不存在根据id查询数据库
        Shop shop = getById(id);

        // 不存在 返回 404
        if(shop == null){
            return Result.fail("店铺不存在");
        }

        // 存在 写入 redis
        stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(shop));

        // 返回
        return Result.ok(shop);
    }
}
```

### 2. 缓存更新策略

缓存更新是redis为了节约内存而设计出来的一个东西，主要是因为内存数据宝贵，当我们向redis插入太多数据，此时就可能会导致缓存中的数据过多，所以redis会对部分数据进行更新，或者把他叫为淘汰更合适。

**内存淘汰**: redis自动进行，当redis内存达到咱们设定的max-memery的时候，会自动触发淘汰机制，淘汰掉一些不重要的数据(可以自己设置策略方式)

**超时剔除**: 当我们给redis设置了过期时间ttl之后，redis会将超时的数据进行删除，方便咱们继续使用缓存

**主动更新**: 我们可以手动调用方法把缓存删掉，通常用于解决缓存和数据库不一致问题

![alt text](img/12.png)

#### 数据库缓存不一致解决方案

由于我们的**缓存的数据源来自于数据库**,而数据库的**数据是会发生变化的**,因此,如果当数据库中**数据发生变化,而缓存却没有同步**,此时就会有**一致性问题存在**,其后果是:

用户使用缓存中的过时数据,就会产生类似多线程数据安全问题,从而影响业务,产品口碑等;

基于主动更新，有如下几种方案：

- `Cache Aside Pattern` 人工编码方式：缓存调用者在更新完数据库后再去更新缓存，也称之为双写方案

- `Read/Write Through Pattern` : 由系统本身完成，数据库与缓存的问题交由系统本身去处理

- `Write Behind Caching Pattern` ：调用者只操作缓存，其他线程去异步处理数据库，实现最终一致

##### 建议方案

综合考虑使用方案一

操作缓存和数据库时有三个问题需要考虑：

如果采用第一个方案，那么假设我们每次操作数据库后，都操作缓存，但是中间如果没有人查询，那么这个更新动作实际上只有最后一次生效，中间的更新动作意义并不大，我们可以把缓存删除，等待再次查询时，将缓存中的数据加载出来

- 删除缓存还是更新缓存？
  - 更新缓存：每次更新数据库都更新缓存，无效写操作较多
  - 删除缓存：更新数据库时让缓存失效，查询时再更新缓存

- 如何保证缓存与数据库的操作的同时成功或失败？
  - 单体系统，将缓存与数据库操作放在一个事务
  - 分布式系统，利用TCC等分布式事务方案

- 先操作缓存还是先操作数据库？
  - 先删除缓存，再操作数据库
  - 先操作数据库，再删除缓存

应该具体操作缓存还是操作数据库，我们应当是**先操作数据库，再删除缓存**

原因在于，如果你选择第一种方案，在两个线程并发来访问时，假设线程1先来，他先把缓存删了，此时线程2过来，他查询缓存数据并不存在，此时他写入缓存，当他写入缓存后，线程1再执行更新动作时，实际上写入的就是旧的数据，新的数据被旧数据覆盖了。

其实即使 先操作数据库，再删除缓存 也可能存在不一致的情况，不过由于操作更新数据库的速度一般比写缓存慢，所以发生可能性低

冲突情况：

![alt text](img/14.png)

#### 实现商户信息缓存一致性

核心思路如下：

修改ShopController中的业务逻辑，满足下面的需求：

- 根据id查询店铺时，如果缓存未命中，则查询数据库，将数据库结果写入缓存，并设置超时时间

- 根据id修改店铺时，先修改数据库，再删除缓存 (弹幕也有说 延迟双删 策略)

##### 添加过期时间

直接加就行

##### 修改时删除缓存

通过之前的淘汰，我们确定了采用删除策略，来解决双写问题，当我们修改了数据之后，然后把缓存中的数据进行删除，查询时发现缓存中没有数据，则会从mysql中加载最新的数据，从而避免数据库和缓存不一致的问题

```java
@Override
public Result update(Shop shop) {
    Long id = shop.getId();
    if(id == null){
        return Result.fail("商户id为空");
    }
    updateById(shop);
    stringRedisTemplate.delete(CACHE_SHOP_KEY + id);
    return Result.ok();
}
```

### 3. 缓存穿透

缓存穿透是指客户端请求的数据在缓存中和数据库中都不存在，这样缓存永远不会生效，这些请求都会打到数据库

常见的解决方案有两种：

- 缓存空对象
  - 优点：实现简单，维护方便
  - 缺点：
    - 额外的内存消耗
    - 可能造成短期的不一致
- 布隆过滤
  - 优点：内存占用较少，没有多余key
  - 缺点：
    - 实现复杂
    - 存在误判可能

#### 介绍

![alt text](img/15.png)

##### 缓存空对象

当我们客户端访问不存在的数据时，先请求redis，但是此时redis中没有数据，此时会访问到数据库，但是数据库中也没有数据，这个数据穿透了缓存，直击数据库

我们都知道数据库能够承载的并发不如redis这么高，如果大量的请求同时过来访问这种不存在的数据，这些请求就都会访问到数据库

简单的解决方案就是哪怕这个数据在数据库中也不存在，我们也把这个数据存入到redis中去，这样，下次用户过来访问这个不存在的数据，那么在redis中也能找到这个数据就不会进入到缓存了

##### 布隆过滤

布隆过滤器其实采用的是**哈希思想**来解决这个问题

通过一个庞大的二进制数组，走哈希思想去判断当前这个要查询的这个数据是否存在，如果布隆过滤器判断存在，则放行，这个请求会去访问redis，哪怕此时redis中的数据过期了，但是数据库中一定存在这个数据，在数据库中查询出来这个数据后，再将其放入到redis中，假设布隆过滤器判断这个数据不存在，则直接返回

这种方式优点在于节约内存空间，存在误判，误判原因在于：布隆过滤器走的是哈希思想，只要哈希思想，就可能存在哈希冲突

#### 缓冲空对象解决示例

![alt text](img/16.png)

核心思路如下：

在原来的逻辑中，我们如果发现这个数据在mysql中不存在，直接就返回404了，这样是会存在缓存穿透问题的

现在的逻辑中：

如果这个数据不存在，我们不会返回404 ，还是会把这个数据写入到Redis中，并且将value设置为空

当再次发起查询时，我们如果发现命中之后，判断这个value是否是null，如果是null，则证明是缓存穿透数据，如果不是，则直接返回数据

```java
@Override
public Result queryById(Long id) {
    String key = CACHE_SHOP_KEY + id;
    // 从 redis 查询缓存
    String shopJson = stringRedisTemplate.opsForValue().get(key);

    // 判断是否存在
    // “”也是返回 false
    if(StrUtil.isNotBlank(shopJson)){
        // 存在 直接返回
        Shop shop = JSONUtil.toBean(shopJson, Shop.class);
        return Result.ok(shop);
    }
    // 判断命中的是否是空值
    if(shopJson != null){
        // “” 的情况
        return Result.fail("店铺不存在");
    }

    // 不存在根据id查询数据库
    Shop shop = getById(id);

    // 不存在 返回 404
    if(shop == null){
        // 将空值写入
        stringRedisTemplate.opsForValue().set(key, "", CACHE_SHOP_TTL, TimeUnit.MINUTES);
        return Result.fail("店铺不存在");
    }

    // 存在 写入 redis
    stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(shop), CACHE_SHOP_TTL, TimeUnit.MINUTES);

    // 返回
    return Result.ok(shop);
}
```

#### 总结

- 缓存穿透产生的原因是什么？
  
  用户请求的数据在缓存中和数据库中都不存在，不断发起这样的请求，给数据库带来巨大压力

- 缓存穿透的解决方案有哪些？
  - 缓存null值
  - 布隆过滤
  - 增强id的复杂度，避免被猜测id规律
  - 做好数据的基础格式校验
  - 加强用户权限校验
  - 做好热点参数的限流

### 4. 缓存雪崩

缓存雪崩是指在同一时段大量的缓存key同时失效或者Redis服务宕机，导致大量请求到达数据库，带来巨大压力。

解决方案：

- 给不同的Key的TTL添加随机值
- 利用Redis集群提高服务的可用性
- 给缓存业务添加降级限流策略
- 给业务添加多级缓存

### 5. 缓存击穿

缓存击穿问题也叫热点Key问题，就是一个被高并发访问并且缓存重建业务较复杂的key突然失效了，无数的请求访问会在瞬间给数据库带来巨大的冲击

场景分析：

假设线程1在查询缓存之后，本来应该去查询数据库，然后把这个数据重新加载到缓存的，此时只要线程1走完这个逻辑，其他线程就都能从缓存中加载这些数据了

但是假设在线程1没有走完的时候，后续的线程2，线程3，线程4同时过来访问当前这个方法，那么这些线程都不能从缓存中查询到数据

那么他们就会同一时刻来访问查询缓存，都没查到，接着同一时间去访问数据库，同时的去执行数据库代码，对数据库访问压力过大，从而出现缓存击穿现象

![alt text](img/17.png)

常见的解决方案有两种：

- 互斥锁
- 逻辑过期

#### 方案简介

![alt text](img/18.png)

##### 互斥锁

因为锁能实现互斥性

假设线程过来，只能一个人一个人的来访问数据库，从而避免对于数据库访问压力过大，但这也会影响查询的性能，因为此时会让查询的性能从并行变成了串行

我们可以采用 `tryLock` 方法 + `double check` 来解决这样的问题

假设现在线程1过来访问，他查询缓存没有命中，但是此时他获得到了锁的资源，那么线程1就会一个人去执行逻辑

> 注意：获取锁成功应该再次检测redis缓存是否过期，做DoubleCheck，如果存在则无需重建缓存 (因为可能此时另一个线程刚释放完锁，然后准备往 redis 塞，刚好此时这个线程1 获取到锁)

假设现在线程2过来，线程2在执行过程中，并没有获得到锁，那么线程2就可以进行到休眠，直到线程1把锁释放后，线程2获得到锁，然后再来执行逻辑，此时就能够从缓存中拿到数据了

这样保证了数据的一致性，但牺牲了效率

##### 逻辑过期

方案分析：我们之所以会出现这个缓存击穿问题，主要原因是在于我们对key设置了过期时间，假设我们不设置过期时间，其实就不会有缓存击穿的问题，但是不设置过期时间，这样数据不就一直占用我们内存了吗，我们可以采用逻辑过期方案。

> 因为缓存击穿主要是防备的热点key失效的情况，所以这种情况下先往缓存塞点(缓存预热)，这样就避免初始情况一直是 null 根本不能判断了

我们把过期时间设置在 redis 的 value 中

注意：这个过期时间并不会直接作用于redis，而是我们后续通过逻辑去处理

假设线程1去查询缓存，然后从value中**判断出来当前的数据已经过期**了，此时线程1去获得互斥锁，此时与数据库操作的相关功能不在 线程1 执行，而是独立开启一个线程2来执行，而线程1直接返回脏数据即可，直到新开的线程完成这个逻辑后，才释放锁

假设现在线程3过来访问，由于线程线程2持有着锁，所以线程3无法获得锁，线程3也直接返回数据

只有等到新开的线程2把重建数据构建完后，其他线程才能走返回正确的数据。

这种方案巧妙在于，异步的构建缓存，缺点在于在构建完缓存之前，返回的都是脏数据

这样相当于保证了高效性，但牺牲了数据一致性

##### 对比

![alt text](img/19.png)

**互斥锁方案**：由于保证了互斥性，所以数据一致，且实现简单，因为仅仅只需要加一把锁而已，也没其他的事情需要操心，所以没有额外的内存消耗，缺点在于有锁就有死锁问题的发生，且只能串行执行性能肯定受到影响

**逻辑过期方案**：线程读取过程中不需要等待，性能好，有一个额外的线程持有锁去进行重构数据，但是在重构数据完成前，其他的线程只能返回之前的数据，且实现起来麻烦

#### 5.1 互斥锁实现

##### 核心思路

![alt text](img/20.png)

相较于原来从缓存中查询不到数据后直接查询数据库而言

现在的方案是：

进行查询之后，如果从缓存没有查询到数据，则进行互斥锁的获取

获取互斥锁后，判断是否获得到了锁，如果没有获得到，则休眠，过一会再去 redis 查询是否有对应缓存，没有继续尝试获取锁，直到缓存命中或者获取锁为止

如果获取到了锁的线程，再去进行查询，查询后将数据写入redis，再释放锁，返回数据，利用互斥锁就能保证只有一个线程去执行操作数据库的逻辑，防止缓存击穿

##### 互斥锁实现

利用`redis`的`setnx`方法来表示获取锁，该方法含义是`redis`中如果没有这个`key`，则插入成功，返回1，在`stringRedisTemplate`中返回true，如果有这个`key`则插入失败，则返回0，在`stringRedisTemplate`返回false

我们可以通过true，或者是false，来表示是否有线程成功插入key，**成功插入的key的线程**我们认为他就是获得到锁的线程

##### 相关代码

###### 互斥锁代码

```java
private boolean tryLock(String key){
  Boolean flag = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", 10, TimeUnit.SECONDS);
  return BooleanUtil.isTrue(flag);
}

private void unlock(String key){
  stringRedisTemplate.delete(key);
}
```

###### 具体操作代码

```java
/**
 * 互斥锁实现
 * @param id
 * @return
 */
public Shop queryWithMutex(Long id) {
  String key = CACHE_SHOP_KEY + id;
  // 从 redis 查询缓存
  String shopJson = stringRedisTemplate.opsForValue().get(key);

  // 判断是否存在
  // “”也是返回 false
  if (StrUtil.isNotBlank(shopJson)) {
      // 存在 直接返回
      return JSONUtil.toBean(shopJson, Shop.class);
  }
  // 判断命中的是否是空值
  if (shopJson != null) {
      // “” 的情况
      return null;
  }

  // 实现缓存重建
  // 获取互斥锁
  String lockKey = "lock:shop:" + id;
  Shop shop = null;
  try {
      boolean isLock = tryLock(lockKey);
      if (!isLock) {
          // 失败休眠重试
          Thread.sleep(50);
          return queryWithMutex(id);
      }
      // 成功，根据id查询数据库
      shop = getById(id);

      // 模拟重建延时
      Thread.sleep(200);

      // 不存在 返回 404
      if (shop == null) {
          // 将空值写入
          stringRedisTemplate.opsForValue().set(key, "", CACHE_SHOP_TTL, TimeUnit.MINUTES);
          return null;
      }
      // 存在 写入 redis
      stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(shop), CACHE_SHOP_TTL, TimeUnit.MINUTES);
  }
  catch (InterruptedException e) {
      unlock(lockKey);
      throw new RuntimeException(e);
  }
  finally {
      // 释放锁
      unlock(lockKey);
  }
  // 返回
  return shop;
}
```

#### 5.2 逻辑过期实现

**需求：修改根据id查询商铺的业务，基于逻辑过期方式来解决缓存击穿问题**

##### 核心思路

![alt text](img/21.png)

思路分析：当用户开始查询redis时，判断是否命中，如果没有命中则直接返回空数据，不查询数据库，而一旦命中后，将value取出，判断value中的过期时间是否满足，如果没有过期，则直接返回redis中的数据，如果过期，则在开启独立线程后直接返回之前的数据，独立线程去重构数据，重构完成后释放互斥锁

> 由于这主要解决的热点key问题，即某个信息在一个时刻频繁被访问。这种情况下，我们需要先进行缓存预热，不然会一直是`null`，一直未命中不会更新

##### 构建实体类 (添加过期时间信息)

新建一个实体类，对原来代码没有侵入性。

```java
@Data
public class RedisData {
    private LocalDateTime expireTime;
    private Object data;
}
```

##### 缓存预热

在**ShopServiceImpl** 新增方法，利用单元测试进行缓存预热

```java
public void saveShop2Redis(Long id, Long expireSeconds) {
  // 查询店铺数据
  Shop shop = getById(id);
  // 封装逻辑过期时间
  RedisData redisData = new RedisData();
  redisData.setExpireTime(LocalDateTime.now().plusSeconds(expireSeconds));
  redisData.setData(shop);
  // 写入Redis
  stringRedisTemplate.opsForValue().set(CACHE_SHOP_KEY + id, JSONUtil.toJsonStr(redisData));
}
```

##### 逻辑过期实现代码

```java
private static final ExecutorService CACHE_REBUILD_EXECUTOR = Executors.newFixedThreadPool(10);

public Shop queryWithLogicalExpire(Long id){
  String key = CACHE_SHOP_KEY + id;
  // 从 redis 查询缓存
  String shopJson = stringRedisTemplate.opsForValue().get(key);

  // 判断是否存在
  if(StrUtil.isBlank(shopJson)){
      // 不存在 直接返回
      return null;
  }

  // 命中，先吧json反序列化为对象
  RedisData redisData = JSONUtil.toBean(shopJson, RedisData.class);
  Shop shop = JSONUtil.toBean((JSONObject) redisData.getData(), Shop.class);
  LocalDateTime expireTime = redisData.getExpireTime();

  // 判断逻辑时间是否过期
  if(expireTime.isAfter(LocalDateTime.now())){
      // 未过期 直接返回
      return shop;
  }

  // 已过期 需要缓存重建
  String lockKey = LOCK_SHOP_KEY + id;
  // 获取互斥锁 判断是否成功
  boolean isLock = tryLock(lockKey);

  if(isLock){
      // 成功 开启新线程实现缓存重建
      CACHE_REBUILD_EXECUTOR.submit(() -> {
          try {
              this.saveShop2Redis(id, 20L);
          } catch (Exception e) {
              throw new RuntimeException(e);
          } finally {
              // 释放锁
              unlock(lockKey);
          }
      });

  }

  // 直接返回过期信息
  return shop;
}
```
