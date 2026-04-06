# Chương 8: Routing Với Đầy Đủ Type Safety



*Chương này cover:*

- **8.1** React Router v7: file-based routing và type-safe params
- **8.2** Protected routes và authentication flow
- **8.3** Nested layouts và data loading pattern
- **8.4** Navigation types và `useNavigate` type-safe
- **8.5** Exercise: Routing toàn bộ CRM — dashboard, customers, settings (full solution)


Từ đầu cuốn sách đến giờ, chúng ta đã xây dựng hàng loạt components cho CRM Dashboard: Nút bấm, Bảng, Thanh tìm kiếm, Form tạo khách hàng... Nhưng chúng đều đang ở trạng thái "rời rạc", giống như những viên gạch xếp chồng chất chưa có khung nhà. Một Ứng dụng thực sự cần nhiều Màn hình (Pages/Views), và cách Duy nhất để di chuyển giữa các màn hình mà không làm tải lại trang chính là **Routing** (Định tuyến).

React Router đã là tiêu chuẩn vàng bao nhiêu năm nay. Nhưng với phiên bản v7, thư viện này đã đạt đến cảnh giới mới: Nó gộp trọn sức mạnh của Remix (một framework Server-side) lại thành một, mang đến Data Loading song song, File-based config, và trên hết: Hỗ trợ Type-Safe (Kiểm tra kiểu dữ liệu tĩnh cho các tham số URL).

Trong chương này, chúng ta sẽ xâu chuỗi mọi thành quả từ Chương 1 tới Chương 7, phủ lên nó một bản đồ lưới định tuyến, và áp dụng Zustand Auth Store (Chương 7) để xây dựng hệ thống Khóa Cửa (Protected Routes) cực kì an toàn.

---

### 8.1 React Router v7 Bản Chất Khác Biệt Và Configuration

Trước đây ở React Router v5/v6, chúng ta thường khai báo một rừng thẻ `<Route>` nhúng thẳng vào component `<App>`. Khi ứng dụng phình to, cây JSX này trở thành cơn ác mộng để bảo trì. React Router v7 hướng tới cấu hình bằng khai báo Object hoặc File-based (nếu dùng chung Vite plugin).

Cách setup chuẩn Enterprise cho CRM Dashboard ưu tiên một file định nghĩa Route tập trung và dùng Typescript để khoá các Path.

```tsx [src/routes/config.ts]
// Nguồn duy nhất định nghĩa các Path URL trong dự án!
// Việc này tránh lỗi sai chính tả type tay "cusomers" thay vì "customers"
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CUSTOMERS: '/customers',
  CUSTOMER_DETAIL: (id: string) => `/customers/${id}`,
  SETTINGS: '/settings',
} as const;
```

Bây giờ chúng ta khởi tạo `createBrowserRouter`. Hàm này không nằm trong Component Lifecycle, nó nằm độc lập bên ngoài, giúp React Router v7 có thể bắt đầu load dữ liệu Router sớm nhất có thể.

```tsx [src/router.tsx]
import { createBrowserRouter, redirect } from 'react-router';
import { ROUTES } from './routes/config';

// Import Các Pages (Các màn hình Full-View)
import RootLayout from './pages/RootLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersListPage from './pages/CustomersListPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import ErrorPage from './pages/ErrorPage';

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    // RootLayout chứa Sidebar/Header. Outlet bên trong nó tuỳ URL sẽ bung rễ.
    element: <RootLayout />,
    // Bắt toàn vẹn các lỗi văng ra trong các trang nhánh
    errorElement: <ErrorPage />, 
    children: [
      {
        index: true, // Nếu trỏ về '/' thì default vào Home Dashboard
        element: <DashboardPage /> 
      },
      {
        path: 'customers',
        element: <CustomersListPage />,
      },
      {
        path: 'customers/:id', // URL Parameter (:id)
        element: <CustomerDetailPage />,
      },
      {
        path: 'settings',
        element: <div>Trang cấu hình hệ thống (To-do)</div>
      }
    ]
  },
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />
  }
]);
```

Cuối cùng, gài vào `main.tsx`:

```tsx [src/main.tsx]
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

---

### 8.2 Protected Routes Và Kết Nối Auth Flow

Quy luật bất biến của Dashboard Mật: Nếu bạn chưa đăng nhập, mọi truy cập vào `/customers` hay `/dashboard` đều phải bị cưỡng chế đá văng về `/login`. Nếu bạn *đã* đăng nhập mà mò vào `/login`, bạn phải bị búng về `/dashboard`.

Rất nhiều Developer xử lý logic này bằng `useEffect` trong từng Page. Đó là hành vi thiết kế gây chớp màn hình trắng (Waterfalls Navigation) - tức là Trang phải render ra DOM xong, Effect mới chạy, thấy chưa login mới đá đi. Hệ quả: User kịp nhìn thấy 0.1s mã nguồn nhạy cảm!

**Phương pháp chuẩn xác:** Sử dụng Component Vệ Sĩ bao bọc (Wrapper). Chúng ta móc nối với Zustand `useAuthStore` thiết kế ở Chương 7.

```tsx [src/routes/ProtectedRoute.tsx]
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/store/useAuthStore';
import { ROUTES } from './config';

export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Lưu lại vị trí user định chọc vào để sau khi login xong ta redirect lại đúng chỗ đó!
  const location = useLocation();

  if (!isAuthenticated) {
    // Navigate hoạt động êm ái chặn từ khâu Render (Không cần Effect)
    // Trường state giúp Login Page biết phải rẽ về đâu sau khi thành công
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  // Nếu thoả mãn Auth, Outlet xả cửa cho Route con hiển thị
  return <Outlet />;
};
```

Bây giờ, tại hệ thống Route `router.tsx`, bạn chỉ việc gài Kẹp Chả Vệ Sĩ vào cây.

```tsx [src/router.tsx]
import { ProtectedRoute } from './routes/ProtectedRoute';

export const router = createBrowserRouter([
  // ... Nhánh 1 nhánh Public
  { path: ROUTES.LOGIN, element: <LoginPage /> },
  
  // ... Nhánh 2 nhánh System (Bị Vệ Sĩ Chặn)
  {
    element: <ProtectedRoute />, // 🛡️ KHOÁ Ở ĐÂY
    children: [
      {
        path: ROUTES.HOME,
        element: <RootLayout />, // RootLayout bây giờ chắc chắn 100% có Data của User!
        children: [
           // Dashboard, Customers...
        ]
      }
    ]
  }
]);
```

Tại `LoginPage.tsx`, sau khi Login action từ Zustand xử lý xong:

```tsx
const navigate = useNavigate();
const location = useLocation();
const login = useAuthStore(state => state.login);

const handleLoginSubmit = async () => {
   const token = await fakeApiAuth();
   login(user, token);
   
   // Đọc lại địa điểm cũ, hoặc default bay về Dashboard
   const redirectTo = location.state?.from || ROUTES.DASHBOARD;
   navigate(redirectTo, { replace: true }); 
}
```

---

### 8.3 Nested Layouts & Cấu Trúc Khung Chứa

Tầng `RootLayout` ở ví dụ trước không phải một Page nội dung. Nó là cái "khung cửi". Nó tốn vĩnh viễn ở ngoài viền như Sidebar hay TopNav. Component đặc thù nhất của Nested Route là `<Outlet />`, nó hoạt động như một cái "lỗ ngầm", dữ liệu URL quét trúng Page nào thì HTML Page đó sẽ đùn lên qua lỗ.

```tsx [src/pages/RootLayout.tsx]
import { FC } from 'react';
import { Outlet } from 'react-router';
import Navbar from '@components/layout/Navbar';
import Sidebar from '@components/layout/Sidebar';
import ToastContainer from '@components/layout/ToastContainer';

const RootLayout: FC = () => {
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--color-background)' }}>
      {/* Cột trái tĩnh */}
      <Sidebar />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Thanh trên tĩnh */}
        <Navbar />
        
        {/* Nơi nhộn nhịp nhất: Đổi trang thì chỉ khu này re-render! */}
        <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
          <Outlet /> 
        </main>
      </div>

      {/* Global State Toast */}
      <ToastContainer />
    </div>
  );
};

export default RootLayout;
```

---

### 8.4 Navigation Types Và Params An Toàn

Vấn đề đau đầu của Web Routing là Parameter (Tham số truy vấn). Làm sao để bảo đảm trang `CustomerDetailPage` lấy ID dạng chuỗi, và lấy đúng khoá `id` chứ không phải typo `customerIdx` trên URL?

Tiếc thay, hàm móc `useParams` của React Router trả về Object lỏng `<string, string | undefined>`. Ở đây ta ép kiểu nghiêm ngặt (Type Assertion) thông qua Zod để đảm bảo không ai chọc vào URL rác.

```tsx [src/pages/CustomerDetailPage.tsx]
import { useParams, Navigate } from 'react-router';
import { z } from 'zod';

// Tái chế Zod thành công cụ bắt kiểu Params
const ParamSchema = z.object({
  id: z.string().uuid("ID khách hàng phải là định dạng UUID hợp lệ")
});

export default function CustomerDetailPage() {
  const rawParams = useParams();
  
  // SafeParse URL Params
  const parseResult = ParamSchema.safeParse(rawParams);

  if (!parseResult.success) {
    // Nếu ai đó gõ `/customers/abcedf-sai-uuid`, sẽ bị hệ thống phát hiện
    return <Navigate to="/customers" replace title="URL Không hợp lệ" />;
  }

  // Lúc này biến customerId an toàn tuyệt đối, TypeScript công nhận.
  const customerId = parseResult.data.id;

  return (
    <div>
      <h2>Chi Tiết Khách Hàng: {customerId}</h2>
      {/* Fetch dữ liệu data dựa trên thẻ customerId an toàn nảy */}
    </div>
  );
}
```

Về phần Điều hướng `useNavigate()`, hãy gói nó lại để không ai có thể dùng Hard-code string ném vào, mà luôn thông qua File Config.

```tsx
import { useNavigate } from 'react-router';
import { ROUTES } from '@/routes/config';

// ❌ Chống lỗi sai chính tả
// navigate('/cusomers/123'); 

// ✅ TypeScript chắp cánh
const nav = useNavigate();
nav(ROUTES.CUSTOMER_DETAIL("ab12-32b3-ccc1"));
```

---

### 8.5 Exercise: Lắp Ráp Khung Sườn Routing CRM (Full)

**Mục tiêu:** Hãy biến những bài học trên thành file Routing thực tế cho CRM Dashboard của chúng ta.
Sự kiện xảy ra là: Thay vì `App.tsx` chỉ Render tuột tuồn tuột các UI như Chương 4, chúng ta chia mảng, biến Khối Sidebar và Navbar vào Root Layout. Màn Hình Customers Dashboard vào 1 Router. Khi nhấp vào "Xem chi tiết" ở bảng, Routing trỏ sang trang Parameter cụ thể.

**Full Solution:**

Đầu tiên, định hình cấu trúc Page và thiết lập Component Sidebar điều hướng. Ở đây sử dụng thẻ `<NavLink>` vĩ đại của React Router để tô màu nút khi đang đứng ở Trang đó.

```tsx [src/components/layout/Sidebar.tsx]
import { NavLink } from 'react-router'; 
import { ROUTES } from '@/routes/config';

const links = [
  { path: ROUTES.DASHBOARD, label: "Tổng quan" },
  { path: ROUTES.CUSTOMERS, label: "Hồ sơ Khách Hàng" },
  { path: ROUTES.SETTINGS, label: "Cấu hình" },
];

export default function Sidebar() {
  return (
    <aside style={{ width: '250px', background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '2rem' }}>CRM PRO</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {links.map(route => (
          <NavLink 
            key={route.path}
            to={route.path}
            style={({ isActive }) => ({
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
              // Tự Động Highlight nếu đang đứng đúng cửa
              backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: isActive ? '#3b82f6' : 'var(--color-text-secondary)'
            })}
          >
            {route.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

Với cấu trúc Cây Router. Nhất định phải tách biệt Loading UI (Nếu áp dụng cơ chế code-splitting cho Trang). React Router v7 cung cấp thuộc tính `hydrateFallbackElement` để làm Skeleton lúc bắt đầu tải mã JS trang.

Cuối cùng, lắp ráp toàn bộ bộ khung ở `App.tsx` tối thượng (kết hợp `ThemeProvider` từ Chương 1, `Zustand` từ Chương 7, và `RouterProvider` Chương 8):

```tsx [src/App.tsx]
import { type FC } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './router'; 
import { ThemeProvider } from './context/ThemeContext'; // Theme Chương 1
import ToastContainer from './components/layout/ToastContainer'; // Notification Chương 7

// File gốc App.tsx bây giờ trở nên sạch sẽ chưa từng có!
const App: FC = () => {
  return (
    <ThemeProvider>
       {/* 
         RouterProvider nắm quyền điều khiển việc render gì. 
         Global Store Zustand không cần Provider bọc vì chúng đứng ngoài cây React!
       */}
       <RouterProvider router={router} />
       
       {/* Notification Portal bám víu gốc rễ */}
       <ToastContainer />
    </ThemeProvider>
  );
};

export default App;
```

**Thành Quả Nhìn Lại:** 

Một User (Khách) vào Trang `/customers`. Route lập tức phát hiện chặn tại kẹp chả `<ProtectedRoute>`. Nó check Zustand `AuthStore`, thấy rỗng! Tức khắc Component React Router `<Navigate>` bắn bay qua `/login`. Trắng mạng, an toàn tuyệt mật.

User login vào `/login`. Form Zod bắn check email/password từ Chương 6. Nếu đúng -> Gọi Zustand lưu Context Token và Role. Zustand gọi Save Cache LocalStorage chốt phiên -> Route Login dùng `useNavigate()` đẩy User sang `/dashboard`. Cây RootLayout đùn lên `<Sidebar>` tĩnh và Component Navbar có chứa Avatar User từ Zustand.

Luồng điều hướng Front-end đã kín không một kẽ hở!

---

> **Tiếp theo:** [Chương 9: Performance Thực Sự Có Ý Nghĩa →](./chapter-09). Ứng dụng đã chạy cực hoàn hảo. Nhưng chuyện gì xảy ra nếu Công ty bạn phát đạt và List Khách hàng lên tới 10.000 dòng? Trình duyệt sẽ sập cái "Bụp" hoặc Memory quá tải vì Render ra 10 ngàn thẻ `<tr>`. Tại hồi kết của Phần 3 này, chúng ta sẽ tối ưu hoá hiệu năng mức đỉnh cao.
