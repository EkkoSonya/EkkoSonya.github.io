---
title: item3-1
date: 2025-12-15
category:
  - code
tag:
  - java_item
  - PaiSmart
# star: true
# sticky: true
order: -0.6
---

## 启动项目

注意点:

### docker配置问题

如果启动后想改 mysql 密码，再去 `docker-compose.yaml`修改，是无效的

>你挂载了 `mysql-data:/var/lib/mysql`，而这个数据卷里已经存在旧的 MySQL 初始化数据
> MySQL 只在“第一次初始化数据目录”时读取 MYSQL_ROOT_PASSWORD 后续再改环境变量，完全不会生效

```java
// 停容器
docker compose down

// 删除数据卷（关键）
docker volume rm pai_smart_mysql-data

// 注意：
// pai_smart_mysql-data = 项目名_卷名

// 重新启动
docker compose up -d
```

这一次：

MySQL 会重新初始化 MYSQL_ROOT_PASSWORD=123456 会生效 root 可直接登录

凡是和「安全、密码、集群元数据、系统索引」有关的配置：

一旦 data volume 已初始化，再改 environment = 不生效

### application读取问题

Spring Boot 是通过 spring.profiles.active 决定用 application.yaml + 哪个 application-xxx.yaml 的

IDEA 里本质就是：启动时传不同的 profile 参数

假设你现在有：

```
application.yaml
application-docker.yaml
```

加载规则是：

永远加载 `application.yaml`

再加载：`application-${spring.profiles.active}.yaml`

后加载的会覆盖前面的
