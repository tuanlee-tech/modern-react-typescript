# Chương 7: Global State An Toàn Kiểu Dữ Liệu, Không Cần Redux



*Chương này cover:*

- **7.1** Tại sao Redux thường là over-engineering cho 2026
- **7.2** Zustand: store type-safe với slices pattern
- **7.3** Phân tách server state và client state
- **7.4** Persistence, devtools, và debugging Zustand
- **7.5** Exercise: Auth store và notification store cho CRM (full solution)


Các chương trước đã trang bị cho bạn cách cô lập state vào từng component (Local State), hay nhấc nó lên các component liên quan (Lifted UI State thông qua Router/Parent Props). Nhưng mọi ứng dụng CRM cấp doanh nghiệp đều sẽ chạm đến ngưỡng thiết kế mà "Lifted State" gục ngã hoàn toàn.

Hãy tưởng tượng: User đăng nhập thành công. Thông tin `UserAvatar` cần hiển thị trên Navbar. Nhưng Token của User cần được chèn vào mọi request `fetch` ở tuốt dưới Tầng Data Hooks. Trong khi đó, cái Modal thông báo "Phiên bản mới vừa cập nhật" cần bắn ra một cái Alert trên mọi màn hình. Nếu dùng Prop Drilling, bạn sẽ phải lôi đống logic User, Notifications vào tận `App.tsx` gốc rồi truyền chằng chịt vài chục tầng Component!

Đó là lúc ta cần một "Global State" (Trạng thái toàn cục).

Nhiều năm trước, câu trả lời mặc định là Redux. Nhưng hệ sinh thái React đã thay đổi chóng mặt. Với React 19, một bộ Global State hoàn hảo không cần hàng chục file Boilerplate (mã khuôn lặp lại) hay cấu hình phức tạp. Chương này đưa bạn đến với **Zustand**, kết hợp Typescript để xây nên lớp lưu trữ trung tâm của ứng dụng.

---

### 7.1 Tại Sao Redux Rất Tốt, Nhưng Thường Là Over-Engineering (Làm Quá) 

**Sự chia tách lịch sử**

Redux xuất hiện ở giai đoạn các nhà phát triển React phải tự tải từng mẩu dữ liệu nhỏ bằng Javascript, ép mọi thứ vào một "Kho bách hoá tổng hợp" khổng lồ trên Browser. Khi bạn Fetch danh sách Customer? Nhét vô Redux. Lỗi khi xoá? Nhét lỗi vô Redux. Trạng thái Modal bật tắt? Lại nhét vô Redux.

Đến ngày nay, chúng ta nhận ra rằng:
1. **Server State (Dữ liệu máy chủ):** Dữ liệu như danh sách khách hàng, thông tin cá nhân... thực chất không phải của Client. Client chỉ đang "mượn" (cache). Giữ chúng ở Redux đồng nghĩa với việc bạn phải làm bằng tay mọi cơ chế Cache, Invalidation, Refetching,... (TanStack Query/SWR/React Server Components đã giải quyết triệt để vấn đề này).
2. **Client State (Dữ liệu giao diện):** Theme Sáng/Tối, Sidebar mở hay đóng, User Authentication Token, hay Alert Notifications. Đây mới thực sự là các state cần Global Store. 

Khi chỉ còn phải quản lý Client State, Redux Toolkit trở nên quá nặng nề: Bạn vẫn phải thiết lập Provider, Slice, Dispatch, Thunk,...

**Triết lí của Zustand**

`Zustand` (tiếng Đức: "Trạng thái") ra đời nhắm thẳng vào sự tinh giản:
*  Không cần Context Provider bọc quanh `<App>`.
*  Không có Action/Dispatch boilerplate rườm rà.
*  API hướng Hook, hoạt động không thể tự nhiên hơn với Typescript.

---

### 7.2 Zustand: Khởi Tạo Store Type-Safe Cho Auth

Đầu tiên, tải thư viện (trong thực tế là `npm install zustand`).
Hãy xem sức mạnh của nó qua việc tích hợp hệ thống Xác thực (Auth) cho hệ thống CRM.

Với Typescript, cốt lõi để làm Zustand chuẩn chỉnh là luôn luôn **định nghĩa Store Interface** trước khi code body của Zustand. Nếu bạn bỏ qua Interface, Type Inference của Zustand sẽ rất lỏng lẻo khi chia Slice hoặc Middleware.

```tsx [src/store/useAuthStore.ts]
import { create } from 'zustand';

// Định hình dữ liệu
export type UserRole = 'admin' | 'manager' | 'staff';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

// Interface của Store: Gồm cả State VÀ Actions (Hàm chỉnh sửa state)
interface AuthState {
  // State
  user: UserProfile | null;
  isAuthenticated: boolean;
  token: string | null;

  // Actions
  login: (userData: UserProfile, token: string) => void;
  logout: () => void;
  updateAvatar: (url: string) => void;
}

// Khởi tạo Store bằng Type AuthState
export const useAuthStore = create<AuthState>((set) => ({
  // State mặc định (Initial Config)
  user: null,
  isAuthenticated: false,
  token: null,

  // Các actions, sử dụng hàm `set` được tiêm bởi Zustand
  login: (userData, token) => set({ 
    user: userData, 
    isAuthenticated: true, 
    token 
  }),
  
  logout: () => set({ 
    user: null, 
    isAuthenticated: false, 
    token: null 
  }),

  // Cú pháp Partial Set: Bạn chỉ cần truyền những field bị thay đổi (zustand tự merge như React setState object cũ)
  // Nếu State phụ thuộc vào State cũ, ta dùng callback method
  updateAvatar: (url) => set((state) => ({
    user: state.user ? { ...state.user, avatarUrl: url } : null
  })),
}));
```

**Cách sử dụng trong Component (Tối ưu Render)**

Đây là lý do thứ hai khiến Zustand tuyệt vời: Khả năng chia rẽ chọn lọc (Selector). Bạn hoàn toàn kiểm soát việc component có re-render hay không khi Store thay đổi.

```tsx [src/components/layout/Navbar.tsx]
import { type FC } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import Button from '@components/ui/Button';

const Navbar: FC = () => {
  // ❌ ANTI-PATTERN: Đừng lấy toàn bộ store! 
  // Nếu bạn rút toàn bộ: const store = useAuthStore() ---> Component Navbar sẽ re-render CẢ khi biến 'token' thay đổi (dù bạn ko dùng nó).
  
  // ✅ BEST PRACTICE: Chỉ lựa chọn các cành state mình cần (Selector).
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!user) {
    return <nav style={{ padding: '1rem', background: 'var(--color-surface)' }}>Loading...</nav>;
  }

  return (
    <nav style={{ 
      padding: '1rem 2rem', background: 'var(--color-surface)', 
      display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)' 
    }}>
      <div style={{ fontWeight: 'bold' }}>TuanLee CRM</div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img 
          src={user.avatarUrl || '/default-avatar.png'} 
          alt="avatar" 
          style={{ width: '32px', height: '32px', borderRadius: '50%' }}
        />
        <span>Xin chào, {user.name}</span>
        
        <Button variant="ghost" size="sm" onClick={logout}>Đăng Xuất</Button>
      </div>
    </nav>
  );
};

export default Navbar;
```

---

### 7.3 Middleware: DevTools và Persistence

Khi Global State của bạn to ra, hai yêu cầu tối thượng bắt buộc có: (1) Debug bằng Redux DevTools Extension và (2) Lưu Cache vào LocalStorage để reload trang không bắt người dùng đăng nhập lại.

Nhờ triết lý thiết kế Slices và Middleware vòng lặp ngoài của Zustand, bạn có thể "bọc" Store một cách an toàn mà không phá vỡ Typescript.

Cải tiến lại file `useAuthStore.ts` từ mục 7.2:

```tsx [src/store/useAuthStore.ts]
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { UserProfile, UserRole } from './types'; // (Assume we extracted the types)

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  token: string | null;
  
  login: (userData: UserProfile, token: string) => void;
  logout: () => void;
}

// Bọc devtools -> bọc persist -> logic lõi
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        token: null,

        // Thêm tham chiếu số 3 (tên action cho Redux Devtools dễ đọc)
        login: (userData, token) => set(
          { user: userData, isAuthenticated: true, token },
          false, 
          'auth/login' // Log hiển thị trong Redux Extension
        ),
        
        logout: () => set(
          { user: null, isAuthenticated: false, token: null },
          false,
          'auth/logout'
        ),
      }),
      {
        name: 'crm-auth-storage', // Key sẽ lưu trong LocalStorage trình duyệt
        // Nếu bạn muốn bỏ không lưu field 'token' vì lý do bảo mật, bạn dùng config partialize:
        // partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
      }
    ),
    { name: 'AuthStore' } // Tên block store trong Tool Debug
  )
);
```

Giờ đây, bạn có 1 hệ thống Authentication lưu trạng thái qua f5 vĩnh viễn, được kiểm tra dễ dàng, không mất đến 40 dòng mã.

---

### 7.4 Tách Biệt Server State & Client State

Có một cái bẫy chết người khi developers lần đầu học Global State: Họ tự coi Redux hay Zustand là Data Cache Layer. Họ tạo ra `useCustomerStore`, gọi lệnh API, cập nhật mảng mươi ngàn khách hàng vào đó.

**Đừng làm vậy.**

*   Phân trang (Pagination) sẽ vô cùng phức tạp khi Cache lộn xộn.
*   Chức năng Invalidate Data (ép dữ liệu làm mới) gần như phải code tay cho từng tình huống (Xóa xong phải Fetch lại).
*   Không có công cụ Garbage Collector (xoá Ram khi Component rời đi).

Trong ứng dụng CRM của chúng ta, `useCustomers.ts` (Chương 4) sẽ được giao cho Tanstack Query/SWR đảm nhiệm khi đấu nối API thực tế, đó là **Server State**.

Cái nên vào Zustand là **Client State**. Nó bao gồm:
1. Thông tin màn hình Modal chung (Thông báo, Cảnh báo đóng băng hệ thống).
2. Tình trạng Layout (Mở đóng Sidebar, Toggle Menu).
3. Session của User.

Hãy tuân thủ nghiêm ngặt ranh giới này. Bất cứ khi nào bạn đi tìm nơi chứa State, hay hỏi: *"Biến này tạo và quyết định bởi thằng DataBase, hay tạo ra bởi Trình Duyệt?"*. Database -> React Query / API Router. Trình duyệt -> Zustand.

---

### 7.5 Exercise: Tích hợp Notification Store (Popup Lũy Tích)

**Mục tiêu:** Tính năng Thông Báo (Toast Notification) ở góc màn hình là linh hồn của các hệ thống Dashboard. Nó có thể được gọi từ Nút Save, từ hàm Delete Customer bị Error, hoặc từ 1 báo động WebSocket ngầm nào đó. Zustand chính xác sinh ra cho vấn đề này vì Toast không thuộc về bất kì Component UI cụ thể nào.

**Yêu cầu:** Trang bị file Store cho mảng Notifications:
- Mỗi notification có `id` radom, chuỗi văn bản `title`, phân loại mầu `type` ('info' | 'success' | 'error').
- Lệnh `addNotification` có chức năng bồi thêm object vào mảng thông báo hiện tại. (Sinh ID tự động)
- Lệnh `removeNotification(id)` dùng để xóa item khỏi giao diện sau khi nó hết hạn.
- Khai báo một UI Toast Container treo lơ lửng ngoài màn hình để draw tất cả List Thông Báo này lên cho CRM. 

**Full Solution:**

```tsx [src/store/useNotificationStore.ts]
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationPayload {
  id: string; // Phải là chuỗi unique để mapping list React
  message: string;
  type: NotificationType;
}

interface NotificationState {
  notifications: NotificationPayload[];
  
  // Hành động public
  addNotification: (message: string, type?: NotificationType) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],
      
      addNotification: (message, type = 'info') => set(
        (state) => {
          // Tránh chặn thông báo, gộp thêm vô mảng (Immutable logic array)
          const newNoti: NotificationPayload = {
            id: crypto.randomUUID(), // Tiện ích Web Native có sẵn trong TS 6+
            message,
            type,
          };
          return { notifications: [...state.notifications, newNoti] };
        },
        false, "noti/add"
      ),

      removeNotification: (id) => set(
        (state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }),
        false, "noti/remove"
      )
    }),
    { name: 'NotificationStore' }
  )
);
```

Giờ là lúc viết Container đón nhận mảng Global Data này và In ra ngoài màn hình (Bất chấp Component Container này đặt ở đâu, Data vẫn trôi về).

```tsx [src/components/layout/ToastContainer.tsx]
import { useEffect, type FC } from 'react';
import { useNotificationStore, type NotificationPayload } from '@/store/useNotificationStore';

const COLOR_MAP = {
  success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
  error:   { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  info:    { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  warning: { bg: '#fffbeb', border: '#f59e0b', text: '#b45309' },
};

// UI Từng Dòng Rời Rạc
const ToastItem: FC<{ noti: NotificationPayload }> = ({ noti }) => {
  const remove = useNotificationStore(state => state.removeNotification);
  const styles = COLOR_MAP[noti.type];

  // Self Cleanup: Tự mất tích sau 4 giây
  useEffect(() => {
    const timer = setTimeout(() => {
      remove(noti.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [noti.id, remove]);

  return (
    <div style={{
      width: '320px', padding: '1rem', marginBottom: '0.75rem',
      borderRadius: '6px', borderLeft: `5px solid ${styles.border}`,
      backgroundColor: styles.bg, color: styles.text,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      display: 'flex', justifyContent: 'space-between',
      animation: 'slideIn 0.3s ease-out forwards'
    }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{noti.message}</p>
      <button 
        onClick={() => remove(noti.id)} 
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}
      >
        ✕
      </button>
    </div>
  );
};

// Vùng Đáy Chứa List Toast Component
const ToastContainer: FC = () => {
  // Chỉ selector cái mình cần là mảng object. Add/Remove chạy nội bộ.
  const notifications = useNotificationStore(state => state.notifications);

  // Không có thông báo -> không Render DOM div ảo nào cả
  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999, // Đảm bảo nổi trên tất cả
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      {notifications.map((n) => (
        <ToastItem key={n.id} noti={n} />
      ))}
    </div>
  );
};

export default ToastContainer;
```

**Cách gọi thông báo từ tận nơi xa xôi nhất:**

Cuối cùng, ví dụ ở File `CustomerTable` (Chương 5), ta lấy Action AddNoti mang ra nả đạn vào Global State: Sự thay đổi này sẽ làm cái Toast bật khung!

```tsx
// Bất cứ nơi nào trong App:
import { useNotificationStore } from '@/store/useNotificationStore';

function DemoChildComponent() {
  // Rút nguyên cái Action Fire. (Tuyệt đối không rút state Notification rác làm tốn re-render UI Component này nhé!)
  const addToast = useNotificationStore(state => state.addNotification);

  const handleClick = async () => {
    try {
      await deleteUserOnServer();
      addToast("Xoá thành công khách hàng", "success");
    } catch {
      addToast("Có lỗi máy chủ không kết nối được", "error");
    }
  }

  return <Button onClick={handleClick}>Run Test</Button>;
}
```

Kiến trúc Provider-less của Zustand làm thay đổi toàn bộ luật chơi React 19. Component Fire Event và Component vẽ UI Toast không có chút dây mơ rễ má nào về Scope Prop. Chỉ có một File duy nhất chốt nối, với sức mạnh TypeSafe, có lưu cache và có Redux Devtool!

---

> **Tiếp theo:** [Chương 8: Routing Với Đầy Đủ Type Safety →](./chapter-08), nơi chúng ta chính thức giăng lưới toàn bộ các View vừa thiết kế từ đầu chuỗi vào một kết cấu Luồng URL Routing. Chúng ta sẽ áp dụng các Store phía trên vào Protected Layout để chắn bảo vệ người chưa Login.
