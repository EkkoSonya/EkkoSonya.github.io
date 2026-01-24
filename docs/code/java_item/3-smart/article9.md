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

### ElasticSearch

| **层级** | **MySQL (关系型)** | **Elasticsearch (8.x)** | **备注** |
| --- | --- | --- | --- |
| **服务器** | Instance (MySQL 服务) | **Node / Cluster** | 整个服务进程 |
| **逻辑库** | Database (库) | **无** (或者说是命名空间) | ES 没有物理的“库”概念，通常靠命名区分（如 `app1_users`） |
| **数据集合** | **Table (表)** | **Index (索引)** | **这是最核心的对应关系**。都是存同类数据的容器。 |
| **数据行** | Row (行) | **Document (文档)** | JSON 格式的一条记录 |
| **数据列** | Column (列) | **Field (字段)** | JSON 里的 Key |
| **表结构** | Schema | **Mapping** | 定义字段类型的地方 |
| **查询加速** | Index (B+树索引) | **Inverted Index (倒排索引)** | ES **默认**对每个字段都建好了索引结构，不需要你手动加 |

### 分块数据编码后存入ES `vectorizationService.vectorize`

在触发了 `Consumer` 监听后，`FileProcessingConsumer.java` 中的 `processTask(FileProcessingTask task)` 会进行处理

前面介绍了一部分的逻辑，即从MinIO读取文件，通过流式读取的方式逐步将文档部分内容引入JVM内存，然后依次读取进行切割成小批量文本块，然后存入 `document_vectors` 数据表中

因此在 `document_vectors` 数据表保存了该文件所有小文本块的信息，他们的 `file_md5` 字段是相同的，在后续的编码就根据这个来获取该文件的所有小文本块信息列表，然后调用 阿里Embedding模型来进行编码，进而依次保存到 ES 中

主要逻辑在 `vectorizationService.vectorize(文件MD5, 用户ID, 文件所属组织标签, 文件是否公开)`

```java
vectorizationService.vectorize(task.getFileMd5(), task.getUserId(), task.getOrgTag(), task.isPublic());
```

#### 根据文件MD5获取小文本块列表

```java
logger.info("开始向量化文件，fileMd5: {}, userId: {}, orgTag: {}, isPublic: {}", fileMd5, userId, orgTag, isPublic);
            
// 获取文件分块内容
List<TextChunk> chunks = fetchTextChunks(fileMd5);
if (chunks == null || chunks.isEmpty()) {
    logger.warn("未找到分块内容，fileMd5: {}", fileMd5);
    return;
}

// 提取文本内容
List<String> texts = chunks.stream()
      .map(TextChunk::getContent)
      .toList();
```

主要逻辑实现就在 `fetchTextChunks`

```java
// 从数据库获取分块内容
private List<TextChunk> fetchTextChunks(String fileMd5) {
  // 调用 Repository 查询数据
  List<DocumentVector> vectors = documentVectorRepository.findByFileMd5(fileMd5);

  // 转换为 TextChunk 列表
  return vectors.stream()
          .map(vector -> new TextChunk(
                  vector.getChunkId(),
                  vector.getTextContent()
          ))
          .toList();
}
```

直接通过 `documentVectorRepository` 根据 fileMd5 来获取对应的文本块信息列表 `List<DocumentVector>`

然后通过 `stream` 流只保存对应的 `TextChunk` 列表 (chunkId 和 切块文本内容)

最终我们得到了 `TextChunk` 列表 `chunks` 和对应的内容列表 `List<String> texts`

#### 调用外部模型生成向量表示

通过调用阿里embedding模型，对每一个文本块编码为 2048 维的向量表示，然后将其依次存入 ES 中，提供关键词搜索和向量搜索

```java
// 调用外部模型生成向量
List<float[]> vectors = embeddingClient.embed(texts);

// 构建 Elasticsearch 文档并存储
List<EsDocument> esDocuments = IntStream.range(0, chunks.size())
  .mapToObj(i -> new EsDocument(
          UUID.randomUUID().toString(),
          fileMd5,
          chunks.get(i).getChunkId(),
          chunks.get(i).getContent(),
          vectors.get(i),
          "deepseek-embed", // 更新为 DeepSeek 的模型版本
          userId,
          orgTag,
          isPublic
  ))
  .toList();

elasticsearchService.bulkIndex(esDocuments); // 批量存储到 Elasticsearch

logger.info("向量化完成，fileMd5: {}", fileMd5);
```

通过调用 `embeddingClient.embed` 来将该文件对应的所有小文本块列表内容依次编码为指定维度(2048)的向量后，得到对应的 `List<float[]> vectors` 列表

随后将这些信息存入 ES 中

每个是一个 `EsDocument` 实例，包括了对应的chunkId、原始文本内容、编码后向量表示、用户id、文件所属组织id等

最后调用 `elasticsearchService.bulkIndex(esDocuments)` 批量存储

#### `EmbeddingClient` 向量编码

##### WebClient

WebClient 是 Spring 5.0 (Spring Boot 2.0) 引入的一个现代化 HTTP 客户端

在 WebClient 出现之前, 用的大多是 `RestTemplate`, 但 `RestTemplate` 是阻塞的

`WebClient`即可以像 RestTemplate 一样阻塞运行 (用 `.block()`)

也可以完全异步运行 (用 `.subscribe()`)

##### WebClient基本配置 —— `WebClientConfig`

WebClient 可以通过静态方法 WebClient.create() 创建，也可以通过 WebClient.Builder 定制

以下是一个最基本的配置：

```java
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient() {
        return WebClient.create("https://api.example.com");
    }
}
```

为了增强 WebClient 的灵活性，可以使用 WebClient.Builder 来配置全局属性，比如超时设置、全局拦截器等，在项目里对于 `embeddingWebClient` 就是这样配置的

通过 `@Value` 绑定配置文件对应的信息，然后根据 `embeddingWebClient` 来进行注册

```java
@Configuration
public class WebClientConfig {
  @Value("${embedding.api.url}")
  private String apiUrl;
  
  @Value("${embedding.api.key}")
  private String apiKey;
  
  @Bean
  public WebClient embeddingWebClient() {
    ExchangeStrategies strategies = ExchangeStrategies.builder()
        .codecs(configurer -> configurer
            .defaultCodecs()
            .maxInMemorySize(16 * 1024 * 1024)) // 16MB
        .build();

    return WebClient.builder()
        .baseUrl(apiUrl)
        .exchangeStrategies(strategies)
        .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
        .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .build();
  }
} 
```

##### 实现向量生成客户端 —— `EmbeddingClient`

通过 `embed` 方法来对文件的小文本块分批次进行embedding操作，每次 `batch` 大小

通过 `callApiOnce` 构建请求发送，返回 Response 类型是 `String`

然后用 `parseVectors` 来解析请求，得到这批次的向量表示并放到列表中

```java
// 嵌入向量生成客户端
@Component
public class EmbeddingClient {
  @Value("${embedding.api.model}")
  private String modelId;
  
  @Value("${embedding.api.batch-size:100}")
  private int batchSize;

  @Value("${embedding.api.dimension:2048}")
  private int dimension;
  
  private static final Logger logger = LoggerFactory.getLogger(EmbeddingClient.class);
  private final WebClient webClient;
  private final ObjectMapper objectMapper;

  public EmbeddingClient(WebClient embeddingWebClient, ObjectMapper objectMapper) {
      this.webClient = embeddingWebClient;
      this.objectMapper = objectMapper;
  }

  /**
   * 调用通义千问 API 生成向量
   * @param texts 输入文本列表
   * @return 对应的向量列表
   */
  public List<float[]> embed(List<String> texts) {
    try {
        logger.info("开始生成向量，文本数量: {}", texts.size());
        
        List<float[]> all = new ArrayList<>(texts.size());
        for (int start = 0; start < texts.size(); start += batchSize) {
            int end = Math.min(start + batchSize, texts.size());
            List<String> sub = texts.subList(start, end);
            logger.debug("调用向量 API, 批次: {}-{} (size={})", start, end - 1, sub.size());
            String response = callApiOnce(sub);
            all.addAll(parseVectors(response));
        }
        logger.info("成功生成向量，总数量: {}", all.size());
        return all;
    } catch (Exception e) {
        logger.error("调用向量化 API 失败: {}", e.getMessage(), e);
        throw new RuntimeException("向量生成失败", e);
    }
  }

  private String callApiOnce(List<String> batch) {
    Map<String, Object> requestBody = new HashMap<>();
    requestBody.put("model", modelId);
    requestBody.put("input", batch);
    requestBody.put("dimension", dimension);  // 直接在根级别设置dimension
    requestBody.put("encoding_format", "float");  // 添加编码格式

    return webClient.post()
            .uri("/embeddings")
            .bodyValue(requestBody)
            .retrieve()
            .bodyToMono(String.class)
            .retryWhen(Retry.fixedDelay(3, Duration.ofSeconds(1))
                    .filter(e -> e instanceof WebClientResponseException))
            .block(Duration.ofSeconds(30));
  }

  private List<float[]> parseVectors(String response) throws Exception {
      JsonNode jsonNode = objectMapper.readTree(response);
      JsonNode data = jsonNode.get("data");  // 兼容模式下使用data字段
      if (data == null || !data.isArray()) {
          throw new RuntimeException("API 响应格式错误: data 字段不存在或不是数组");
      }
      
      List<float[]> vectors = new ArrayList<>();
      for (JsonNode item : data) {
          JsonNode embedding = item.get("embedding");
          if (embedding != null && embedding.isArray()) {
              float[] vector = new float[embedding.size()];
              for (int i = 0; i < embedding.size(); i++) {
                  vector[i] = (float) embedding.get(i).asDouble();
              }
              vectors.add(vector);
          }
      }
      return vectors;
  }
}
```

##### `ObjectMapper`

`ObjectMapper` 是 Java 生态中最著名的 JSON 处理库 Jackson 的核心类, 负责 序列化 和 反序列化

A. 序列化 (Java -> JSON)

当你把数据发给前端或存入数据库时，ObjectMapper 把 Java 对象转换成 JSON 字符串

```java
// Java 对象
User user = new User("Gemini", 18);

// 翻译
String json = objectMapper.writeValueAsString(user);

// 结果
// {"name":"Gemini", "age":18}
```

B. 反序列化 (JSON -> Java)

当你从 API 收到数据时，ObjectMapper 把 JSON 字符串转换成你的 Java 类对象

```java
String json = "{\"name\":\"Gemini\", \"age\":18}";

// 翻译
User user = objectMapper.readValue(json, User.class);

// 结果：user.getName() 等于 "Gemini"
```

C. 树模型 `JsonNode`

当 JSON 结构非常复杂、嵌套很深，或者你不想专门为此写一个 Java 类（POJO）来对应时, 可以用 `readTree` 来直接操作

把 JSON 看作一棵“树”，就可以不断的用 `jsonNode.get("xxx")` 逐层获取

当到最后一层的时候，可以用 `asText()` `asBoolean()` `asDouble` 等方法指明类型转换

#### `ElasticsearchService` ES相关操作

在通过 `embeddingClient.embed(texts)` 得到所有切割后的小文本块的2048编码向量后

需要将其依次存入 ES 中，从而可以使用 ES 提供的高效搜索机制

首先通过 `Stream` 机制创建了对应的 Es 存储对象 `EsDocument`

每个对象包含了对应的 chunkId, 原始文本, 编码后的向量表示, 编码所用的模型版本, 用户id, 文件所属组织ID 以及 文件是否公开 的信息，会全存入 ES 中

```java
List<EsDocument> esDocuments = IntStream.range(0, chunks.size())
  .mapToObj(i -> new EsDocument(
          UUID.randomUUID().toString(),
          fileMd5,
          chunks.get(i).getChunkId(),
          chunks.get(i).getContent(),
          vectors.get(i),
          "deepseek-embed", // 更新为 DeepSeek 的模型版本
          userId,
          orgTag,
          isPublic
  ))
  .toList();
```

之后就将这个列表 `List<EsDocument> esDocuments` 调用 `elasticsearchService.bulkIndex(esDocuments);` 进行存储

##### `EsConfig`

在使用 `ElasticsearchService` 之前，我们需要配置对应的 ES 属性，才能有效地使用

这里是 ES 8.x 版本，在配置对应客户端采用了分层设计，并且为了应对 Elasticsearch 8.0+ 默认开启的安全策略（HTTPS + 密码）

Java API 客户端围绕三个主要组件进行了结构化设计：

- 底层 (Low Level - RestClient)：只负责发 HTTP 请求（GET, POST）。它不管你发的是什么业务数据，只管网络连接、连接池、超时控制。这是最底层的“管道”

- 传输层 (Transport - ElasticsearchTransport)：负责“翻译”。它把你的 Java 对象序列化成 JSON 发给底层，再把底层收到的 JSON 反序列化回 Java 对象

- 高层 (High Level - ElasticsearchClient)：提供强类型的 API（比如 index(), search()），是业务代码里直接调用的那个对象，也是配置类返回的注册Bean

```java
// Elasticsearch客户端配置类
@Configuration
public class EsConfig {
  @Value("${elasticsearch.host}")
  private String host;

  @Value("${elasticsearch.port}")
  private int port;

  @Value("${elasticsearch.scheme:https}")
  private String scheme;

  @Value("${elasticsearch.username:elastic}")
  private String username;

  @Value("${elasticsearch.password:changeme}")
  private String password;

  @Bean
  public ElasticsearchClient elasticsearchClient() {
    // 创建低级客户端
    RestClientBuilder builder = RestClient.builder(new HttpHost(host, port, scheme));

    // 设置基本认证
    if (username != null && !username.isEmpty()) {
        BasicCredentialsProvider credsProvider = new BasicCredentialsProvider();
        credsProvider.setCredentials(AuthScope.ANY, new UsernamePasswordCredentials(username, password));
        builder.setHttpClientConfigCallback(httpClientBuilder -> {
            // 忽略 TLS 证书（仅限开发环境）
            try {
                SSLContext sslContext = SSLContexts.custom()
                        .loadTrustMaterial(null, (X509Certificate[] chain, String authType) -> true)
                        .build();
                httpClientBuilder.setSSLContext(sslContext);
                httpClientBuilder.setSSLHostnameVerifier(NoopHostnameVerifier.INSTANCE);
            } catch (Exception e) {
                // ignore
            }
            return httpClientBuilder.setDefaultCredentialsProvider(credsProvider);
        });
    }

    RestClient restClient = builder.build();

    // 创建传输层
    // 这里指定了 JacksonJsonpMapper，意味着 ES 客户端会复用 Spring Boot 默认的 Jackson 库来处理 JSON，保持项目依赖的一致性
    ElasticsearchTransport transport = new RestClientTransport(
            restClient, new JacksonJsonpMapper()
    );

    // 返回高级客户端
    return new ElasticsearchClient(transport);
  }
}
```

通过 RestClient.builder 创建一个 RestClientBuilder，用来构建底层的 RestClient

如果提供了 username 和 password，则创建一个 BasicCredentialsProvider 来存储凭证

配置完成后，通过 `RestClient restClient = builder.build();` 创建

使用 RestClientTransport 创建一个传输层对象，RestClient 用来处理底层通信，JacksonJsonpMapper 用于 JSON 解析

最后，返回一个配置好的 ElasticsearchClient，该客户端可以进行更高层次的 Elasticsearch 操作（如索引、查询等）

##### `ElasticsearchService.bulkIndex(List<EsDocument> documents)`

根据传来的编码列表文档信息，存入ES中

在 ES 8.x 的 Java Client 中，使用 BulkOperation 通常分为三步：

- 准备一个 `List<BulkOperation>` 集合。

- 往集合里塞各种操作（新增、删除、修改）。

- 调用 `esClient.bulk()` 一次性发送

###### 构建 `BulkOperation` 列表

BulkOperation 是 Elasticsearch 新版 Java 客户端（co.elastic.clients）中用于批量操作的核心对象

```java
// 将文档列表转换为批量操作列表，每个文档都对应一个索引操作
List<BulkOperation> bulkOperations = documents.stream()
  .map(doc -> BulkOperation.of(op -> op.index(idx -> idx
          .index("knowledge_base") // 指定索引名称
          .id(doc.getId()) // 使用文档的ID作为Elasticsearch中的文档ID
          .document(doc) // 将文档对象作为数据源
  )))
  .toList();
```

利用 Java 8 的 Stream 流式编程，将业务系统中的“文档对象列表”，批量转换成了 Elasticsearch 客户端能识别的“批量操作指令列表”

- `.map(doc -> BulkOperation.of(...))`: 把流里的每一个 “业务文档对象” (doc) 转换成了一个 “ES 操作指令对象” (BulkOperation)

- `op.index(idx -> ...)`: 贴上“存储”的标签, 告诉 ES，这个操作的类型是 Index（索引/存储）

- `.index("knowledge_base")`: 指定数据要存入哪个索引（数据库表），这里是名为 knowledge_base 的索引

- `.id(doc.getId())`: 指定文档在 ES 里的唯一标识

- `.document(doc)`: 把你的 Java 对象 doc 直接塞进去。底层会自动把它序列化成 JSON 格式

###### 创建BulkRequest对象

```java
BulkRequest request = BulkRequest.of(b -> b.operations(bulkOperations));
```

###### 执行批量操作

```java
// 执行批量索引操作
BulkResponse response = esClient.bulk(request);

// 检查响应结果
if (response.errors()) {
    logger.error("批量索引过程中发生错误:");
    for (BulkResponseItem item : response.items()) {
        if (item.error() != null) {
            logger.error("文档索引失败 - ID: {}, 错误: {}", item.id(), item.error().reason());
        }
    }
    throw new RuntimeException("批量索引部分失败，请检查日志");
} else {
    logger.info("批量索引成功完成，文档数量: {}", documents.size());
}
```

##### `EsIndexInitializer` 初始化

这个配置类实现了 `CommandLineRunner` 会在SpringBoot加载完时开始执行

在 Spring Boot 应用启动完成后的第一时间，自动检查并创建 Elasticsearch 索引（数据库表结构）

`CommandLineRunner` 是 Spring Boot 提供的一个接口

实现这个接口的 Bean，会在 Spring 容器完全启动后，但在 开始接收用户请求前，自动执行 run 方法

作用：它通常用于加载缓存、初始化配置、或者像这里一样——初始化数据库结构

```java
@Component
public class EsIndexInitializer implements CommandLineRunner {

  private static final Logger logger = LoggerFactory.getLogger(EsIndexInitializer.class);

  @Autowired
  private ElasticsearchClient esClient;

  @Value("classpath:es-mappings/knowledge_base.json") // 加载 JSON 文件
  private org.springframework.core.io.Resource mappingResource;

  @Override
  public void run(String... args) throws Exception {
      try {
          initializeIndex();
      } catch (Exception exception) {
          // 特别处理连接关闭异常，尝试重新连接
          if (exception instanceof ConnectionClosedException || (exception.getCause() != null && exception.getCause() instanceof ConnectionClosedException)) {
              logger.error("Elasticsearch连接已关闭，等待5秒后重试...");
              try {
                  Thread.sleep(5000); // 等待5秒后重试
                  // 重新尝试初始化索引
                  initializeIndex();
              } catch (Exception retryException) {
                  logger.error("重试初始化索引失败，请检查Elasticsearch连接配置，比如说是否开启了 HTTPS 模式: {}", retryException.getMessage());
                  throw new RuntimeException("初始化索引失败，重试也未能成功", retryException);
              }
          } else {
              throw new RuntimeException("初始化索引失败", exception);
          }
      }
  }

  /**
   * 初始化索引的核心逻辑
   * @throws Exception
   */
  private void initializeIndex() throws Exception {
      // 检查索引是否存在
      BooleanResponse existsResponse = esClient.indices().exists(ExistsRequest.of(e -> e.index("knowledge_base")));
      if (!existsResponse.value()) {
          createIndex();
      } else {
          logger.info("索引 'knowledge_base' 已存在");
      }
  }

  /**
   * 创建索引
   * @throws Exception
   */
  private void createIndex() throws Exception {
      // 读取 JSON 文件内容
      String mappingJson = new String(Files.readAllBytes(mappingResource.getFile().toPath()), StandardCharsets.UTF_8);

      // 创建索引并应用映射
      CreateIndexRequest createIndexRequest = CreateIndexRequest.of(c -> c
              .index("knowledge_base") // 索引名称
              .withJson(new StringReader(mappingJson)) // 使用 JSON 文件定义映射
      );
      esClient.indices().create(createIndexRequest);
      logger.info("索引 'knowledge_base' 已创建");
  }
}
```
