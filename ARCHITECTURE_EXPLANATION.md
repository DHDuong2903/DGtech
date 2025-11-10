# 📚 GIẢI THÍCH LUỒNG CHẠY VÀ CƠ CHẾ HOẠT ĐỘNG

## 🎯 Tổng Quan

Hệ thống authentication kết hợp **Clerk** (frontend auth) + **Backend API** để quản lý user và phân quyền.

```
User → Clerk Login → Frontend → Backend API → Database
                        ↓
                   Zustand Store
                        ↓
                   UI Components
```

---

## 📁 CHI TIẾT TỪNG FILE

### 1️⃣ **src/lib/axios.ts** - HTTP Client

**Nhiệm vụ:** Tạo instance axios để gọi API backend

```typescript
const axiosInstance = axios.create({
  baseURL: "http://localhost:5000/api",  // URL backend
  headers: { "Content-Type": "application/json" },
  withCredentials: true,  // Gửi cookies kèm request
});
```

**Chức năng:**
- ✅ Cấu hình base URL cho tất cả API calls
- ✅ Request interceptor: Xử lý trước khi gửi request
- ✅ Response interceptor: Xử lý response và errors
- ✅ Tự động xử lý lỗi 401 (Unauthorized)

**Khi nào dùng:**
```typescript
// Trong useAuth hook
const response = await axiosInstance.get("/users/me", {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

### 2️⃣ **src/types/index.ts** - Type Definitions

**Nhiệm vụ:** Định nghĩa TypeScript types cho toàn project

```typescript
export interface User {
  clerkId: string;      // ID từ Clerk
  username: string;
  email: string;
  phone?: string;
  role: "user" | "admin";  // Phân quyền
  createdAt?: string;
  updatedAt?: string;
}
```

**Tại sao cần:**
- ✅ Type safety: Tránh lỗi khi code
- ✅ Autocomplete: VS Code gợi ý properties
- ✅ Maintainability: Dễ bảo trì và refactor

---

### 3️⃣ **src/stores/useUserStore.ts** - State Management (ZUSTAND)

**Nhiệm vụ:** Quản lý global state của user trong toàn ứng dụng

#### 🔍 Cấu trúc Store:

```typescript
interface UserStore {
  // STATE
  user: User | null;           // Thông tin user hiện tại
  isLoading: boolean;          // Đang load data?
  error: string | null;        // Thông báo lỗi

  // ACTIONS
  setUser: (user) => void;     // Lưu thông tin user
  setLoading: (bool) => void;  // Set trạng thái loading
  setError: (error) => void;   // Lưu lỗi
  clearUser: () => void;       // Xóa user (logout)
  isAdmin: () => boolean;      // Kiểm tra role admin
}
```

#### 🔧 Persist Middleware:

```typescript
persist(
  (set, get) => ({ /* state */ }),
  { name: "user-storage" }  // Lưu vào localStorage
)
```

**Hoạt động:**
- User data được lưu vào `localStorage` với key `"user-storage"`
- Khi refresh trang, data tự động load từ localStorage
- Không cần login lại mỗi lần refresh

#### 📊 Diagram:

```
Component A → useUserStore() → Zustand Store → localStorage
Component B → useUserStore() →        ↓
Component C → useUserStore() →   Shared State
```

**Ví dụ sử dụng:**

```typescript
// Lấy user data
const user = useUserStore((state) => state.user);

// Kiểm tra admin
const isAdmin = useUserStore((state) => state.isAdmin());

// Set user
const setUser = useUserStore((state) => state.setUser);
setUser(userData);
```

---

### 4️⃣ **src/hooks/useAuth.ts** - Custom Hook (LOGIC CHÍNH)

**Nhiệm vụ:** Kết nối Clerk authentication với Backend API và Zustand store

#### 🔄 Luồng hoạt động:

```
1. Component mount
   ↓
2. useAuth() hook được gọi
   ↓
3. Lấy thông tin từ Clerk (clerkUser, isSignedIn)
   ↓
4. Nếu đã login → Lấy token từ Clerk
   ↓
5. Gọi API backend: GET /users/me với Bearer token
   ↓
6. Backend verify token → Trả về user data (có role)
   ↓
7. Lưu user vào Zustand store
   ↓
8. Store tự động persist vào localStorage
   ↓
9. Component nhận được user data và isAdmin
```

#### 📝 Code Flow:

```typescript
export const useAuth = () => {
  // 1. LẤY THÔNG TIN TỪ CLERK
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  
  // 2. KẾT NỐI VỚI ZUSTAND STORE
  const { user, setUser, clearUser, isAdmin } = useUserStore();
  
  // 3. FIX HYDRATION MISMATCH
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);  // Component đã mount trên client
  }, []);

  // 4. FETCH USER DATA TỪ BACKEND
  useEffect(() => {
    const fetchUser = async () => {
      // Kiểm tra Clerk đã load chưa
      if (!isLoaded) return;
      
      // Nếu chưa login → Clear user
      if (!isSignedIn || !clerkUser) {
        clearUser();
        return;
      }
      
      // Nếu đã có user trong store → Skip
      if (user && user.clerkId === clerkUser.id) {
        return;
      }

      try {
        // Lấy JWT token từ Clerk
        const token = await getToken();
        
        // Gọi API backend
        const response = await axiosInstance.get("/users/me", {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Lưu user vào store
        if (response.data.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchUser();
  }, [isLoaded, isSignedIn, clerkUser]);

  // 5. TRẢ VỀ DATA CHO COMPONENT
  return {
    user,
    isAdmin: mounted ? isAdmin() : false,  // Tránh hydration mismatch
    isLoading: !isLoaded || !mounted,
  };
};
```

#### 🛡️ Giải thích Hydration Mismatch Fix:

**Vấn đề:**
- **Server render:** Không có localStorage → `isAdmin = false`
- **Client render:** Đọc từ localStorage → `isAdmin = true`
- React detect khác nhau → ERROR!

**Giải pháp:**
```typescript
const [mounted, setMounted] = useState(false);

// Lần render đầu: mounted = false
// Server và Client đều trả về isAdmin = false

useEffect(() => {
  setMounted(true);  // Chỉ chạy trên client
}, []);

// Lần render thứ 2 (chỉ trên client): mounted = true
// Giờ mới đọc từ localStorage
return {
  isAdmin: mounted ? isAdmin() : false
};
```

---

### 5️⃣ **src/components/providers/AuthProvider.tsx** - Provider Wrapper

**Nhiệm vụ:** Initialize auth state khi app khởi động

```typescript
export const AuthProvider = ({ children }) => {
  // Gọi useAuth() để tự động fetch user
  useAuth();
  
  return <>{children}</>;
};
```

**Tại sao cần:**
- ✅ Đảm bảo `useAuth()` chạy ngay khi app load
- ✅ Fetch user data một lần duy nhất
- ✅ Tất cả components con đều access được user state

**Sử dụng trong layout.tsx:**

```typescript
<ClerkProvider>
  <AuthProvider>  {/* Initialize auth */}
    <Navbar />     {/* Có thể dùng useAuth() */}
    {children}     {/* Tất cả pages có thể dùng useAuth() */}
  </AuthProvider>
</ClerkProvider>
```

---

### 6️⃣ **src/components/public/Navbar.tsx** - UI Component

**Nhiệm vụ:** Hiển thị navigation bar với conditional rendering

```typescript
const Navbar = () => {
  // Lấy auth state
  const { isAdmin, isLoading } = useAuth();

  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/shop">Shop</Link>
      
      {/* CHỈ HIỂN THỊ CHO ADMIN */}
      {!isLoading && isAdmin && (
        <Link href="/admin">Admin</Link>
      )}
    </nav>
  );
};
```

**Logic:**
1. `useAuth()` trả về `{ isAdmin, isLoading }`
2. Nếu `isLoading = true` → Đợi load xong
3. Nếu `isAdmin = true` → Hiển thị Admin link
4. Nếu `isAdmin = false` → Ẩn Admin link

---

## 🔄 LUỒNG CHẠY HOÀN CHỈNH

### Scenario 1: User Login Lần Đầu

```
1. User vào trang web
   → layout.tsx render
   → AuthProvider mount
   → useAuth() được gọi

2. Clerk check auth status
   → Chưa login
   → isSignedIn = false

3. useAuth() detect chưa login
   → clearUser()
   → Zustand store: user = null

4. Navbar nhận isAdmin = false
   → Admin link ẨN
   → User chỉ thấy Home, Shop

5. User click "Login" button
   → Clerk modal hiện ra
   → User đăng nhập

6. Clerk login thành công
   → isSignedIn = true
   → clerkUser có data

7. useAuth() detect đã login
   → getToken() lấy JWT
   → Call API: GET /users/me

8. Backend verify token
   → Tìm user trong DB
   → Trả về: { clerkId, username, email, role }

9. useAuth() nhận response
   → setUser(userData)
   → Zustand lưu vào store
   → Store persist vào localStorage

10. Navbar re-render
    → isAdmin = (user.role === "admin")
    → Nếu admin → HIỆN Admin link
    → Nếu user → VẪN ẨN Admin link
```

### Scenario 2: User Refresh Trang (Đã Login Trước Đó)

```
1. Trang load lại
   → Zustand đọc từ localStorage
   → user data đã có sẵn

2. Clerk check auth
   → Session còn hợp lệ
   → isSignedIn = true

3. useAuth() check
   → user.clerkId === clerkUser.id
   → SKIP fetch API (đã có data)

4. Navbar render ngay
   → isAdmin = true (nếu là admin)
   → Admin link HIỆN LUÔN
   → Không cần đợi API
```

### Scenario 3: User Logout

```
1. User click Clerk logout
   → Clerk clear session

2. useAuth() detect
   → isSignedIn = false
   → clearUser()

3. Zustand store
   → user = null
   → localStorage clear

4. Navbar update
   → isAdmin = false
   → Admin link ẨN
```

---

## 🎭 CÁC TRƯỜNG HỢP ĐẶC BIỆT

### 1. Server Side Rendering (SSR)

```
Server Render:
- Không có localStorage
- Không có Clerk session
- mounted = false
→ isAdmin = false
→ Admin link KHÔNG render

Client Hydration:
- Giống server render lần đầu
- mounted = false
→ isAdmin = false
→ KHÔNG CÓ HYDRATION MISMATCH

Client Re-render:
- mounted = true
- Đọc localStorage
→ isAdmin = true (nếu là admin)
→ Admin link xuất hiện
```

### 2. API Call Failed

```
1. getToken() hoặc API call lỗi
   → catch block
   → setError("Failed to fetch user data")

2. User vẫn = null
   → isAdmin = false
   → Admin link ẨN

3. Error được lưu trong store
   → Có thể hiển thị thông báo lỗi
```

### 3. Token Expired

```
1. Token hết hạn
   → Backend trả về 401

2. Axios interceptor bắt 401
   → Log "Unauthorized access"

3. useAuth() catch error
   → setError()
   → User data không update

4. Clerk tự động refresh token
   → Retry lần sau sẽ thành công
```

---

## 📊 DATA FLOW DIAGRAM

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  layout.tsx                     │
│  ┌──────────────────────────┐  │
│  │  ClerkProvider           │  │
│  │  ┌────────────────────┐  │  │
│  │  │  AuthProvider      │  │  │
│  │  │  (calls useAuth()) │  │  │
│  │  │         │          │  │  │
│  │  │         ▼          │  │  │
│  │  │    ┌─────────┐    │  │  │
│  │  │    │ Navbar  │    │  │  │
│  │  │    └─────────┘    │  │  │
│  │  │    ┌─────────┐    │  │  │
│  │  │    │ Pages   │    │  │  │
│  │  │    └─────────┘    │  │  │
│  │  └────────────────────┘  │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────┐
│   useAuth() Hook    │
├─────────────────────┤
│ • useUser()         │ ← Clerk
│ • getToken()        │ ← Clerk
│ • useUserStore()    │ ← Zustand
│ • axiosInstance     │ ← Axios
└──────┬──────────────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌─────────────┐      ┌──────────────┐
│   Clerk     │      │ Zustand Store│
│ Auth Server │      │ + localStorage│
└──────┬──────┘      └──────┬───────┘
       │                    │
       │ JWT Token          │ user data
       │                    │ isAdmin()
       ▼                    │
┌─────────────┐             │
│  Backend    │             │
│  API Server │             │
│             │             │
│ GET /users/ │             │
│     me      │             │
│     │       │             │
│     ▼       │             │
│ ┌─────────┐ │             │
│ │Database │ │             │
│ └─────────┘ │             │
└──────┬──────┘             │
       │                    │
       │ User + Role        │
       └────────────────────┘
                │
                ▼
         ┌─────────────┐
         │  Component  │
         │  Re-render  │
         └─────────────┘
```

---

## 🔐 SECURITY FLOW

```
1. User Login → Clerk
2. Clerk Issues JWT Token
3. Frontend stores token (Clerk manages it)
4. Every API call:
   frontend → getToken() → Clerk → JWT
   frontend → API request + Bearer JWT
   backend → verify JWT with Clerk Secret
   backend → extract userId from token
   backend → find user in DB
   backend → return user + role
5. Frontend → Save to Zustand
6. UI → Show/Hide based on role
```

---

## 💡 LỢI ÍCH CỦA KIẾN TRÚC NÀY

✅ **Separation of Concerns:**
- Clerk: Authentication
- Backend: Authorization & Data
- Zustand: State Management
- Components: UI Display

✅ **Performance:**
- LocalStorage cache → Fast load
- Skip unnecessary API calls
- Token auto-refresh

✅ **Security:**
- JWT verification on backend
- Role-based access control
- Secure token handling

✅ **Developer Experience:**
- Type-safe với TypeScript
- Reusable hooks
- Easy to test
- Clear data flow

---

## 🎓 TÓM TẮT

| File | Nhiệm vụ | Khi nào dùng |
|------|----------|--------------|
| `axios.ts` | HTTP client config | Gọi API backend |
| `types/index.ts` | Type definitions | Import types |
| `useUserStore.ts` | Global state | Lưu/đọc user data |
| `useAuth.ts` | Auth logic | Cần user/isAdmin |
| `AuthProvider.tsx` | Initialize auth | Wrap app |
| `Navbar.tsx` | UI display | Show/hide menu |

**Luồng chính:** 
Clerk → Token → Backend API → User Data → Zustand → LocalStorage → UI

**Key concept:** 
Kết hợp authentication (Clerk) với authorization (Backend role) để quản lý quyền truy cập UI.
