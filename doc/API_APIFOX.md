# TalkBlog Back API 文档（Apifox 调试版）

## 1. 基本信息

- 服务地址：`http://localhost:8080`
- 数据格式：`application/json`
- 认证方式：当前接口未使用鉴权头（如 `Authorization`）

## 2. 接口分组

- 认证模块：`/api/auth`
- 人脸向量模块：`/api/face`
- 健康检查：`/actuator/health`

---

## 3. 认证模块

### 3.1 用户注册

- 方法：`POST`
- 路径：`/api/auth/register`
- 完整 URL：`http://localhost:8080/api/auth/register`
- 请求头：
  - `Content-Type: application/json`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| email | string | 是 | 用户邮箱（唯一标识） |
| username | string | 是 | 用户名 |
| password | string | 是 | 明文密码（后端会加密存储） |
| image | string | 是 | 人脸图片的 base64 字符串 |

#### 请求示例

```json
{
  "email": "user@example.com",
  "username": "revy",
  "password": "123456",
  "image": "data:image/jpeg;base64,/9j/4AAQSk..."
}
```

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "Registration successful"
}
```

#### 失败响应示例（200，业务失败）

```json
{
  "success": false,
  "message": "Email already exists"
}
```

#### 失败响应示例（400，参数/业务校验异常）

```json
{
  "success": false,
  "message": "具体错误信息"
}
```

---

### 3.2 人脸登录

- 方法：`POST`
- 路径：`/api/auth/login`
- 完整 URL：`http://localhost:8080/api/auth/login`
- 请求头：
  - `Content-Type: application/json`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| email | string | 是 | 用户邮箱 |
| image | string | 是 | 人脸图片 base64 字符串 |

#### 请求示例

```json
{
  "email": "user@example.com",
  "image": "data:image/jpeg;base64,/9j/4AAQSk..."
}
```

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "Login successful"
}
```

#### 失败响应示例（200，业务失败）

```json
{
  "success": false,
  "message": "Email or face not matched"
}
```

#### 失败响应示例（400，参数/业务校验异常）

```json
{
  "success": false,
  "message": "具体错误信息"
}
```

---

## 4. 人脸向量模块

### 4.1 注册人脸向量

- 方法：`POST`
- 路径：`/api/face/register`
- 完整 URL：`http://localhost:8080/api/face/register`
- 请求头：
  - `Content-Type: application/json`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| vectorId | number(int64) | 否 | 向量记录 ID |
| userId | number(int64) | 是 | 用户 ID |
| faceVector | number[] | 是 | 人脸向量数组（float 数组） |
| faceImageUrl | string | 否 | 人脸图片 URL |
| createdAt | string(date-time) | 否 | 创建时间 |
| updatedAt | string(date-time) | 否 | 更新时间 |

#### 请求示例

```json
{
  "userId": 1,
  "faceVector": [0.12, -0.08, 0.34, 0.91],
  "faceImageUrl": "https://example.com/face/1.jpg"
}
```

#### 成功响应示例（200）

```text
Face vector registered successfully!
```

---

### 4.2 根据用户 ID 查询人脸向量

- 方法：`GET`
- 路径：`/api/face/user/{userId}`
- 完整 URL：`http://localhost:8080/api/face/user/1`
- 路径参数：
  - `userId`：number(int64)，用户 ID

#### 成功响应示例（200）

```json
{
  "vectorId": 100,
  "userId": 1,
  "faceVector": [0.12, -0.08, 0.34, 0.91],
  "faceImageUrl": "https://example.com/face/1.jpg",
  "createdAt": "2026-04-18T10:30:00",
  "updatedAt": "2026-04-18T10:30:00"
}
```

---

### 4.3 人脸向量匹配

- 方法：`POST`
- 路径：`/api/face/match`
- 完整 URL：`http://localhost:8080/api/face/match`
- 请求头：
  - `Content-Type: application/json`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| face_vector | number[] | 是 | 待匹配的人脸向量数组 |

#### 请求示例

```json
{
  "face_vector": [0.11, -0.05, 0.29, 0.88]
}
```

#### 成功响应示例（200）

```json
{
  "vectorId": 100,
  "userId": 1,
  "faceVector": [0.12, -0.08, 0.34, 0.91],
  "faceImageUrl": "https://example.com/face/1.jpg",
  "createdAt": "2026-04-18T10:30:00",
  "updatedAt": "2026-04-18T10:30:00"
}
```

#### 失败响应说明

- 当 `face_vector` 不是数组时，会抛出参数异常（通常表现为 4xx/5xx，取决于全局异常处理配置）。

---

## 5. 健康检查接口

### 5.1 服务健康检查

- 方法：`GET`
- 路径：`/actuator/health`
- 完整 URL：`http://localhost:8080/actuator/health`

#### 成功响应示例（200）

```json
{
  "status": "UP"
}
```

---

## 6. 聊天室管理模块（Admin）

### 6.1 获取聊天室列表

- 方法：`GET`
- 路径：`/api/admin/chatrooms`
- 完整 URL：`http://localhost:8080/api/admin/chatrooms`
- 请求头：
  - `Authorization: Bearer <token>`

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| page | number | 否 | 页码，默认 1 |
| size | number | 否 | 每页条数，默认 10 |
| keyword | string | 否 | 搜索关键词 |

#### 成功响应示例（200）

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "chatroomId": 1,
        "name": "技术交流群",
        "description": "技术讨论",
        "memberCount": 50,
        "messageCount": 1234,
        "maxMembers": 200,
        "status": "ACTIVE",
        "isPrivate": false,
        "createdAt": "2026-05-10T10:00:00"
      }
    ],
    "total": 5
  }
}
```

---

### 6.2 获取聊天室详情

- 方法：`GET`
- 路径：`/api/admin/chatrooms/{chatroomId}`

#### 成功响应示例（200）

```json
{
  "success": true,
  "data": {
    "chatroomId": 1,
    "name": "技术交流群",
    "description": "技术讨论",
    "memberCount": 50,
    "messageCount": 1234,
    "maxMembers": 200,
    "status": "ACTIVE",
    "isPrivate": false,
    "createdAt": "2026-05-10T10:00:00",
    "updatedAt": "2026-05-12T15:30:00"
  }
}
```

---

### 6.3 创建聊天室

- 方法：`POST`
- 路径：`/api/admin/chatrooms`
- 请求头：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 聊天室名称 |
| description | string | 否 | 聊天室描述 |
| maxMembers | number | 否 | 最大成员数，默认 100 |
| isPrivate | boolean | 否 | 是否私密聊天室，默认 false |

#### 请求示例

```json
{
  "name": "技术交流群",
  "description": "技术讨论交流",
  "maxMembers": 200,
  "isPrivate": false
}
```

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "聊天室创建成功",
  "data": {
    "chatroomId": 1
  }
}
```

---

### 6.4 更新聊天室

- 方法：`PUT`
- 路径：`/api/admin/chatrooms/{chatroomId}`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 聊天室名称 |
| description | string | 否 | 聊天室描述 |
| maxMembers | number | 否 | 最大成员数 |
| isPrivate | boolean | 否 | 是否私密聊天室 |
| status | string | 否 | 状态：ACTIVE / INACTIVE / BANNED |

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "聊天室更新成功"
}
```

---

### 6.5 删除聊天室

- 方法：`DELETE`
- 路径：`/api/admin/chatrooms/{chatroomId}`

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "聊天室删除成功"
}
```

---

### 6.6 获取聊天室成员列表

- 方法：`GET`
- 路径：`/api/admin/chatrooms/{chatroomId}/members`

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| page | number | 否 | 页码，默认 1 |
| size | number | 否 | 每页条数，默认 50 |
| keyword | string | 否 | 搜索关键词 |

#### 成功响应示例（200）

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "userId": 1,
        "username": "alice",
        "nickname": "Alice",
        "role": "OWNER",
        "joinedAt": "2026-05-10T10:00:00",
        "lastActiveTime": "2026-05-13T09:00:00",
        "messageCount": 56
      },
      {
        "userId": 2,
        "username": "bob",
        "nickname": "Bob",
        "role": "ADMIN",
        "joinedAt": "2026-05-11T14:00:00",
        "lastActiveTime": "2026-05-12T22:00:00",
        "messageCount": 23
      }
    ],
    "total": 50
  }
}
```

---

### 6.7 添加聊天室成员

- 方法：`POST`
- 路径：`/api/admin/chatrooms/{chatroomId}/members`
- 请求头：
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| userId | number | 是 | 用户ID |
| role | string | 否 | 角色：OWNER / ADMIN / MEMBER，默认 MEMBER |

#### 请求示例

```json
{
  "userId": 3,
  "role": "MEMBER"
}
```

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "成员添加成功"
}
```

---

### 6.8 移除聊天室成员

- 方法：`DELETE`
- 路径：`/api/admin/chatrooms/{chatroomId}/members/{userId}`

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "成员移除成功"
}
```

---

### 6.9 更新成员角色

- 方法：`PATCH`
- 路径：`/api/admin/chatrooms/{chatroomId}/members/{userId}`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| role | string | 是 | 角色：OWNER / ADMIN / MEMBER |

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "角色更新成功"
}
```

---

### 6.10 获取聊天室统计

- 方法：`GET`
- 路径：`/api/admin/chatrooms/stats`

#### 成功响应示例（200）

```json
{
  "success": true,
  "data": {
    "totalChatrooms": 10,
    "totalMembers": 456,
    "totalMessages": 12345,
    "activeChatrooms": 8,
    "todayMessages": 234,
    "avgMembersPerChatroom": 45.6
  }
}
```

---

### 6.11 获取聊天室日统计

- 方法：`GET`
- 路径：`/api/admin/chatrooms/{chatroomId}/stats/daily`

#### Query 参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| startDate | string | 否 | 开始日期，格式：YYYY-MM-DD |
| endDate | string | 否 | 结束日期，格式：YYYY-MM-DD |

#### 成功响应示例（200）

```json
{
  "success": true,
  "data": {
    "chatroomId": 1,
    "dailyStats": [
      {
        "date": "2026-05-10",
        "messageCount": 120,
        "activeMembers": 30,
        "newMembers": 5
      },
      {
        "date": "2026-05-11",
        "messageCount": 85,
        "activeMembers": 25,
        "newMembers": 3
      }
    ]
  }
}
```

---

## 7. Apifox 导入/调试建议

1. 在 Apifox 新建项目，环境变量 `baseUrl` 设置为 `http://localhost:8080`。
2. 按以上分组创建接口（Auth、Face、Admin、Actuator）。
3. 所有 POST/PUT/PATCH 接口的 Body 类型选择 `JSON`。
4. `faceVector` / `face_vector` 字段务必传数组，不要传字符串。
5. 登录与注册的 `image` 传 base64 字符串即可（可先用短字符串联调接口流程）。
6. Admin 模块所有接口需要携带 `Authorization: Bearer <token>` 头。
