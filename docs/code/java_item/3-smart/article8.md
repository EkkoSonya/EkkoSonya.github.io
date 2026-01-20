---
title: item3 - 8 文件解析模块1
date: 2026-1-12
category:
  - code
tag:
  - java_item
  - PaiSmart
# star: true
# sticky: true
order: -0.6
---

实现大文件的分片上传、断点续传、文件合并以及文档解析功能

## 目的

- 通过 Redis 和 MinIO 的结合，确保大文件上传的可靠性
- 并通过 Kafka 实现异步处理，进行文件解析等操作
- 模块支持多种文档格式（PDF、Word、Excel）的解析，并提取文本内容用于后续向量化处理
- 文本向量化通过调用阿里向量化 API 实现，生成的向量数据目前存储在 `Elasticsearch` 中，未来将同时支持 FAISS 存储

## 文件处理(解析+向量化)

![alt text](img/11.png)

### Kafka

Apache Kafka是由LinkedIn采⽤Scala和Java开发的开源流处理软件平台，并捐赠给了Apache Software Foundation

Kafka使用高效的数据存储和管理技术，能够轻松地处理TB级别的数据量。其优点包括高吞吐量、低延迟、可扩展性、持久性和容错性等

Kafka的设计目标是高吞吐、低延迟和可扩展，主要关注消息传递而不是消息处理

所以，Kafka并没有支持死信队列、顺序消息等高级功能 (需要自己设计?)

#### 基本概念

![alt text](img/12.png)

##### 生产者(Producer)和消费者(Consumer) - 客户端

客户端(Client)包括：生产者和消费者

向主题发布消息的客户端应用程序称为生产者，生产者程序通常持续不断地向⼀个或多个主题发送消息

订阅这些主题消息的客户端应用程序就被称为消费者，消费者也能够同时订阅多个主题的消息

##### 服务端(Broker)

一个 Kafka服务器 就是一个 Broker

集群由多个 Broker 组成，Broker 负责接收和处理客户端(即消息生产者和消息消费者)发送过来的请求，以及对消息进行持久化

虽然多个 Broker 进程能够运行在同⼀台机器上，但更常见的做法是将不同的 Broker 分散运行在不同的机器上，这样如果集群中某⼀台机器宕机，即使在它上面运行的所有 Broker 进程都挂掉了，其他机器上的 Broker 也可以对外提供服务

##### Topic(主题)

是⼀个逻辑概念，⼀个Topic被认为是业务含义相同的⼀组消息

发布订阅的对象是主题(Topic)，可以为每个业务、每个应用甚至是每类数据都创建专属的主题

客户端都通过绑定 Topic 来生产或者消费自己感兴趣的话题

##### Partition(分区)

Topic只是⼀个逻辑概念，⽽Partition就是实际存储消息的组件，每个Topic可以对应多个Partition，并且这些分区可以存在不同的Broker中

每个Partiton就是⼀个queue队列结构，所有消息以FIFO先进先出的顺序保存在这些Partition分区中

生产者生产的每条消息只会被发送到⼀个分区中，也就是说如果向⼀个双分区的主题发送⼀条消息，这条消息要么在分区 0 中，要么在分区 1 中

每个分区下可以配置若干个副本，其中只能有 1 个领导者副本和 N-1 个追随者副本

生产者向分区写入消息，每条消息在分区中的位置信息叫位移

##### 消费者组

每个消费者可以指定⼀个所属的消费者组，相同消费者组的消费者共同构成⼀个逻辑消费者组

每⼀个消息会被多个感兴趣的消费者组消费，但是在每⼀个消费者组内部，⼀个消息只会被消费⼀次

如果所有实例都属于同⼀个 Group, 那么它实现的就是消息队列模型

如果所有实例分别属于不同的 Group ，那么它实现的就是发布/订阅模型

#### docker部署

在 dokcker 拉取镜像时部署Kafka

整体主要做三件事：

- 启动一个单节点 Kafka（不依赖 Zookeeper，用 KRaft 模式）

- 等 Kafka 真正起来之后，自动创建两个 Topic：`file-processing` 和 `vectorization`
  
  Kafka 可用后，创建两个 topic：`file-processing` 和 `vectorization`
  每个都是：`replication-factor 1`（单副本）+ `partitions 1`（1 分区）

- 做健康检查 + 持久化数据

```yaml
services:
  kafka:
    image: bitnamilegacy/kafka:latest
    container_name: kafka       # 如果需要按照新的命名规则，请改为 pai_smart_kafka
    restart: always
    ports:
      # Kafka 客户端连接端口（producer/consumer 连接用）
      - "9092:9092"
      # KRaft controller 通信端口（Kafka 内部控制面用）
      - "9093:9093"
    # 把 Kafka 数据目录挂到 volume，重启容器数据不丢
    volumes:
      - kafka-data:/bitnami/kafka
    # ---------------------------------------------------- #
    environment:
      # 单节点启动
      - KAFKA_CFG_NODE_ID=0
      # 同一个进程同时扮演 controller + broker
      - KAFKA_CFG_PROCESS_ROLES=controller,broker
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@localhost:9093

      # 监听器配置 对谁开放、用哪个端口
      - KAFKA_CFG_LISTENERS=CONTROLLER://:9093,PLAINTEXT://:9092
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
    command:
      - sh
      - -c
      - |
        # 启动 Kafka（使用 bitnami 完整初始化流程）
        /opt/bitnami/scripts/kafka/run.sh &

        # 等待 Kafka 完全启动（更可靠的检测方式）
        echo "Waiting for Kafka to start..."
        while ! kafka-topics.sh --bootstrap-server localhost:9092 --list 2>/dev/null; do
          sleep 2
        done

        # 创建第一个主题（忽略已存在的错误）
        echo "Creating topic: file-processing"
        kafka-topics.sh --create \
          --bootstrap-server localhost:9092 \
          --replication-factor 1 \
          --partitions 1 \
          --topic file-processing 2>/dev/null || true

        # 创建第二个主题 vectorization
        echo "Creating topic: vectorization"
        kafka-topics.sh --create \
          --bootstrap-server localhost:9092 \
          --replication-factor 1 \
          --partitions 1 \
          --topic vectorization 2>/dev/null || true
        # 保持容器运行
        tail -f /dev/null
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "kafka-topics.sh --bootstrap-server localhost:9092 --list || exit 1",
        ]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
```

在使用时用的是 `KafkaTemplate<String, Object>`

##### Kafka结构

### JAVA 使用Kafka API

#### 发送消息 `KafkaTemplate`

`KafkaTemplate` 封装了一个生产者，并提供了便捷方法将数据发送到 Kafka 主题

该类构造方法需要传递一个 `ProducerFactory` 对象，来表示如何根据对应配置创建一个生产者从而进行消息传递

```java
public KafkaTemplate(ProducerFactory<K, V> producerFactory) {
  this(producerFactory, false);
}

public KafkaTemplate(ProducerFactory<K, V> producerFactory, boolean autoFlush) {
  this(producerFactory, autoFlush, (Map)null);
}

public KafkaTemplate(ProducerFactory<K, V> producerFactory, boolean autoFlush, @Nullable Map<String, Object> configOverrides) {
  this.logger = new LogAccessor(LogFactory.getLog(this.getClass()));
  this.producers = new ConcurrentHashMap();
  this.micrometerTags = new HashMap();
  this.clusterIdLock = new ReentrantLock();
  this.beanName = "kafkaTemplate";
  this.messageConverter = new MessagingMessageConverter();
  this.producerListener = new LoggingProducerListener();
  this.closeTimeout = ProducerFactoryUtils.DEFAULT_CLOSE_TIMEOUT;
  this.micrometerEnabled = true;
  this.observationRegistry = ObservationRegistry.NOOP;
  Assert.notNull(producerFactory, "'producerFactory' cannot be null");
  this.autoFlush = autoFlush;
  this.micrometerEnabled = KafkaUtils.MICROMETER_PRESENT;
  this.customProducerFactory = !CollectionUtils.isEmpty(configOverrides);
  if (this.customProducerFactory) {
      this.producerFactory = producerFactory.copyWithConfigurationOverride(configOverrides);
  } else {
      this.producerFactory = producerFactory;
  }

  this.transactional = this.producerFactory.transactionCapable();
}
```

##### 创建 `KafkaTemplate`

就需要提供一个 `ProducerFactory` 对象 生产者工厂，规定了一些基础配置，然后在 Template 构造时引用

`ProducerConfig` 是 Kafka 客户端里定义的生产者配置项大全的类

例子

```java
@Bean
public ProducerFactory producerFactory() {
    return new DefaultKafkaProducerFactory<>(producerConfigs());
}

@Bean
public Map producerConfigs() {
    Map props = new HashMap<>();
    props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
    props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, IntegerSerializer.class);
    props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
    // See https://kafka.apache.org/41/documentation/#producerconfigs for more properties
    return props;
}

@Bean
public KafkaTemplate kafkaTemplate() {
    return new KafkaTemplate(producerFactory());
}
```

此外，比如我们前面注册了一个 `ProducerFactory<String, Object>` 的类, 我们在穿件别的，可以覆盖这个工厂的 `ProducerConfig` 属性，以使用与同一工厂不同的生产者配置创建模板

```java
@Bean
public KafkaTemplate<String, Object> reliableTemplate(ProducerFactory<String, Object> pf) {
  Map<String, Object> overrides = new HashMap<>();
  overrides.put(ProducerConfig.ACKS_CONFIG, "all");
  overrides.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
  overrides.put(ProducerConfig.RETRIES_CONFIG, 3);

  return new KafkaTemplate<>(pf, overrides);
}
```

##### `KafkaTemplate`方法

```java
CompletableFuture<SendResult<K, V>> sendDefault(V data);

CompletableFuture<SendResult<K, V>> sendDefault(K key, V data);

CompletableFuture<SendResult<K, V>> sendDefault(Integer partition, K key, V data);

CompletableFuture<SendResult<K, V>> sendDefault(Integer partition, Long timestamp, K key, V data);

CompletableFuture<SendResult<K, V>> send(String topic, V data);

CompletableFuture<SendResult<K, V>> send(String topic, K key, V data);

CompletableFuture<SendResult<K, V>> send(String topic, Integer partition, K key, V data);

CompletableFuture<SendResult<K, V>> send(String topic, Integer partition, Long timestamp, K key, V data);

CompletableFuture<SendResult<K, V>> send(ProducerRecord<K, V> record);

CompletableFuture<SendResult<K, V>> send(Message<?> message);

Map<MetricName, ? extends Metric> metrics();

List<PartitionInfo> partitionsFor(String topic);

<T> T execute(ProducerCallback<K, V, T> callback);

<T> T executeInTransaction(OperationsCallback<K, V, T> callback);

// Flush the producer.
void flush();

interface ProducerCallback<K, V, T> {

    T doInKafka(Producer<K, V> producer);

}

interface OperationsCallback<K, V, T> {

    T doInOperations(KafkaOperations<K, V> operations);

}
```

主要方法有 `send` 和 `sendDefault`，并且返回的都是 `Future` 类型 `CompletableFuture`

The sendDefault API requires that a default topic has been provided to the template.

```java
public CompletableFuture<SendResult<K, V>> sendDefault(@Nullable V data) {
  return this.send(this.defaultTopic, data);
}
```

即用 `sendDefault` 方法需要确定 `defaultTopic`

而 `send` 需要自己指明

调用 `kafkaTemplate.metrics()` (拿生产者的监控指标) 和 `kafkaTemplate.partitionsFor(topic)` (查 topic 的分区信息)

KafkaTemplate 不自己实现这些功能，它会把调用原封不动转发给底层的 `org.apache.kafka.clients.producer.KafkaProducer`（或者说 Producer 实例）去执行

调用 KafkaTemplate.send(Message<?> message) 这种方法时, 消息的元信息（topic、partition、key、timestamp）不再写在参数里，而是放在 Message 的 header（消息头）里传递

`Message`

Spring 自己定义了一个通用消息接口：`org.springframework.messaging.Message<T>`

它的实现在 `GenericMessage<T>`

主要就是有两个属性一个是 `payload` 一个是 `headers`

如果用 `Message` 传信息就可以这样写

```java
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.kafka.support.KafkaHeaders;

Message<FileProcessingTask> message = MessageBuilder
        .withPayload(task)
        .setHeader(KafkaHeaders.TOPIC, kafkaConfig.getFileProcessingTopic())
        .setHeader(KafkaHeaders.KEY, request.fileMd5())
        .setHeader(KafkaHeaders.TIMESTAMP, System.currentTimeMillis())
        .build();

kafkaTemplate.send(message);
```

##### 向 Kafka 发送消息

发送方法返回一个 `CompletableFuture<SendResult>` 对象，我们需要用 `whenComplete(...)` 去写回调

非阻塞

```java
public void sendToKafka(final MyOutputData data) {
  final ProducerRecord<String, String> record = createRecord(data);

  CompletableFuture<SendResult<String, String>> future = template.send(record);
  future.whenComplete((result, ex) -> {
      if (ex == null) {
          handleSuccess(data);
      }
      else {
          handleFailure(data, record, ex);
      }
  });
}
```

阻塞

```java
public void sendToKafka(final MyOutputData data) {
  final ProducerRecord<String, String> record = createRecord(data);

  try {
      template.send(record).get(10, TimeUnit.SECONDS);
      handleSuccess(data);
  }
  catch (ExecutionException e) {
      handleFailure(data, record, e.getCause());
  }
  catch (TimeoutException | InterruptedException e) {
      handleFailure(data, record, e);
  }
}
```

##### 事务

Spring Kafka 在 `executeInTransaction` 里会做这些事（概念上）：

- 从 ProducerFactory 拿一个“事务型 Producer”（前提是你设置了 transactionIdPrefix）
- beginTransaction()
- 执行你的 lambda：send(...)
- commitTransaction()
  - 如果 lambda 里抛异常或发送失败导致异常冒泡：abortTransaction()

用事务是希望这个任务消息一定要可靠地发出去，最好和我前面那堆数据库操作（更新 file_upload 状态、写记录等）形成一个一致的提交边界

##### 监听 `ProducerListener`

可以为 KafkaTemplate 配置一个 ProducerListener，以获取发送结果（成功或失败）的异步回调，而不是等待 Future 完成

```java
public interface ProducerListener<K, V> {
  default void onSuccess(ProducerRecord<K, V> producerRecord, RecordMetadata recordMetadata) {
  }

    default void onError(ProducerRecord<K, V> producerRecord, RecordMetadata recordMetadata, Exception exception) {
  }
}
```

示例

可以 `KafkaProducerListenerConfig.java` 建一个监听配置

```java
@Component
public class KafkaProducerLogListener implements ProducerListener<String, Object> {

    @Override
    public void onSuccess(ProducerRecord<String, Object> record, RecordMetadata metadata) {
        log.info("sent ok topic={}, partition={}, offset={}, key={}",
                metadata.topic(), metadata.partition(), metadata.offset(), record.key());
    }

    @Override
    public void onError(ProducerRecord<String, Object> record,
                        RecordMetadata metadata,
                        Exception exception) {
        String meta = (metadata == null)
                ? "meta=null"
                : String.format("partition=%d, offset=%d", metadata.partition(), metadata.offset());

        log.error("send failed topic={}, key={}, {}",
                record.topic(), record.key(), meta, exception);
    }
}
```

然后在 KafkaTemplate 那里注入它：

```java
@Bean
public KafkaTemplate<String, Object> kafkaTemplate(
  ProducerFactory<String, Object> pf,
  ProducerListener<String, Object> producerListener) {
  KafkaTemplate<String, Object> template = new KafkaTemplate<>(pf);
  template.setProducerListener(producerListener);
  return template;
}

```

#### 接收消息

##### 示例

监听 Kafka 的 test topic，最简单就 3 步：加依赖 → 配置 consumer → 写 `@KafkaListener`

1.加依赖

```xml
<dependency>
  <groupId>org.springframework.kafka</groupId>
  <artifactId>spring-kafka</artifactId>
</dependency>
```

2.配置 application.yml

```yml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: test-group
      auto-offset-reset: earliest   # 第一次消费从最早开始（可选）
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.StringDeserializer
```

3.写监听器 Consumer

```java
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class TestTopicListener {
    @KafkaListener(topics = "test", groupId = "test-group")
    public void onMessage(String msg) {
        System.out.println("收到 test topic 消息: " + msg);
    }
}
```

##### 消息监听器接口

使用消息监听器容器时，您必须提供一个监听器来接收数据。目前有八种支持的消息监听器接口

```java
public interface MessageListener<K, V> {
  void onMessage(ConsumerRecord<K, V> data);
}

public interface AcknowledgingMessageListener<K, V> {
  void onMessage(ConsumerRecord<K, V> data, Acknowledgment acknowledgment);
}

public interface ConsumerAwareMessageListener<K, V> extends MessageListener<K, V> {
  void onMessage(ConsumerRecord<K, V> data, Consumer<?, ?> consumer);
}

public interface AcknowledgingConsumerAwareMessageListener<K, V> extends MessageListener<K, V> {
  void onMessage(ConsumerRecord<K, V> data, Acknowledgment acknowledgment, Consumer<?, ?> consumer);
}

public interface BatchMessageListener<K, V> {
  void onMessage(List<ConsumerRecord<K, V>> data);
}

public interface BatchAcknowledgingMessageListener<K, V> {
  void onMessage(List<ConsumerRecord<K, V>> data, Acknowledgment acknowledgment);
}

public interface BatchConsumerAwareMessageListener<K, V> extends BatchMessageListener<K, V> {
  void onMessage(List<ConsumerRecord<K, V>> data, Consumer<?, ?> consumer);
}

public interface BatchAcknowledgingConsumerAwareMessageListener<K, V> extends BatchMessageListener<K, V> {
  void onMessage(List<ConsumerRecord<K, V>> data, Acknowledgment acknowledgment, Consumer<?, ?> consumer);
}
```

### ElasticSearch

### Consumer解析过程

首先在 Kafka 中会创建两个Topic对应文档解析(`file-processing`)和向量化(`vectorization`)

他们的副本和分区都简单设为1

当用户成功把文件chunks均合并好后，会发送信息到 `file-processing` Topic

```java
kafkaTemplate.executeInTransaction(kt -> {
  kt.send(kafkaConfig.getFileProcessingTopic(), task);
  return true;
});
```