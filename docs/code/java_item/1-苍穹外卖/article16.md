---
title: Javassm - item1-16 (订单定时 来单提醒 客户催单 1)
date: 2025-11-21
category:
  - code
tag:
  - java_item
# star: true
# sticky: true
order: -0.6
---

## 内容

- Spring Task
- 订单状态定时处理
- WebSocket
- 来单提醒
- 客户催单

功能实现：**订单状态定时处理**、**来单提醒**和**客户催单**

## Spring Task

**Spring Task** 是Spring框架提供的任务调度工具，可以按照约定的时间自动执行某个代码逻辑

**定位**：定时任务框架

**作用**：定时自动执行某段Java代码

### 应用场景

1). 信用卡每月还款提醒

2). 银行贷款每月还款提醒

3). 火车票售票系统处理未支付订单

4). 入职纪念日为用户发送通知

**强调**：只要是需要定时处理的场景都可以使用Spring Task

### cron表达式

**cron表达式**其实就是一个字符串，通过cron表达式可以**定义任务触发的时间**

**构成规则：**分为6或7个域，由空格分隔开，每个域代表一个含义

每个域的含义分别为：秒、分钟、小时、日、月、周、年(可选)

![alt text](img/63.png)

**举例**：

2022年10月12日上午9点整 对应的cron表达式为：**0 0 9 12 10 ? 2022**

**说明**：一般**日**和**周**的值不同时设置，其中一个设置，另一个用？表示。

**比如**：描述2月份的最后一天，最后一天具体是几号呢？可能是28号，也有可能是29号，所以就不能写具体数字。

为了描述这些信息，提供一些特殊的字符。这些具体的细节，我们就不用自己去手写，因为这个cron表达式，它其实有在线生成器。

cron表达式在线生成器：<https://cron.qqe2.com/>

#### 通配符

- `*` 表示所有值

- `?` 表示未说明的值，即不关心它为何值

- `-` 表示一个指定的范围

- `,` 表示附加一个可能值

- `/` 符号前表示开始时间，符号后表示每次递增的

#### cron表达式案例

- `23 0 0/1 L * ? *` 本月最后一天从0小时开始, 每一小时执行一次

- `*/5 * * * * ?` 每隔5秒执行一次

- `0 */1 * * * ?` 每隔1分钟执行一次

- `0 0 5-15 * * ?` 每天5-15点整点触发

- `0 0/3 * * * ?` 每三分钟触发一次

- `0 0-5 14 * * ?` 在每天下午2点到下午2:05期间的每1分钟触发

- `0 0/5 14 * * ?` 在每天下午2点到下午2:55期间的每5分钟触发

- `0 0/5 14,18 * * ?` 在每天下午2点到2:55期间和下午6点到6:55期间的每5分钟触发

- `0 0/30 9-17 * * ?` 朝九晚五工作时间内每半小时

- `0 0 10,14,16 * * ?` 每天上午10点，下午2点，4点

### 简单示例

#### 1. 导入`maven`坐标 `spring-context`

#### 2. 启动类添加注解开启任务调度 `@EnableScheduling`

#### 3.自定义定时任务类 `@Scheduled`

对应方法没有返回值，且名字随意

```java
/**
 * 自定义定时任务类
 */
@Component
@Slf4j
public class MyTask {

    /**
     * 定时任务 每隔5秒触发一次
     */
    @Scheduled(cron = "0/5 * * * * ?")
    public void executeTask(){
        log.info("定时任务开始执行：{}",new Date());
    }
}
```

## 订单状态定时处理

### 需求分析

用户下单后可能存在的情况：

- 下单后未支付，订单一直处于**待支付**状态
- 用户收货后管理端未点击完成按钮，订单一直处于**派送中**状态

对于上面两种情况需要通过**定时任务**来修改订单状态，具体逻辑为：

- 通过定时任务每分钟检查一次是否存在支付超时订单（下单后超过15分钟仍未支付则判定为支付超时订单），如果存在则修改订单状态为“已取消”
- 通过定时任务每天凌晨1点检查一次是否存在“派送中”的订单，如果存在则修改订单状态为“已完成”

### 代码开发

自定义定时任务类`OrderTask`

```java
@Component
@Slf4j
public class OrderTask {
    @Autowired
    private OrderMapper orderMapper;

    /**
     * 处理支付超时订单
     */
    @Scheduled(cron = "0 * * * * ?")
    public void processTimeoutOrder(){
        log.info("处理支付超时订单：{}", new Date());

        LocalDateTime time = LocalDateTime.now().plusMinutes(-15);

        // select * from orders where status = 1 and order_time < 当前时间-15分钟
        List<Orders> ordersList = orderMapper.getByStatusAndOrderTimeLT(Orders.PENDING_PAYMENT, time);
        if(ordersList != null && !ordersList.isEmpty()){
            ordersList.forEach(order -> {
                order.setStatus(Orders.CANCELLED);
                order.setCancelReason("支付超时，自动取消");
                order.setCancelTime(LocalDateTime.now());
                orderMapper.update(order);
            });
        }
    }

    /**
     * 处理“派送中”状态的订单
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void processDeliveryOrder(){
        log.info("处理派送中订单：{}", new Date());
        // select * from orders where status = 4 and order_time < 当前时间-1小时
        LocalDateTime time = LocalDateTime.now().plusMinutes(-60);
        List<Orders> ordersList = orderMapper.getByStatusAndOrderTimeLT(Orders.DELIVERY_IN_PROGRESS, time);

        if(ordersList != null && !ordersList.isEmpty()){
            ordersList.forEach(order -> {
                order.setStatus(Orders.COMPLETED);
                orderMapper.update(order);
            });
        }
    }
}
```

在OrderMapper接口中扩展方法:

```java
/**
 * 根据状态和下单时间查询订单
 * @param status
 * @param orderTime
 */
@Select("select * from orders where status = #{status} and order_time < #{orderTime}")
List<Orders> getByStatusAndOrdertimeLT(Integer status, LocalDateTime orderTime);
```
