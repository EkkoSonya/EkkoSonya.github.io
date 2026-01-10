---
title: item3 - 3 用户管理模块1
date: 2026-1-8
category:
  - code
tag:
  - java_item
  - PaiSmart
# star: true
# sticky: true
order: -0.6
---

解决用户注册、登录以及权限控制

## 目的

- 确保用户身份安全性
- 有灵活权限管理机制，基于角色的访问控制，通过 RBAC 实现不同角色(管理员|普通用户)功能权限区分
- 为其他模块提供信息支持

## 实现功能

### 用户注册

允许用户使用用户名和密码进行注册，成功注册后默认分配普通用户的角色

#### 流程

- 接收用户注册请求，验证用户名和密码
- 检查用户名是否已存在
- 使用 BCrypt 加密密码
- 创建用户记录，设置默认角色为USER => 存 users 表
- 创建用户私人组织标签（PRIVATE_username） => 存 organization_tag 表
- 将私人组织标签设置为用户的主组织标签
- 返回注册成功响应

![alt text](img/1.png)

#### 接口设计

- URL: /api/v1/users/register
- Method: POST
- Request Body
  
  ```json
    {
      "username": "string",   // 用户名，唯一
      "password": "string"    // 密码（明文传输，后端加密存储）
    }
  ```

- Response:
  
  ```json
  {
    "code": 200, // 成功
    "message": "User registered successfully"
  }

  {
    "code": 400, // 失败
    "message": "Username already exists"
  }
  ```

#### 具体实现

由于这个项目在数据库交互 (数据访问) 用的是 Spring Data JPA，所以不是 Mybatis 那样分的是 Mapper 层

这里更常用的三层是

- `UserController` (Controller层)
- `UserService` (Service层)
- `UserRepository` (Repository层)

##### `UserController`层

```java
@PostMapping("/register")
public ResponseEntity<?> register(@RequestBody UserRequest request) {
    LogUtils.PerformanceMonitor monitor = LogUtils.startPerformanceMonitor("USER_REGISTER");
    try {
        // 用户不合规检验
        if (request.username() == null || request.username().isEmpty() ||
                request.password() == null || request.password().isEmpty()) {
            LogUtils.logUserOperation("anonymous", "REGISTER", "validation", "FAILED_EMPTY_PARAMS");
            monitor.end("注册失败：参数为空");
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "Username and password cannot be empty"));
        }
        
        // 进入 Service 层
        userService.registerUser(request.username(), request.password());
        LogUtils.logUserOperation(request.username(), "REGISTER", "user_creation", "SUCCESS");
        monitor.end("注册成功");
        
        return ResponseEntity.ok(Map.of("code", 200, "message", "User registered successfully"));
    } catch (CustomException e) {
        LogUtils.logBusinessError("USER_REGISTER", request.username(), "用户注册失败: %s", e, e.getMessage());
        monitor.end("注册失败: " + e.getMessage());
        return ResponseEntity.status(e.getStatus()).body(Map.of("code", e.getStatus().value(), "message", e.getMessage()));
    } catch (Exception e) {
        LogUtils.logBusinessError("USER_REGISTER", request.username(), "用户注册异常: %s", e, e.getMessage());
        monitor.end("注册异常: " + e.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("code", 500, "message", "Internal server error"));
    }
}
```

整理流程还行，主要日志记录倒是没有见过，需要了解下

##### `LogUtils`工具类

暂时简单了解下，之前是直接再对应类上加上 Lombok 的注解 `@Slf4j` 然后就可以用 `log` 来快速日志

本质上在类上使用 `@Slf4j` 时，Lombok 默认生成的代码其实就是： `private static final Logger log = LoggerFactory.getLogger(当前类名.class)`

而这里是集成到了一个工具类上 `LogUtils`

```java
public class LogUtils {
    
  // 业务日志记录器
  private static final Logger BUSINESS_LOGGER = LoggerFactory.getLogger("com.yizhaoqi.smartpai.business");
  
  // 性能日志记录器
  private static final Logger PERFORMANCE_LOGGER = LoggerFactory.getLogger("com.yizhaoqi.smartpai.performance");

  // MDC键名常量
  public static final String USER_ID = "userId";
  public static final String REQUEST_ID = "requestId";
  public static final String SESSION_ID = "sessionId";
  public static final String OPERATION = "operation";

  /**
   * 记录业务日志
   */
  public static void logBusiness(String operation, String userId, String message, Object... args) {
      try {
          MDC.put(OPERATION, operation);
          MDC.put(USER_ID, userId);
          BUSINESS_LOGGER.info("[{}] [用户:{}] {}", operation, userId, formatMessage(message, args));
      } finally {
          MDC.clear();
      }
  }

  ...

}
```

分别设置了两个记录器来记录业务和性能

有一个概念 MDC (Mapped Diagnostic Context)，可以粗略的理解成是一个线程安全的存放诊断日志的容器

简单了解是 将类中的对应静态变量（如 userId, requestId）绑定到当前线程，这样就能有具体信息对应，并且多线程下可以对应

此外还有一个性能监视的内部类

```java
/**
 * 性能监控装饰器
 */
public static class PerformanceMonitor {
  private final String operation;
  private final long startTime;
  
  public PerformanceMonitor(String operation) {
      this.operation = operation;
      this.startTime = System.currentTimeMillis();
  }
  
  public void end() {
      end("");
  }
  
  public void end(String details) {
      long duration = System.currentTimeMillis() - startTime;
      logPerformance(operation, duration, details);
  }
}

/**
 * 创建性能监控器
 */
public static PerformanceMonitor startPerformanceMonitor(String operation) {
  return new PerformanceMonitor(operation);
}
```

##### `UserService`层

```java
/**
 * 注册新用户。
 *
 * @param username 要注册的用户名
 * @param password 要注册的用户密码
 * @throws CustomException 如果用户名已存在，则抛出异常
 */
@Transactional
public void registerUser(String username, String password) {
    // 检查数据库中是否已存在该用户名
    if (userRepository.findByUsername(username).isPresent()) {
        // 若用户名已存在，抛出自定义异常，状态码为 400 Bad Request
        throw new CustomException("Username already exists", HttpStatus.BAD_REQUEST);
    }
    
    // 确保默认组织标签存在（系统内部使用）
    ensureDefaultOrgTagExists();
    
    User user = new User();
    user.setUsername(username);
    // 对密码进行加密处理并设置到 User 对象中
    user.setPassword(PasswordUtil.encode(password));
    // 设置用户角色为普通用户
    user.setRole(User.Role.USER);
    
    // 保存用户以生成ID
    userRepository.save(user);
    
    // 创建用户的私人组织标签
    String privateTagId = PRIVATE_TAG_PREFIX + username;
    createPrivateOrgTag(privateTagId, username, user);
    
    // 只分配私人组织标签
    user.setOrgTags(privateTagId);
    
    // 设置私人组织标签为主组织标签
    user.setPrimaryOrg(privateTagId);
    
    userRepository.save(user);
    
    // 缓存组织标签信息
    orgTagCacheService.cacheUserOrgTags(username, List.of(privateTagId));
    orgTagCacheService.cacheUserPrimaryOrg(username, privateTagId);
    
    logger.info("User registered successfully with private organization tag: {}", username);
}
```

### 用户登录

根据传来的用户信息进行校验，成功就生成包含用户信息和组织标签的 JWT Token，来认证用户信息，支持后续操作

#### 流程

- 接收用户登录请求，获取用户名和密码
- 查询用户记录并验证密码
- 加载用户组织标签信息
- 基于用户信息和组织标签，生成包含用户信息和组织标签的 JWT Token
- 返回登录成功响应和 Token

![alt text](img/2.png)

#### 接口设计

- URL: /api/v1/users/login
- Method: POST
- Request Body:
  
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```

- Response:
  
  ```json
  {
    "code": 200, // 成功
    "message": "Login successful",
    "data": {
      "token": "JWT_TOKEN_STRING"
    }
  }

  {
    "code": 401, // 失败
    "message": "Invalid username or password"
  }
  ```

#### 具体实现

同样的，类似还是分了三层来进行实现

##### `UserController`

先在 Controller 层来处理请求

```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody UserRequest request) {
  LogUtils.PerformanceMonitor monitor = LogUtils.startPerformanceMonitor("USER_LOGIN");
  try {
      if (request.username() == null || request.username().isEmpty() ||
              request.password() == null || request.password().isEmpty()) {
          LogUtils.logUserOperation("anonymous", "LOGIN", "validation", "FAILED_EMPTY_PARAMS");
          return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "Username and password cannot be empty"));
      }
      
      String username = userService.authenticateUser(request.username(), request.password());
      if (username == null) {
          LogUtils.logUserOperation(request.username(), "LOGIN", "authentication", "FAILED_INVALID_CREDENTIALS");
          return ResponseEntity.status(401).body(Map.of("code", 401, "message", "Invalid credentials"));
      }
      
      String token = jwtUtils.generateToken(username);
      String refreshToken = jwtUtils.generateRefreshToken(username);
      LogUtils.logUserOperation(username, "LOGIN", "token_generation", "SUCCESS");
      monitor.end("登录成功");
      
      return ResponseEntity.ok(Map.of("code", 200, "message", "Login successful", "data", Map.of(
          "token", token,
          "refreshToken", refreshToken
      )));
  } catch (CustomException e) {
      LogUtils.logBusinessError("USER_LOGIN", request.username(), "登录失败: %s", e, e.getMessage());
      monitor.end("登录失败: " + e.getMessage());
      return ResponseEntity.status(e.getStatus()).body(Map.of("code", e.getStatus().value(), "message", e.getMessage()));
  } catch (Exception e) {
      LogUtils.logBusinessError("USER_LOGIN", request.username(), "登录异常: %s", e, e.getMessage());
      monitor.end("登录异常: " + e.getMessage());
      return ResponseEntity.status(500).body(Map.of("code", 500, "message", "Internal server error"));
  }
}
```

先判断账号名和密码的合理性，然后传到 `userService` 层进行验证

根据返回的 `username` 来判断是否成功

成功就开始建立 JWT token

##### `UserService`

对应 `Service` 中的实现方法就比较简单了，就是查询下用户是否在数据库里

通过与 `Repository` 进行数据库交互

```java
public String authenticateUser(String username, String password) {
  User user = userRepository.findByUsername(username)
          .orElseThrow(() -> new CustomException("Invalid username or password", HttpStatus.UNAUTHORIZED));
  // 比较输入的密码和数据库中存储的加密密码是否匹配
  if (!PasswordUtil.matches(password, user.getPassword())) {
      // 若不匹配，抛出自定义异常，状态码为 401 Unauthorized
      throw new CustomException("Invalid username or password", HttpStatus.UNAUTHORIZED);
  }
  // 认证成功，返回用户的用户名
  return user.getUsername();
}
```

##### JWT Token

在 Service 层完成交互返回用户名字后，`Controller`层还需要继续完成逻辑，先校验用户是否存在，存在再将其放到 JWT Token 传回

```java
if (username == null) {
  LogUtils.logUserOperation(request.username(), "LOGIN", "authentication", "FAILED_INVALID_CREDENTIALS");
  return ResponseEntity.status(401).body(Map.of("code", 401, "message", "Invalid credentials"));
}

String token = jwtUtils.generateToken(username);
String refreshToken = jwtUtils.generateRefreshToken(username);
LogUtils.logUserOperation(username, "LOGIN", "token_generation", "SUCCESS");
monitor.end("登录成功");

return ResponseEntity.ok(Map.of("code", 200, "message", "Login successful", "data", Map.of(
  "token", token,
  "refreshToken", refreshToken
)));
```

对应的 JWT 生成工具封装在 JwtUtils 下

一个JWT令牌由3部分组成：标头(Header)、有效载荷(Payload)和签名(Signature)

在传输的时候，会将JWT的前2部分分别进行Base64编码后用.进行连接形成最终需要传输的字符串。

- 标头：包含一些元数据信息，比如JWT签名所使用的加密算法，还有类型，这里统一都是JWT。

- 有效载荷：包括用户名称、令牌发布时间、过期时间、JWT ID等，当然我们也可以自定义添加字段，我们的用户信息一般都在这里存放。

- 签名：首先需要指定一个密钥，该密钥仅仅保存在服务器中，保证不能让其他用户知道。然后使用Header中指定的算法对Header和Payload进行base64加密之后的结果通过密钥计算哈希值，然后就得出一个签名哈希。这个会用于之后验证内容是否被篡改。这样即使别人改了前面两个的内容，传回来通过秘钥加密对比就不一样了

标头和载荷直接通过 base64 编/解码，但要验证有效性，必须根据标头和载荷的base64编码值利用对应加密算法和指定秘钥加密后，与签名比对

##### 双 Token 机制

这里登录采用了双 Token 机制，来解决 Token 被别人恶意截获的情况

JWT 是无状态的，后端不保存它。如果 Token 被偷且有效期很长（比如 7 天），那黑客就能横行 7 天。

- 双 Token 机制（Access + Refresh）：
  - Access Token：有效期极短（如 15 分钟），负责日常接口访问。
  - Refresh Token：有效期较长（如 7 天），仅用于换取新的 Access Token。

效果：即使 Access Token 被截获，黑客也只能操作 15 分钟。由于 Refresh Token 的调用频率极低，被截获的概率也小得多

```java
String token = jwtUtils.generateToken(username);
String refreshToken = jwtUtils.generateRefreshToken(username);
```

分别创了两个 token，均保存到 redis 中

第一个 token 有效期是 1 h，包含了用户的信息+组织+主组织以及 uuid生成的唯一tokenId，因此有效期短，负责日常接口访问

第二个 token 是 refreshToken，就包含了 uuid生成的唯一tokenId, 以及用户名字，主要目的是可以基于这个来刷新获取 第一个token

即使 Access Token 被截获，黑客也只能操作 15 分钟。由于 Refresh Token 的调用频率极低，被截获的概率也小得多

为了让这个机制真正生效，具体流程应该是：

- 平时：前端在请求头（如 Authorization: Bearer `token`）中携带 token。后端校验这个短效 Token。

- 过期时：当 token 过期，后端返回 401 Unauthorized。

- 静默刷新：前端拦截到 401 后，不跳转登录页，而是自动调用另一个 /refresh 接口，把 refreshToken 发给后端。

- 续期：后端校验 refreshToken 有效后，重新生成一个新的 token 返回。前端拿到新 Token 后重试刚才失败的请求。用户全程无感知。

### 用户注销

用户退出，如果 token 没过期，需要主动将其放入黑名单里

```java
// 用户登出接口
@PostMapping("/logout")
public ResponseEntity<?> logout(@RequestHeader("Authorization") String token) {
  LogUtils.PerformanceMonitor monitor = LogUtils.startPerformanceMonitor("USER_LOGOUT");
  String username = null;
  try {
      if (token == null || !token.startsWith("Bearer ")) {
          LogUtils.logUserOperation("anonymous", "LOGOUT", "validation", "FAILED_INVALID_TOKEN");
          monitor.end("登出失败：token格式无效");
          return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "Invalid token format"));
      }

      String jwtToken = token.replace("Bearer ", "");
      username = jwtUtils.extractUsernameFromToken(jwtToken);
      
      if (username == null || username.isEmpty()) {
          LogUtils.logUserOperation("anonymous", "LOGOUT", "token_extraction", "FAILED_NO_USERNAME");
          monitor.end("登出失败：无法提取用户名");
          return ResponseEntity.status(401).body(Map.of("code", 401, "message", "Invalid token"));
      }

      // 使当前token失效
      jwtUtils.invalidateToken(jwtToken);
      
      LogUtils.logUserOperation(username, "LOGOUT", "token_invalidation", "SUCCESS");
      monitor.end("登出成功");

      return ResponseEntity.ok(Map.of("code", 200, "message", "Logout successful"));
  } catch (Exception e) {
      LogUtils.logBusinessError("USER_LOGOUT", username, "登出异常: %s", e, e.getMessage());
      monitor.end("登出异常: " + e.getMessage());
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("code", 500, "message", "Internal server error"));
  }
}
```

首先会根据传来的 JWT Token 解析用户名来判断是否正确，然后登出，会将 token 拉入黑名单 `jwtUtils.invalidateToken(jwtToken)`

而对应的黑名单的有效期就是这个token剩余的时长即可

存在 redis 对应的 key 为`jwt:blacklist:token_id` String类型，value为对应 `System.currentTimeMillis()`

```java
public void invalidateToken(String token) {
  try {
      String tokenId = extractTokenIdFromToken(token);
      if (tokenId != null) {
          Claims claims = extractClaimsIgnoreExpiration(token);
          if (claims != null) {
              long expireTime = claims.getExpiration().getTime();
              String userId = claims.get("userId", String.class);
              
              // 加入黑名单
              tokenCacheService.blacklistToken(tokenId, expireTime);
              // 从缓存中移除
              tokenCacheService.removeToken(tokenId, userId);
              
              logger.info("Token invalidated: {}", tokenId);
          }
      }
  } catch (Exception e) {
      logger.error("Error invalidating token", e);
  }
}
```
