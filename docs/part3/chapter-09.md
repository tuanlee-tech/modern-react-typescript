# Chương 9: Performance Thực Sự Có Ý Nghĩa



*Chương này cover:*

- **9.1** Đo trước khi tối ưu: React Profiler và Lighthouse
- **9.2** Code splitting với `React.lazy` và dynamic imports
- **9.3** Virtualization cho danh sách lớn: `@tanstack/react-virtual`
- **9.4** Image optimization, font loading, và Core Web Vitals
- **9.5** Exercise: Tối ưu bảng 10.000 khách hàng (full solution)


Một câu nói kinh điển trong giới kỹ thuật phần mềm do Donald Knuth phát biểu: *"Tối ưu hóa vội vàng là cội nguồn của mọi tội ác"*. Tuy nhiên, trong thế giới trình duyệt, việc bỏ qua "Tối ưu hoá" hoàn toàn lại là lý do khiến người dùng rởi bỏ phần mềm của bạn.

Hệ thống Routing ở Chương 8 của chúng ta đã làm cho CRM Dashboard luân chuyển cực kì chuyên nghiệp. Tuy nhiên, nó kéo theo một tác dụng phụ: Người dùng vào `/login`, nhưng lại bị ép tải Javascript của file `CustomerDetailPage`, chứa kèm thư viện Chart, bộ parse Zod nặng trịch, và CSS của các bảng table mà chưa chắc họ đã nhấn vào! 

Tiếp đến, trang CustomeList sau 2 năm hoạt động đã đổ về 10,000 bản ghi thay vì 50 cái list dummy. Và DOM của trình duyệt kêu rên thảm thiết, quạt tản nhiệt của sếp bạn trong máy Macbook rú lên mỗi khi cuộn trang.

Trong chương cuối cùng của Phần 3 này, chúng ta sẽ làm đúng hai chữ "Performance" (Hiệu Năng), tập trung vào các giải pháp sát sườn với Production: Đo đạc chính xác bệnh viện, chia nhỏ rủi ro tệp JS tải về, và biểu diễn ma thuật hiển thị mảng khổng lồ bằng Grid Virtualization. 

---

### 9.1 Đo Lường Thay Vì Phỏng Đoán

Không bao giờ bắt tay code Tối ưu nếu bạn không thấy con số chỉ điểm cụ thể. Bạn có 2 loại đo lường:

**1. React Profiler (Đo Rendering CPU Client)**
Nó được tích hợp sẵn ở React DevTools (Chrome/Firefox Extension). Chuyển sang tab Profiler, bấm Nút Record màu đỏ, thực hiện thao tác Thêm Item. Sau khi bấm Stop, nó sẽ vẽ ra Flamegraph. 
- *Bạn tìm gì?* Bất cứ thanh ngang màu vàng cam nào hiển thị `Render time > 16ms`. Nghĩa là màn hình bị giật cục (drop dưới 60 FPS).
- *Lưu ý sống còn:* Nhờ React Compiler cài đặt ở Chương 1, ứng dụng của chúng ta gần như đã được giải thoát khỏi "Thiếu Memoization" (Re-render hàng loạt do mất reference). Bệnh lớn nhất lúc này là *Quá Nhiều DOM Nodes*. 

**2. Chrome Lighthouse (Đo Tải Trọng Mạng Thực Tế)**
Tab Lighthouse trong DevTools đo điểm Core Web Vitals.
- *LCP (Largest Contentful Paint):* Mất bao lâu khối Text/Hình nặng nhất mới hiện ra?
- *INP (Interaction to Next Paint):* Mất bao lâu cái Button chuyển sang màu xanh khi bị Click vào?

Thay vì mù quáng thử sai, hãy theo dõi 2 chỉ số trên để biết code bạn thêm vào có thật sự xịn hay là "Tối ưu hóa tồi".

---

### 9.2 Code Splitting & Tải Chậm (Lazy Loading) bằng Dynamic Import

Single Page Application (SPA) của React theo mặc định sẽ gộp cả nghìn file JSX vào 1 cục gọi là `bundle.js`. Nếu cục đó nặng 5MB, người dùng 3G phải đợi 10 giây ở Vòng xoay trắng trước khi thấy Trang Login.

**Quy tắc:** Chỉ tải giao diện mà màn hình đó cần hiển thị. Giải pháp: `React.lazy` kết hợp Route-based splitting (Tách theo cấu trúc trang).

```tsx [src/router.tsx]
import { createBrowserRouter } from 'react-router';
// import { lazy, Suspense } from 'react'
import { ROUTES } from './routes/config';
import RootLayout from './pages/RootLayout';
import ErrorPage from './pages/ErrorPage';

// ❌ ANTI-PATTERN Mặc Định (Static Import)
// Import kéo theo cả file và Dependency của nó.
// import CustomersListPage from './pages/CustomersListPage'; 
// import DashboardPage from './pages/DashboardPage';

// ✅ BÊN DƯỚI LÀ CÁCH LOAD ĐÚNG LÝ TƯỞNG CỦA SPA (Dynamic Import)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CustomersListPage = lazy(() => import('./pages/CustomersListPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        // Dùng Suspense (Học ở Chương 5) để bao fallback Layout chờ tải Component
        element: (
          <Suspense fallback={<div>Đang tải Tổng Quan...</div>}>
             <DashboardPage />
          </Suspense>
        ) 
      },
      // ...
    ]
  }
]);
```

**Hoạt động thế nào?**
Khi build production (Vite), nó sẽ không ra 1 file `index.xxx.js` bự chảng, mà chặt thành `index.xxx.js`, `LoginPage.xxx.js`, `DashboardPage.xxx.js` độc lập.
Khi user vào URL `/login`, React Router phát lệnh load mã nhúng của trang đó, tải xong chèn vào UI. Người chưa bao giờ có quyền lọt qua `<ProtectedRoute>` vào Khách Hàng, sẽ vĩnh viễn không phải tải mã Code `CustomersListPage.xxxx.js`. Điều này giảm tải LCP cực mạnh.

---

### 9.3 Tối Ưu Bảng Hàng Ngàn Dòng: Virtualization

Bây giờ tới vấn đề cục bộ Khách Hàng. Nếu API chọc xuống lấy được 10.000 users. Tại `CustomerTable.tsx`, vòng lặp `.map()` ép React tạo ra 10.000 cặp `<tr>` có vài thuộc tính Text xen kẽ nút Xóa và Icon Badge.

Thực tế HTML trình duyệt chỉ khoẻ khi vẽ < 1500 Nodes. Quá ngưỡng đó, trình duyệt ngốn vài gigabytes RAM.
**Cách giải quyết:** `Virtualization` (DOM ảo). Nghĩa là dù Mảng có 10000 object, React chỉ vẽ *đúng 15 thẻ `<tr>` hiện trên giới hạn khung vuông màn hình bạn đang xem*. Khi bạn Scroll cuộn chuột, React tái sử dụng (Re-render) đúng 15 thẻ đó, hoán đổi liên tục văn bản thay vì tạo hàng ngàn thẻ mới.

Thư viện chuẩn mực vô đối cho chuyện này: `@tanstack/react-virtual`.

```bash
npm install @tanstack/react-virtual
```

Hãy nâng cấp Form Hàng Tỷ đô la từ chương 5 thành thế hệ kế tiếp:

```tsx [src/components/CustomerTableVirtual.tsx]
import { useRef, type FC } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CustomerListItem } from '@types/customer';
import StatusBadge from '@components/ui/StatusBadge';

interface Props {
  customers: CustomerListItem[];
}

const CustomerTableVirtual: FC<Props> = ({ customers }) => {
  // 1. Phải có Ref bọc quanh Box cuộn trang
  const parentRef = useRef<HTMLDivElement>(null);

  // 2. Khởi tạo Engine chạy khung nhìn ảo (Virtualizer)
  const rowVirtualizer = useVirtualizer({
    count: customers.length,                 // Tổng số Record 10000
    getScrollElement: () => parentRef.current, // Box vật lý nào để chứa scroll
    estimateSize: () => 65,                  // Kích thước ước lượng 1 hàng (px)
    overscan: 5,                             // Render mồi thêm 5 hàng phía trên/dưới góc nhìn tránh bị chớp
  });

  return (
    // Bộ định kích thước ViewPort
    <div
      ref={parentRef}
      style={{
        height: '600px', // Bắt buộc Fix Height thì Scroll mới hiện ra!!
        overflow: 'auto', // CSS Bắt Cuộn
        border: '1px solid var(--color-border)',
        borderRadius: '8px'
      }}
    >
      {/* Bộ khung Total Height Dũng Mãnh nhất: Chứa giá trị Height Ảo tổng bằng 10k items gộp lại */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative', // Gốc Toạ độ cho item móc vào
        }}
      >
        {/* Lặp không qua danh sách customers lỏng lẽo nữa, lặp qua Engine VirtualItems */}
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
           // Móc gốc index trở lại 
           const customer = customers[virtualRow.index];
           
           return (
             <div
               key={virtualRow.index}
               // Absolute để gắn ghim cố định hàng vào đỉnh trang ảo
               style={{
                 position: 'absolute',
                 top: 0,
                 left: 0,
                 width: '100%',
                 height: `${virtualRow.size}px`,
                 transform: `translateY(${virtualRow.start}px)`, // Engine thả vị trí pixel đúng chuẩn
                 
                 // CSS Tuổi trang
                 display: 'flex',
                 alignItems: 'center',
                 padding: '0 1rem',
                 borderBottom: '1px solid var(--color-border)',
               }}
             >
                {/* 
                  Đây chính là nơi bạn Render 1 dòng (Row). 
                  Nhưng nhớ: Table 10k người, cái này chỉ loop 15-20 lần MAX! 
                */}
                <div style={{ flex: 2, fontWeight: 500 }}>{customer.name}</div>
                <div style={{ flex: 2, color: 'var(--color-text-secondary)' }}>{customer.email}</div>
                <div style={{ flex: 1 }}><StatusBadge status={customer.status} /></div>
             </div>
           )
        })}
      </div>
    </div>
  );
};

export default CustomerTableVirtual;
```

Đây là đẳng cấp thiết kế Frontend siêu việt. Thư viện Virtualizer âm thầm tính toán vị trí tọa độ khi bạn scroll 1 khoảng 3000px, nó đẩy DOM xuống `transform: translateY(3000px)`. Kết quả? Cuộn 10.000 hàng mượt như vuốt iPhone (60FPS Frame) vì trình duyệt vĩnh viễn bị đánh lừa là màn hình chỉ đang giữ 15 Element đơn giản! 

---

### 9.4 Cạm Bẫy Media: Ảnh Khổng Lồ Và Vấn Đề Fonts

10.000 dòng React sẽ chạy trên RAM máy khách, nhưng một chiếc Ảnh Cover Tải chậm nặng 5MB có thể làm tê liệt trải nghiệm Mọi Kết nối yếu.

**Giải Pháp Ảnh (Webp vs PNG/JPG):**
Không tải thẻ `<img>` chứa đuôi PNG. Bạn nên dùng `<source>` `srcset` để ném về format `webp` hoặc thẻ `<picture>` hỗ trợ ngã nhánh (fallback) đa định dạng. Với React Compiler, điều này còn được tự động static generate (Nếu dùng NextJs `next/image`). Nhưng vì CRM ta dùng Vite SPA cơ bản:

```tsx
<picture>
  {/* Chạy webp hoặc xài resize image API từ Backend trả về */}
  <source srcSet={`${user.avatar}.webp`} type="image/webp" />
  <img src={`${user.avatar}.jpg`} loading="lazy" alt="User avatar" />
</picture>
```
Lưu ý quan trọng kì diệu: thuộc tính `loading="lazy"`. Trình duyệt hiện đại đã hỗ trợ lệnh này, giúp trì hoãn nạp file ảnh nếu khung ảnh nằm tít tắp ở vị trí cần vuộn chuột cách xa! Thêm một giải pháp miễn phí tốn hụt mạng.

**Font Cờ Nhíp Chèn Ép Render (FOUT/FOIT):**
Không thả thẻ Link Google Fonts vào file HTML index. Hãy Self-host (Cắm trực tiếp code thư mục `/public`). Đặc biệt dùng CSS property vô địch: `font-display: swap;`. Khai báo này nói với màn hình: "Hãy vẽ Text bừa bằng font mặc định trước đã, tao đang chạy nền tải font đẹp, khi nào down xong tao Swap (tráo lại) ngay chứ tao không chịu chờ màn hình Trắng." 

Điều này cắt đi nỗi ức chế LCP (Chỉ số hiển thị khối chữ) - một thước đo đánh giá khắt khe nhất của Google Search Ranking.

---

### 9.5 Tổng Quan Các Check-list Performance Hệ Đại

Vậy là với tư cách một Architect (kiến trúc sư Front-end), sau này gặp một React Single Page App chết đứng vì giật, bạn chĩa tia X-Ray theo lộ trình sau:

1. Có chia đường truyền JS ra bằng `Lazy Load` và Dynamic Code-splitting? -> `Chia Layout cấp độ Route`.
2. Có hàm Tính toán nặng (Số nguyên tố, Lọc danh sách 50k item client-side) bị Trigger liên tục khi người ta gõ chữ Text Input? -> `Wrap nó trong StartTransition` hoặc dời chúng về Worker/Backend.
3. Có DOM Table kéo dài bất tận quá 500 nodes? -> Áp dụng kĩ nghệ `tanstack/react-virtual`.
4. Giao diện có quá nhiều Image/Video Render thẳng vào lúc Page load đầu? -> Bơm `loading="lazy"`, đổi chuẩn Webp, gán khung Skeleton cứng (Để chống dịch chuyển Box khi Image phình ra - giải quyết bệnh CLS trong WebVitals). 
5. Bệnh đệ quy Effect (Rerender Infinite loop)? -> Kiểm tra List Rule Dependency mảng useEffect (Thật ngạc nhiên, React Compiler của Chương 1 đã auto xoá đi lỗi này!).

**Kết luận Phần 3:**
Với bộ 3 công cụ: Thiết lập mạng lưới vững chắc bằng Global Store `Zustand` (Ch.7), Bản đồ điều khiển đường thông gió `React Router v7` (Ch.8) và Trục bảo trì bẻ cong giới hạn vật lý `Virtualizer` (Ch.9)... Bản vẽ của chúng ta không còn là một Bản thô của Thực Tập Sinh nữa. Đó là bộ Engine của một Hệ thống Cấp Độ Doanh Nghiệp (Enterprise-grade). 

---

> **Tiếp theo:** [Chương 10: Viết Test Dễ Dàng Với Vitest Và React Testing Library →](../part4/chapter-10). Khi Động cơ chạy tốc độ cao, hệ thống Phanh khẩn cấp phải càng chính xác. Phần 4 - Bước Đệm cho Kỹ sư Senior khai chiến: Test tự động gỡ mìn!
