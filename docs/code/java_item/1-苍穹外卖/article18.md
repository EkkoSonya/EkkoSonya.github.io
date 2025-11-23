---
title: Javassm - item1-18 (营业额|用户|订单统计1)
date: 2025-11-22
category:
  - code
tag:
  - java_item
# star: true
# sticky: true
order: -0.6
---

## 内容

- Apache ECharts
- 营业额统计
- 用户统计
- 订单统计
- 销量排名Top10

功能实现：**数据统计**

## Apache ECharts

Apache ECharts 是一款基于 Javascript 的数据可视化图表库，提供直观，生动，可交互，可个性化定制的数据可视化图表

官网地址：<https://echarts.apache.org/zh/index.html>

### 入门案例

Apache Echarts官方提供的快速入门：<https://echarts.apache.org/handbook/zh/get-started/>

#### 实现步骤

1). 引入echarts.js 文件(当天资料已提供)

2). 为 ECharts 准备一个设置宽高的 DOM

3). 初始化echarts实例

4). 指定图表的配置项和数据

5). 使用指定的配置项和数据显示图表

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ECharts</title>
    <!-- 引入刚刚下载的 ECharts 文件 -->
    <script src="echarts.js"></script>
  </head>
  <body>
    <!-- 为 ECharts 准备一个定义了宽高的 DOM -->
    <div id="main" style="width: 600px;height:400px;"></div>
    <script type="text/javascript">
      // 基于准备好的dom，初始化echarts实例
      var myChart = echarts.init(document.getElementById('main'));

      // 指定图表的配置项和数据
      var option = {
        title: {
          text: 'ECharts 入门示例'
        },
        tooltip: {},
        legend: {
          data: ['销量']
        },
        xAxis: {
          data: ['衬衫', '羊毛衫', '雪纺衫', '裤子', '高跟鞋', '袜子']
        },
        yAxis: {},
        series: [
          {
            name: '销量',
            type: 'bar',
            data: [5, 20, 36, 10, 10, 20]
          }
        ]
      };

      // 使用刚指定的配置项和数据显示图表。
      myChart.setOption(option);
    </script>
  </body>
</html>
```

#### 总结

使用Echarts，重点在于研究当前图表所需的数据格式。通常是需要后端提供符合格式要求的动态数据，然后响应给前端来展示图表。

## 营业额统计

### 分析

营业额统计是基于折现图来展现，并且按照天来展示的。

实际上，就是某一个时间范围之内的每一天的营业额。同时，不管光标放在哪个点上，那么它就会把具体的数值展示出来。并且还需要注意日期并不是固定写死的，是由上边时间选择器来决定。

比如选择是近7天、或者是近30日，或者是本周，就会把相应这个时间段之内的每一天日期通过横坐标展示

#### 业务规则

- 营业额指订单状态为已完成的订单金额合计
- 基于可视化报表的折线图展示营业额数据，X轴为日期，Y轴为营业额
- 根据时间选择区间，展示每天的营业额数据

#### 接口分析

![alt text](img/66.png)

**注意**：具体返回数据一般由前端来决定，前端展示图表，具体折现图对应数据是什么格式，是有固定的要求的。
所以说，后端需要去适应前端，它需要什么格式的数据，我们就给它返回什么格式的数据

### 代码开发

#### VO 设计 `UserReportVO`

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TurnoverReportVO implements Serializable {

    //日期，以逗号分隔，例如：2022-10-01,2022-10-02,2022-10-03
    private String dateList;

    //营业额，以逗号分隔，例如：406.0,1520.0,75.0
    private String turnoverList;

}
```

#### Controller 层 `ReportController/turnoverStatistics`

```java
/**
 * 报表
 */
@RestController
@RequestMapping("/admin/report")
@Slf4j
@Api(tags = "统计报表相关接口")
public class ReportController {

    @Autowired
    private ReportService reportService;

    /**
     * 营业额数据统计
     *
     * @param begin
     * @param end
     * @return
     */
    @GetMapping("/turnoverStatistics")
    @ApiOperation("营业额数据统计")
    public Result<TurnoverReportVO> turnoverStatistics(
            @DateTimeFormat(pattern = "yyyy-MM-dd")
                    LocalDate begin,
            @DateTimeFormat(pattern = "yyyy-MM-dd")
                    LocalDate end) {
        return Result.success(reportService.getTurnover(begin, end));
    }

}
```

#### Service 层 `ReportService`

##### 接口

```java
public interface ReportService {

    /**
     * 根据时间区间统计营业额
     * @param beginTime
     * @param endTime
     * @return
     */
    TurnoverReportVO getTurnover(LocalDate beginTime, LocalDate endTime);
}
```

##### 实现类 `ReportServiceImpl`

```java
package com.sky.service.impl;

import com.sky.entity.Orders;
import com.sky.mapper.OrderMapper;
import com.sky.service.ReportService;
import com.sky.vo.TurnoverReportVO;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportServiceImpl implements ReportService {
    @Autowired
    private OrderMapper orderMapper;

    /**
     * 根据时间区间统计营业额
     *
     * @param begin
     * @param end
     * @return
     */
    public TurnoverReportVO getTurnover(LocalDate begin, LocalDate end) {
        List<LocalDate> dateList = new ArrayList<>();
        dateList.add(begin);

        while (!begin.equals(end)) {
            begin = begin.plusDays(1);//日期计算，获得指定日期后1天的日期
            dateList.add(begin);
        }

        List<Double> turnoverList = new ArrayList<>();
        for (LocalDate date : dateList) {
            LocalDateTime beginTime = LocalDateTime.of(date, LocalTime.MIN);
            LocalDateTime endTime = LocalDateTime.of(date, LocalTime.MAX);
            Map<String, Object> map = new HashMap<>();
            map.put("status", Orders.COMPLETED);
            map.put("begin", beginTime);
            map.put("end", endTime);
            Double turnover = orderMapper.sumByMap(map);
            turnover = turnover == null ? 0.0 : turnover;
            turnoverList.add(turnover);
        }

        //数据封装
        return TurnoverReportVO.builder()
                .dateList(StringUtils.join(dateList, ","))
                .turnoverList(StringUtils.join(turnoverList, ","))
                .build();
    }
}
```

#### Mapper 层

**在OrderMapper接口声明sumByMap方法**

```java
/**
 * 根据动态条件统计营业额
 * @param map
 */
Double sumByMap(Map map);
```

**在OrderMapper.xml文件中编写动态SQL**

```xml
<select id="sumByMap" resultType="java.lang.Double">
        select sum(amount) from orders
        <where>
            <if test="status != null">
                and status = #{status}
            </if>
            <if test="begin != null">
                and order_time &gt;= #{begin}
            </if>
            <if test="end != null">
                and order_time &lt;= #{end}
            </if>
        </where>
</select>
```

## 用户统计

所谓用户统计，实际上统计的是用户的数量。

通过折线图来展示，上面这根蓝色线代表的是用户总量，下边这根绿色线代表的是新增用户数量，是具体到每一天。

所以说用户统计主要统计**两个数据**，一个是**总的用户数量**，另外一个是**新增用户数量**

### 分析

**业务规则**

- 基于可视化报表的折线图展示用户数据，X轴为日期，Y轴为用户数
- 根据时间选择区间，展示每天的用户总量和新增用户量数据

#### 接口设计

![alt text](img/67.png)

### 代码开发

#### VO设计

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserReportVO implements Serializable {

    //日期，以逗号分隔，例如：2022-10-01,2022-10-02,2022-10-03
    private String dateList;

    //用户总量，以逗号分隔，例如：200,210,220
    private String totalUserList;

    //新增用户，以逗号分隔，例如：20,21,10
    private String newUserList;

}
```

#### Controller层

根据接口定义，在ReportController中创建userStatistics方法

```java
/**
 * 用户数据统计
 * @param begin
 * @param end
 * @return
 */
@GetMapping("/userStatistics")
@ApiOperation("用户数据统计")
public Result<UserReportVO> userStatistics(
        @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate begin,
        @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate end){
    return Result.success(reportService.getUserStatistics(begin,end));
}
```

#### Service层

##### 接口

```java
/**
 * 根据时间区间统计用户数量
 * @param begin
 * @param end
 * @return
 */
UserReportVO getUserStatistics(LocalDate begin, LocalDate end);
```

##### 实现类

```java
@Override
public UserReportVO getUserStatistics(LocalDate begin, LocalDate end) {
    List<LocalDate> dateList = new ArrayList<>();
    dateList.add(begin);

    while (!begin.equals(end)){
        begin = begin.plusDays(1);
        dateList.add(begin);
    }
    List<Integer> newUserList = new ArrayList<>(); //新增用户数
    List<Integer> totalUserList = new ArrayList<>(); //总用户数

    for (LocalDate date : dateList) {
        LocalDateTime beginTime = LocalDateTime.of(date, LocalTime.MIN);
        LocalDateTime endTime = LocalDateTime.of(date, LocalTime.MAX);
        //新增用户数量 select count(id) from user where create_time > ? and create_time < ?
        Integer newUser = getUserCount(beginTime, endTime);
        //总用户数量 select count(id) from user where  create_time < ?
        Integer totalUser = getUserCount(null, endTime);

        newUserList.add(newUser);
        totalUserList.add(totalUser);
    }

    return UserReportVO.builder()
            .dateList(StringUtils.join(dateList,","))
            .newUserList(StringUtils.join(newUserList,","))
            .totalUserList(StringUtils.join(totalUserList,","))
            .build();
}

/**
 * 根据时间区间统计用户数量
 * @param beginTime
 * @param endTime
 * @return
 */
private Integer getUserCount(LocalDateTime beginTime, LocalDateTime endTime) {
    Map map = new HashMap();
    map.put("begin",beginTime);
    map.put("end", endTime);
    return userMapper.countByMap(map);
}
```

#### Mapper层

**在UserMapper接口中声明countByMap方法**

```java
/**
 * 根据动态条件统计用户数量
 * @param map
 * @return
 */
Integer countByMap(Map map);
```

**在UserMapper.xml文件中编写动态SQL**

```xml
<select id="countByMap" resultType="java.lang.Integer">
    select count(id) from user
    <where>
        <if test="begin != null">
            and create_time &gt;= #{begin}
        </if>
        <if test="end != null">
            and create_time &lt;= #{end}
        </if>
    </where>
</select>
```
