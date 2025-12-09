---
title: item2-7 (优惠券秒杀2 - 分布式锁)
date: 2025-12-7
category:
  - code
tag:
  - java_item
# star: true
# sticky: true
order: -0.6
---

## 分布式锁

之前的加锁只能解决单机模式下的并发问题，不能解决集群模式下的并发，这种情况就需要分布式锁

### 集群环境下的并发问题

1、我们将服务启动两份，端口分别为8081和8082

2、然后修改nginx的conf目录下的nginx.conf文件，配置反向代理和负载均衡

由于现在我们部署了多个tomcat，每个tomcat都有一个属于自己的jvm，那么假设在服务器A的tomcat内部，有两个线程，这两个线程由于使用的是同一份代码，那么他们的锁对象是同一个，是可以实现互斥的

但是如果现在是服务器B的tomcat内部，又有两个线程，但是他们的锁对象写的虽然和服务器A一样，但是锁对象却不是同一个，所以线程3和线程4可以实现互斥，但是却无法和线程1和线程2实现互斥，这就是 集群环境下，syn锁失效的原因

![alt text](img/36.png)

在这种情况下，我们就需要使用分布式锁来解决这个问题

### 基本原理和实现方式对比

分布式锁：满足分布式系统或集群模式下多进程可见并且互斥的锁

分布式锁的核心思想就是让大家都使用同一把锁，只要大家使用的是同一把锁，那么我们就能锁住线程，不让线程进行，让程序串行执行，这就是分布式锁的核心思路

![alt text](img/37.png)

#### 分布式锁条件

- 可见性：多个线程都能看到相同的结果，注意：这个地方说的可见性并不是并发编程中指的内存可见性，只是说多个进程之间都能感知到变化的意思

- 互斥：互斥是分布式锁的最基本的条件，使得程序串行执行

- 高可用：程序不易崩溃，时时刻刻都保证较高的可用性

- 高性能：由于加锁本身就让性能降低，所有对于分布式锁本身需要他就较高的加锁性能和释放锁性能

- 安全性：安全也是程序中必不可少的一环

#### 常见分布式锁

- Mysql：mysql本身就带有锁机制，但是由于mysql性能本身一般，所以采用分布式锁的情况下，其实使用mysql作为分布式锁比较少见

- Redis：redis作为分布式锁是非常常见的一种使用方式，现在企业级开发中基本都使用redis或者zookeeper作为分布式锁，利用setnx这个方法，如果插入key成功，则表示获得到了锁，如果有人插入成功，其他人插入失败则表示无法获得到锁，利用这套逻辑来实现分布式锁

- Zookeeper：zookeeper也是企业级开发中较好的一个实现分布式锁的方案，由于本套视频并不讲解zookeeper的原理和分布式锁的实现，所以不过多阐述

![alt text](img/38.png)

### Redis分布式锁的实现思路

实现分布式锁时需要实现的两个基本方法：

- 获取锁：
  - 互斥：确保只能有一个线程获取锁 `SETNX lock thread1`
  - 超时释放：获取锁时添加一个超时时间 `EXPIRE lock 10`
  - 确保原子性，用一个命令 `SET lock thread1 NX EX 10`

- 释放锁：
  - 手动释放 `DEL key`

核心思路：

我们利用 redis 命令 `SET lock thread1 NX EX 10`，当有多个线程进入时，我们就利用该方法，第一个线程进入时，redis 中就有这个key，返回1，如果结果是1，则表示他抢到了锁，那么他去执行业务，然后再删除锁，退出锁逻辑

没有抢到锁的，采用非阻塞的方法，直接表示获取锁失败，

![alt text](img/39.png)

### Redis分布式锁实现1

加锁逻辑 (非阻塞模式)

#### 锁实现

##### 接口

```java
public interface ILock {
    /**
     * 尝试获取锁
     * @param timeoutSec
     * @return
     */
    boolean tryLock(long timeoutSec);

    /**
     * 释放锁
     */
    void unlock();
}
```

##### `SimpleRedisLock`

利用setnx方法进行加锁，同时增加过期时间，防止死锁，此方法可以保证加锁和增加过期时间具有原子性

```java
public class SimpleRedisLock implements ILock {
    private String name;
    private StringRedisTemplate stringRedisTemplate;

    public SimpleRedisLock(String name, StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.name = name;
    }

    private static final String KEY_PREFIX = "lock:";

    @Override
    public boolean tryLock(long timeoutSec) {
        // 获取线程标示
        long threadId = Thread.currentThread().getId();
        // 获取锁
        stringRedisTemplate.opsForValue()
                .setIfAbsent(KEY_PREFIX + name, Long.toString(threadId), timeoutSec, TimeUnit.SECONDS);
        return false;
    }

    @Override
    public void unlock() {
        // 释放锁
        stringRedisTemplate.delete(KEY_PREFIX + name);
    }
}
```

##### 修改业务代码

根据用户ID来尝试去Redis中获取锁，如果成功，就执行创建订单逻辑，失败就返回 (不能重复下单)，然后再等事务对应的代码执行结束，数据库更新后再释放锁，从而避免并发时的重复下单

这样在同一时间内，同一个用户即使同时发很多请求，也只有一个请求可以获取并行锁进入尝试创建订单的逻辑，这样当用户之前没有订单时，也不会发生多线程进入查询得到0订单的情况

```java
@Override
public Result seckillVoucher(Long voucherId) {
    // 查询优惠券
    SeckillVoucher voucher = seckillVoucherService.getById(voucherId);

    // 判断秒杀是否开始和结束
    if (voucher.getBeginTime().isAfter(LocalDateTime.now())) {
        return Result.fail("秒杀尚未开始");
    }

    if (voucher.getEndTime().isBefore(LocalDateTime.now())) {
        return Result.fail("秒杀已经结束");
    }

    // 判断库存是否充足
    if (voucher.getStock() < 1) {
        return Result.fail("库存不足");
    }

    Long userId = UserHolder.getUser().getId();

    // 创建锁对象(新增代码)
    SimpleRedisLock lock = new SimpleRedisLock("order:" + userId, stringRedisTemplate);
    // 获取锁对象
    boolean isLock = lock.tryLock(1200);
    // 加锁失败
    if (!isLock) {
        return Result.fail("不允许重复下单");
    }
    try {
        // 获取代理对象(事务)
        IVoucherOrderService proxy = (IVoucherOrderService) AopContext.currentProxy();
        return proxy.createVoucherOrder(voucherId);
    } finally {
        // 释放锁
        lock.unlock();
    }
}
```

### Redis分布式锁误删情况

#### 情况分析

持有锁的线程在锁的内部出现了阻塞，导致他的锁自动释放，这时其他线程，线程2来尝试获得锁，就拿到了这把锁

然后线程2在持有锁执行过程中，线程1反应过来，继续执行，而线程1执行过程中，走到了删除锁逻辑，此时就会把本应该属于线程2的锁进行删除，这就是误删别人锁的情况说明

![alt text](img/40.png)

**解决方案**

就是在每个线程释放锁的时候，去判断一下当前这把锁是否属于自己，如果不属于自己，则不进行锁的删除

假设还是上边的情况，线程1卡顿，锁自动释放，线程2进入到锁的内部执行逻辑，此时线程1反应过来，然后删除锁，但是线程1，一看当前这把锁不是属于自己，于是不进行删除锁逻辑

当线程2走到删除锁逻辑时，如果没有卡过自动释放锁的时间点，则判断当前这把锁是属于自己的，于是删除这把锁。

![alt text](img/41.png)

#### 解决误删情况

需求：修改之前的分布式锁实现，满足：在获取锁时存入线程标示（可以用UUID表示）
在释放锁时先获取锁中的线程标示，判断是否与当前线程标示一致

因为此时后端服务分布式，可能有多个端口对应多个JVM，因此不**同的线程生成的UUID是不同的**，可以进行区分

- 如果一致则释放锁
- 如果不一致则不释放锁

核心逻辑：在存入锁时，放入自己线程的标识，在删除锁时，判断当前这把锁的标识是不是自己存入的，如果是，则进行删除，如果不是，则不进行删除。

![alt text](img/42.png)

##### 加锁

```java
private static final String KEY_PREFIX = "lock:";
private static final String ID_PREFIX = UUID.randomUUID().toString(true) + "-";

@Override
public boolean tryLock(long timeoutSec) {
    // 获取线程标示
    String threadId = ID_PREFIX + Thread.currentThread().getId();
    // 获取锁
    Boolean success = stringRedisTemplate.opsForValue()
            .setIfAbsent(KEY_PREFIX + name, threadId, timeoutSec, TimeUnit.SECONDS);
    return Boolean.TRUE.equals(success);
}
```

##### 释放锁

```java
@Override
public void unlock() {
    // 获取线程标示
    String threadId = ID_PREFIX + Thread.currentThread().getId();
    // 获取锁中的标示
    String id = stringRedisTemplate.opsForValue().get(KEY_PREFIX + name);
    // 判断标示是否一致
    if(threadId.equals(id)) {
        // 释放锁
        stringRedisTemplate.delete(KEY_PREFIX + name);
    }
}
```

在我们修改完此处代码后，我们重启工程，然后启动两个线程，第一个线程持有锁后，手动释放锁，第二个线程 此时进入到锁内部，再放行第一个线程，此时第一个线程由于锁的value值并非是自己，所以不能释放锁，也就无法删除别人的锁，此时第二个线程能够正确释放锁，通过这个案例初步说明我们解决了锁误删的问题。

### 分布式锁的原子性问题

更为极端的误删逻辑说明：

线程1现在持有锁之后，在执行业务逻辑过程中，他正准备删除锁，而且已经走到了条件判断的过程中，比如他已经拿到了当前这把锁确实是属于他自己的，**正准备删除锁**，阻塞了一段时间 (JVM垃圾回收等)，导致**此时他的锁到期**了

那么此时线程2进来，但是线程1他会接着往后执行，当他卡顿结束后，他直接就会执行删除锁那行代码，相当于条件判断并没有起到作用，这就是删锁时的**原子性**问题，之所以有这个问题，是因为线程1的拿锁，比锁，删锁，实际上并不是原子性的，我们要防止刚才的情况发生

![alt text](img/43.png)

#### Lua脚本

Redis提供了Lua脚本功能，在一个脚本中编写多条Redis命令，确保多条命令执行时的原子性

Lua是一种编程语言，它的基本语法可以参考网站：<https://www.runoob.com/lua/lua-tutorial.html>

这里重点介绍Redis提供的调用函数，我们可以使用lua去操作redis，又能保证他的原子性，这样就可以实现`拿锁比锁删锁`是一个原子性动作了

##### lua中Redis提供的调用函数

```lua
redis.call('命令名称', 'key', '其它参数', ...)
```

例如，我们要执行`set name jack`，则脚本是这样：

```lua
# 执行 set name jack
redis.call('set', 'name', 'jack')
```

例如，我们要先执行set name Rose，再执行get name，则脚本如下：

```lua
# 先执行 set name jack
redis.call('set', 'name', 'Rose')
# 再执行 get name
local name = redis.call('get', 'name')
# 返回
return name
```

##### Redis执行lua脚本 `EVAL`

写好脚本以后，需要用Redis命令来调用脚本，调用脚本的常见命令如下

```redis
EVAL "return redis.call('set', 'name', 'jack')" 0
```

如果脚本中的key、value不想写死，可以作为参数传递

key类型参数会放入`KEYS`数组，其它参数会放入`ARGV`数组(这里数组起始元素是从1开始的)

在脚本中可以从KEYS和ARGV数组获取这些参数：

![alt text](img/44.png)

#### java调用lua脚本解决原子性问题

##### 释放锁的逻辑

释放锁的业务流程是这样的

1. 获取锁中的线程标示
2. 判断是否与指定的标示（当前线程标示）一致
3. 如果一致则释放锁（删除）
4. 如果不一致则什么都不做

最终我们操作redis的拿锁比锁删锁的lua脚本就会变成这样

```lua
-- 这里的 KEYS[1] 就是锁的key，这里的ARGV[1] 就是当前线程标示
-- 获取锁中的标示，判断是否与当前线程标示一致
if (redis.call('GET', KEYS[1]) == ARGV[1]) then
  -- 一致，则删除锁
  return redis.call('DEL', KEYS[1])
end
-- 不一致，则直接返回
return 0
```

##### 具体代码

我们的`RedisTemplate`中，可以利用execute方法去执行lua脚本，参数对应关系就如下

![alt text](img/45.png)

**Java代码**

```java
private static final DefaultRedisScript<Long> UNLOCK_SCRIPT;
static {
    UNLOCK_SCRIPT = new DefaultRedisScript<>();
    UNLOCK_SCRIPT.setLocation(new ClassPathResource("unlock.lua"));
    UNLOCK_SCRIPT.setResultType(Long.class);
}

public void unlock() {
    // 调用lua脚本
    stringRedisTemplate.execute(
            UNLOCK_SCRIPT,
            Collections.singletonList(KEY_PREFIX + name),
            ID_PREFIX + Thread.currentThread().getId());
}
```

经过以上代码改造后，我们就能够实现 拿锁比锁删锁的原子性动作了

### 总结

在之前的逻辑上，已经实现了单个JVM时的 一人一单 和 阻止超卖的情况，主要逻辑也封装在了 `createVoucherOrder` 函数中

但是当开了多个服务，存在多个 JVM 时，此时处理 一人一单 的逻辑就不行了, 因为本质是通过不同的 `userId.toString().intern()` 在通过 `synchronized` 来创建悲观锁使得同一时刻一个用户只能有一个请求可以创建订单，这样就解决了一人一单

但是 多个JVM时，这种锁就没用了，因为不同的JVM对象是不同的。

所以需要考虑别的方法，采用分布式锁来解决，即多个JVM去Redis获取锁，这样就不会有问题了，但是会出现**误删**和**原子性**的情况，所以又要解决

基于Redis的分布式锁实现思路：

- 利用set nx ex获取锁，并设置过期时间，保存线程标示
- 释放锁时先判断线程标示是否与自己一致，一致则删除锁
  - 特性：
    - 利用set nx满足互斥性
    - 利用set ex保证故障时锁依然能释放，避免死锁，提高安全性
    - 利用Redis集群保证高可用和高并发特性

我们一路走来，利用添加过期时间，防止死锁问题的发生，但是有了过期时间之后，可能出现误删别人锁的问题，这个问题我们开始是利用删之前通过拿锁，比锁，删锁这个逻辑来解决的，也就是删之前判断一下当前这把锁是否是属于自己的，但是现在还有原子性问题，也就是我们没法保证拿锁比锁删锁是一个原子性的动作，最后通过lua表达式来解决这个问题

但是目前还剩下一个问题锁不住，什么是锁不住呢，你想一想，如果当过期时间到了之后，我们可以给他续期一下，比如续个30s，就好像是网吧上网， 网费到了之后，然后说，来，网管，再给我来10块的，是不是后边的问题都不会发生了，那么续期问题怎么解决呢，可以依赖于我们接下来要学习redission

死锁 —— 添加过期时间

误删 —— 删之前判断一下当前这把锁是否是属于自己的

原子性问题 —— lua表达式来解决

锁不住 (过期时间到了之后续期) —— `redission`
