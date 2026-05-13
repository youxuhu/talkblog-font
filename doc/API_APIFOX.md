# TalkBlog Back API 文档（Apifox 调试版）

## 1. 基本信息

- 服务地址：`http://localhost:8080`
- 数据格式：`application/json`
- 认证方式：当前接口未使用鉴权头（如 `Authorization`）

## 2. 接口分组

- 认证模块：`/api/auth`
- 人脸向量模块：`/api/face`
- 博客评论模块：`/api/comments`
- 管理员-评论模块：`/api/admin/comments`
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

## 6. 博客评论模块

### 通用说明

- 评论状态枚举：`0` = 待审核，`1` = 已通过（正常显示），`2` = 已拒绝
- 所有需要登录的接口需在 Header 中携带 `Authorization: Bearer <token>`

---

### 6.1 发表评论

- 方法：`POST`
- 路径：`/api/comments`
- 完整 URL：`http://localhost:8080/api/comments`
- 请求头：
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| blogId | number(long) | 是 | 博客文章 ID |
| content | string | 是 | 评论内容（1~500 字符） |
| parentId | number(long) | 否 | 父评论 ID（回复评论时填写，一级评论不传） |

#### 请求示例

```json
{
  "blogId": 1,
  "content": "这篇文章写得很好，学到了很多！",
  "parentId": null
}
```

#### 成功响应示例（201）

```json
{
  "success": true,
  "message": "评论发表成功",
  "data": {
    "commentId": 101,
    "blogId": 1,
    "userId": 1,
    "username": "revy",
    "userAvatar": null,
    "content": "这篇文章写得很好，学到了很多！",
    "parentId": null,
    "status": 0,
    "likeCount": 0,
    "createdAt": "2026-04-30T10:00:00"
  }
}
```

---

### 6.2 获取博客评论列表

- 方法：`GET`
- 路径：`/api/comments`
- 完整 URL：`http://localhost:8080/api/comments?blogId=1&page=1&size=10`

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| blogId | number(long) | 是 | 博客文章 ID |
| page | number | 否 | 页码，默认 1 |
| size | number | 否 | 每页条数，默认 10，最大 50 |
| parentId | number(long) | 否 | 父评论 ID（获取某条评论的回复列表时传） |
| status | number | 否 | 评论状态筛选（仅管理员有效） |

#### 成功响应示例（200）

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "commentId": 101,
        "blogId": 1,
        "userId": 1,
        "username": "revy",
        "userAvatar": null,
        "content": "这篇文章写得很好！",
        "parentId": null,
        "status": 1,
        "likeCount": 5,
        "replyCount": 2,
        "createdAt": "2026-04-30T10:00:00",
        "replies": [
          {
            "commentId": 102,
            "userId": 2,
            "username": "alice",
            "userAvatar": null,
            "content": "同意！",
            "parentId": 101,
            "replyToUserId": 1,
            "replyToUsername": "revy",
            "status": 1,
            "likeCount": 1,
            "createdAt": "2026-04-30T10:05:00"
          }
        ]
      }
    ],
    "total": 25,
    "page": 1,
    "size": 10
  }
}
```

---

### 6.3 点赞/取消点赞评论

- 方法：`POST`
- 路径：`/api/comments/{commentId}/like`
- 完整 URL：`http://localhost:8080/api/comments/101/like`
- 请求头：
  - `Authorization: Bearer <token>`

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "已点赞",
  "data": {
    "commentId": 101,
    "likeCount": 6,
    "userLiked": true
  }
}
```

---

### 6.4 删除自己的评论

- 方法：`DELETE`
- 路径：`/api/comments/{commentId}`
- 完整 URL：`http://localhost:8080/api/comments/101`
- 请求头：
  - `Authorization: Bearer <token>`

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "评论已删除"
}
```

---

### 6.5 获取我的评论列表

- 方法：`GET`
- 路径：`/api/comments/mine`
- 完整 URL：`http://localhost:8080/api/comments/mine?page=1&size=10`
- 请求头：
  - `Authorization: Bearer <token>`

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| page | number | 否 | 页码，默认 1 |
| size | number | 否 | 每页条数，默认 10 |

#### 成功响应示例（200）

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "commentId": 101,
        "blogId": 1,
        "blogTitle": "Vue3 组合式 API 入门",
        "content": "这篇文章写得很好！",
        "status": 1,
        "likeCount": 5,
        "createdAt": "2026-04-30T10:00:00"
      }
    ],
    "total": 8,
    "page": 1,
    "size": 10
  }
}
```

---

## 7. 管理员-评论模块

### 7.1 获取评论列表（管理员）

- 方法：`GET`
- 路径：`/api/admin/comments`
- 完整 URL：`http://localhost:8080/api/admin/comments?page=1&size=10&keyword=test&status=0&blogId=1`
- 请求头：
  - `Authorization: Bearer <token>`

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| page | number | 否 | 页码，默认 1 |
| size | number | 否 | 每页条数，默认 10 |
| keyword | string | 否 | 搜索关键词（评论内容、用户名） |
| status | number | 否 | 评论状态筛选（0=待审核，1=已通过，2=已拒绝） |
| blogId | number(long) | 否 | 按博客 ID 筛选 |

#### 成功响应示例（200）

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "commentId": 101,
        "blogId": 1,
        "blogTitle": "Vue3 组合式 API 入门",
        "userId": 1,
        "username": "revy",
        "email": "revy@example.com",
        "content": "这篇文章写得很好！",
        "parentId": null,
        "status": 0,
        "likeCount": 0,
        "ipAddress": "127.0.0.1",
        "createdAt": "2026-04-30T10:00:00"
      }
    ],
    "total": 50,
    "page": 1,
    "size": 10
  }
}
```

---

### 7.2 审核评论

- 方法：`PATCH`
- 路径：`/api/admin/comments/{commentId}/status`
- 完整 URL：`http://localhost:8080/api/admin/comments/101/status`
- 请求头：
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| status | number | 是 | 目标状态：1=通过，2=拒绝 |

#### 请求示例

```json
{
  "status": 1
}
```

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "评论已通过"
}
```

---

### 7.3 删除评论（管理员）

- 方法：`DELETE`
- 路径：`/api/admin/comments/{commentId}`
- 完整 URL：`http://localhost:8080/api/admin/comments/101`
- 请求头：
  - `Authorization: Bearer <token>`

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "评论已删除"
}
```

---

### 7.4 批量审核评论

- 方法：`PATCH`
- 路径：`/api/admin/comments/batch-status`
- 完整 URL：`http://localhost:8080/api/admin/comments/batch-status`
- 请求头：
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`

#### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| commentIds | number[] | 是 | 评论 ID 数组 |
| status | number | 是 | 目标状态：1=通过，2=拒绝 |

#### 请求示例

```json
{
  "commentIds": [101, 102, 103],
  "status": 1
}
```

#### 成功响应示例（200）

```json
{
  "success": true,
  "message": "已处理 3 条评论"
}
```

---

### 7.5 评论数据统计

- 方法：`GET`
- 路径：`/api/admin/comments/stats`
- 完整 URL：`http://localhost:8080/api/admin/comments/stats`
- 请求头：
  - `Authorization: Bearer <token>`

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| days | number | 否 | 统计最近 N 天数据，默认 30 |

#### 成功响应示例（200）

```json
{
  "success": true,
  "data": {
    "totalComments": 1280,
    "pendingReview": 15,
    "approved": 1200,
    "rejected": 65,
    "todayComments": 42,
    "totalLikes": 3560,
    "avgCommentsPerBlog": 8.5,
    "topBlogs": [
      {
        "blogId": 1,
        "blogTitle": "Vue3 组合式 API 入门",
        "commentCount": 128
      },
      {
        "blogId": 3,
        "blogTitle": "Spring Boot 实战",
        "commentCount": 96
      }
    ],
    "topCommenters": [
      {
        "userId": 1,
        "username": "revy",
        "commentCount": 45,
        "likeCount": 230
      }
    ],
    "dailyTrend": [
      {
        "date": "2026-04-24",
        "count": 35
      },
      {
        "date": "2026-04-25",
        "count": 42
      }
    ]
  }
}
```

---

## 9. 健康检查接口

### 9.1 服务健康检查

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

## 10. Apifox 导入/调试建议

1. 在 Apifox 新建项目，环境变量 `baseUrl` 设置为 `http://localhost:8080`。
2. 按以上分组创建接口（Auth、Face、Comments、Admin-Comments、Actuator）。
3. 所有 POST 接口的 Body 类型选择 `JSON`。
4. `faceVector` / `face_vector` 字段务必传数组，不要传字符串。
5. 登录与注册的 `image` 传 base64 字符串即可（可先用短字符串联调接口流程）。
6. 评论模块中需要登录的接口，需在 Header 中传入 `Authorization: Bearer <token>`。
