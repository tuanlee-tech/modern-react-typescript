# Chương 11: Cấu Trúc Dự Án Có Thể Mở Rộng Cho Nhóm Phát Triển



*Chương này cover:*

- **11.1** Feature-based folder structure vs layer-based
- **11.2** Barrel exports, circular dependency và cách tránh
- **11.3** Shared component library nội bộ với Storybook
- **11.4** Monorepo với Turborepo khi nào và tại sao
- **11.5** Exercise: Refactor CRM thành feature modules (full solution)


Khi đội ngũ của bạn chỉ có 2 thành viên, không ai quan tâm bạn để file Login ở thư mục nào. Bạn có thể gọi to ở nửa kia văn phòng: *"Ê, thằng `useFetch` tao nhớ nhét trong `src/helpers/utils` nha"*. Mọi thứ vô cùng đơn giản.

Nhưng chuyện gì xảy ra nếu CRM Dashboard thành công vang dội? CEO thuê thêm 15 Lập trình viên mới chia thành 3 team: Team *Customer Management*, Team *Billing*, và Team *Analytics*. 

Bạn (với tư cách là Tech Lead xịn xò) không thể đi giải thích file cho từng người. Không những thế, sáng nay thức dậy bạn bàng hoàng nhận thấy một Dev thuộc team Billing đã âm thầm can thiệp sửa một dòng CSS trong thẻ `Button.tsx` dùng chung, vô tình làm lồi lõm màn hình Dashboard của team Analytics. Khủng hoảng bùng nổ, xung đột Git triền miên!

Chào mừng bạn đến với vấn đề kiến trúc Enterprise. Trong Chương 11, chúng ta sẽ đập bỏ cấu trúc lõi `src` truyền thống (Layer-based), dời đô sang chuẩn Modules (Feature-based), làm quen với thư viện UI độc lập (Storybook), và vạch ra chân trời mở rộng với Monorepo (Turborepo).

---

### 11.1 Layer-Based vs Feature-Based Structure

Nhìn vào `MEMORY.md` của chúng ta từ Chương 1 đến 10, cấu trúc hiện tại đang là **Layer-Based (Theo Lớp kỹ thuật)**:
```text
src/
 ├── components/  (Chứa TẤT CẢ UI: Nút bấm, Table Khách Hàng, Form Đăng nhập)
 ├── store/       (Chứa TẤT CẢ Zustand files)
 ├── pages/       (Chứa TẤT CẢ các View Router)
 ├── hooks/       (Chứa TẤT CẢ Hook)
```
Đây là cấu trúc "Mặc định" của ngành công nghiệp. Nhưng nó có 1 điểm yếu cốt tử: **Sự phân mảnh não bộ cực độ**. 

Để đọc hiểu tính năng "Review Khách Hàng", một Dev mới vào phải nhảy cửa sổ loạn xạ: mở `hooks/useCustomers.ts` để đọc state, sang `types/customer.ts` đọc Interface, chạy xuống `components/CustomerTable.tsx` để xem UI, vòng qua `actions/customerActions.ts` xem gọi hàm. Mức độ liên kết chức năng (Cohesion) bị phá vỡ hoàn toàn.

**Giải Pháp: Feature-Based (Theo Tính năng cốt lõi)**

Khái niệm này (hay còn gọi là **Khu Vực Phân Tách - Bounded Context**) nhóm tất cả những gì thuộc về 1 chức năng vào chung 1 hộp khép kín. Không phụ thuộc thư mục chéo.

CRM Dashboard chuẩn Enterprise sẽ được thiết kế lại như sau:
```text
src/
 ├── app/               # Nơi thiêng liêng nhất, chốt Router, Provider Global 
 ├── components/        # CHỈ chứa DUMB (ngu ngốc) Components dùng chung (Button, Card, Input)
 ├── features/          # NGÔI SAO CHÍNH CỦA DỰ ÁN
 │   ├── customers/     # ---- Feature Khách Hàng ----
 │   │    ├── api/          # Lệnh gọi Backend (axios/fetch)
 │   │    ├── components/   # UI gắn liền với Feature này (CustomerTable)
 │   │    ├── hooks/        # useCustomers hook. Chỉ có tính năng này mới xài.
 │   │    ├── types/        # Customer Interface
 │   │    └── index.ts      # Vách ngăn bảo vệ Public API (Sẽ giải thích cấu trúc Export)
 │   │
 │   ├── auth/          # ---- Feature Xác Thực (Login, AuthStore) ----
 │   │    ├── components/   # LoginForm
 │   │    ├── store/        # useAuthStore (Zustand)
 │   │    └── index.ts
 │
 ├── lib/               # Thư viện ngoài độ chệ (axios config, zod helper)
```

Giờ đây, Team Customer Management chỉ được quyền viết code bên trong folder `features/customers`. Họ không bao giờ dẫm chân lên code của Team Auth.

---

### 11.2 Barrel Exports & Circular Dependency (Lỗi Import Vòng Tròn)

Cấu trúc Feature-Based có một luật nghiêm ngặt: **Không bao giờ được Import Xuyên Ruột Các Feature Khác.**

Ví dụ ❌ ANTI-PATTERN:
```tsx
// File: src/features/billing/components/InvoiceList.tsx
// Team Billing mượn Type từ Ruột của team Customer:
import { CustomerItem } from '../../customers/types/customer'; 
```
Điều này khiến `billing` liên kết chặt với thư mục `types` của khách hàng. Khi dev team Customers đổi file `types/customer.ts` thành `models.ts`, file của team Billing sẽ nổ trắng xóa màn hình!

**Cách giải quyết: Tường Lửa `index.ts` (Barrel Export)**

Barrel pattern sử dụng 1 file `index.ts` để gộp toàn bộ những giá trị *công cộng* (Public API) mà một Feature muốn cho Feature khác xài. Còn lại đều là mã nguồn bảo mật (Private).

```ts [src/features/customers/index.ts]
// Bạn chỉ cho thế giới bên ngoài xài 3 thứ duy nhất này. Đừng ai sờ vào hàm tính toán ẩn bên trong!
export * from './components/CustomerDashboard';
export * from './types/customerCore';
export { useCustomersFilter } from './hooks/useFilter';
```

Giờ đây, team Billing import mã một cách thanh lịch:
```tsx [src/features/billing/components/InvoiceList.tsx]
// ✅ Tuyệt hảo. Import từ tường lửa 'index.ts', không chọc sâu vào ruột.
import { CustomerItem } from '@/features/customers'; 
```

::: warning Bẫy Chết Người: Circular Dependency
Khi áp dụng Barrel, bạn tuyệt đối không được viết theo kiểu: `Auth` import `Customer` và cùng lúc `Customer` import `Auth`. Điều này tạo ra Vòng Lặp Vô Tận (Circular Dependency) khiến Trình gói (Vite/Webpack) treo cứng hoặc return giá trị `undefined` kì lạ giữa runtime. LUÔN đẩy các thành phần chung lỏng lẻo (Shared Types) xuống một thư mục `src/types` ở tầm Global dưới cùng để mọi nhánh Feature đều chĩa mỏ xuống lấy độc lập.
:::

---

### 11.3 Lôi `Button.tsx` ra Khỏi Bùn Lầy Với Storybook

Quay lại câu chuyện "Sửa CSS rách layout" mở đầu chương. Căn nguyên là vì các UI Elements dùng chung (`Button`, `Input`, `Card`) đang nằm chung mâm với Business code, khiến mọi Lập trình viên đều có quyền sửa nó dễ dàng.

Với đội lớn, quy trình chuẩn mực là Xây Dựng **Design System (Hệ thống thiết kế)**. Mọi thứ trong `src/components/ui/` không được phép chỉnh sửa tùy tiện. Và công cụ Storybook là linh hồn để duy trì điều này.

Lệnh khởi tạo:
```bash
npx storybook@latest init
```

Storybook là bộ công cụ cho phép bạn "Chạy lẻ một Component" bên ngoài ứng dụng CRM thật. Bạn không cần Login, không cần mở màn hình, bạn chỉ nhìn đúng mỗi cái nút nhấn đó trên Background trắng, truyền Props đa dạng và chiêm ngưỡng xem nó có hỏng không.

```tsx [src/components/ui/Button.stories.tsx]
import type { Meta, StoryObj } from '@storybook/react';
import Button from './Button';

// Khai báo giao thức Story
const meta: Meta<typeof Button> = {
  title: 'Design System/Button', // Phân luồng trên Menu Web
  component: Button,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Button>;

// Biến thể Primary Mặc định
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Lưu thay đổi',
    isLoading: false
  },
};

// Biến thể Cảnh báo Đỏ
export const DangerVariant: Story = {
  args: {
    variant: 'danger',
    children: 'Xóa Vĩnh Viễn',
  },
};
```

Kết quả là một máy chủ `localhost:6006` được bật lên cung cấp Giao diện tương tác 3D. 
Cái tuyệt nhất? Trong Github Action (CI/CD) của Team, bất kỳ Pull Request nào cũng sẽ auto chụp hình Storybook của Nút bấm (dùng tool Chromatic), so sánh Pixel với phiên bản trước. Nếu bạn gõ lệch CSS làm khung Nút hẹp 2 pixel, Github sẽ KHÔNG CẤP QUYỀN MERGE CODE! Không còn màn chối cãi "Tại máy em nó chạy bình thường". 

---

### 11.4 Định Hướng Monorepo Với Turborepo

Hôm nay Sếp bạn gặp đối tác mới và gật đầu kí hợp đồng: *"Vâng, ngoài hệ thống CRM Dashboard cho Nhân Viên quản lý, tháng sau tao sẽ code thêm một cái Khách Hàng Web Portal để khách hàng tự đăng nhập đóng tiền!"*.

Lúc này, cái **Design System UI (Button, Card)** và cái **Lõi Axios Kết nối Data Backend CRM** bạn vừa viết cần phải được *Share* cho Project thứ hai? 
Bạn làm thế nào? Copy Paste qua kho source code mới? - Chúc mừng bạn đã vi phạm quy tắc DRY (Don't Repeat Yourself) một cách bẩn nhất. Nếu Nút Button đổi luật viền đỏ, bạn phải sửa tay 2 kho khác nhau!

Tiếp cận Enterprise 2026 là **Monorepo (Một Kho Sinh Sinh Thái Cỡ Lớn)**, đại diện ưu tú là **Turborepo** của Vercel:

Tư tưởng của Monorepo:
```text
my-company-org/
 ├── apps/
 │    ├── crm-dashboard/       (React Vite SPA - CRM App ta đang viết)
 │    └── customer-portal/     (NextJs SSR - App Cho Khách hàng)
 │
 ├── packages/
 │    ├── ui-components/       (Nơi vứt Button, Card, Storybook vào)
 │    ├── ts-config/           (Cấu hình chung mâm Typescript 6.0)
 │    └── eslint-config/       (Format Code bắt cả công ty gõ giống nhau)
```

Giờ đây cấu hình `package.json` của `crm-dashboard` sẽ import trọn bộ như sau thay vì thư viện Public:
```json
"dependencies": {
   "@mycorp/ui": "workspace:*",
   "react": "^19.0.0"
}
```

Và phép màu Turborepo:
Bạn gõ `turbo run build`. Nó sẽ thông minh tới mức... Tự Build `packages/ui-components/` trước, ra file JS biên dịch, nhét nó chui qua đường ngầm vào bộ Build của `crm-dashboard` rồi tóm tắt lại. Nó thậm chí lưu Cache trên Đám mây Vercel để lần chạy sau chỉ mất 3 giây. 

Tất cả nằm chung 1 thư mục Github duy nhất. 20 Developers gõ chung mã thoải mái!

---

### 11.5 Exercise: Refactoring Triệt Để CRM Thành Features Module!

**Mục tiêu:** Bài tập này yêu cầu bạn không viết tính năng mới. Thay vào đó, chặt đứt đường dẫn lộn xộn của CRM Dashboard hiện tại, dồn nó vào kết giới `features/`.

**Yêu cầu:** Di chuyển Component và Type và Action của hệ khách hàng ở Phần 2, Phần 3 thành 1 Folder mang chuẩn Barrel Pattern.

**Full Solution Pattern:**

Khám phá bộ mặt mới của `features/customers`:

Thư mục:
```text
src/features/customers/
 ├── api/
 │    └── createCustomer.ts   <- (Từ actions/customerActions.ts dời qua)
 │
 ├── components/
 │    ├── CustomerDashboard.tsx
 │    ├── CustomerTableVirtual.tsx <- (View bảng ảo dời vô)
 │    ├── DebouncedSearch.tsx
 │    └── CustomerStatusUpdater.tsx
 │
 ├── hooks/
 │    ├── useCustomers.ts      <- (Fetch logic đập từ ngoài vào)
 │    └── useDebouncedFetch.ts
 │
 ├── types/
 │    └── index.ts             <- (customerHook.ts , customerSchema.ts chui hết vào đây)
 │
 └── index.ts                  <- TƯỜNG LỬA CHỐT CHẶN BARREL
```

Và ta tiến hành thiết lập vách tường lửa `index.ts`:

```ts [src/features/customers/index.ts]
// Chỉ xuất trang Màn Hình Tổng cho Router dùng
export { default as CustomersListPage } from './components/CustomerDashboard';

// Public các thao tác type ngầm
export type { CustomerListItem, CustomerStatus } from './types/index';

// Export móc Fetch gốc để ví dụ như Dashboard Phân Tích số liệu ngoài mượn Data tạm thời xài chung
export { useCustomers } from './hooks/useCustomers'; 
```

Giờ đây, ở File gốc Cực đại `src/router.tsx` (Chương 8):

Hồi xưa chúng ta import lôm côm từ Folder `pages`:
```ts
// MÃ CŨ CỔ ĐIỂN - Thụt lùi
import CustomersListPage from '@/pages/CustomersListPage'; 
```

Trở thành mã Code Enterprise:
```ts [src/router.tsx]
import { createBrowserRouter } from 'react-router';
// Import thông qua tên Feature Bounded Contexts. Không ai cần biết CustomerListPage đằng sau là DOM quỷ quái thế nào!
import { CustomersListPage } from '@/features/customers'; 
import { LoginPage } from '@/features/auth';

export const router = createBrowserRouter([
   { path: '/customers', element: <CustomersListPage /> },
   { path: '/login', element: <LoginPage /> },
])
```

Kiến trúc này cho phép Team bạn Scale (mở rộng) từ 2 lên 20 hay 50 developers mà hệ thống Git vẫn trong vắt, không xảy chuyện "Trông nhầm chậu hoa nhà hàng xóm". Nó biến đống hỗn tạp mã spaghetti thành những viên Lego Feature chuẩn mực. Bất cứ khi nào sếp nói: Nè em, tính năng Billing thừa thải quá, cắt đi. Bạn chỉ việc nhấn Delete xoá đứt nguyên thư mục `features/billing/`. Bách Nhục Bất Bại!

---

> **Tiếp theo:** [Chương 12: Triển Khai, Tối Ưu Hóa & Chuẩn bị Migration lên Typescript 7.0 →](./chapter-12). Chặng cuối của hành trình! Code đã kiến trúc sạch, Performance bén mượt, Test đã đính kèm. Hồi cuối là việc đưa Dự án đóng gói thả lên Vũ trụ WWW và chuẩn bị tinh thần đối phó với sự kiện lớn nhất của Javascript toàn thế giới: TS 7.0 Native Go Compiler.
